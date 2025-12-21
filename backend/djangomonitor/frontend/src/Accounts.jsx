import React, { useEffect, useState } from "react";
import SidebarLayout from "./SidebarLayout";

function Accounts() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/app/users/", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch users: ${res.status}`);
        }

        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchUsers();
  }, []);

  const handleVerify = async (username) => {
    try {
      const res = await fetch("/app/verify/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username }),
      });

      const data = await res.json();
      alert(data.detail);

      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.username === username ? { ...u, is_verified: true, verified_at: data.verified_at } : u
          )
        );
      }
    } catch (err) {
      console.error("Error verifying user:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/app/users/${id}/`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== id));
      } else {
        const data = await res.json();
        alert(data.detail || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
    }
  };

  return (
    <SidebarLayout>
      <div className="accounts-page">
        <h1>Accounts</h1>
        <p>Manage user accounts here.</p>

        <table className="table-container">
          <thead>
            <tr className="table-header">
              <th className="table-cell">Username</th>
              <th className="table-cell">Status</th>
              <th className="table-cell">Verified At</th>
              <th className="table-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="table-row">
                <td className="table-cell">{u.username}</td>
                <td className="table-cell">{u.is_verified ? "Verified ✅" : "Pending"}</td>
                <td className="table-cell">{u.verified_at || "—"}</td>
                <td className="table-cell">
                  {!u.is_verified && (
                    <button onClick={() => handleVerify(u.username)} style={{ marginRight: "8px" }}>
                      Approve
                    </button>
                  )}
                  <button onClick={() => handleDelete(u.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}

export default Accounts;
