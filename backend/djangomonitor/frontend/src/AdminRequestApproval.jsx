import React, { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Dashboard.css";

// Helper function to get minimum allowed date (4 days from today)
const getMinimumDate = () => {
  const today = new Date();
  today.setDate(today.getDate() + 4);
  return today;
};

// Helper function to format date
const formatDateToString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

function AdminRequestApproval() {
  // Create Product Purchase Order Form state
  const [createRequestLoading, setCreateRequestLoading] = useState(false);
  const [createRequestMessage, setCreateRequestMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState(null);
  const [formData, setFormData] = useState({
    product: "",
    quantity: "",
    deadline: "",
    requester_id: "",
  });
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [addedProducts, setAddedProducts] = useState([]);
  const [applySameDeadline, setApplySameDeadline] = useState(false);
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
  const [showProductCalendars, setShowProductCalendars] = useState({});

  const dropdownButtonRef = useRef(null);
  const dropdownMenuRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const customerMenuRef = useRef(null);
  const calendarRef = useRef(null);

  useEffect(() => {
    // Fetch products and customers on component mount for the form
    const fetchProductsAndCustomers = async () => {
      try {
        const [productsRes, customersRes] = await Promise.all([
          fetch("http://localhost:8000/app/prodname/", {
            method: "GET",
            credentials: "include",
          }),
          fetch("http://localhost:8000/app/admin/available-customers/", {
            method: "GET",
            credentials: "include",
          }),
        ]);

        const productsData = await productsRes.json();
        setProducts(Array.isArray(productsData) ? productsData : []);

        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData.customers || []);
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setCreateRequestLoading(false);
      }
    };

    fetchProductsAndCustomers();
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // Prevent non-numeric characters in quantity field
    if (name === 'quantity') {
      // Only allow numbers
      if (value === '' || /^\d+$/.test(value)) {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const addProductToRequest = () => {
    if (!formData.product || !formData.quantity || !formData.deadline) {
      setCreateRequestMessage("⚠️ Please fill all fields");
      return;
    }

    const productObj = products.find(p => p.ProdID == formData.product);
    if (!productObj) {
      setCreateRequestMessage("⚠️ Product not found");
      return;
    }

    const newProduct = {
      product: parseInt(formData.product),
      product_name: productObj.prodName,
      quantity: parseInt(formData.quantity),
      deadline_extension: formData.deadline,
    };

    if (addedProducts.some(p => p.product === newProduct.product)) {
      setCreateRequestMessage("⚠️ This product is already added");
      return;
    }

    setAddedProducts([...addedProducts, newProduct]);
    
    // Clear product and quantity fields, but keep deadline if "Apply Same Deadline" is checked
    if (applySameDeadline) {
      setFormData({ ...formData, product: "", quantity: "" });
    } else {
      setFormData({ ...formData, product: "", quantity: "", deadline: "" });
    }
    
    setCreateRequestMessage(`✓ Added "${productObj.prodName}" to purchase order`);
    setTimeout(() => setCreateRequestMessage(""), 3000);
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

  const handleSubmitCreateRequest = async () => {
    if (!formData.requester_id) {
      setCreateRequestMessage("⚠️ Please select a customer");
      return;
    }

    if (addedProducts.length === 0) {
      setCreateRequestMessage("⚠️ Please add at least one product");
      return;
    }

    const invalidProducts = addedProducts.filter(p => !p.quantity || !p.deadline_extension);
    if (invalidProducts.length > 0) {
      setCreateRequestMessage("⚠️ All products must have quantity and deadline");
      return;
    }

    setCreateRequestLoading(true);
    try {
      const submissionProducts = addedProducts.map(product => ({
        product: product.product,
        quantity: product.quantity,
        deadline_extension: product.deadline_extension,
      }));

      const requestPayload = {
        requester_id: parseInt(formData.requester_id),
        products: submissionProducts,
        deadline: addedProducts[0]?.deadline_extension || new Date().toISOString().split("T")[0],
      };

      console.log("[CREATE_REQUEST] Sending payload:", requestPayload);
      console.log("[CREATE_REQUEST] Total products being sent:", submissionProducts.length);
      submissionProducts.forEach((p, index) => {
        console.log(`[CREATE_REQUEST] Product ${index}:`, p);
      });

      const response = await fetch("http://localhost:8000/app/admin/create-request/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestPayload),
      });

      const data = await response.json();

      console.log("[CREATE_REQUEST] Response status:", response.status);
      console.log("[CREATE_REQUEST] Response data:", data);

      if (response.ok) {
        console.log("[CREATE_REQUEST] Success! Request created with ID:", data.request_id);
        setSuccessModalData({
          requestId: data.request_id,
          requester: data.requester,
          message: data.message
        });
        setShowSuccessModal(true);
        setFormData({ product: "", quantity: "", deadline: "", requester_id: "" });
        setAddedProducts([]);
        setApplySameDeadline(false);
      } else {
        let errorMessage = "Failed to create product purchase order";
        if (data.detail) errorMessage = data.detail;
        else if (data.error) errorMessage = data.error;
        else if (data.errors) errorMessage = JSON.stringify(data.errors);
        console.log("[CREATE_REQUEST] Error:", errorMessage);
        setCreateRequestMessage(`✗ Error: ${errorMessage}`);
      }
    } catch (err) {
      console.error("Error submitting product purchase order:", err);
      setCreateRequestMessage("✗ Error submitting product purchase order");
    } finally {
      setCreateRequestLoading(false);
    }
  };

  // Handle click outside dropdowns
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
        customerMenuRef.current &&
        customerDropdownRef.current &&
        !customerMenuRef.current.contains(event.target) &&
        !customerDropdownRef.current.contains(event.target)
      ) {
        setShowCustomerDropdown(false);
      }

      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowDeadlineCalendar(false);
      }
    };

    if (showProductDropdown || showCustomerDropdown || showDeadlineCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProductDropdown, showCustomerDropdown, showDeadlineCalendar]);

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ color: "#666", marginBottom: 0, fontSize: "0.95rem" }}>
          Create product purchase orders for customers - they will be automatically approved and sent to the production manager
        </p>
      </div>

      {/* CREATE PRODUCT PURCHASE ORDER FORM */}
      <div style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(34, 197, 94, 0.12), 0 2px 8px rgba(34, 197, 94, 0.06)",
        padding: "2.5rem",
        border: "1px solid rgba(134, 239, 172, 0.6)"
      }}>
        {/* Alert Message */}
        {createRequestMessage && (
          <div 
            className={`alert ${createRequestMessage.includes("✓") ? "alert-success" : "alert-danger"} mb-4`} 
            role="alert"
            style={{
              borderRadius: "8px",
              border: "none",
              padding: "1rem 1.25rem",
              fontSize: "0.95rem",
              animation: "slideIn 0.3s ease-out",
            }}
          >
            {createRequestMessage}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmitCreateRequest(); }}>
          {/* Customer Selection */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid transparent",
              backgroundImage: "linear-gradient(to right, #1e40af 0%, #3b82f6 100%)",
              backgroundPosition: "left bottom",
              backgroundSize: "100% 2px",
              backgroundRepeat: "no-repeat",
            }}>
              <i className="bi bi-person-fill me-2" style={{ fontSize: "1.1rem", color: "#1e40af" }}></i>
              <h6 
                className="text-uppercase fw-700 mb-0" 
                style={{ 
                  fontSize: "0.75rem", 
                  letterSpacing: "1px", 
                  color: "#1a1a1a",
                  fontWeight: "800"
                }}
              >
                Select Customer
              </h6>
            </div>
            <div style={{ position: "relative" }}>
              <label htmlFor="customer" className="form-label fw-600 mb-2" style={{ fontSize: "0.95rem", color: "#333" }}>
                Customer *
              </label>
              <button
                ref={customerDropdownRef}
                type="button"
                className="form-control text-start d-flex justify-content-between align-items-center"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                style={{
                  backgroundColor: "white",
                  color: formData.requester_id ? "#1a1a1a" : "#999",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  border: formData.requester_id ? "2px solid #007bff" : "1px solid #ddd",
                  borderRadius: "6px",
                  fontSize: "0.95rem",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => !formData.requester_id && (e.currentTarget.style.borderColor = "#bbb")}
                onMouseLeave={(e) => !formData.requester_id && (e.currentTarget.style.borderColor = "#ddd")}
              >
                <span>
                  {formData.requester_id
                    ? customers.find(c => c.id === parseInt(formData.requester_id))?.full_name ||
                      customers.find(c => c.id === parseInt(formData.requester_id))?.username ||
                      "-- Select Customer --"
                    : "-- Select Customer --"}
                </span>
                <i className={`bi bi-chevron-${showCustomerDropdown ? 'up' : 'down'}`}></i>
              </button>

              {showCustomerDropdown && (
                <div
                  ref={customerMenuRef}
                  className="product-dropdown-menu"
                  style={{ maxHeight: "250px", overflowY: "auto", top: "100%" }}
                >
                  {customers.map((c) => (
                    <button
                      key={`customer-${c.id}`}
                      type="button"
                      className={`dropdown-item ${formData.requester_id == c.id ? "active" : ""}`}
                      onClick={() => {
                        setFormData({ ...formData, requester_id: c.id });
                        setShowCustomerDropdown(false);
                      }}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "0.75rem 1rem",
                        cursor: "pointer",
                        backgroundColor: formData.requester_id == c.id ? "#e7f3ff" : "white",
                        borderBottom: "1px solid #f0f0f0"
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: "600" }}>{c.full_name}</div>
                        <small style={{ color: "#666" }}>{c.username} • {c.company_name}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Products Section */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid transparent",
              backgroundImage: "linear-gradient(to right, #7c3aed 0%, #a855f7 100%)",
              backgroundPosition: "left bottom",
              backgroundSize: "100% 2px",
              backgroundRepeat: "no-repeat",
            }}>
              <i className="bi bi-box-seam-fill me-2" style={{ fontSize: "1.1rem", color: "#7c3aed" }}></i>
              <h6 
                className="text-uppercase fw-700 mb-0" 
                style={{ 
                  fontSize: "0.75rem", 
                  letterSpacing: "1px", 
                  color: "#1a1a1a",
                  fontWeight: "800"
                }}
              >
                Add Products
              </h6>
            </div>
            <div className="row g-2 mb-3" style={{ overflow: "visible" }}>
              <div className="col-md-5">
                <label className="form-label fw-600 mb-2" style={{ fontSize: "0.9rem" }}>Product</label>
                <div style={{ position: "relative" }}>
                  <button
                    ref={dropdownButtonRef}
                    type="button"
                    className="form-control text-start d-flex justify-content-between align-items-center"
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                    style={{
                      backgroundColor: "white",
                      color: formData.product ? "#1a1a1a" : "#999",
                      padding: "0.65rem 0.75rem",
                      cursor: "pointer",
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      fontSize: "0.9rem",
                      transition: "all 0.2s ease"
                    }}
                  >
                    <span>
                      {formData.product
                        ? products.find(p => p.ProdID == formData.product)?.prodName || "Select..."
                        : "Select..."}
                    </span>
                    <i className={`bi bi-chevron-${showProductDropdown ? 'up' : 'down'}`}></i>
                  </button>

                  {showProductDropdown && (
                    <div
                      ref={dropdownMenuRef}
                      className="product-dropdown-menu"
                      style={{ maxHeight: "200px", overflowY: "auto" }}
                    >
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
                    </div>
                  )}
                </div>
              </div>

              <div className="col-md-2">
                <label className="form-label fw-600 mb-2" style={{ fontSize: "0.9rem" }}>Quantity</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  placeholder="0"
                  className="form-control"
                  style={{
                    border: "1px solid #ddd",
                    borderRadius: "6px",
                    padding: "0.65rem 0.75rem",
                    fontSize: "0.9rem",
                    transition: "all 0.2s ease"
                  }}
                  onKeyPress={(e) => {
                    // Additional validation for keyboard input
                    if (!/[0-9]/.test(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  title="Only numbers are allowed"
                />
              </div>

              <div className="col-md-3">
                <label className="form-label fw-600 mb-2" style={{ fontSize: "0.9rem" }}>Deadline</label>
                <div className="calendar-container" ref={calendarRef}>
                  <button
                    type="button"
                    className="form-control date-input-btn"
                    onClick={() => setShowDeadlineCalendar(!showDeadlineCalendar)}
                    style={{
                      textAlign: 'left',
                      backgroundColor: 'white',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      border: "1px solid #ddd",
                      borderRadius: "6px",
                      padding: "0.65rem 0.75rem",
                      fontSize: "0.9rem",
                      color: formData.deadline ? "#1a1a1a" : "#999",
                      cursor: "pointer"
                    }}
                  >
                    <span>{formData.deadline ? formatDateToString(formData.deadline) : 'Pick date'}</span>
                    <i className="bi bi-calendar3"></i>
                  </button>
                  {showDeadlineCalendar && (
                    <div className="calendar-popup">
                      <Calendar
                        value={formData.deadline ? new Date(formData.deadline) : null}
                        onChange={(date) => {
                          const newDeadline = formatDateToString(date);
                          setFormData({ ...formData, deadline: newDeadline });
                          
                          // If "Apply Same Deadline" is checked, update all products
                          if (applySameDeadline && addedProducts.length > 0) {
                            const updated = addedProducts.map(p => ({
                              ...p,
                              deadline_extension: newDeadline
                            }));
                            setAddedProducts(updated);
                          }
                          
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
                  type="button"
                  className="btn btn-primary w-100"
                  onClick={addProductToRequest}
                  disabled={createRequestLoading}
                  style={{
                    padding: "0.65rem",
                    fontWeight: "600",
                    fontSize: "0.9rem"
                  }}
                >
                  <i className="bi bi-plus-lg"></i> Add
                </button>
              </div>
            </div>

            {/* Apply Same Deadline to All Products Option */}
            {addedProducts.length > 0 && (
              <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px dashed #ddd" }}>
                <div className="form-check" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="applySameDeadlineCheckbox"
                    checked={applySameDeadline}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setApplySameDeadline(checked);
                      if (checked && formData.deadline) {
                        // Apply current deadline to all added products
                        const updated = addedProducts.map(p => ({
                          ...p,
                          deadline_extension: formData.deadline
                        }));
                        setAddedProducts(updated);
                      }
                    }}
                    style={{ cursor: "pointer" }}
                  />
                  <label
                    className="form-check-label"
                    htmlFor="applySameDeadlineCheckbox"
                    style={{
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "500",
                      color: "#495057",
                      userSelect: "none"
                    }}
                  >
                    <i className="bi bi-calendar-check me-1" style={{ color: "#6c757d" }}></i>
                    Apply Same Deadline to All Products
                  </label>
                </div>
                {applySameDeadline && (
                  <small style={{ color: "#6c757d", marginTop: "0.25rem", display: "block", marginLeft: "1.75rem" }}>
                    All products will use the deadline you select above
                  </small>
                )}
              </div>
            )}
          </div>

          {/* Products Added */}
          {addedProducts.length > 0 && (
            <div style={{ 
              marginBottom: "1.5rem", 
              padding: "1.5rem", 
              background: "linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
              borderRadius: "10px", 
              border: "1px solid rgba(124, 58, 237, 0.15)",
              boxShadow: "0 4px 12px rgba(124, 58, 237, 0.08)"
            }}>
              <h6 style={{ 
                fontSize: "0.85rem", 
                fontWeight: "700", 
                color: "#7c3aed",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <i className="bi bi-list-check"></i>
                Products Added
                <span className="badge bg-gradient" style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
                  marginLeft: "auto"
                }}>{addedProducts.length}</span>
              </h6>
              <div className="table-responsive">
                <table className="table table-sm table-hover mb-0" style={{ fontSize: "0.9rem" }}>
                  <thead style={{ backgroundColor: "rgba(124, 58, 237, 0.06)", borderBottom: "2px solid rgba(124, 58, 237, 0.2)" }}>
                    <tr>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#7c3aed", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>Product</th>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#7c3aed", width: "80px", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>Qty</th>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#7c3aed", width: "120px", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>Deadline</th>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#7c3aed", textAlign: "center", width: "50px", paddingTop: "0.75rem", paddingBottom: "0.75rem" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedProducts.map((product, index) => (
                      <tr key={index}>
                        <td style={{ fontSize: "0.9rem", padding: "0.5rem" }}>{product.product_name}</td>
                        <td style={{ padding: "0.5rem" }}>
                          <input
                            type="text"
                            inputMode="numeric"
                            className="form-control form-control-sm"
                            value={product.quantity || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === '' || /^\d+$/.test(value)) {
                                updateProductQuantity(index, value);
                              }
                            }}
                            onKeyPress={(e) => {
                              if (!/[0-9]/.test(e.key)) {
                                e.preventDefault();
                              }
                            }}
                            style={{ fontSize: "0.85rem", padding: "0.3rem 0.5rem" }}
                            title="Only numbers are allowed"
                          />
                        </td>
                        <td style={{ padding: "0.5rem" }}>
                          <small style={{ color: "#666" }}>{formatDateToString(product.deadline_extension)}</small>
                        </td>
                        <td style={{ textAlign: "center", padding: "0.5rem" }}>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeProduct(index)}
                            disabled={createRequestLoading}
                            style={{ padding: "0.25rem 0.5rem", fontSize: "0.85rem" }}
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
          )}

          {/* Submit Button */}
          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setFormData({ product: "", quantity: "", deadline: "", requester_id: "" });
                setAddedProducts([]);
                setApplySameDeadline(false);
                setCreateRequestMessage("");
              }}
              disabled={createRequestLoading}
              style={{
                padding: "0.75rem 1.75rem",
                fontWeight: "700",
                fontSize: "0.95rem",
                border: "1.5px solid #d1d5db",
                color: "#666",
                backgroundColor: "white",
                borderRadius: "8px",
                transition: "all 0.3s ease",
                cursor: createRequestLoading ? "not-allowed" : "pointer",
                opacity: createRequestLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!createRequestLoading) {
                  e.currentTarget.style.backgroundColor = "#f3f4f6";
                  e.currentTarget.style.borderColor = "#999";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "white";
                e.currentTarget.style.borderColor = "#d1d5db";
              }}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i> Clear Form
            </button>
            <button
              type="submit"
              disabled={createRequestLoading || addedProducts.length === 0 || !formData.requester_id}
              style={{
                padding: "0.75rem 2.5rem",
                background: createRequestLoading || addedProducts.length === 0 || !formData.requester_id 
                  ? "linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)" 
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: createRequestLoading || addedProducts.length === 0 || !formData.requester_id ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: createRequestLoading || addedProducts.length === 0 || !formData.requester_id 
                  ? "none" 
                  : "0 6px 20px rgba(16, 185, 129, 0.3)",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                opacity: createRequestLoading || addedProducts.length === 0 || !formData.requester_id ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!(createRequestLoading || addedProducts.length === 0 || !formData.requester_id)) {
                  e.currentTarget.style.boxShadow = "0 10px 30px rgba(16, 185, 129, 0.4)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              {createRequestLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" style={{ width: "14px", height: "14px" }}></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle"></i>
                  Create Product Purchase Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Success Modal with Premium Design */}
      {showSuccessModal && successModalData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.6) 100%)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 10000,
            backdropFilter: "blur(4px)",
            animation: "fadeIn 0.3s ease-out",
          }}
          onClick={() => {
            setShowSuccessModal(false);
            setSuccessModalData(null);
          }}
        >
          <style>{`
            @keyframes fadeIn {
              from {
                opacity: 0;
              }
              to {
                opacity: 1;
              }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
            @keyframes pulse {
              0%, 100% {
                transform: scale(1);
              }
              50% {
                transform: scale(1.05);
              }
            }
            .success-modal {
              animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
            }
            .check-icon {
              animation: pulse 0.6s ease-in-out 0.1s;
            }
          `}</style>
          <div
            className="success-modal"
            style={{
              background: "linear-gradient(135deg, #ffffff 0%, #f0f4ff 100%)",
              borderRadius: "12px",
              boxShadow: "0 16px 40px rgba(0, 0, 0, 0.2), 0 0 1px rgba(0, 0, 0, 0.1)",
              maxWidth: "400px",
              width: "90%",
              padding: "1.25rem",
              textAlign: "center",
              border: "1px solid rgba(255, 255, 255, 0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ marginBottom: "0.75rem" }}>
              <div 
                className="check-icon"
                style={{
                  width: "48px",
                  height: "48px",
                  margin: "0 auto",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                }}
              >
                <i
                  className="bi bi-check-lg"
                  style={{
                    fontSize: "1.5rem",
                    color: "white",
                    fontWeight: "bold",
                  }}
                ></i>
              </div>
            </div>
            <h3
              style={{
                marginBottom: "0.2rem",
                color: "#1a1a1a",
                fontSize: "1.25rem",
                fontWeight: "800",
                letterSpacing: "-0.3px",
              }}
            >
              Request Created Successfully!
            </h3>
            <p style={{ color: "#999", fontSize: "0.8rem", marginBottom: "0.75rem" }}>
              Your request has been processed and approved
            </p>
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.75rem",
                background: "rgba(16, 185, 129, 0.05)",
                borderLeft: "3px solid #10b981",
                borderRadius: "6px",
                color: "#1a1a1a",
              }}
            >
              <div style={{ marginBottom: "0.4rem" }}>
                <small style={{ color: "#999", display: "block", fontSize: "0.65rem", marginBottom: "0.15rem" }}>REQUEST ID</small>
                <p style={{ fontSize: "0.95rem", fontWeight: "700", color: "#10b981", margin: 0 }}>
                  #{successModalData.requestId}
                </p>
              </div>
              <div>
                <small style={{ color: "#999", display: "block", fontSize: "0.65rem", marginBottom: "0.15rem" }}>CUSTOMER</small>
                <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "#1a1a1a", margin: 0 }}>
                  {successModalData.requester}
                </p>
              </div>
            </div>
            <div
              style={{
                marginBottom: "0.75rem",
                padding: "0.6rem 0.75rem",
                backgroundColor: "rgba(59, 130, 246, 0.08)",
                borderRadius: "6px",
                color: "#3b82f6",
                fontSize: "0.75rem",
                fontWeight: "500",
              }}
            >
              <i className="bi bi-info-circle me-2"></i>
              Request approved and sent to production manager's queue
            </div>
            <p style={{ fontSize: "0.75rem", color: "#999", marginBottom: "0.75rem" }}>
              The customer will receive a notification about their new request.
            </p>
            <button
              onClick={() => {
                setShowSuccessModal(false);
                setSuccessModalData(null);
              }}
              style={{
                padding: "0.65rem 1.75rem",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontWeight: "700",
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                boxShadow: "0 3px 12px rgba(16, 185, 129, 0.25)",
                letterSpacing: "0.2px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.35)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = "0 3px 12px rgba(16, 185, 129, 0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminRequestApproval;