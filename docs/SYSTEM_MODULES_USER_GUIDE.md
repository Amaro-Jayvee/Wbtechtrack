# System Modules Guide

## Order Management Module

Under the Order Management section, you can view a comprehensive list of all customer orders. The table displays key details for each order, including the Order Number, Product Name, Quantity, Total Price, and Status (e.g., Pending or Completed). You can also access more information and manage orders through the following actions:

### Key Features

- **View Details**: Click the "View Details" link under Customer Details or Payment Details to see a full breakdown of the order and customer information.

- **Edit Status**: Click the "Edit" button in the Actions column to update the order's status, for example, from "Pending" to "Completed."

- **Print Report**: Use the Print Report feature to download or print the order list.

You can use the "Show entries" dropdown to manage how many orders are displayed per page and the "Search" bar to find specific orders quickly.

---

## Purchase Order Management Module

### Create Purchase Order

The Create Purchase Order form allows administrators to generate new purchase orders for customers. Access this feature from the main dashboard or navigation menu.

#### Form Fields

1. **Select Customer**
   - Dropdown menu populated with all available customers
   - Shows customer company name for easy identification
   - Required field

2. **Select Product**
   - Dropdown menu with all available products
   - Displays product name and specifications
   - Required field

3. **Quantity**
   - Enter the number of units for the order
   - Numeric input field
   - Required field

4. **Delivery Deadline**
   - Calendar date picker for selecting delivery date
   - Minimum 4 days from current date required
   - Required field

5. **Order Notes** (Optional)
   - Text area for additional instructions or special requirements
   - Free-form text input

#### Creating an Order

1. Select a customer from the dropdown
2. Choose the desired product
3. Enter the quantity needed
4. Select the delivery deadline using the calendar picker
5. Add any special notes in the Order Notes field
6. Click **Create Purchase Order** to submit

#### Order Confirmation

Upon successful creation, you will receive:
- Confirmation message with Request ID
- Order summary with all details
- Option to print or download the order

---

## Purchase Order List

The Purchase Order List displays all active and completed purchase orders in a structured table format.

### Table Columns

| Column | Description |
|--------|-------------|
| **Issuance ID No.** | Unique identifier for the purchase order |
| **Requester** | Name of the person who requested the order |
| **Company Name** | Customer's company name |
| **Date Created** | Date when the purchase order was created |
| **Action** | Quick link to view full order details |

### Features

- **View Full Details**: Click the "View Full Details" link to see comprehensive order information including:
  - Product specifications
  - Delivery status
  - Payment details
  - Customer information
  - Timeline of order updates

- **Search & Filter**: Use the search bar to find orders by:
  - Issuance ID
  - Requester name
  - Company name

- **Sort Options**:
  - Sort by: Number (default), Date, Requester, or Company Name
  - Order: Ascending or Descending

- **Show Entries**: Adjust how many orders display per page (10, 25, 50, or All)

---

## Cancelled Purchase Orders

The Cancelled Purchase Orders section displays all purchase orders that have been cancelled before issuance or fulfillment.

### Information Displayed

- **Order Number**: Original issuance ID of the cancelled order
- **Product Name**: Product that was on the cancelled order
- **Quantity**: Number of units ordered
- **Total Price**: Calculated total for the order
- **Cancellation Date**: Date when the order was cancelled
- **Cancellation Reason**: Explanation for why the order was cancelled
- **Status**: Shows "Cancelled" for all entries

### Viewing Cancelled Orders

1. Navigate to Cancelled Purchase Orders from the sidebar
2. Browse the list or use search to find specific cancelled orders
3. View details about why the order was cancelled
4. Reference cancelled orders for historical tracking and reporting

---

## Task & Process Management

### Task Status Tracking

The Task Status page displays all production tasks and their current progress. This is typically accessed by production managers.

#### Features

- **Task List**: View all active tasks with:
  - Task ID and name
  - Associated product
  - Assigned to (team member)
  - Current status (In Progress, Pending, Completed)
  - Progress percentage
  - Deadline

- **Filter Tasks**: Use filters to view:
  - All tasks
  - Tasks by status
  - Tasks by assigned team member
  - Tasks by product

- **Update Task Status**: Click on a task to:
  - Update progress percentage
  - Change task status
  - Add notes or comments
  - Attach files or documents

- **View Task Details**: Access detailed information including:
  - Task description
  - Product specifications
  - Production steps/processes
  - Associated purchase orders
  - Timeline and milestones

---

## Request Management

