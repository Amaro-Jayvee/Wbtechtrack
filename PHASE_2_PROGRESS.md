# Phase 2: Product/Part Management Refactor - Progress Report

**Date**: February 26, 2026  
**Status**: Clarification Complete - Ready for Implementation

---

## 📋 Clarified Requirements

### Button Name & Location
- **Old**: "Add Product" (currently in Request.jsx)
- **New**: "Add Product/Part" 
- **Location**: Task Status page, right side level with filter (TaskStatus.jsx around line 218)
- **Access**: Admin-only

### Modal Form Fields  
The modal should have exactly **2 fields** (not 3 as previously thought):

1. **Part/Description Name**
   - Used by customers to request specific parts
   - Example: "Bracket-Stand"
   - Stored in: `ProductName` model (`prodName` field)

2. **Part/Process Number**  
   - Sequential process code with operation name
   - Format: `PST-01 - Withdrawal`, `PST-02 - Shearing`, etc.
   - Each code combines operation sequence + operation name
   - Example flow:
     ```
     Part: "Bracket-Stand"
     ├── PST-01 - Withdrawal
     ├── PST-02 - Shearing  
     ├── PST-03 - Bending
     └── PST-04 - Quality Check
     ```
   - Stored as: `ProcessName.name` (e.g., "PST-01 - Withdrawal")
   - Pattern: `[CODE]-[NUMBER] - [Operation]`

### Example Data Entry
When admin creates a part:
```
[Add Product/Part] button click
↓
Modal opens with form:
┌─────────────────────────────────────────────┐
│ Add Product/Part                        │ ✕ │
├─────────────────────────────────────────────┤
│ Part/Description Name:                      │
│ [Bracket-Stand_____________________]        │
│                                             │
│ Part/Process Number:                        │
│ [PST-01 - Withdrawal________________]       │
│ (or choose from dropdown of existing)       │
│                                             │
│ [Cancel] [Save Product/Part]                │
└─────────────────────────────────────────────┘
```

---

## 🔍 Current Code Structure

### Backend Models
**File**: `/backend/djangomonitor/app/models.py`

```python
class ProductName(models.Model):
    ProdID = models.AutoField(primary_key=True)
    prodName = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ProcessName(models.Model):
    ProcessID = models.AutoField(primary_key=True)
    name = models.CharField("Process Name", max_length=100, unique=True)

class ProductProcess(models.Model):
    request_product = models.ForeignKey(RequestProduct, ...)
    product = models.ForeignKey(ProductName, ...)
    workers = models.ManyToManyField(Worker, ...)  # ← WILL BE REMOVED IN PHASE 4
    process = models.ForeignKey(ProcessName, ...)
    step_order = models.PositiveIntegerField("Step Order")
    completed_quota = models.PositiveIntegerField("Completed Quota", default=0)
    defect_count = models.PositiveIntegerField("Defect Count", default=0)
    is_completed = models.BooleanField("Is Completed", default=False)
```

### Backend API Endpoints
**File**: `/backend/djangomonitor/app/urls.py`

```python
path('prodname/', productnameAPI, name='product-name-api'),
path('prodname/<int:id>/', productnameAPI, name='product-name-api-PUT-DELETE'),
path('process/', processAPI, name='process-api'),
path('process/<int:id>/', processAPI, name='process-api-PUT-DELETE'),
```

### Frontend Current Location
**File**: `/backend/djangomonitor/frontend/src/Request.jsx` (Lines ~545, 563, 668)

- Button text: "Add Product"
- Used for: Adding products to a request with quantity & deadline
- **Issue**: This is for customer requests, not for admin product management

### Frontend Target Location
**File**: `/backend/djangomonitor/frontend/src/TaskStatus.jsx` (Line ~218)

- Should add "Add Product/Part" button next to filter
- Admin-only visibility
- Modal for creating/managing parts

---

## ✅ Implementation Checklist

### 2.1: Update Button Label
- [ ] Rename all "Add Product" references to "Add Product/Part"
  - [ ] Request.jsx (if customer-facing)
  - [ ] TaskStatus.jsx (admin panel)
  - [ ] Backend validation messages

### 2.2: Relocate Button to TaskStatus  
- [ ] Add "Add Product/Part" button to TaskStatus.jsx header (next to filter)
- [ ] Update layout: Flexbox to position button on right
- [ ] Ensure proper spacing and alignment

### 2.3: Restrict to Admin Only
- [ ] Add role check in TaskStatus.jsx (show button only if `userData.role === "admin"`)
- [ ] Backend endpoint already requires admin but verify `/app/prodname/` permission

### 2.4: Simplify Modal Form
- [ ] Remove unnecessary fields (if any)
- [ ] Keep only:
  - [ ] Part/Description Name (text input)
  - [ ] Part/Process Number (text input with help text)
- [ ] Update form validation
- [ ] Add placeholder text:
  - Part Name placeholder: "e.g., Bracket-Stand"
  - Process Number placeholder: "e.g., PST-01 - Withdrawal"

### 2.5: Update Process Display
- [ ] Ensure TaskStatus displays Part/Description Name and Part/Process Number
- [ ] Verify columns show correct data from backend
- [ ] Test filtering and sorting

---

## 🔗 Related Database Models (No Changes Needed Yet)

The current `ProductName` and `ProcessName` models support the new structure:
- ✅ `ProductName.prodName` → Part/Description Name
- ✅ `ProcessName.name` → Part/Process Number

**No database migration needed** if we continue using existing models.

---

## 📝 Implementation Order

1. **Backend Preparation**
   - Verify `productnameAPI` and `processAPI` endpoints
   - Check permission decorators (admin-only)

2. **Frontend - TaskStatus.jsx**
   - Add "Add Product/Part" button to filter bar
   - Add role-based visibility (admin only)
   - Create/Link modal for part creation

3. **Frontend - Modal/Form**
   - Simplify form to 2 fields
   - Update field labels and placeholders
   - Hook to backend endpoints

4. **Testing**
   - Test admin can access Add Product/Part button
   - Test non-admin cannot see button
   - Test form submission and product creation
   - Verify displayed in product list

---

## 🚀 Next Steps

Ready to implement once you confirm:
1. ✅ Two-field form structure confirmed
2. ✅ Button location in TaskStatus.jsx confirmed  
3. ✅ Admin-only access requirement confirmed

**Proceed with implementation? [Y/N]**

