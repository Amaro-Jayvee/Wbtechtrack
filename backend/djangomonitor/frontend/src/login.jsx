import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "./UserContext.jsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./login.css";
import SignupForm from "./SignupForm";

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshUserData } = useUser();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous message
    
    try {
      let url = "http://localhost:8000/app/login/";
      let body = { username: formData.username, password: formData.password };

      console.log("🔐 Sending login request to:", url);
      console.log("📝 Username:", formData.username);
      console.log("📝 Password length:", formData.password.length);

      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      console.log("📊 Response status:", response.status);
      console.log("📊 Content-Type:", response.headers.get('content-type'));
      
      const responseText = await response.text();
      console.log("📄 Raw response:", responseText);
      
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("❌ JSON parse error:", parseErr);
        data = { detail: "Invalid server response", raw: responseText };
      }
      
      console.log("📦 Parsed data:", data);
      
      if (!response.ok) {
        const errorMsg = data.detail || data.error || JSON.stringify(data) || "Unknown error";
        setMessage(`❌ ${errorMsg}`);
        console.error("❌ Login failed with status", response.status, ":", data);
        return;
      }

      // Success - show loading screen and redirect
      console.log("✅ Login successful!");
      setIsLoading(true);
      
      // Refresh user data in context
      console.log("🔄 Refreshing user data in context...");
      await refreshUserData();
      
      // Determine redirect based on user role
      let redirectPath = "/request"; // Default for customers and managers
      if (data.role === "admin" || data.role === "production_manager") {
        redirectPath = "/dashboard";
      }
      
      console.log("🔀 Redirecting to " + redirectPath + " (role: " + data.role + ")");
      setTimeout(() => navigate(redirectPath), 1500);
    } catch (err) {
      console.error("❌ Network error:", err);
      setMessage(`❌ Network error: ${err.message}`);
    }
  };

  const toggleAuthMode = () => {
    setIsRegister(!isRegister);
    setMessage("");
    setFormData({ username: "", password: "" });
  };

  // Loading Screen
  if (isLoading) {
    return (
      <div className="login-page-wrapper">
        <div className="loading-overlay">
          <div className="loading-content">
            <img src="/Group 1.png" alt="WB Technologies" className="loading-logo" />
            <div className="spinner-border text-primary loading-spinner" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <h2 className="loading-text">Welcome back!</h2>
            <p className="loading-subtext">Preparing your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

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
          {isRegister ? (
            <SignupForm 
              onToggleMode={toggleAuthMode}
              onSuccess={() => {
                setMessage("✅ Signup successful! Please wait for admin approval to log in.");
              }}
            />
          ) : (
            <>
              <form onSubmit={handleSubmit}>
                <div>
                  <label className="form-label">USERNAME</label>
                  <input
                    type="text"
                    name="username"
                    className="form-control"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={false}
                  />
                </div>

                <div>
                  <label className="form-label">PASSWORD</label>
                  <input
                    type="password"
                    name="password"
                    className="form-control"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={false}
                  />
                </div>

                {message && (
                  <div className={`alert ${message.includes("error") ? "alert-danger" : "alert-success"}`} role="alert">
                    {message}
                  </div>
                )}

                <button type="submit" className="btn btn-primary">
                  Sign In
                </button>

                <div className="text-center">
                  <a href="http://localhost:8000/app/reset_password/" className="forgot-password">
                    Forgot password?
                  </a>
                </div>

                <div className="text-center mt-3">
                  <p className="mb-0">
                    Don't have an account?{" "}
                    <button
                      type="button"
                      className="btn-link-simple"
                      onClick={toggleAuthMode}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#007bff",
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: 0,
                        font: "inherit"
                      }}
                    >
                      Sign up here
                    </button>
                  </p>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;
