import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import Accounts from "./Accounts";
import Request from "./Request";
import RequestList from "./RequestList";
import TaskStatus from "./TaskStatus";
import Dashboard from "./Dashboard";
import Settings from "./Settings";
import CustomerViewRequests from "./CustomerViewRequests";
import CustomerSettings from "./CustomerSettings";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/request" element={<Request />} />
        <Route path="/request-list" element={<RequestList />} />
        <Route path="/customer-requests" element={<CustomerViewRequests />} />
        <Route path="/customer/settings" element={<CustomerSettings />} />
        <Route path="/task-status" element={<TaskStatus />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
