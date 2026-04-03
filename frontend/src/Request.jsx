import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "bootstrap/dist/css/bootstrap.min.css";
import SidebarLayout from "./SidebarLayout";
import { useUser } from "./UserContext.jsx";
import "./Dashboard.css";
import "./Request.css";

// Helper function to get minimum allowed date (4 days from today)
const getMinimumDate = () => {
  const today = new Date();
  today.setDate(today.getDate() + 4);
  return today;
};

// Helper function to format date for HTML input
const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

// Helper function to format date from Date object to YYYY-MM-DD
const formatDateToString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

function Request() {
  const navigate = useNavigate();
  const { userData } = useUser();
  const [message, setMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    requester: "",
    product: "",
    quantity: "",
    deadline: "",
  });
  
  const [requesters, setRequesters] = useState([]);
  const [products, setProducts] = useState([]);
  const [configuredProducts, setConfiguredProducts] = useState([]); // Products configured via modal
  const [newProductIds, setNewProductIds] = useState(new Set()); // Track newly added products for badge
  const [addedProducts, setAddedProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const dropdownButtonRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  
  // Calendar state
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
  const [showProductCalendars, setShowProductCalendars] = useState({});
  const calendarRef = useRef(null);
  const productCalendarRefs = useRef({});

  useEffect(() => {
    fetchDropdownData();
    fetchConfiguredProducts(); // Fetch configured products from DB
  }, []);

  // Handle click outside dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownMenuRef.current &&
        dropdownButtonRef.current &&
        !dropdownMenuRef.current.contains(event.target) &&
        !dropdownButtonRef.current.contains(event.target)
      ) {
        setShowProductDropdown(false);
      }
      
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setShowDeadlineCalendar(false);
      }
    };

    if (showProductDropdown || showDeadlineCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProductDropdown, showDeadlineCalendar]);

  useEffect(() => {
    // Prevent customers from accessing create request page
    if (userData.role === "customer") {
      navigate("/customer-requests");
      return;
    }
    
    // Prevent production managers from creating requests - redirect to request list
    if (userData.role === "production_manager" || userData.role === "manager") {
      navigate("/request-list");
      return;
    }
    
    fetchDropdownData();
  }, [userData.role, navigate]);

  const fetchDropdownData = async () => {
    try {
      const [requestersRes, productsRes] = await Promise.all([
        fetch("http://localhost:8000/app/users/?status=active", {
          method: "GET",
          credentials: "include",
        }),
        fetch("http://localhost:8000/app/prodname/", {
          method: "GET",
          credentials: "include",
        }),
      ]);

      const requestersData = await requestersRes.json();
      const productsData = await productsRes.json();

      // Filter to only show verified customers (exclude staff, managers, admins)
      const customersOnly = Array.isArray(requestersData) 
        ? requestersData.filter(user => user.role === "customer" && user.is_verified)
        : [];

      setRequesters(customersOnly);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      console.error("Error fetching dropdown data:", err);
    }
  };

  const fetchConfiguredProducts = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/product-config/", {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        // Transform backend data to match our state structure
        const configured = data.map((p) => ({
          id: p.id,
          prodName: p.prodName,
          processes: Array.isArray(p.processes) ? p.processes : [],
        }));
        setConfiguredProducts(configured);
      }
    } catch (err) {
      console.error("Error fetching configured products:", err);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleModalInputChange = (e) => {
    const { name, value } = e.target;
    setModalInputs({ ...modalInputs, [name]: value });
  };

  const addProductToRequest = () => {
    if (!formData.product || !formData.quantity || !formData.deadline) {
      setMessage("⚠️ Please fill all product fields");
      return;
    }

    // Check if it's a configured product
    const configuredProduct = configuredProducts.find((p) => p.id === formData.product);
    
    if (configuredProduct) {
      // Add configured product as a SINGLE row with processes stored for submission
      const newProduct = {
        product: configuredProduct.id, // Use the actual product ID (not null!)
        product_name: configuredProduct.prodName,
        quantity: parseInt(formData.quantity),
        deadline_extension: formData.deadline,
        processes: configuredProduct.processes, // Store processes for submission, don't display them
      };

      setAddedProducts([...addedProducts, newProduct]);
      setMessage(`✓ Added "${configuredProduct.prodName}" to request`);
      setFormData({ ...formData, product: "", quantity: "", deadline: "" });
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    // Handle database product
    const productObj = products.find((p) => p.ProdID == formData.product);
    if (!productObj) {
      setMessage("⚠️ Product not found");
      return;
    }

    const newProduct = {
      product: parseInt(formData.product),
      product_name: productObj.prodName,
      quantity: parseInt(formData.quantity),
      deadline_extension: formData.deadline,
    };

    // Check if product already added
    if (
      addedProducts.some(
        (p) => p.product === newProduct.product && !p.processes
      )
    ) {
      setMessage("⚠️ This product is already added");
      return;
    }

    setAddedProducts([...addedProducts, newProduct]);
    setFormData({ ...formData, product: "", quantity: "", deadline: "" });
    setMessage("");
  };

  const removeProduct = (index) => {
    setAddedProducts(addedProducts.filter((_, i) => i !== index));
  };

  const updateProductQuantity = (index, quantity) => {
    const updated = [...addedProducts];
    updated[index].quantity = parseInt(quantity) || 0;
    setAddedProducts(updated);
  };

  const updateProductDeadline = (index, deadline) => {
    const updated = [...addedProducts];
    updated[index].deadline_extension = deadline;
    setAddedProducts(updated);
  };

  const handleSubmitRequest = async () => {
    if (!formData.requester) {
      setMessage("⚠️ Please select a requester");
      return;
    }

    if (addedProducts.length === 0) {
      setMessage("⚠️ Please add at least one product to submit");
      return;
    }

    // Validate all products have quantity and deadline
    const invalidProducts = addedProducts.filter(p => !p.quantity || !p.deadline_extension);
    if (invalidProducts.length > 0) {
      setMessage("⚠️ All products must have quantity and deadline filled");
      return;
    }

    setLoading(true);
    try {
      // Transform products for submission
      const submissionProducts = [];

      addedProducts.forEach((product) => {
        // Send ONE row per product (don't expand processes)
        // ProcessTemplates will be used when starting the project
        submissionProducts.push({
          product: product.product,
          quantity: product.quantity,
          deadline_extension: product.deadline_extension,
        });
      });

      if (submissionProducts.length === 0) {
        setMessage("⚠️ No valid products to submit");
        setLoading(false);
        return;
      }

      // Create request payload
      const requestPayload = {
        requester: parseInt(formData.requester),
        products: submissionProducts,
        deadline:
          addedProducts[0]?.deadline_extension ||
          new Date().toISOString().split("T")[0],
      };

      const response = await fetch("http://localhost:8000/app/request/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      if (response.ok) {
        setShowSuccessModal(true);
        setFormData({
          requester: "",
          product: "",
          quantity: "",
          deadline: "",
        });
        setAddedProducts([]);
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
        
        // Redirect to request list after 3 seconds
        setTimeout(() => {
          navigate("/request-list");
        }, 2000);
      } else {
        // Log full error for debugging
        console.error("Backend error response:", data);
        
        // Handle different error formats from backend
        let errorMessage = "Failed to create request";
        if (data.detail) {
          errorMessage = data.detail;
        } else if (data.request_products) {
          errorMessage = `Products error: ${JSON.stringify(data.request_products)}`;
        } else if (data.requester) {
          errorMessage = `Requester error: ${JSON.stringify(data.requester)}`;
        } else if (data.deadline) {
          errorMessage = `Deadline error: ${JSON.stringify(data.deadline)}`;
        } else if (data.products) {
          errorMessage = `Products error: ${JSON.stringify(data.products)}`;
        } else if (typeof data === 'object') {
          errorMessage = JSON.stringify(data);
        }
        
        setMessage(`✗ Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Error submitting request:", err);
      setMessage("✗ Error submitting request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="request-page">
        {/* Alert Message */}
        {message && (
          <div
            className={`alert ${
              message.includes("✓") ? "alert-success" : "alert-danger"
            } alert-dismissible fade show mb-4`}
            role="alert"
          >
            <i className={`bi ${message.includes("✓") ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"} me-2`}></i>
            {message}
            <button
              type="button"
              className="btn-close"
              onClick={() => setMessage("")}
              aria-label="Close"
            ></button>
          </div>
        )}

        {/* Success Modal */}
        {showSuccessModal && (
          <div 
            className="modal d-block"
            style={{ 
              backgroundColor: "rgba(0, 0, 0, 0.5)", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center",
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999
            }}
          >
            <div 
              className="modal-dialog modal-dialog-centered" 
              style={{ maxWidth: "400px" }}
            >
              <div className="modal-content border-0 shadow-lg">
                <div className="modal-body p-5 text-center">
                  <div 
                    className="mb-4"
                    style={{
                      fontSize: "3rem",
                      animation: "fadeIn 0.3s ease-in"
                    }}
                  >
                    <i className="bi bi-check-circle text-success" style={{ fontSize: "4rem" }}></i>
                  </div>
                  <h4 className="fw-bold mb-2 text-success">Success!</h4>
                  <p className="text-muted mb-4">Your request has been submitted successfully.</p>
                  <p className="small text-muted">Redirecting to purchase order list...</p>
                  <div className="mt-4">
                    <div className="spinner-border spinner-border-sm text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Page Header with Add Item and View List Buttons */}
        <div className="d-flex justify-content-between align-items-start mb-5">
          <div>
            <p className="text-muted small mb-0">Add products and specify delivery deadlines for your manufacturing request</p>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-outline-primary"
              onClick={() => navigate("/request-list")}
            >
              <i className="bi bi-list-check me-2"></i> View Purchase Order List
            </button>
          </div>
        </div>



        {/* Main Form Container */}
        <div className="container-fluid ps-0 pe-0">
          <div className="row">
            <div className="col-lg-12">
              {/* Combined Form Card */}
              <div className="card request-card shadow-sm mb-4 border-0" style={{ overflow: "visible" }}>
                <div className="card-header border-0 py-3" style={{ backgroundColor: "hsla(126, 78%, 50%, 0.667)" }}>
                  <h5 className="card-title mb-0">
                    <i className="bi bi-pencil-square text-info me-2"></i>
                    <span className="fw-bold">Request Details</span>
                  </h5>
                </div>
                <div className="card-body" style={{ overflow: "visible", position: "relative" }}>
                  {/* Customer Selection Section */}
                  <div className="mb-5 pb-4 border-bottom" style={{ position: "relative" }}>
                    <h6 className="text-uppercase fw-700 text-muted small mb-3">
                      <i className="bi bi-person-circle me-2"></i> Step 1: Select Customer
                    </h6>
                    <div className="form-group">
                      <label htmlFor="requester" className="form-label fw-600 mb-2">
                        Customer Name
                      </label>
                      <select
                        id="requester"
                        name="requester"
                        value={formData.requester}
                        onChange={handleFormChange}
                        className="form-select form-select-lg border-2"
                      >
                        <option value="">-- Select a Customer --</option>
                        {requesters.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.full_name || r.username}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Products Section */}
                  <div style={{ overflow: "visible" }}>
                    <h6 className="text-uppercase fw-700 text-muted small mb-3">
                      <i className="bi bi-box-seam-fill me-2"></i> Step 2: Add Products with Quantity & Deadline
                    </h6>
                  <div className="row g-3 mb-4" style={{ overflow: "visible" }}>
                    <div className="col-md-4">
                      <label htmlFor="product" className="form-label fw-600 mb-2">
                        Product Name
                      </label>
                      <div style={{ position: "relative" }}>
                        <button
                          ref={dropdownButtonRef}
                          type="button"
                          className="form-control text-start d-flex justify-content-between align-items-center border-2"
                          onClick={() => setShowProductDropdown(!showProductDropdown)}
                          style={{
                            backgroundColor: "white",
                            color: formData.product ? "black" : "#999",
                            padding: "0.5rem 1rem",
                            cursor: "pointer"
                          }}
                        >
                          <span>
                            {formData.product
                              ? configuredProducts.find(p => p.id === formData.product)?.prodName ||
                                products.find(p => p.ProdID == formData.product)?.prodName ||
                                "-- Select Product --"
                              : "-- Select Product --"}
                          </span>
                          <i className={`bi bi-chevron-${showProductDropdown ? 'up' : 'down'}`}></i>
                        </button>

                        {showProductDropdown && (
                          <div
                            ref={dropdownMenuRef}
                            className="product-dropdown-menu"
                          >
                            {/* Show all database products first (official products) */}
                            {products.map((p) => (
                              <button
                                key={`db-${p.ProdID}`}
                                type="button"
                                className={`dropdown-item ${formData.product == p.ProdID ? "active" : ""}`}
                                onClick={() => {
                                  setFormData({ ...formData, product: p.ProdID });
                                  setShowProductDropdown(false);
                                }}
                              >
                                {p.prodName}
                              </button>
                            ))}

                            {/* Show configured products that don't exist in database (to avoid duplicates) */}
                            {configuredProducts
                              .filter((cp) => !products.some((p) => p.prodName === cp.prodName))
                              .map((p) => (
                                <button
                                  key={`config-${p.id}`}
                                  type="button"
                                  className={`dropdown-item ${formData.product === p.id ? "active" : ""}`}
                                  onClick={() => {
                                    setFormData({ ...formData, product: p.id });
                                    setShowProductDropdown(false);
                                  }}
                                >
                                  {p.prodName}
                                  {newProductIds.has(p.id) && (
                                    <span style={{ marginLeft: "8px", color: "#22863a", fontSize: "0.85rem", fontWeight: "600" }}>
                                      ✨ NEW
                                    </span>
                                  )}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-3">
                      <label htmlFor="quantity" className="form-label fw-600 mb-2">
                        Quantity
                      </label>
                      <input
                        id="quantity"
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleFormChange}
                        placeholder="0"
                        min="1"
                        className="form-control border-2"
                      />
                    </div>

                    <div className="col-md-3">
                      <label htmlFor="deadline" className="form-label fw-600 mb-2">
                        Deadline
                      </label>
                      <div className="calendar-container" ref={calendarRef}>
                        <button
                          type="button"
                          className="form-control border-2 date-input-btn"
                          onClick={() => setShowDeadlineCalendar(!showDeadlineCalendar)}
                          style={{
                            textAlign: 'left',
                            backgroundColor: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>{formData.deadline ? formatDateToString(formData.deadline) : 'Select deadline...'}</span>
                          <i className={`bi bi-calendar3 ${showDeadlineCalendar ? 'rotate-calendar' : ''}`}></i>
                        </button>
                        {showDeadlineCalendar && (
                          <div className="calendar-popup">
                            <Calendar
                              value={formData.deadline ? new Date(formData.deadline) : null}
                              onChange={(date) => {
                                setFormData({ ...formData, deadline: formatDateToString(date) });
                                setShowDeadlineCalendar(false);
                              }}
                              minDate={getMinimumDate()}
                              tileDisabled={({ date }) => date < getMinimumDate()}
                              className="custom-calendar"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="col-md-2 d-flex align-items-end">
                      <button
                        className="btn btn-primary w-100 fw-600"
                        onClick={addProductToRequest}
                        disabled={loading}
                      >
                        <i className="bi bi-plus-lg me-1"></i> Add
                      </button>
                    </div>
                  </div>

                  <div className="alert alert-info border-0 bg-light-info mb-0" role="alert">
                    <i className="bi bi-info-circle text-info me-2"></i>
                    <span className="small fw-500"><strong>Recommended:</strong> Use the "Add Item" button to add products with their processes.</span>
                  </div>

                  {/* Products List Section */}
                  {addedProducts.length > 0 && (
                    <>
                      <div className="border-top my-4"></div>
                      <h6 className="text-uppercase fw-700 text-muted small mb-3">
                        <i className="bi bi-list-check text-info me-2"></i>
                        Products Added <span className="badge bg-info">{addedProducts.length}</span>
                      </h6>
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="table-light">
                            <tr>
                              <th className="fw-700">Product</th>
                              <th className="fw-700">Quantity</th>
                              <th className="fw-700">Deadline</th>
                              <th className="fw-700 text-center" style={{ width: "70px" }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {addedProducts.map((product, index) => (
                              <tr key={index} className="align-middle">
                                <td className="fw-500">{product.product_name}</td>
                                <td>
                                  <input
                                    type="number"
                                    className="form-control form-control-sm"
                                    style={{ width: "80px" }}
                                    value={product.quantity || ""}
                                    onChange={(e) => updateProductQuantity(index, e.target.value)}
                                    placeholder="Qty"
                                    min="1"
                                  />
                                </td>
                                <td>
                                  <div className="calendar-container-sm">
                                    <button
                                      type="button"
                                      className="form-control form-control-sm date-input-btn"
                                      onClick={() => setShowProductCalendars({ ...showProductCalendars, [index]: !showProductCalendars[index] })}
                                      style={{
                                        width: "120px",
                                        textAlign: 'left',
                                        backgroundColor: 'white',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        padding: '0.35rem 0.5rem'
                                      }}
                                    >
                                      <span style={{ fontSize: '0.8rem' }}>{product.deadline_extension ? formatDateToString(product.deadline_extension) : 'Pick'}</span>
                                      <i className="bi bi-calendar3" style={{ fontSize: '0.85rem' }}></i>
                                    </button>
                                    {showProductCalendars[index] && (
                                      <div className="calendar-popup-sm">
                                        <Calendar
                                          value={product.deadline_extension ? new Date(product.deadline_extension) : null}
                                          onChange={(date) => {
                                            updateProductDeadline(index, formatDateToString(date));
                                            setShowProductCalendars({ ...showProductCalendars, [index]: false });
                                          }}
                                          minDate={getMinimumDate()}
                                          tileDisabled={({ date }) => date < getMinimumDate()}
                                          className="custom-calendar"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="text-center">
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => removeProduct(index)}
                                    disabled={loading}
                                    title="Remove this product"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}

                  <div className="border-top my-4"></div>

                  {/* Submit Button Section */}
                  <div className="d-flex justify-content-end">
                    <button
                      className="btn btn-success btn-lg fw-600"
                      onClick={handleSubmitRequest}
                      disabled={loading || !formData.requester || addedProducts.length === 0}
                      title={addedProducts.length === 0 ? "Please add at least one product to submit" : "Submit the request"}
                    >
                      <i className="bi bi-check-circle me-2"></i>
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Submitting...
                        </>
                      ) : (
                        "Submit Request"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </SidebarLayout>
  );
}

export default Request;