### View Requests

The Request Management section allows you to:

- **List All Requests**: View all purchase requests in your system
- **Filter by Status**: 
  - Pending approval
  - Approved
  - In production
  - Completed
  - Archived

- **Search Requests**: Find requests by:
  - Request ID
  - Customer name
  - Product name
  - Date range

### Request Actions

- **Start Project**: Initiate production for approved requests
- **Archive Request**: Move completed requests to archive
- **View Full Details**: See complete request information and history
- **Edit Request**: Modify request details (if status permits)

---

## Dashboard & Reporting

### Main Dashboard

The main dashboard provides an overview of your system's current status:

- **Active Orders**: Count and summary of pending orders
- **In Production**: Number of tasks currently in production
- **Completed This Month**: Summary of finished orders
- **Upcoming Deadlines**: List of orders nearing delivery date
- **System Alerts**: Important notifications and warnings

### Reports Available

1. **Order Report**: Complete list of all orders with filtering and sorting
2. **Production Report**: Task completion rates and timeline tracking
3. **Revenue Report**: Sales analysis and order value metrics
4. **Cancelled Orders Report**: Analysis of cancellations and reasons
5. **Delivery Performance**: On-time delivery statistics

### Generating Reports

1. Navigate to Dashboard or Reports section
2. Select the report type needed
3. Choose date range or filters
4. Click **Generate Report**
5. View, print, or download the report in PDF format

---

## User Account & Authentication

### Login

1. Navigate to the login page
2. Enter your email address
3. Enter your password
4. Click **Login**
5. Dashboard will load upon successful authentication

### User Roles & Permissions

#### Admin
- Full system access
- Create and manage purchase orders
- Approve/reject orders
- Create and edit products
- Manage user accounts
- View all reports

#### Production Manager
- View assigned tasks and orders
- Update task status and progress
- View production reports
- Cannot create new orders

#### Customer
- View their own orders
- Track order status
- Access delivery information
- Cannot view other customers' orders

### Account Settings

Access Account Settings from the user menu:
- Change password
- Update profile information
- Manage preferences
- View login history

---

## System Features Overview

### Search & Filter

Most modules include search and filtering capabilities:
- **Text Search**: Find by order/request/product name
- **Date Range**: Filter by date created or deadline
- **Status Filter**: Show only specific statuses
- **Custom Filters**: Combine multiple filter criteria

### Sorting

Data tables support sorting by:
- Column header: Click to sort ascending/descending
- Default sort orders optimized by module
- Maintains filter while changing sort

### Pagination

When viewing large lists:
- **Show entries**: Adjust results per page
- **Page navigation**: Move between pages
- **Jump to page**: Enter specific page number

### Export & Print

Most reports support:
- **Print Report**: Direct printing with formatting
- **Download PDF**: Save report as PDF file
- **Download CSV**: Export data for spreadsheet analysis

---

## Notifications & Alerts

### System Notifications

The notification bell icon shows alerts for:
- New orders received
- Tasks nearing deadline
- Order status changes
- System maintenance notices
- Approval required notifications

### Notification Settings

Configure notifications from Account Settings:
- Email notifications
- In-app notifications
- Notification frequency
- Notification types to receive

---

## Common Tasks

### How to Create a Purchase Order

1. From sidebar, click **Create Purchase Order**
2. Select customer from dropdown
3. Select product from dropdown
4. Enter quantity
5. Select delivery deadline (minimum 4 days ahead)
6. Add optional notes
7. Review order summary
8. Click **Create Purchase Order**
9. Receive confirmation with order ID

### How to View Order Details

1. Navigate to Purchase Order List or Order Management
2. Find the order in the table
3. Click **View Details** or **View Full Details**
4. Review complete order information
5. Access payment details, customer info, and timeline
6. Print or download order if needed

### How to Track a Task

1. Go to Task Status from sidebar
2. Search for task or filter by status
3. Click on task to view details
4. See current progress percentage
5. View associated production steps
6. Check deadline and assigned team member

### How to Cancel an Order

1. From Purchase Order List, select the order
2. Click **Edit** or **Actions**
3. Select **Cancel Order**
4. Enter cancellation reason
5. Confirm cancellation
6. Order moves to Cancelled Orders list

---

## Support & Help

For additional assistance:
- Contact your system administrator
- Review the FAQ section in Help menu
- Check Knowledge Base for common issues
- Email support team for technical issues

---

**Last Updated**: May 21, 2026  
**Version**: 1.0
