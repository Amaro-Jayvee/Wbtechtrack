import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./ResetPassword.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [isValidating, setIsValidating] = useState(true);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError("Invalid reset link");
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:8000/app/forgot-password/verify-token/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.detail || "Invalid or expired reset link");
          setIsValidating(false);
          return;
        }

        setIsTokenValid(true);
        setIsValidating(false);
      } catch (err) {
        console.error("Error verifying token:", err);
        setError("Network error. Please try again.");
        setIsValidating(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    // Validation
    if (!newPassword.trim()) {
      setError("New password is required");
      return;
    }

    if (!confirmPassword.trim()) {
      setError("Please confirm your password");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/app/forgot-password/reset/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setMessage("✓ Password reset successfully! Redirecting to login...");
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      console.error("Error:", err);
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  if (isValidating) {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-loading">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Validating...</span>
            </div>
            <p>Validating your reset link...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isTokenValid || error === "Invalid or expired reset link") {
    return (
      <div className="reset-password-page">
        <div className="reset-password-container">
          <div className="reset-password-error">
            <div className="error-icon">✕</div>
            <h2>Reset Link Expired</h2>
            <p>This password reset link has expired or is invalid.</p>
            <p className="text-muted">Reset links expire after 24 hours.</p>
            <button
              className="btn btn-primary mt-3"
              onClick={() => navigate("/")}
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-form-wrapper">
          <div className="reset-password-header">
            <img src="/Group 1.png" alt="WB Technologies" className="reset-password-logo" />
            <h1>Reset Your Password</h1>
            <p>Enter your new password below</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="reset-password-form-group">
              <label className="reset-password-label">New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  className="reset-password-input"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setError("");
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <small className="form-text text-muted">
                Must be at least 6 characters
              </small>
            </div>

            <div className="reset-password-form-group">
              <label className="reset-password-label">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="reset-password-input"
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
              </div>
            )}

            {message && (
              <div className="alert alert-success alert-dismissible fade show" role="alert">
                {message}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary reset-password-submit"
              disabled={isLoading}
            >
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="reset-password-footer">
            <p className="text-muted">
              <button
                type="button"
                className="btn-link-simple"
                onClick={() => navigate("/")}
              >
                Back to Login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
