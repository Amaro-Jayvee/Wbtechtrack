import React, { useEffect, useState } from "react";
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
  const [loginBackgroundUrl, setLoginBackgroundUrl] = useState("");
  const navigate = useNavigate();
  const { refreshUserData, userData } = useUser();

  useEffect(() => {
    const fetchLoginBackground = async () => {
      try {
        const response = await fetch("http://localhost:8000/app/public/login-background/");
        if (!response.ok) {
          return;
        }

        const data = await response.json();
        if (data.login_background_image_url) {
          setLoginBackgroundUrl(data.login_background_image_url);
        }
      } catch (error) {
        console.warn("Unable to load login background image:", error);
      }
    };

    fetchLoginBackground();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(""); // Clear previous message
    
    try {
      let url = "http://localhost:8000/app/login/";
      let body = { username: formData.username, password: formData.password };

      const response = await fetch(url, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const responseText = await response.text();
      
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (parseErr) {
        console.error("❌ JSON parse error:", parseErr);
        data = { detail: "Invalid server response", raw: responseText };
      }
      
      if (!response.ok) {
        const errorMsg = data.detail || data.error || JSON.stringify(data) || "Unknown error";
        setMessage(`❌ ${errorMsg}`);
        return;
      }

      // Success - show loading screen and redirect
      setIsLoading(true);
      
      // Refresh user data in context
      await refreshUserData();
      
      // Determine redirect based on user role
      let redirectPath = "/request"; // Default for customers and managers
      if (data.role === "admin" || data.role === "production_manager") {
        redirectPath = "/dashboard";
      }
      
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
            <h2 className="loading-text">Welcome {userData.username ? `${userData.username}` : '!'}!</h2>
            <p className="loading-subtext">Preparing your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Login/Register Step
  return (
    <div className="login-page-wrapper">
      <div
        className="login-hero"
        style={loginBackgroundUrl ? { backgroundImage: `url('${loginBackgroundUrl}')` } : undefined}
      >
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
                <h2 className="login-form-title">Login to your account</h2>
                
                <div>
                  <label className="login-label">USERNAME</label>
                  <input
                    type="text"
                    name="username"
                    className="login-input"
                    placeholder="Username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={false}
                  />
                </div>

                <div>
                  <label className="login-label">PASSWORD</label>
                  <input
                    type="password"
                    name="password"
                    className="login-input"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={false}
                  />
                </div>

                <hr className="my-separator" />

                <div className="text-center">
                  <a href="http://localhost:8000/app/reset_password/" className="forgot-password">
                    Forgot password?
                  </a>
                </div>

                {message && (
                  <div className={`alert ${message.includes("error") ? "alert-danger" : "alert-success"}`} role="alert">
                    {message}
                  </div>
                )}

                <button type="submit" className="btn btn-primary sign-in-btn">
                  Sign In
                </button>

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
      </div>{/* end login-hero */}

      {/* Footer */}
      <footer className="login-footer">
        <div className="footer-content">
          <h3 className="footer-title">WB Technologies Inc.</h3>
          <div className="footer-grid">
            <div className="footer-item">
              <span className="footer-label">Tel:</span>
              <span className="footer-text">(02) 994.9971</span>
            </div>
            <div className="footer-item">
              <span className="footer-label">Mobile:</span>
              <span className="footer-text">0922 823 7874</span>
            </div>
            <div className="footer-item">
              <span className="footer-label">Address:</span>
              <span className="footer-text">B2, L11, Greenland Bulihan Business Park</span>
            </div>
            <div className="footer-item">
              <span className="footer-label">Email:</span>
              <span className="footer-text">wbtechnologiesinc@yahoo.com / worksbellphiles@yahoo.com</span>
            </div>
          </div>

          {/* Company Vision */}
          <div className="footer-vision">
            <h4 className="footer-vision-title" style={{color: '#cc0000'}}>The Customer</h4>
            <p className="footer-vision-text">
The customer is the most important visitor in our premises.

He is not dependent on us. We are dependent on him.

He is not a distraction to our work. He is the purpose of it.

He is not outsider of our business. He is a part of it.

We are not doing him a favor serving him. He is doing us a favor by giving us opportunity to do so.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;
