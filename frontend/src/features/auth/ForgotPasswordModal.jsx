import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

function ForgotPasswordModal({ isOpen, onClose }) {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/app/forgot-password/request/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({ email: email.toLowerCase() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Failed to process request");
        setIsLoading(false);
        return;
      }

      setMessage(data.detail || "Check your email for reset link");
      setStep("verification");
      setIsLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError("Network error. Please try again.");
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep("email");
    setEmail("");
    setMessage("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 0,
    margin: 0,
  };

  const modalStyle = {
    backgroundColor: "white",
    borderRadius: "12px",
    boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15)",
    maxWidth: "450px",
    width: "90%",
    maxHeight: "85vh",
    overflowY: "auto",
    position: "relative",
    animation: "slideIn 0.3s ease-out",
  };

  const closeButtonStyle = {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    fontSize: "24px",
    cursor: "pointer",
    color: "#999",
    padding: "0 4px",
    width: "auto",
    height: "auto",
    display: "inline",
    transition: "color 0.2s",
  };

  const formStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };

  const contentStyle = {
    padding: "40px 32px",
  };

  const titleStyle = {
    fontSize: "24px",
    fontWeight: 700,
    color: "#222",
    margin: "0 0 12px 0",
    textAlign: "center",
  };

  const subtitleStyle = {
    fontSize: "14px",
    color: "#666",
    textAlign: "center",
    margin: "0 0 28px 0",
    lineHeight: "1.6",
  };

  const formGroupStyle = {
    marginBottom: "20px",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "#222",
    marginBottom: "8px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "14px",
    fontFamily: "inherit",
    boxSizing: "border-box",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };

  const submitButtonStyle = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
    marginTop: "12px",
  };

  const alertDangerStyle = {
    margin: "12px 0",
    padding: "12px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    backgroundColor: "#f8d7da",
    color: "#721c24",
    border: "1px solid #f5c6cb",
  };

  const alertSuccessStyle = {
    margin: "12px 0",
    padding: "12px 14px",
    borderRadius: "6px",
    fontSize: "13px",
    backgroundColor: "#d4edda",
    color: "#155724",
    border: "1px solid #c3e6cb",
  };

  const backButtonStyle = {
    textAlign: "center",
    marginTop: "16px",
    fontSize: "13px",
  };

  const linkStyle = {
    background: "none",
    border: "none",
    color: "#007bff",
    cursor: "pointer",
    fontSize: "14px",
    padding: "0 4px",
    textDecoration: "underline",
    transition: "color 0.2s",
  };

  const successStyle = {
    textAlign: "center",
  };

  const iconStyle = {
    width: "64px",
    height: "64px",
    backgroundColor: "#d4edda",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "36px",
    color: "#28a745",
    margin: "0 auto 20px",
  };

  const instructionsStyle = {
    fontSize: "14px",
    color: "#666",
    margin: "16px 0",
    textAlign: "center",
    lineHeight: "1.6",
  };

  const backBtnStyle = {
    width: "100%",
    padding: "12px 16px",
    backgroundColor: "#007bff",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
    marginTop: "24px",
  };

  const modalContent = (
    <>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .forgot-password-input:focus {
          border-color: #007bff !important;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1) !important;
          outline: none !important;
        }
        
        .forgot-password-input:disabled {
          background-color: #f5f5f5 !important;
          cursor: not-allowed !important;
        }
        
        .forgot-password-btn:hover:not(:disabled) {
          background-color: #0056b3 !important;
        }
        
        .forgot-password-btn:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
        }
      `}</style>
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <button style={closeButtonStyle} onClick={handleClose}>
            ✕
          </button>

        {step === "email" && (
          <div style={contentStyle}>
            <h2 style={titleStyle}>Reset Your Password</h2>
            <p style={subtitleStyle}>
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleEmailSubmit} style={formStyle}>
              <div style={formGroupStyle}>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  className="forgot-password-input"
                  style={inputStyle}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div style={alertDangerStyle}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="forgot-password-btn"
                style={submitButtonStyle}
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Reset Link"}
              </button>
            </form>

            <p style={backButtonStyle}>
              <button
                type="button"
                style={linkStyle}
                onClick={handleClose}
              >
                Back to Login
              </button>
            </p>
          </div>
        )}

        {step === "verification" && (
          <div style={contentStyle}>
            <div style={successStyle}>
              <div style={iconStyle}>✓</div>
              <h2 style={titleStyle}>Check Your Email</h2>
              <p style={subtitleStyle}>
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <p style={instructionsStyle}>
                Click the link in the email to reset your password. The link will expire in 24 hours.
              </p>

              {message && (
                <div style={alertSuccessStyle}>
                  {message}
                </div>
              )}

              <button
                style={backBtnStyle}
                className="forgot-password-btn"
                onClick={handleClose}
              >
                Back to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

export default ForgotPasswordModal;
