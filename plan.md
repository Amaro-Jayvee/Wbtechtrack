# Process Flow Improvements Plan

## Current Problem
When admin creates a purchase order → admin starts the project → project starts with multiple products → task status table shows one row per product (spread messily across rows)

## Desired Changes
1. **One row per Issuance (Purchase Order)**: Group by `request_id` instead of `request_product_id`
2. **Products listed together**: Show all products in a single row (e.g., "Product1, Product2, Product3")
3. **Rename "Due Date" → "Deadline"**: Column header change
4. **Remove "Deadline Extension" column**: Remove from table and backend

## Implementation Plan

### Backend (models.py, serializers.py, views.py)
- Create migration to remove `deadline_extension` and `extension_status` from RequestProduct
- Update serializers: remove deadline_extension references
- Remove extension-related view endpoints
- Remove extension-related alert checking

### Frontend (TaskStatus.jsx, TaskStatusPODetailModal.jsx)
- TaskStatus.jsx:
  - Change grouping from `request_product_id` to `request_id`
  - One row per issuance with all products listed
  - Rename "Due Date" → "Deadline" 
  - Remove "Deadline Extension" column
- TaskStatusPODetailModal.jsx:
  - Update to work with issuance-based grouping
  - Remove deadline extension references