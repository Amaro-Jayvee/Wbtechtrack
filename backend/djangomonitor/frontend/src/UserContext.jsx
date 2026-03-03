import React, { createContext, useContext, useState, useEffect } from "react";

// Create the UserContext
const UserContext = createContext();

// Create the UserProvider component
export function UserProvider({ children }) {
  const [userData, setUserData] = useState({
    username: "",
    role: "",
    id: null,
    terms_accepted: null,
  });
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  // Function to fetch user data
  const fetchUserData = async () => {
    try {
      console.log("[UserContext] Fetching user data from /app/whoami/");
      setIsLoadingUser(true);
      
      const response = await fetch("/app/whoami/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      console.log("[UserContext] Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("[UserContext] User data received:", data);
        
        const newUserData = {
          username: data.username || "Unknown",
          role: data.role || "guest",
          id: data.id,
          terms_accepted: data.terms_accepted,
        };
        
        console.log("[UserContext] Setting user data:", newUserData);
        setUserData(newUserData);
      } else {
        console.warn("[UserContext] Failed to fetch user data with status:", response.status);
        const errorText = await response.text();
        console.warn("[UserContext] Error response:", errorText);
        // Don't set Guest here - keep waiting for user to login
      }
    } catch (err) {
      console.error("[UserContext] Error fetching user data:", err);
    } finally {
      setIsLoadingUser(false);
    }
  };

  // Fetch user data on mount
  useEffect(() => {
    fetchUserData();
  }, []);

  return (
    <UserContext.Provider value={{ userData, setUserData, isLoadingUser, refreshUserData: fetchUserData }}>
      {children}
    </UserContext.Provider>
  );
}

// Custom hook to use the UserContext
export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
