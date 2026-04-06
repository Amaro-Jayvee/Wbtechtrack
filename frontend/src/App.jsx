import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./login";
import Accounts from "./Accounts";
import Request from "./Request";
import RequestList from "./RequestList";
import TaskStatus from "./TaskStatus";
import CancelledRequests from "./CancelledRequests";
import Dashboard from "./Dashboard";
import Settings from "./Settings";
import CustomerViewRequests from "./CustomerViewRequests";
import CustomerSettings from "./CustomerSettings";
import PrintableReport from "./PrintableReport";
import ResetPassword from "./ResetPassword";
import { UserProvider } from "./UserContext.jsx";

function App() {
  return (
    <Router>
      <UserProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/request" element={<Request />} />
          <Route path="/request-list" element={<RequestList />} />
          <Route path="/customer-requests" element={<CustomerViewRequests />} />
          <Route path="/customer/settings" element={<CustomerSettings />} />
          <Route path="/task-status" element={<TaskStatus />} />
          <Route path="/cancelled-requests" element={<CancelledRequests />} />
          <Route path="/printable-report" element={<PrintableReport />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
