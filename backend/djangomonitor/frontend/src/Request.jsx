import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import SidebarLayout from "./SidebarLayout";
import "./Dashboard.css";
import "./Request.css";

function Request() {
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    requester: "",
    product: "",
    quantity: "",
    deadline: "",
  });
  
  // Modal state for adding items with processes
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [modalProductName, setModalProductName] = useState("");
  const [modalProcesses, setModalProcesses] = useState([
    { processName: "", stepOrder: 1 }
  ]);
  
  const [requesters, setRequesters] = useState([]);
  const [products, setProducts] = useState([]);
  const [configuredProducts, setConfiguredProducts] = useState([]); // Products configured via modal
  const [newProductIds, setNewProductIds] = useState(new Set()); // Track newly added products for badge
  const [addedProducts, setAddedProducts] = useState([]);
  const [showProductDropdown, setShowProductDropdown] = useState(false); // Custom dropdown state

  useEffect(() => {
    fetchCurrentUser();
    fetchDropdownData();
    fetchConfiguredProducts(); // Fetch configured products from DB
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch("http://localhost:8000/app/whoami/", {
        method: "GET",
        credentials: "include",
      });
      
      if (!response.ok) {
        navigate("/login");
        return;
      }
      
      const data = await response.json();
      setUserRole(data.role || null);
      
      // Prevent customers from accessing create request page
      if (data.role === "customer") {
        navigate("/customer-requests");
        return;
      }
      
      // Prevent production managers from accessing create request page
      // Only admins can create requests
      if (data.role === "manager" || data.role === "production_manager") {
        navigate("/request");
        return;
      }
    } catch (err) {
      console.error("Error fetching current user:", err);
      navigate("/login");
    }
  };

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

      setRequesters(Array.isArray(requestersData) ? requestersData : []);
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

  const handleProcessNameChange = (index, value) => {
    const updated = [...modalProcesses];
    updated[index].processName = value;
    setModalProcesses(updated);
  };

  const handleAddMoreProcess = () => {
    // Auto-increment step order
    const nextStepOrder = Math.max(...modalProcesses.map(p => p.stepOrder)) + 1;
    setModalProcesses([...modalProcesses, { processName: "", stepOrder: nextStepOrder }]);
  };

  const handleRemoveProcess = (index) => {
    if (modalProcesses.length === 1) {
      setMessage("⚠️ You must have at least one process");
      return;
    }
    const updated = modalProcesses.filter((_, i) => i !== index);
    setModalProcesses(updated);
  };

  const handleAddItemFromModal = async () => {
    if (!modalProductName.trim()) {
      setMessage("⚠️ Please enter a Product Name");
      return;
    }

    // Validate all processes have names
    for (let i = 0; i < modalProcesses.length; i++) {
      if (!modalProcesses[i].processName.trim()) {
        setMessage(`⚠️ Please enter a Process Name for all rows (row ${i + 1} is empty)`);
        return;
      }
    }

    // Save product configuration to database
    try {
      // Transform processes to match backend snake_case expectations
      const processesForBackend = modalProcesses.map(p => ({
        process_name: p.processName,
        step_order: p.stepOrder,
      }));

      const response = await fetch("http://localhost:8000/app/product-config/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: modalProductName,
          processes: processesForBackend,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Add to configured products state and track as new
        const newProduct = {
          id: data.product_id,
          prodName: modalProductName,
          processes: [...modalProcesses],
        };
        setConfiguredProducts([...configuredProducts, newProduct]);
        
        // Track this product as newly added
        setNewProductIds(new Set([...newProductIds, data.product_id]));

        // Show success message
        setMessage(`✓ Product "${modalProductName}" saved successfully with ${modalProcesses.length} step(s)!`);
        
        // Reset modal form
        setModalProductName("");
        setModalProcesses([{ processName: "", stepOrder: 1 }]);
        
        // Close modal after 1 second
        setTimeout(() => {
          setShowAddItemModal(false);
          setTimeout(() => setMessage(""), 4000);
        }, 1000);
      } else {
        setMessage(`✗ Error: ${data.error || "Failed to save product"}`);
      }
    } catch (err) {
      console.error("Error saving product:", err);
      setMessage("✗ Error submitting product configuration");
    }
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
        setMessage("✓ Request submitted successfully!");
        setFormData({
          requester: "",
          product: "",
          quantity: "",
          deadline: "",
        });
        setAddedProducts([]);
        
        // Refresh notifications
        window.dispatchEvent(new Event('refreshNotifications'));
        
        // Redirect to request list after 2 seconds
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

        {/* Page Header with Add Item and View List Buttons */}
        <div className="d-flex justify-content-between align-items-start mb-5">
          <div>
            <h2 className="mb-2">
              <i className="bi bi-clipboard-plus text-primary me-2"></i>
              Create New Request
            </h2>
            <p className="text-muted small mb-0">Add products and specify delivery deadlines for your manufacturing request</p>
          </div>
          <div className="d-flex gap-2">
            <button
              className="btn btn-success"
              onClick={() => setShowAddItemModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i> Add Product
            </button>
            <button
              className="btn btn-outline-primary"
              onClick={() => navigate("/request-list")}
            >
              <i className="bi bi-list-check me-2"></i> View Request List
            </button>
          </div>
        </div>

        {/* Modal for Adding Item with Process */}
        {showAddItemModal && (
          <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: "500px" }}>
              <div className="modal-content">
                <div className="modal-header bg-success text-white border-0">
                  <h5 className="modal-title">
                    <i className="bi bi-plus-circle me-2"></i>Add Product & Processes
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => {
                      setShowAddItemModal(false);
                      setModalProductName("");
                      setModalProcesses([{ processName: "", stepOrder: 1 }]);
                    }}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  {/* Product Name */}
                  <div className="mb-4">
                    <label htmlFor="productName" className="form-label fw-600">
                      Product Name
                    </label>
                    <input
                      id="productName"
                      type="text"
                      className="form-control border-2 form-control-lg"
                      value={modalProductName}
                      onChange={(e) => setModalProductName(e.target.value)}
                      placeholder="e.g., Motor Assembly, Bracket 0080"
                    />
                  </div>

                  {/* Processes Section */}
                  <div className="mb-4">
                    <label className="form-label fw-600 mb-3">
                      <i className="bi bi-gear me-2"></i>Processes
                    </label>
                    <div className="border rounded p-3 bg-light">
                      {modalProcesses.map((process, index) => (
                        <div key={index} className="mb-3">
                          <div className="d-flex gap-2 align-items-end">
                            <div className="flex-grow-1">
                              <label className="form-label fw-600 small mb-1">
                                Process Name
                              </label>
                              <input
                                type="text"
                                className="form-control border-1"
                                value={process.processName}
                                onChange={(e) => handleProcessNameChange(index, e.target.value)}
                                placeholder={`Process ${index + 1}`}
                              />
                            </div>
                            <div style={{ width: "80px" }}>
                              <label className="form-label fw-600 small mb-1">
                                Step
                              </label>
                              <div className="badge bg-warning text-dark p-2 d-flex align-items-center justify-content-center" style={{ height: "38px", fontSize: "16px" }}>
                                {process.stepOrder}
                              </div>
                            </div>
                            {modalProcesses.length > 1 && (
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveProcess(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </div>

                          {index === modalProcesses.length - 1 && (
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-primary w-100 mt-2"
                              onClick={handleAddMoreProcess}
                            >
                              <i className="bi bi-plus-lg me-1"></i>+ Add More Process
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="alert alert-info border-0 mb-0">
                    <i className="bi bi-info-circle me-2"></i>
                    <small>Add all processes/steps for this product at once. Steps auto-increment. Then select this product from the "Product Name" dropdown below and enter Quantity & Deadline to add it to your request.</small>
                  </div>
                </div>
                <div className="modal-footer border-top-0 pt-0">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowAddItemModal(false);
                      setModalProductName("");
                      setModalProcesses([{ processName: "", stepOrder: 1 }]);
                    }}
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleAddItemFromModal}
                    disabled={!modalProductName || modalProcesses.some(p => !p.processName)}
                  >
                    <i className="bi bi-check-circle me-2"></i>Add Product
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Form Container */}
        <div className="container-fluid ps-0 pe-0">
          <div className="row">
            <div className="col-lg-12">
              {/* Combined Form Card */}
              <div className="card request-card shadow-sm mb-4 border-0" style={{ overflow: "visible" }}>
                <div className="card-header border-0 py-3">
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
                    <div className="col-md-4" style={{ overflow: "visible" }}>
                      <label htmlFor="product" className="form-label fw-600 mb-2">
                        Product Name
                      </label>
                      <div style={{ position: "relative", overflow: "visible" }}>
                        <button
                          type="button"
                          className="form-control border-2 text-start d-flex justify-content-between align-items-center"
                          onClick={() => setShowProductDropdown(!showProductDropdown)}
                          style={{
                            backgroundColor: "white",
                            color: formData.product ? "black" : "#999",
                            padding: "0.5rem 1rem",
                            textAlign: "left"
                          }}
                        >
                          <span>
                            {formData.product
                              ? configuredProducts.find(p => p.id === formData.product)?.prodName ||
                                products.find(p => p.ProdID == formData.product)?.prodName ||
                                "-- Select Product --"
                              : "-- Select Product --"}
                          </span>
                          <i className="bi bi-chevron-down"></i>
                        </button>
                        
                        {showProductDropdown && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              backgroundColor: "white",
                              border: "1px solid #dee2e6",
                              borderTop: "none",
                              maxHeight: "400px",
                              overflowY: "auto",
                              zIndex: 10000,
                              marginTop: "-1px",
                              boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                            }}
                          >
                            {/* Show all database products first (official products) */}
                            {products.map((p) => (
                              <button
                                key={`db-${p.ProdID}`}
                                type="button"
                                className="w-100 text-start px-3 py-2"
                                style={{
                                  border: "none",
                                  backgroundColor: formData.product == p.ProdID ? "#e7f3ff" : "white",
                                  color: "black",
                                  cursor: "pointer"
                                }}
                                onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                onMouseLeave={(e) =>
                                  (e.target.style.backgroundColor =
                                    formData.product == p.ProdID ? "#e7f3ff" : "white")
                                }
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
                                  className="w-100 text-start px-3 py-2"
                                  style={{
                                    border: "none",
                                    backgroundColor: formData.product === p.id ? "#e7f3ff" : "white",
                                    color: "black",
                                    cursor: "pointer"
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f8f9fa"}
                                  onMouseLeave={(e) =>
                                    (e.target.style.backgroundColor =
                                      formData.product === p.id ? "#e7f3ff" : "white")
                                  }
                                  onClick={() => {
                                    setFormData({ ...formData, product: p.id });
                                    setShowProductDropdown(false);
                                  }}
                                >
                                  <span>
                                    {p.prodName}
                                    {newProductIds.has(p.id) && (
                                      <span
                                        style={{
                                          marginLeft: "8px",
                                          color: "#22863a",
                                          fontSize: "0.85rem",
                                          fontWeight: "600"
                                        }}
                                      >
                                        ✨ NEW
                                      </span>
                                    )}
                                  </span>
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
                      <input
                        id="deadline"
                        type="date"
                        name="deadline"
                        value={formData.deadline}
                        onChange={handleFormChange}
                        className="form-control border-2"
                      />
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
                    <span className="small fw-500"><strong>Recommended:</strong> Use the "Add Item" button to add products with their processes. Or use this form to add products without processes.</span>
                  </div>
                  </div>
                </div>
              </div>

              {/* Products List Card */}
              {addedProducts.length > 0 && (
                <div className="card request-card shadow-sm mb-4 border-0">
                  <div className="card-header bg-gradient-info border-0 py-3">
                    <h5 className="card-title mb-0">
                      <i className="bi bi-list-check text-info me-2"></i>
                      <span className="fw-bold">Products Added</span>
                      <span className="badge bg-info ms-2">{addedProducts.length}</span>
                    </h5>
                  </div>
                  <div className="card-body">
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
                                <input
                                  type="date"
                                  className="form-control form-control-sm"
                                  style={{ width: "120px" }}
                                  value={product.deadline_extension || ""}
                                  onChange={(e) => updateProductDeadline(index, e.target.value)}
                                />
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
                  </div>
                </div>
              )}

              {/* Submit Button Section */}
              <div className="d-flex justify-content-end mb-5">
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
    </SidebarLayout>
  );
}

export default Request;

