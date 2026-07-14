# Quick Reference - System Modules Guide

## Navigation Map

```
┌─ Dashboard
│  ├─ Overview
│  ├─ Reports
│  └─ Analytics
│
├─ Order Management
│  ├─ Purchase Order List
│  ├─ Create Purchase Order
│  └─ Cancelled Orders
│
├─ Task Management
│  ├─ Task Status
│  ├─ Task Details
│  └─ Production Timeline
│
├─ Requests
│  ├─ View Requests
│  ├─ Request Approval
│  └─ Request History
│
└─ Admin (if applicable)
   ├─ User Management
   ├─ Product Management
   └─ System Settings
```

---

## Module Quick Links

| Module | Purpose | Key Action |
|--------|---------|-----------|
| **Purchase Order List** | View all customer orders | View Full Details |
| **Create Purchase Order** | Generate new orders | Create Purchase Order |
| **Cancelled Orders** | Track cancelled POs | Reference for history |
| **Task Status** | Monitor production tasks | Update Progress |
| **Requests** | Manage all requests | Start Project |
| **Dashboard** | System overview | Generate Report |

---

## Button Actions Reference

### Common Buttons & What They Do

| Button | Location | Action |
|--------|----------|--------|
| **View Details** | Order/Request rows | Opens detailed information |
| **View Full Details** | Order list | Shows complete order data |
| **Edit** | Action columns | Allows editing entry |
| **Print Report** | Dashboard/Reports | Prints current view |
| **Create Purchase Order** | Form submit | Creates new order |
| **Start Project** | Request actions | Begins production |
| **Archive** | Request actions | Moves to archive |
| **Cancel** | Order actions | Cancels the order |

---

## Data Entry Fields

### Purchase Order Form

**Required Fields:**
- Customer (dropdown)
- Product (dropdown)
- Quantity (number)
- Deadline (date picker)

**Optional Fields:**
- Order Notes (text area)

**Deadline Rules:**
- Minimum 4 days from today
- Calendar picker enforces minimum
- Use for production planning

---

## Search & Filter Tips

### Finding Orders

**By Order ID:**
- Search: `Issuance ID No.`
- Example: Search "5" to find order #5

**By Customer:**
- Search: `Requester` or `Company Name`
- Example: Search "Honda" to find all Honda City orders

**By Date:**
- Use date range filter if available
- Default shows newest orders first

### Filtering Results

**Status Filters:**
- Pending (not started)
- In Production (active)
- Completed (finished)
- Cancelled (cancelled)

**Sort Options:**
- By Number (default)
- By Date
- By Requester
- By Company

---

## Common Workflows

### Workflow 1: Create & Track New Order

```
1. Click "Create Purchase Order"
   ↓
2. Select Customer & Product
   ↓
3. Enter Quantity & Deadline
   ↓
4. Click "Create Purchase Order"
   ↓
5. View confirmation & order ID
   ↓
6. Go to Purchase Order List
   ↓
7. Track status using "View Full Details"
```

### Workflow 2: Monitor Production Tasks

```
1. Click "Task Status"
   ↓
2. View all active tasks
   ↓
3. Click task to see details
   ↓
4. Update progress percentage
   ↓
5. Change status if needed
   ↓
6. Add notes/comments
   ↓
7. Return to list to see updates
```

### Workflow 3: Manage Cancelled Orders

```
1. Click "Cancelled Orders"
   ↓
2. View all cancelled POs
   ↓
3. Search for specific order
   ↓
4. View cancellation reason
   ↓
5. Reference for reports/history
```

---

## Data Display

### Purchase Order List Columns

| Column | Shows | Example |
|--------|-------|---------|
| Issuance ID No. | Order identifier | 5, 11, 12, 13 |
| Requester | Person requesting order | Alice Customer, Jayvee T. Amaro |
| Company Name | Customer company | Customer Company A, Honda City |
| Date Created | When order was made | 2026-04-16, 2026-05-21 |
| Action | View link | View Full Details |

---

## Status Reference

### Order Status Values

| Status | Meaning | Next Action |
|--------|---------|-------------|
| **Pending** | Not started | Wait for approval or start project |
| **In Production** | Currently being made | Monitor progress and deadline |
| **Completed** | Finished | View completion details |
| **Cancelled** | Cancelled before production | Reference for history |

### Task Status Values

| Status | Meaning |
|--------|---------|
| **Not Started** | Task pending |
| **In Progress** | Task being worked on |
| **On Hold** | Task paused |
| **Completed** | Task finished |

---

## Common Questions

**Q: How do I create a new purchase order?**
A: Click "Create Purchase Order" in the sidebar, fill in customer/product/quantity/deadline, then click Create.

**Q: What's the minimum deadline for an order?**
A: 4 business days from today. The calendar picker enforces this.

**Q: Can I cancel an order after creation?**
A: Yes. Find the order in the list, click Edit or Actions, then select Cancel Order.

**Q: How do I track order progress?**
A: Go to Purchase Order List, click "View Full Details" on your order to see status and timeline.

**Q: Where do I see cancelled orders?**
A: Click "Cancelled Orders" in the sidebar to see all cancelled purchase orders.

**Q: How do I update a task's progress?**
A: Go to Task Status, click on the task, update the progress percentage, and save.

**Q: Can I print orders or reports?**
A: Yes. Look for "Print Report" button in the dashboard or use your browser's print function.

**Q: How are orders sorted by default?**
A: By Issuance ID Number in ascending order. You can change this using the Sort dropdown.

---

## Browser Compatibility

**Supported Browsers:**
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Recommended Screen Size:**
- Desktop: 1920x1080 or larger
- Tablet: 1024x768 or larger
- Mobile: Limited functionality, use desktop for full features

---

## Keyboard Shortcuts (if applicable)

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + F` | Search within page |
| `Ctrl/Cmd + P` | Open print dialog |
| `Esc` | Close modals/dialogs |
| `Tab` | Navigate between form fields |
| `Enter` | Submit forms |

---

## Tips & Best Practices

✓ **Do:**
- Use the calendar picker for deadline selection to avoid errors
- Search by specific criteria before scrolling
- Print or download reports for record keeping
- Check notifications regularly for order updates
- Add notes when creating orders for clarity

✗ **Don't:**
- Don't use browser back button when filling forms
- Don't close browser without saving changes
- Don't share login credentials with others
- Don't use special characters in notes field
- Don't refresh page during order creation

---

## Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Customer required" | Didn't select customer | Choose customer from dropdown |
| "Invalid deadline date" | Deadline less than 4 days | Select future date (minimum 4 days) |
| "Order not found" | Order ID doesn't exist | Verify ID and search again |
| "Authentication failed" | Session expired | Log in again |
| "Access denied" | Insufficient permissions | Contact administrator |

---

## Getting Help

- **In-app Help**: Click ? icon in top-right corner
- **Documentation**: Reference the full System Modules User Guide
- **Support**: Contact system administrator
- **FAQ**: Check Knowledge Base section

---

**Version**: 1.0  
**Last Updated**: May 21, 2026
