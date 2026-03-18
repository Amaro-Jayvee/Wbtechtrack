import React, { useState, useEffect, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./Dashboard.css";

// Helper function to get minimum allowed date based on required lead days.
const getMinimumDate = (leadDays = 4) => {
  const today = new Date();
  today.setDate(today.getDate() + leadDays);
  today.setHours(0, 0, 0, 0);
  return today;
};

// Helper function to format date
const formatDateToString = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

function AdminRequestApproval() {
  const MAX_PRODUCT_QUANTITY = 50000;
  const PRODUCTS_PER_PAGE = 5;

  const getLeadDaysForQuantity = (quantity) => {
    if (quantity <= 5000) return 4;
    if (quantity <= 15000) return 7;
    if (quantity <= 30000) return 12;
    return 16;
  };

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
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showDeadlineCalendar, setShowDeadlineCalendar] = useState(false);
  const [deadlineLocked, setDeadlineLocked] = useState(false);
  const [showDeadlineWarningModal, setShowDeadlineWarningModal] = useState(false);
  const [pendingDeadlineValue, setPendingDeadlineValue] = useState("");
  const [showCompleteProductsModal, setShowCompleteProductsModal] = useState(false);
  const [productsCompleted, setProductsCompleted] = useState(false);
  const [showProductCalendars, setShowProductCalendars] = useState({});
  const [showCancelProductModal, setShowCancelProductModal] = useState(false);
  const [productToCancelIndex, setProductToCancelIndex] = useState(null);
  const [cancelProductLoading, setCancelProductLoading] = useState(false);
  const [cancelToast, setCancelToast] = useState({ show: false, message: "" });
  const [editingProductIndex, setEditingProductIndex] = useState(null);
  const [editingQuantityValue, setEditingQuantityValue] = useState("");
  const [openRowActionMenuIndex, setOpenRowActionMenuIndex] = useState(null);
  const [productsPage, setProductsPage] = useState(1);

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
        const numericValue = value === '' ? null : parseInt(value, 10);
        if (numericValue !== null && numericValue > MAX_PRODUCT_QUANTITY) {
          setCreateRequestMessage(`⚠️ Maximum quantity per product is ${MAX_PRODUCT_QUANTITY.toLocaleString()}`);
          return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getRequiredLeadDays = (productsList = addedProducts) => {
    if (!productsList.length) {
      return 4;
    }
    return productsList.reduce((maxDays, item) => {
      const qty = Number(item.quantity) || 0;
      return Math.max(maxDays, getLeadDaysForQuantity(qty));
    }, 4);
  };

  const totalProductPages = Math.max(1, Math.ceil(addedProducts.length / PRODUCTS_PER_PAGE));
  const paginatedAddedProducts = addedProducts.slice(
    (productsPage - 1) * PRODUCTS_PER_PAGE,
    productsPage * PRODUCTS_PER_PAGE
  );

  const addProductToRequest = () => {
    if (!formData.product || !formData.quantity) {
      setCreateRequestMessage("⚠️ Please select product and quantity");
      return;
    }

    const quantityValue = parseInt(formData.quantity, 10);
    if (Number.isNaN(quantityValue) || quantityValue < 1 || quantityValue > MAX_PRODUCT_QUANTITY) {
      setCreateRequestMessage(`⚠️ Quantity must be between 1 and ${MAX_PRODUCT_QUANTITY.toLocaleString()}`);
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
      quantity: quantityValue,
    };

    if (addedProducts.some(p => p.product === newProduct.product)) {
      setCreateRequestMessage("⚠️ This product is already added");
      return;
    }

    const updatedProducts = [...addedProducts, newProduct];
    const requiredLeadDays = getRequiredLeadDays(updatedProducts);
    const minimumDeadline = getMinimumDate(requiredLeadDays);
    const minimumDeadlineString = formatDateToString(minimumDeadline);

    setAddedProducts(updatedProducts);
    setProductsPage(Math.max(1, Math.ceil(updatedProducts.length / PRODUCTS_PER_PAGE)));

    if (formData.deadline) {
      const selectedDeadline = new Date(formData.deadline);
      selectedDeadline.setHours(0, 0, 0, 0);

      if (selectedDeadline < minimumDeadline) {
        setFormData({ ...formData, product: "", quantity: "", deadline: minimumDeadlineString });
        setCreateRequestMessage(
          `⚠️ Added quantity requires ${requiredLeadDays} day lead time. Shared deadline auto-adjusted to ${minimumDeadlineString}.`
        );
      } else {
        setFormData({ ...formData, product: "", quantity: "" });
        setCreateRequestMessage(`✓ Added "${productObj.prodName}" to purchase order`);
      }
    } else {
      setFormData({ ...formData, product: "", quantity: "" });
      setCreateRequestMessage(`✓ Added "${productObj.prodName}" to purchase order`);
    }

    setTimeout(() => setCreateRequestMessage(""), 3000);
  };

  const closeDeadlineWarningModal = () => {
    setShowDeadlineWarningModal(false);
    setPendingDeadlineValue("");
  };

  const confirmAndLockDeadline = () => {
    if (!pendingDeadlineValue) {
      return;
    }

    const requiredLeadDays = getRequiredLeadDays();
    const minimumDeadline = getMinimumDate(requiredLeadDays);
    const selectedDeadline = new Date(pendingDeadlineValue);
    selectedDeadline.setHours(0, 0, 0, 0);

    if (selectedDeadline < minimumDeadline) {
      setCreateRequestMessage(
        `⚠️ Deadline is too early for this order size. Minimum date is ${formatDateToString(minimumDeadline)} (${requiredLeadDays} day lead time).`
      );
      closeDeadlineWarningModal();
      return;
    }

    setFormData((prev) => ({ ...prev, deadline: pendingDeadlineValue }));
    setDeadlineLocked(true);
    setShowDeadlineCalendar(false);
    closeDeadlineWarningModal();
    setCreateRequestMessage("✓ Shared deadline saved and locked for this order");
    setTimeout(() => setCreateRequestMessage(""), 3000);
  };

  const openCompleteProductsModal = () => {
    if (addedProducts.length === 0) {
      setCreateRequestMessage("⚠️ Please add at least one product first");
      return;
    }
    setShowCompleteProductsModal(true);
  };

  const closeCompleteProductsModal = () => {
    setShowCompleteProductsModal(false);
  };

  const proceedToDeadlineSelection = () => {
    setProductsCompleted(true);
    setShowCompleteProductsModal(false);
    setShowDeadlineCalendar(true);
  };

  const startEditProductQuantity = (index) => {
    const targetProduct = addedProducts[index];
    if (!targetProduct) {
      return;
    }
    setOpenRowActionMenuIndex(null);
    setEditingProductIndex(index);
    setEditingQuantityValue(String(targetProduct.quantity));
  };

  const cancelEditProductQuantity = () => {
    setEditingProductIndex(null);
    setEditingQuantityValue("");
  };

  const saveEditedProductQuantity = () => {
    if (editingProductIndex === null) {
      return;
    }

    const parsedQuantity = parseInt(editingQuantityValue, 10);
    if (Number.isNaN(parsedQuantity) || parsedQuantity < 1 || parsedQuantity > MAX_PRODUCT_QUANTITY) {
      setCreateRequestMessage(`⚠️ Quantity must be between 1 and ${MAX_PRODUCT_QUANTITY.toLocaleString()}`);
      return;
    }

    const targetProduct = addedProducts[editingProductIndex];
    if (!targetProduct) {
      cancelEditProductQuantity();
      return;
    }

    const updatedProducts = addedProducts.map((item, idx) => (
      idx === editingProductIndex ? { ...item, quantity: parsedQuantity } : item
    ));

    setAddedProducts(updatedProducts);
    cancelEditProductQuantity();

    if (formData.deadline) {
      const requiredLeadDays = getRequiredLeadDays(updatedProducts);
      const minimumDeadline = getMinimumDate(requiredLeadDays);
      const minimumDeadlineString = formatDateToString(minimumDeadline);
      const selectedDeadline = new Date(formData.deadline);
      selectedDeadline.setHours(0, 0, 0, 0);

      if (selectedDeadline < minimumDeadline) {
        setFormData((prev) => ({ ...prev, deadline: minimumDeadlineString }));
        setCreateRequestMessage(
          `⚠️ Quantity updated for "${targetProduct.product_name}". Deadline auto-adjusted to ${minimumDeadlineString} to match ${requiredLeadDays}-day lead time.`
        );
      } else {
        setCreateRequestMessage(`✓ Quantity updated for "${targetProduct.product_name}"`);
      }
    } else {
      setCreateRequestMessage(`✓ Quantity updated for "${targetProduct.product_name}"`);
    }

    setTimeout(() => setCreateRequestMessage(""), 3000);
  };

  const removeProduct = (index) => {
    setAddedProducts((currentProducts) => currentProducts.filter((_, i) => i !== index));
    if (editingProductIndex === index) {
      cancelEditProductQuantity();
    } else if (editingProductIndex !== null && editingProductIndex > index) {
      setEditingProductIndex((prev) => prev - 1);
    }

    if (openRowActionMenuIndex === index) {
      setOpenRowActionMenuIndex(null);
    } else if (openRowActionMenuIndex !== null && openRowActionMenuIndex > index) {
      setOpenRowActionMenuIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    if (productsPage > totalProductPages) {
      setProductsPage(totalProductPages);
    }
  }, [productsPage, totalProductPages]);

  const openCancelProductModal = (index) => {
    setOpenRowActionMenuIndex(null);
    setProductToCancelIndex(index);
    setShowCancelProductModal(true);
  };

  const toggleRowActionMenu = (index) => {
    setOpenRowActionMenuIndex((prev) => (prev === index ? null : index));
  };

  const closeCancelProductModal = () => {
    if (cancelProductLoading) return;
    setShowCancelProductModal(false);
    setProductToCancelIndex(null);
  };

  const showCancelSuccessToast = (message) => {
    setCancelToast({ show: true, message });
    window.setTimeout(() => {
      setCancelToast({ show: false, message: "" });
    }, 2800);
  };

  const confirmCancelProduct = async () => {
    if (productToCancelIndex === null) {
      return;
    }

    const product = addedProducts[productToCancelIndex];
    if (!product) {
      closeCancelProductModal();
      return;
    }

    setCancelProductLoading(true);
    let cancelSucceeded = false;
    try {
      const response = await fetch("http://localhost:8000/app/cancelled-draft-products/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_name: product.product_name,
          quantity: product.quantity,
          deadline: formData.deadline,
          cancellation_reason: "Cancelled before issuance",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || data.error || "Failed to cancel product");
      }

      removeProduct(productToCancelIndex);
      cancelSucceeded = true;
      setCreateRequestMessage("");
      showCancelSuccessToast(`Cancelled \"${product.product_name}\" and moved it to Cancelled Orders`);
      window.dispatchEvent(new Event("refreshNotifications"));
      window.dispatchEvent(new Event("requestCancelled"));
    } catch (err) {
      console.error("Error cancelling draft product:", err);
      setCreateRequestMessage(`✗ ${err.message}`);
    } finally {
      setCancelProductLoading(false);
      if (cancelSucceeded) {
        setShowCancelProductModal(false);
        setProductToCancelIndex(null);
      }
    }
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

    if (!formData.deadline) {
      setCreateRequestMessage("⚠️ Please set one shared deadline for this order");
      return;
    }

    const invalidProducts = addedProducts.filter(
      (p) => !p.quantity || p.quantity < 1 || p.quantity > MAX_PRODUCT_QUANTITY
    );
    if (invalidProducts.length > 0) {
      setCreateRequestMessage(`⚠️ Quantities must be between 1 and ${MAX_PRODUCT_QUANTITY.toLocaleString()}`);
      return;
    }

    const requiredLeadDays = getRequiredLeadDays();
    const minimumDeadline = getMinimumDate(requiredLeadDays);
    const selectedDeadline = new Date(formData.deadline);
    selectedDeadline.setHours(0, 0, 0, 0);
    if (selectedDeadline < minimumDeadline) {
      setCreateRequestMessage(
        `⚠️ Deadline is too early for this order size. Minimum date is ${formatDateToString(minimumDeadline)} (${requiredLeadDays} day lead time).`
      );
      return;
    }

    setCreateRequestLoading(true);
    try {
      const submissionProducts = addedProducts.map(product => ({
        product: product.product,
        quantity: product.quantity,
        deadline_extension: formData.deadline,
      }));

      const requestPayload = {
        requester_id: parseInt(formData.requester_id),
        products: submissionProducts,
        deadline: formData.deadline,
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
        window.dispatchEvent(new Event("refreshNotifications"));
        setFormData({ product: "", quantity: "", deadline: "", requester_id: "" });
        setAddedProducts([]);
        setProductsPage(1);
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

      if (!event.target.closest(".product-row-action-menu")) {
        setOpenRowActionMenuIndex(null);
      }
    };

    if (showProductDropdown || showCustomerDropdown || showDeadlineCalendar || openRowActionMenuIndex !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProductDropdown, showCustomerDropdown, showDeadlineCalendar, openRowActionMenuIndex]);

  const adminFormTheme = {
    panelBackground: "linear-gradient(145deg, #edf7ff 0%, #dff0ff 52%, #d2e9ff 100%)",
    panelBorder: "2px solid rgba(87, 168, 249, 0.8)",
    panelOutline: "0 0 0 4px rgba(87, 168, 249, 0.22)",
    fieldBackground: "#ffffff",
    fieldBorder: "1px solid rgba(87, 168, 249, 0.45)",
    fieldText: "#1e3a5f",
    mutedText: "#3f638a",
    accentBlue: "#1d6ab7",
    accentViolet: "#3388dd",
    accentAmber: "#fbbf24",
    panelShadow: "0 20px 46px rgba(29, 106, 183, 0.2)",
  };

  const darkFieldStyle = {
    backgroundColor: adminFormTheme.fieldBackground,
    color: adminFormTheme.fieldText,
    border: adminFormTheme.fieldBorder,
    borderRadius: "8px",
    boxShadow: "inset 0 1px 0 rgba(87, 168, 249, 0.12)",
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* Page Header */}
      <div style={{ marginBottom: "2rem" }}>
        <p style={{ color: "#64748b", marginBottom: 0, fontSize: "0.95rem" }}>
          Create product purchase orders for customers. This panel now uses the light blue system color for visual consistency.
        </p>
      </div>

      {/* CREATE PRODUCT PURCHASE ORDER FORM */}
      <div style={{
        background: adminFormTheme.panelBackground,
        borderRadius: "18px",
        boxShadow: `${adminFormTheme.panelOutline}, ${adminFormTheme.panelShadow}`,
        padding: "2.5rem",
        border: adminFormTheme.panelBorder,
        position: "relative",
        overflow: "visible"
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

        {cancelToast.show && (
          <div
            role="status"
            style={{
              position: "fixed",
              top: "20px",
              right: "24px",
              zIndex: 11000,
              minWidth: "300px",
              maxWidth: "420px",
              background: "linear-gradient(135deg, rgba(5, 150, 105, 0.98) 0%, rgba(6, 95, 70, 0.98) 100%)",
              color: "#ecfdf5",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
              boxShadow: "0 14px 30px rgba(5, 150, 105, 0.35)",
              border: "1px solid rgba(167, 243, 208, 0.4)",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <i className="bi bi-check-circle-fill"></i>
            <span>{cancelToast.message}</span>
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmitCreateRequest(); }}>
          {/* Products Section */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid transparent",
              backgroundImage: "linear-gradient(to right, #3388dd 0%, #60a5fa 100%)",
              backgroundPosition: "left bottom",
              backgroundSize: "100% 2px",
              backgroundRepeat: "no-repeat",
            }}>
              <i className="bi bi-box-seam-fill me-2" style={{ fontSize: "1.1rem", color: adminFormTheme.accentViolet }}></i>
              <h6 
                className="text-uppercase fw-700 mb-0" 
                style={{ 
                  fontSize: "0.75rem", 
                  letterSpacing: "1px", 
                  color: adminFormTheme.fieldText,
                  fontWeight: "800"
                }}
              >
                Add Products
              </h6>
            </div>
            <div className="row g-2 mb-3" style={{ overflow: "visible" }}>
              <div className="col-md-5">
                <label className="form-label fw-600 mb-2" style={{ fontSize: "0.9rem", color: adminFormTheme.mutedText }}>Product</label>
                <div style={{ position: "relative" }}>
                  <button
                    ref={dropdownButtonRef}
                    type="button"
                    className="form-control text-start d-flex justify-content-between align-items-center"
                    onClick={() => setShowProductDropdown(!showProductDropdown)}
                    style={{
                      ...darkFieldStyle,
                      color: formData.product ? adminFormTheme.fieldText : "#6b8fb4",
                      padding: "0.65rem 0.75rem",
                      cursor: "pointer",
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
                <label className="form-label fw-600 mb-2" style={{ fontSize: "0.9rem", color: adminFormTheme.mutedText }}>Quantity</label>
                <input
                  type="text"
                  inputMode="numeric"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  placeholder="0"
                  max={MAX_PRODUCT_QUANTITY}
                  className="form-control"
                  style={{
                    ...darkFieldStyle,
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
                  title={`Only whole numbers from 1 to ${MAX_PRODUCT_QUANTITY.toLocaleString()} are allowed`}
                />
              </div>

              <div className="col-md-3 d-flex align-items-end">
                <button
                  type="button"
                  className="btn w-100"
                  onClick={addProductToRequest}
                  disabled={createRequestLoading}
                  style={{
                    padding: "0.65rem",
                    fontWeight: "700",
                    fontSize: "0.9rem",
                    background: "linear-gradient(135deg, #22c55e 0%, #15803d 100%)",
                    color: "#ffffff",
                    border: "1px solid rgba(240, 255, 244, 0.9)",
                    textShadow: "0 1px 2px rgba(0, 0, 0, 0.28)",
                    boxShadow: "0 0 0 2px rgba(34, 197, 94, 0.25), 0 12px 24px rgba(21, 128, 61, 0.32)"
                  }}
                >
                  <i className="bi bi-plus-lg"></i> Add
                </button>
              </div>
            </div>

          </div>

          {/* Customer Selection */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              marginBottom: "1rem",
              paddingBottom: "0.75rem",
              borderBottom: "2px solid transparent",
              backgroundImage: "linear-gradient(to right, #38bdf8 0%, #60a5fa 100%)",
              backgroundPosition: "left bottom",
              backgroundSize: "100% 2px",
              backgroundRepeat: "no-repeat",
            }}>
              <i className="bi bi-person-fill me-2" style={{ fontSize: "1.1rem", color: adminFormTheme.accentBlue }}></i>
              <h6 
                className="text-uppercase fw-700 mb-0" 
                style={{ 
                  fontSize: "0.75rem", 
                  letterSpacing: "1px", 
                  color: adminFormTheme.fieldText,
                  fontWeight: "800"
                }}
              >
                Select Customer
              </h6>
            </div>
            <div style={{ position: "relative" }}>
              <label htmlFor="customer" className="form-label fw-600 mb-2" style={{ fontSize: "0.95rem", color: adminFormTheme.mutedText }}>
                Customer *
              </label>
              <button
                ref={customerDropdownRef}
                type="button"
                className="form-control text-start d-flex justify-content-between align-items-center"
                onClick={() => setShowCustomerDropdown(!showCustomerDropdown)}
                style={{
                  ...darkFieldStyle,
                  color: formData.requester_id ? adminFormTheme.fieldText : "#6b8fb4",
                  padding: "0.75rem 1rem",
                  cursor: "pointer",
                  border: formData.requester_id ? "1px solid rgba(125, 211, 252, 0.65)" : adminFormTheme.fieldBorder,
                  fontSize: "0.95rem",
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => !formData.requester_id && (e.currentTarget.style.borderColor = "#7db7ee")}
                onMouseLeave={(e) => !formData.requester_id && (e.currentTarget.style.borderColor = "rgba(87, 168, 249, 0.45)")}
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
                        backgroundColor: formData.requester_id == c.id ? "rgba(87, 168, 249, 0.2)" : "#ffffff",
                        color: "#1e3a5f",
                        borderBottom: "1px solid rgba(125, 165, 205, 0.22)"
                      }}
                    >
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontSize: "0.95rem", fontWeight: "600" }}>{c.full_name}</div>
                        <small style={{ color: "#5d7ea5" }}>{c.username} • {c.company_name}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Products Added */}
          {addedProducts.length > 0 && (
            <div style={{ 
              marginBottom: "1.5rem", 
              padding: "1.5rem", 
              background: "linear-gradient(135deg, #e9f5ff 0%, #d7ebff 100%)",
              borderRadius: "14px", 
              border: "1px solid rgba(87, 168, 249, 0.3)",
              boxShadow: "0 10px 24px rgba(29, 106, 183, 0.14)"
            }}>
              <h6 style={{ 
                fontSize: "0.85rem", 
                fontWeight: "700", 
                color: "#1d6ab7",
                marginBottom: "1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem"
              }}>
                <i className="bi bi-list-check"></i>
                Products Added
                <span className="badge bg-gradient" style={{
                  background: "linear-gradient(135deg, #3388dd 0%, #57a8f9 100%)",
                  marginLeft: "auto"
                }}>{addedProducts.length}</span>
              </h6>
              <div style={{ width: "100%" }}>
                <table
                  className="table table-sm mb-0"
                  style={{
                    fontSize: "0.9rem",
                    color: "#1e3a5f",
                    backgroundColor: "transparent",
                    borderCollapse: "separate",
                    borderSpacing: 0,
                    "--bs-table-bg": "transparent",
                    "--bs-table-accent-bg": "transparent",
                    "--bs-table-striped-bg": "rgba(224, 238, 255, 0.6)",
                    "--bs-table-hover-bg": "rgba(125, 211, 252, 0.28)",
                    "--bs-table-hover-color": "#1e3a5f",
                  }}
                >
                  <thead style={{ backgroundColor: "rgba(51, 136, 221, 0.12)", borderBottom: "2px solid rgba(51, 136, 221, 0.22)" }}>
                    <tr>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1d6ab7", paddingTop: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(125, 165, 205, 0.28)", backgroundColor: "transparent" }}>Product</th>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1d6ab7", width: "80px", paddingTop: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(125, 165, 205, 0.28)", backgroundColor: "transparent" }}>Qty</th>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1d6ab7", width: "120px", paddingTop: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(125, 165, 205, 0.28)", backgroundColor: "transparent" }}>Deadline</th>
                      <th style={{ fontSize: "0.85rem", fontWeight: "700", color: "#1d6ab7", textAlign: "center", width: "130px", paddingTop: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(125, 165, 205, 0.28)", backgroundColor: "transparent" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAddedProducts.map((product, pageIndex) => {
                      const index = (productsPage - 1) * PRODUCTS_PER_PAGE + pageIndex;
                      return (
                      <tr key={`${product.product}-${index}`} style={{ backgroundColor: "rgba(255, 255, 255, 0.7)" }}>
                        <td style={{ fontSize: "0.9rem", padding: "0.5rem", color: "#1e3a5f", borderBottom: "1px solid rgba(125, 165, 205, 0.18)", backgroundColor: "transparent" }}>{product.product_name}</td>
                        <td style={{ padding: "0.5rem", borderBottom: "1px solid rgba(125, 165, 205, 0.18)", backgroundColor: "transparent" }}>
                          {editingProductIndex === index ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={editingQuantityValue}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === "" || /^\d+$/.test(value)) {
                                  setEditingQuantityValue(value);
                                }
                              }}
                              onKeyPress={(e) => {
                                if (!/[0-9]/.test(e.key)) {
                                  e.preventDefault();
                                }
                              }}
                              style={{
                                ...darkFieldStyle,
                                width: "84px",
                                padding: "0.3rem 0.45rem",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                color: "#1d6ab7",
                              }}
                              title={`Only whole numbers from 1 to ${MAX_PRODUCT_QUANTITY.toLocaleString()} are allowed`}
                            />
                          ) : (
                            <span
                              style={{
                                display: "inline-flex",
                                minWidth: "56px",
                                justifyContent: "center",
                                alignItems: "center",
                                padding: "0.3rem 0.5rem",
                                borderRadius: "8px",
                                backgroundColor: "#e7f2ff",
                                color: "#1d6ab7",
                                fontSize: "0.85rem",
                                fontWeight: "600",
                                border: "1px solid rgba(87, 168, 249, 0.35)",
                              }}
                            >
                              {product.quantity}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "0.5rem", borderBottom: "1px solid rgba(125, 165, 205, 0.18)", backgroundColor: "transparent" }}>
                          <small style={{ color: "#4f6f92" }}>{formatDateToString(formData.deadline)}</small>
                        </td>
                        <td style={{ textAlign: "center", padding: "0.5rem", borderBottom: "1px solid rgba(125, 165, 205, 0.18)", backgroundColor: "transparent" }}>
                          {editingProductIndex === index ? (
                            <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={saveEditedProductQuantity}
                                disabled={createRequestLoading || cancelProductLoading}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#22c55e",
                                  fontSize: "0.8rem",
                                  fontWeight: "700",
                                  padding: "0.25rem 0.3rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  cursor: createRequestLoading || cancelProductLoading ? "not-allowed" : "pointer",
                                  opacity: createRequestLoading || cancelProductLoading ? 0.55 : 1,
                                }}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={cancelEditProductQuantity}
                                disabled={createRequestLoading || cancelProductLoading}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#94a3b8",
                                  fontSize: "0.8rem",
                                  fontWeight: "700",
                                  padding: "0.25rem 0.3rem",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                  cursor: createRequestLoading || cancelProductLoading ? "not-allowed" : "pointer",
                                  opacity: createRequestLoading || cancelProductLoading ? 0.55 : 1,
                                }}
                              >
                                Undo
                              </button>
                            </div>
                          ) : (
                            <div className="product-row-action-menu" style={{ position: "relative", display: "inline-block" }}>
                              <button
                                type="button"
                                onClick={() => toggleRowActionMenu(index)}
                                disabled={createRequestLoading || cancelProductLoading}
                                style={{
                                  background: "transparent",
                                  border: "none",
                                  color: "#60a5fa",
                                  fontSize: "1rem",
                                  fontWeight: "700",
                                  padding: "0.2rem 0.35rem",
                                  lineHeight: 1,
                                  cursor: createRequestLoading || cancelProductLoading ? "not-allowed" : "pointer",
                                  opacity: createRequestLoading || cancelProductLoading ? 0.55 : 1,
                                }}
                                title="More actions"
                              >
                                <i className="bi bi-three-dots-vertical"></i>
                              </button>

                              {openRowActionMenuIndex === index && (
                                <div
                                  style={{
                                    position: "absolute",
                                    top: "110%",
                                    right: 0,
                                    minWidth: "150px",
                                    backgroundColor: "#ffffff",
                                    border: "1px solid rgba(87, 168, 249, 0.35)",
                                    borderRadius: "8px",
                                    boxShadow: "0 10px 24px rgba(29, 106, 183, 0.18)",
                                    zIndex: 30,
                                    overflow: "hidden",
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => startEditProductQuantity(index)}
                                    style={{
                                      width: "100%",
                                      textAlign: "left",
                                      background: "transparent",
                                      border: "none",
                                      padding: "0.5rem 0.65rem",
                                      fontSize: "0.8rem",
                                      color: "#1d6ab7",
                                      fontWeight: 600,
                                    }}
                                  >
                                    Edit Quantity
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openCancelProductModal(index)}
                                    style={{
                                      width: "100%",
                                      textAlign: "left",
                                      background: "transparent",
                                      border: "none",
                                      padding: "0.5rem 0.65rem",
                                      fontSize: "0.8rem",
                                      color: "#ef4444",
                                      fontWeight: 600,
                                      borderTop: "1px solid rgba(87, 168, 249, 0.18)",
                                    }}
                                  >
                                    Cancel Product
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                    })}
                  </tbody>
                </table>

                {totalProductPages > 1 && (
                  <div style={{
                    marginTop: "0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                  }}>
                    <small style={{ color: "#4f6f92", fontSize: "0.8rem" }}>
                      Showing {(productsPage - 1) * PRODUCTS_PER_PAGE + 1} to {Math.min(productsPage * PRODUCTS_PER_PAGE, addedProducts.length)} of {addedProducts.length} products
                    </small>

                    <div style={{ display: "inline-flex", gap: "0.35rem", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={() => setProductsPage((prev) => Math.max(1, prev - 1))}
                        disabled={productsPage === 1}
                        style={{
                          ...darkFieldStyle,
                          padding: "0.25rem 0.55rem",
                          fontSize: "0.78rem",
                          color: productsPage === 1 ? "#94a3b8" : "#1d6ab7",
                          cursor: productsPage === 1 ? "not-allowed" : "pointer",
                          opacity: productsPage === 1 ? 0.6 : 1,
                        }}
                      >
                        Prev
                      </button>

                      {Array.from({ length: totalProductPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={`page-${page}`}
                          type="button"
                          onClick={() => setProductsPage(page)}
                          style={{
                            ...darkFieldStyle,
                            minWidth: "30px",
                            padding: "0.25rem 0.45rem",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            color: page === productsPage ? "#ffffff" : "#1d6ab7",
                            background: page === productsPage
                              ? "linear-gradient(135deg, #3388dd 0%, #57a8f9 100%)"
                              : "#ffffff",
                            border: page === productsPage ? "1px solid #3388dd" : adminFormTheme.fieldBorder,
                          }}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setProductsPage((prev) => Math.min(totalProductPages, prev + 1))}
                        disabled={productsPage === totalProductPages}
                        style={{
                          ...darkFieldStyle,
                          padding: "0.25rem 0.55rem",
                          fontSize: "0.78rem",
                          color: productsPage === totalProductPages ? "#94a3b8" : "#1d6ab7",
                          cursor: productsPage === totalProductPages ? "not-allowed" : "pointer",
                          opacity: productsPage === totalProductPages ? 0.6 : 1,
                        }}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mark Products Complete Section */}
          {addedProducts.length > 0 && !productsCompleted && (
            <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
              <button
                type="button"
                className="btn"
                onClick={openCompleteProductsModal}
                disabled={createRequestLoading}
                style={{
                  padding: "0.85rem 2rem",
                  fontWeight: "700",
                  fontSize: "0.95rem",
                  background: "linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  boxShadow: "0 12px 30px rgba(6, 182, 212, 0.3)",
                  transition: "all 0.3s ease",
                  cursor: createRequestLoading ? "not-allowed" : "pointer",
                  opacity: createRequestLoading ? 0.6 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!createRequestLoading) {
                    e.currentTarget.style.boxShadow = "0 16px 40px rgba(6, 182, 212, 0.4)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 12px 30px rgba(6, 182, 212, 0.3)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <i className="bi bi-check-circle me-2"></i>Mark Products Complete & Set Deadline
              </button>
            </div>
          )}

          {/* Deadline Section - Shows after products completed */}
          {productsCompleted && (
            <div style={{ marginBottom: "0.3rem" }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "0.2rem",
                paddingBottom: "0.2rem",
                borderBottom: "2px solid transparent",
                backgroundImage: "linear-gradient(to right, #38bdf8 0%, #60a5fa 100%)",
                backgroundPosition: "left bottom",
                backgroundSize: "100% 2px",
                backgroundRepeat: "no-repeat",
              }}>
                <i className="bi bi-calendar-event me-2" style={{ fontSize: "0.9rem", color: adminFormTheme.accentBlue }}></i>
                <h6 
                  className="text-uppercase fw-700 mb-0" 
                  style={{ 
                    fontSize: "0.8rem", 
                    letterSpacing: "0.6px", 
                    color: adminFormTheme.fieldText,
                    fontWeight: "700"
                  }}
                >
                  Set Deadline
                </h6>
              </div>
              <p style={{ color: "#64748b", marginBottom: "0.2rem", fontSize: "0.75rem" }}>
                Pick deadline for all products.
              </p>
              <div className="calendar-container" ref={calendarRef}>
                <button
                  type="button"
                  className="form-control date-input-btn"
                  onClick={() => {
                    if (deadlineLocked) {
                      setCreateRequestMessage("⚠️ Deadline is locked. Clear Form to choose a different date.");
                      return;
                    }
                    setShowDeadlineCalendar(!showDeadlineCalendar);
                  }}
                  style={{
                    ...darkFieldStyle,
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: "0.25rem 0.4rem",
                    fontSize: "0.75rem",
                    color: formData.deadline ? adminFormTheme.fieldText : "#6b8fb4",
                    cursor: deadlineLocked ? "not-allowed" : "pointer",
                    opacity: deadlineLocked ? 0.85 : 1,
                  }}
                >
                  <span>{formData.deadline ? formatDateToString(formData.deadline) : 'Select date'}</span>
                  <i className={`bi ${deadlineLocked ? "bi-lock-fill" : "bi-calendar3"}`}></i>
                </button>
                {showDeadlineCalendar && !deadlineLocked && (
                  <div className="calendar-popup">
                    <Calendar
                      value={formData.deadline ? new Date(formData.deadline) : null}
                      onChange={(date) => {
                        const newDeadline = formatDateToString(date);
                        setPendingDeadlineValue(newDeadline);
                        setShowDeadlineWarningModal(true);
                        setShowDeadlineCalendar(false);
                      }}
                      minDate={getMinimumDate(getRequiredLeadDays())}
                      tileDisabled={({ date }) => date < getMinimumDate(getRequiredLeadDays())}
                      className="custom-calendar"
                    />
                  </div>
                )}
              </div>
              <small style={{ color: "#5d7ea5", fontSize: "0.6rem", display: "block", marginTop: "0.05rem" }}>
                Min: {formatDateToString(getMinimumDate(getRequiredLeadDays()))}.
              </small>
              {deadlineLocked && (
                <small style={{ color: "#1d6ab7", fontSize: "0.6rem", display: "block", marginTop: "0.05rem", fontWeight: 700 }}>
                  ✓ Locked
                </small>
              )}
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
                setDeadlineLocked(false);
                setProductsCompleted(false);
                setPendingDeadlineValue("");
                setShowDeadlineWarningModal(false);
                setCreateRequestMessage("");
              }}
              disabled={createRequestLoading}
              style={{
                padding: "0.75rem 1.75rem",
                fontWeight: "700",
                fontSize: "0.95rem",
                border: "1px solid rgba(87, 168, 249, 0.42)",
                color: "#1d6ab7",
                backgroundColor: "#eaf3ff",
                borderRadius: "8px",
                transition: "all 0.3s ease",
                cursor: createRequestLoading ? "not-allowed" : "pointer",
                opacity: createRequestLoading ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!createRequestLoading) {
                  e.currentTarget.style.backgroundColor = "#dbeeff";
                  e.currentTarget.style.borderColor = "rgba(87, 168, 249, 0.62)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#eaf3ff";
                e.currentTarget.style.borderColor = "rgba(87, 168, 249, 0.42)";
              }}
            >
              <i className="bi bi-arrow-counterclockwise me-1"></i> Clear Form
            </button>
            <button
              type="submit"
              disabled={createRequestLoading || addedProducts.length === 0 || !formData.requester_id || !formData.deadline || !productsCompleted}
              style={{
                padding: "0.75rem 2.5rem",
                background: createRequestLoading || addedProducts.length === 0 || !formData.requester_id || !formData.deadline || !productsCompleted
                  ? "linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)" 
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontWeight: "700",
                cursor: createRequestLoading || addedProducts.length === 0 || !formData.requester_id || !formData.deadline || !productsCompleted ? "not-allowed" : "pointer",
                fontSize: "0.95rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                boxShadow: createRequestLoading || addedProducts.length === 0 || !formData.requester_id || !formData.deadline || !productsCompleted
                  ? "none" 
                  : "0 6px 20px rgba(16, 185, 129, 0.3)",
                transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                opacity: createRequestLoading || addedProducts.length === 0 || !formData.requester_id || !formData.deadline || !productsCompleted ? 0.7 : 1,
              }}
              onMouseEnter={(e) => {
                if (!(createRequestLoading || addedProducts.length === 0 || !formData.requester_id || !formData.deadline || !productsCompleted)) {
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

      {showCancelProductModal && productToCancelIndex !== null && addedProducts[productToCancelIndex] && (
        <div
          onClick={closeCancelProductModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2, 6, 23, 0.66)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 430px)",
              background: "linear-gradient(145deg, #0f172a 0%, #1e293b 100%)",
              color: "#f8fafc",
              borderRadius: "16px",
              border: "1px solid rgba(248, 113, 113, 0.2)",
              boxShadow: "0 24px 48px rgba(2, 6, 23, 0.4)",
              padding: "1.5rem",
            }}
          >
            <div style={{ marginBottom: "1rem" }}>
              <div style={{ color: "#fda4af", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                Confirm Cancellation
              </div>
              <h4 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800 }}>
                Move this product to Cancelled Orders?
              </h4>
            </div>
            <p style={{ margin: "0 0 0.9rem", color: "#cbd5e1", lineHeight: 1.6 }}>
              {addedProducts[productToCancelIndex].product_name} will be removed from Products Added and stored in Cancelled Orders without an issuance number.
            </p>
            <div style={{
              marginBottom: "1.25rem",
              padding: "0.95rem 1rem",
              borderRadius: "12px",
              background: "rgba(15, 23, 42, 0.68)",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              display: "grid",
              gap: "0.35rem",
            }}>
              <span style={{ color: "#e2e8f0", fontWeight: 600 }}>Product: {addedProducts[productToCancelIndex].product_name}</span>
              <span style={{ color: "#cbd5e1" }}>Quantity: {addedProducts[productToCancelIndex].quantity}</span>
              <span style={{ color: "#cbd5e1" }}>Deadline: {formatDateToString(formData.deadline)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={closeCancelProductModal}
                disabled={cancelProductLoading}
                style={{
                  border: "1px solid rgba(148, 163, 184, 0.35)",
                  background: "transparent",
                  color: "#e2e8f0",
                  padding: "0.65rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 600,
                  cursor: cancelProductLoading ? "not-allowed" : "pointer",
                }}
              >
                No
              </button>
              <button
                type="button"
                onClick={confirmCancelProduct}
                disabled={cancelProductLoading}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)",
                  color: "#fff",
                  padding: "0.65rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  boxShadow: "0 12px 24px rgba(185, 28, 28, 0.28)",
                  cursor: cancelProductLoading ? "not-allowed" : "pointer",
                  opacity: cancelProductLoading ? 0.7 : 1,
                }}
              >
                {cancelProductLoading ? "Cancelling..." : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteProductsModal && addedProducts.length > 0 && (
        <div
          onClick={closeCompleteProductsModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(29, 106, 183, 0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 480px)",
              background: "linear-gradient(145deg, #eef7ff 0%, #dceeff 100%)",
              color: "#1e3a5f",
              borderRadius: "16px",
              border: "1px solid rgba(87, 168, 249, 0.42)",
              boxShadow: "0 24px 48px rgba(29, 106, 183, 0.24)",
              padding: "1.5rem",
            }}
          >
            <div style={{ marginBottom: "0.9rem" }}>
              <div style={{ color: "#1d6ab7", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                Confirm Products Ready
              </div>
              <h4 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800 }}>
                Are these products complete?
              </h4>
            </div>

            <p style={{ margin: "0 0 1rem", color: "#3f638a", lineHeight: 1.6 }}>
              You're about to set the shared deadline for this purchase order. Once confirmed, you'll proceed to select a deadline for all {addedProducts.length} product(s).
            </p>

            <div style={{
              marginBottom: "1.2rem",
              padding: "1rem",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.72)",
              border: "1px solid rgba(87, 168, 249, 0.25)",
            }}>
              <div style={{ display: "grid", gap: "0.5rem", fontSize: "0.9rem" }}>
                <span style={{ color: "#1e3a5f", fontWeight: 600 }}>📦 {addedProducts.length} Product{addedProducts.length !== 1 ? 's' : ''} Added</span>
                <span style={{ color: "#4f6f92" }}>Total Quantity: {addedProducts.reduce((sum, p) => sum + p.quantity, 0).toLocaleString()}</span>
                <span style={{ color: "#4f6f92" }}>Min. Lead Time Required: {getRequiredLeadDays()} days</span>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={closeCompleteProductsModal}
                style={{
                  border: "1px solid rgba(87, 168, 249, 0.38)",
                  background: "#f8fbff",
                  color: "#1e3a5f",
                  padding: "0.65rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={proceedToDeadlineSelection}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg, #1d6ab7 0%, #3388dd 100%)",
                  color: "#fff",
                  padding: "0.65rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  boxShadow: "0 12px 24px rgba(29, 106, 183, 0.28)",
                  cursor: "pointer",
                }}
              >
                Yes, Proceed to Deadline
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeadlineWarningModal && (
        <div
          onClick={closeDeadlineWarningModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(29, 106, 183, 0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10001,
            backdropFilter: "blur(5px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 460px)",
              background: "linear-gradient(145deg, #eef7ff 0%, #dceeff 100%)",
              color: "#1e3a5f",
              borderRadius: "16px",
              border: "1px solid rgba(87, 168, 249, 0.42)",
              boxShadow: "0 24px 48px rgba(29, 106, 183, 0.24)",
              padding: "1.5rem",
            }}
          >
            <div style={{ marginBottom: "0.9rem" }}>
              <div style={{ color: "#1d6ab7", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
                Confirm Shared Deadline
              </div>
              <h4 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800 }}>
                Set this deadline one time?
              </h4>
            </div>

            <p style={{ margin: "0 0 0.9rem", color: "#3f638a", lineHeight: 1.6 }}>
              This deadline applies to all products in the order and will be locked after confirmation. Add all needed products first if you expect larger quantities.
            </p>

            <div style={{
              marginBottom: "1.2rem",
              padding: "0.9rem 1rem",
              borderRadius: "12px",
              background: "rgba(255, 255, 255, 0.72)",
              border: "1px solid rgba(87, 168, 249, 0.25)",
              display: "grid",
              gap: "0.35rem",
            }}>
              <span style={{ color: "#1e3a5f", fontWeight: 600 }}>Selected deadline: {pendingDeadlineValue || "N/A"}</span>
              <span style={{ color: "#4f6f92" }}>Current minimum based on quantity: {formatDateToString(getMinimumDate(getRequiredLeadDays()))}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={closeDeadlineWarningModal}
                style={{
                  border: "1px solid rgba(87, 168, 249, 0.38)",
                  background: "#f8fbff",
                  color: "#1e3a5f",
                  padding: "0.65rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 600,
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={confirmAndLockDeadline}
                style={{
                  border: "none",
                  background: "linear-gradient(135deg, #1d6ab7 0%, #3388dd 100%)",
                  color: "#fff",
                  padding: "0.65rem 1rem",
                  borderRadius: "10px",
                  fontWeight: 700,
                  boxShadow: "0 12px 24px rgba(29, 106, 183, 0.28)",
                }}
              >
                Confirm and Lock
              </button>
            </div>
          </div>
        </div>
      )}

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