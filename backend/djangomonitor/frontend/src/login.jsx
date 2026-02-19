import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./login.css";

function Login() {
  const [step, setStep] = useState("login"); // login, register
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    full_name: "",
    company_name: "",
    contact_number: "",
  });
  const [message, setMessage] = useState("");
  const [userRole, setUserRole] = useState(null); // Store role from backend
  const [showApprovalModal, setShowApprovalModal] = useState(false); // Show approval modal after signup
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let url = "http://localhost:8000/app/login/";
      let body = { username: formData.username, password: formData.password };

      if (isRegister) {
        // Use a single registration endpoint - role is determined by backend based on profile
        url = "http://localhost:8000/app/register/customer/";
        body = formData;
      }

      console.log(" Sending request to:", url);
      console.log(" Body:", { username: formData.username, password: "***" });

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      console.log("📨 Response status:", response.status);
      console.log("📨 Response headers:", {
        contentType: response.headers.get('content-type'),
        corsHeader: response.headers.get('access-control-allow-credentials')
      });
      
      const responseText = await response.text();
      console.log("📨 Raw response text:", responseText);
      
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error("❌ Failed to parse JSON:", e);
        data = { detail: "Invalid server response" };
      }
      
      console.log("📨 Parsed response data:", data);
      
      if (!response.ok) {
        const errorMsg = data.detail || JSON.stringify(data) || "Something went wrong";
        setMessage(errorMsg);
        console.error("❌ Login failed:", data);
      } else {
        setMessage(data.detail);
        console.log("✅ Login successful!");
        
        // Store role from backend response
        if (data.role) {
          setUserRole(data.role);
          console.log("✅ User role from backend:", data.role);
        }
        
        if (!isRegister) {
          // Redirect based on role returned from backend
          console.log("🔀 Redirecting based on role:", data.role);
          navigate("/request");
        } else {
          // Show approval modal after successful registration
          setShowApprovalModal(true);
        }
      }
    } catch (err) {
      console.error("❌ Network error:", err);
      setMessage("Something went wrong: " + err.message);
    }
  };

  // Login/Register Step
  return (
    <div className="login-page-wrapper">
      <div className="login-container">
        {/* Left Side - Branding */}
        <div className="login-left">
          <div className="brand-content">
            <img src="/Group 1.png" alt="WB Technologies" className="brand-logo" />
            <h1 className="brand-title">TECHNOLOGIES INC.</h1>
            <p className="brand-tagline">Track. Monitor. Optimize. All in One Place.</p>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="login-right">
          <div className="login-form-container">
          {!isRegister ? (
            <>
              {/* Login Form */}
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "15px" }}>
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    className="form-control"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                {message && (
                  <div className={`alert ${message.includes("error") ? "alert-danger" : "alert-success"}`} role="alert">
                    {message}
                  </div>
                )}

                <div className="text-center" style={{ marginBottom: "15px" }}>
                  <button type="submit" className="btn btn-primary" style={{ marginRight: "10px" }}>
                    Sign In
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={() => {
                      setIsRegister(true);
                      setMessage("");
                    }}
                  >
                    Sign Up
                  </button>
                </div>

                <div className="text-center">
                  <a href="http://localhost:8000/app/reset_password/" className="forgot-password">
                    Forgot password?
                  </a>
                </div>
              </form>
            </>
          ) : (
            <>
              {/* Register Form */}
              <form onSubmit={handleSubmit} style={{ maxHeight: "350px", overflowY: "auto" }}>
                <div style={{ marginBottom: "10px" }}>
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    name="username"
                    className="form-control"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    name="email"
                    className="form-control"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    name="full_name"
                    className="form-control"
                    placeholder="Full Name"
                    value={formData.full_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label className="form-label">Company</label>
                  <input
                    type="text"
                    name="company_name"
                    className="form-control"
                    placeholder="Company"
                    value={formData.company_name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label className="form-label">Contact</label>
                  <input
                    type="text"
                    name="contact_number"
                    className="form-control"
                    placeholder="Contact"
                    value={formData.contact_number}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>

                {message && (
                  <div className={`alert ${message.includes("error") ? "alert-danger" : "alert-success"}`} role="alert">
                    {message}
                  </div>
                )}

                <div className="d-grid gap-2 mb-3">
                  <button type="submit" className="btn btn-primary">
                    Sign Up
                  </button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    className="btn-link-text"
                    onClick={() => {
                      setIsRegister(false);
                      setMessage("");
                    }}
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="modal-backdrop-custom" onClick={() => setShowApprovalModal(false)}>
          <div className="modal-content-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title-custom">Account Registration Successful</h5>
            </div>
            <div className="modal-body-custom">
              <p>
                Your account has been created successfully!
              </p>
              <p>
                <strong>Your account is now pending admin approval.</strong>
              </p>
              <p>
                An administrator will review your application and you'll be notified once your account is approved. You can then log in with your credentials.
              </p>
            </div>
            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setShowApprovalModal(false);
                  setIsRegister(false);
                  setFormData({
                    username: "",
                    password: "",
                    email: "",
                    full_name: "",
                    company_name: "",
                    contact_number: "",
                  });
                  setMessage("");
                }}
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

export default Login;
