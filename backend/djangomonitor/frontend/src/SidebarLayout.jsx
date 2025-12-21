import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

// ✅ Cookie helper for CSRF
function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.startsWith(name + "=")) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function SidebarLayout({ children }) {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");

  // ✅ Fetch username from Django whoami endpoint
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("http://localhost:8000/app/whoami/", {
          method: "GET",
          credentials: "include",
        });
        const data = await response.json();
        // ✅ handle both response shapes
        if (data.username) {
          setUsername(data.username);
        }
      } catch (err) {
        console.error("Error fetching user", err);
      }
    };
    fetchUser();
  }, []);
  
  const handleLogout = async () => {
    const csrftoken = getCookie("csrftoken");
    try {
      const response = await fetch("http://localhost:8000/app/logout/", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrftoken,
        },
      });
      if (response.ok) {
        navigate("/"); // back to login
      } else {
        console.error("Logout failed");
      }
    } catch (err) {
      console.error("Error logging out", err);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <div style={{ width: "220px", background: "#2c3e50", color: "#fff", padding: "20px" }}>
        {/*Username at top left */}
        <h2>{username ? `👤 ${username}` : "Admin Panel"}</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li><Link to="/accounts" style={{ color: "#fff" }}>Accounts</Link></li>
          <li><Link to="/request" style={{ color: "#fff" }}>Request</Link></li>
          <li><Link to="/dashboard" style={{ color: "#fff" }}>Dashboard</Link></li>
        </ul>
        <button
          onClick={handleLogout}
          style={{
            marginTop: "20px",
            background: "#e74c3c",
            color: "#fff",
            border: "none",
            padding: "10px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: "20px" }}>
        {children}
      </div>
    </div>
  );
}

export default SidebarLayout;
