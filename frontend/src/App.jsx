import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./features/auth/login";
import Accounts from "./features/accounts/Accounts";
import Request from "./features/requests/Request";
import RequestList from "./features/requests/RequestList";
import TaskStatus from "./features/tasks/TaskStatus";
import CancelledRequests from "./features/cancelled-orders/CancelledRequests";
import Dashboard from "./features/dashboard/Dashboard";
import Settings from "./features/accounts/Settings";
import CustomerViewRequests from "./features/requests/CustomerViewRequests";
import CustomerSettings from "./features/accounts/CustomerSettings";
import PrintableReport from "./shared/components/PrintableReport";
import TaskStatusReport from "./features/tasks/reports/TaskStatusReport";
import CompletedTasksReport from "./features/completed-tasks/reports/CompletedTasksReport";
import CancelledOrdersReport from "./features/cancelled-orders/reports/CancelledOrdersReport";
import ResetPassword from "./features/auth/ResetPassword";
import { UserProvider } from "./shared/context/UserContext.jsx";

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
          <Route path="/task-status-report" element={<TaskStatusReport />} />
          <Route path="/completed-tasks-report" element={<CompletedTasksReport />} />
          <Route path="/cancelled-requests" element={<CancelledRequests />} />
          <Route path="/cancelled-orders-report" element={<CancelledOrdersReport />} />
          <Route path="/printable-report" element={<PrintableReport />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </UserProvider>
    </Router>
  );
}

export default App;
