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
      setIsLoadingUser(true);
      
      const response = await fetch("http://localhost:8000/app/whoami/", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        const newUserData = {
          username: data.username || "Unknown",
          role: data.role || "guest",
          id: data.id,
          terms_accepted: data.terms_accepted,
        };
        
        setUserData(newUserData);
      } else {
        console.warn("Failed to fetch user data");
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
