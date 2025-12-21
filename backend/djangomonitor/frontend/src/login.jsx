import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Login() {
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
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isRegister
        ? "http://localhost:8000/app/register/"
        : "http://localhost:8000/app/login/";

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        setMessage(data.detail || "Something went wrong");
      } else {
        setMessage(data.detail);
        if (!isRegister) {
          navigate("/request"); // ✅ redirect after login
        }
      }
    } catch (err) {
      setMessage("Something went wrong");
    }
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto" }}>
      <h2>{isRegister ? "Register" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          required
        />
        <br />
        <input
          type="password"
          name="password"
          placeholder="Password"
          value={formData.password}
          onChange={handleChange}
          required
        />
        <br />
        {isRegister && (
          <>
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              required
            />
            <br />
            <input
              type="text"
              name="full_name"
              placeholder="Full Name"
              value={formData.full_name}
              onChange={handleChange}
              required
            />
            <br />
            <input
              type="text"
              name="company_name"
              placeholder="Company Name"
              value={formData.company_name}
              onChange={handleChange}
              required
            />
            <br />
            <input
              type="text"
              name="contact_number"
              placeholder="Contact Number"
              value={formData.contact_number}
              onChange={handleChange}
              required
            />
            <br />
          </>
        )}
        <button type="submit">{isRegister ? "Sign Up" : "Login"}</button>
      </form>

      {message && <p>{message}</p>}

      {/* ✅ Forgot password link */}
      {!isRegister && (
        <p>
          <a
            href="http://localhost:8000/app/reset_password/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "blue" }}
          >
            Forgot your password?
          </a>
        </p>
      )}

      <p>
        {isRegister ? "Already have an account?" : "New user?"}{" "}
        <button
          type="button"
          onClick={() => setIsRegister(!isRegister)}
          style={{
            background: "none",
            border: "none",
            color: "blue",
            cursor: "pointer",
          }}
        >
          {isRegister ? "Login here" : "Register here"}
        </button>
      </p>
    </div>
  );
}

export default Login;
