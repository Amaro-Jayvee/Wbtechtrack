import React, { useState } from "react";

function SignupForm({ onToggleMode, onSuccess }) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
    company_name: "",
    contact_number: "",
    role: "customer"
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.username.trim()) newErrors.username = "Username is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password) newErrors.password = "Password is required";
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    if (!formData.full_name.trim()) newErrors.full_name = "Full name is required";
    if (!formData.company_name.trim()) newErrors.company_name = "Company name is required";
    if (!formData.contact_number.trim()) newErrors.contact_number = "Contact number is required";

    // Check password strength
    if (formData.password && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      const { confirmPassword, ...signupData } = formData;
      
      const response = await fetch("http://localhost:8000/app/signup/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle validation errors
        if (typeof data === 'object') {
          const errorMessages = Object.entries(data)
            .map(([field, errors]) => {
              const errorText = Array.isArray(errors) ? errors[0] : errors;
              return errorText;
            })
            .join("; ");
          setMessage(`❌ ${errorMessages}`);
        } else {
          setMessage(`❌ ${data.detail || "Signup failed"}`);
        }
        return;
      }

      // Success
      setMessage(`✅ ${data.detail}`);
      if (onSuccess) onSuccess();
      
      // Reset form
      setFormData({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
        company_name: "",
        contact_number: "",
        role: "customer"
      });

      // Show message for a few seconds then return to login
      setTimeout(() => {
        setMessage("Redirecting to login...");
        setTimeout(() => onToggleMode(), 1000);
      }, 2000);
    } catch (err) {
      console.error("Signup error:", err);
      setMessage(`❌ Network error: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "40px", overflow: "auto", alignItems: "flex-start" }}>
      <h3 style={{
        margin: "0 0 8px 0",
        color: "#1D6AB7",
        fontWeight: "700",
        fontSize: "20px"
      }}>
        Create Your Account
      </h3>
      <p style={{
        margin: "0 0 20px 0",
        color: "#666",
        fontSize: "14px"
      }}>
        Fill in the details below to sign up
      </p>

      {message && (
        <div
          style={{
            marginBottom: "20px",
            padding: "12px 16px",
            borderRadius: "8px",
            backgroundColor: message.includes("✅") ? "#d4edda" : "#f8d7da",
            color: message.includes("✅") ? "#155724" : "#721c24",
            border: message.includes("✅") ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
            fontSize: "14px"
          }}
        >
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px", width: "100%" }}>
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1D6AB7",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                Username <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose a unique username"
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: errors.username ? "1px solid #dc3545" : "1px solid #ddd",
                  padding: "10px 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => !errors.username && (e.target.style.borderColor = "#1D6AB7")}
                onBlur={(e) => !errors.username && (e.target.style.borderColor = "#ddd")}
              />
              {errors.username && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {errors.username}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px", width: "100%" }}>
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1D6AB7",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                Email Address <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: errors.email ? "1px solid #dc3545" : "1px solid #ddd",
                  padding: "10px 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => !errors.email && (e.target.style.borderColor = "#1D6AB7")}
                onBlur={(e) => !errors.email && (e.target.style.borderColor = "#ddd")}
              />
              {errors.email && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {errors.email}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px", width: "100%" }}>
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1D6AB7",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                Password <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter a strong password (min 6 characters)"
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: errors.password ? "1px solid #dc3545" : "1px solid #ddd",
                  padding: "10px 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => !errors.password && (e.target.style.borderColor = "#1D6AB7")}
                onBlur={(e) => !errors.password && (e.target.style.borderColor = "#ddd")}
              />
              {errors.password && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {errors.password}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px", width: "100%" }}>
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1D6AB7",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                Confirm Password <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: errors.confirmPassword ? "1px solid #dc3545" : "1px solid #ddd",
                  padding: "10px 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => !errors.confirmPassword && (e.target.style.borderColor = "#1D6AB7")}
                onBlur={(e) => !errors.confirmPassword && (e.target.style.borderColor = "#ddd")}
              />
              {errors.confirmPassword && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {errors.confirmPassword}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px", width: "100%" }}>
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1D6AB7",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                Full Name <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Your full name"
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: errors.full_name ? "1px solid #dc3545" : "1px solid #ddd",
                  padding: "10px 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => !errors.full_name && (e.target.style.borderColor = "#1D6AB7")}
                onBlur={(e) => !errors.full_name && (e.target.style.borderColor = "#ddd")}
              />
              {errors.full_name && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {errors.full_name}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "20px", width: "100%" }}>
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1D6AB7",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                Company Name <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                placeholder="Your company name"
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: errors.company_name ? "1px solid #dc3545" : "1px solid #ddd",
                  padding: "10px 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => !errors.company_name && (e.target.style.borderColor = "#1D6AB7")}
                onBlur={(e) => !errors.company_name && (e.target.style.borderColor = "#ddd")}
              />
              {errors.company_name && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {errors.company_name}
                </div>
              )}
            </div>

            <div style={{ marginBottom: "24px", width: "100%" }}>
              <label style={{
                display: "block",
                fontWeight: "600",
                color: "#1D6AB7",
                marginBottom: "8px",
                fontSize: "14px"
              }}>
                Contact Number <span style={{ color: "#dc3545" }}>*</span>
              </label>
              <input
                type="tel"
                name="contact_number"
                value={formData.contact_number}
                onChange={handleChange}
                placeholder="Your contact number"
                disabled={isLoading}
                style={{
                  width: "100%",
                  borderRadius: "8px",
                  border: errors.contact_number ? "1px solid #dc3545" : "1px solid #ddd",
                  padding: "10px 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "border-color 0.3s ease"
                }}
                onFocus={(e) => !errors.contact_number && (e.target.style.borderColor = "#1D6AB7")}
                onBlur={(e) => !errors.contact_number && (e.target.style.borderColor = "#ddd")}
              />
              {errors.contact_number && (
                <div style={{ color: "#dc3545", fontSize: "12px", marginTop: "4px" }}>
                  {errors.contact_number}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <button
                type="button"
                onClick={onToggleMode}
                disabled={isLoading}
                style={{
                  flex: 1,
                  backgroundColor: "#f0f0f0",
                  color: "#333",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  opacity: isLoading ? 0.5 : 1,
                  transition: "all 0.3s ease"
                }}
                onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = "#e0e0e0")}
                onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = "#f0f0f0")}
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  flex: 1,
                  backgroundColor: isLoading ? "#a0b4d1" : "#1D6AB7",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 20px",
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: isLoading ? "not-allowed" : "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 8px rgba(29, 106, 183, 0.2)"
                }}
                onMouseEnter={(e) => !isLoading && (e.target.style.backgroundColor = "#164d8a")}
                onMouseLeave={(e) => !isLoading && (e.target.style.backgroundColor = "#1D6AB7")}
              >
                {isLoading ? (
                  <>
                    <span style={{ marginRight: "8px" }}>⏳</span>
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>

            <p style={{
              textAlign: "center",
              color: "#999",
              fontSize: "12px",
              margin: "0"
            }}>
              After signing up, your account will require admin approval before you can log in.
            </p>
      </form>
    </div>
  );
}

export default SignupForm;
