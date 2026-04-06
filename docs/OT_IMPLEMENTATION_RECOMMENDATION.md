# Implementation Recommendation - OT Task Status Feature

**Analysis Date**: April 5, 2026  
**Current Implementation Status**: ✅ Analyzed  
**Recommended Approach**: 🟢 **START WITH BACKEND API FIRST**

---

## 📊 Current System Overview

### Backend Architecture ✅
- **Model:** `ProductProcess` (backend/app/models.py)
- **Current Fields:**
  - `completed_quota` (output) 
  - `defect_count`
  - `quota_updated_at`, `quota_updated_by`
  - `defect_updated_at`, `defect_updated_by`
- **API Endpoint:** `PATCH /app/product/{productProcessId}/`

### Frontend Architecture ✅
- **Main Component:** `TaskDetailModal.jsx` 
- **Save Function:** `handleSave()` (line 249)
- **Current Logic:** No restriction - can save unlimited times
- **Form Fields:** `completed_quota`, `defectLogs`, `workers`

---

## 🏆 WHY START WITH BACKEND FIRST

### 1. **Foundation Dependency**
Frontend depends on backend API response → Backend must be ready first

### 2. **Data Model is Critical**
- New fields needed in database
- Need migration before any frontend changes
- Frontend can't test without the data structure

### 3. **Business Logic Protection**
- Backend validates the "one save per mode" rule
- Frontend can't be trusted (users can refresh, hack, etc.)
- Backend is the source of truth

### 4. **Faster Frontend Development**
Once backend is done → frontend is just UI changes

### 5. **Testing Earlier**
Can test API in Postman/curl while frontend is being built

---

## 📝 Implementation Plan (Step-by-Step)

### **PHASE 1: Backend (Days 1-2)**

#### Step 1: Database Migration
**File:** Create new migration file  
**Changes:**
```python
# Migration adds these fields to ProductProcess:
- output_regular (PositiveIntegerField, default=0)
- defect_regular (PositiveIntegerField, default=0)
- output_ot (PositiveIntegerField, null=True, blank=True)
- defect_ot (PositiveIntegerField, null=True, blank=True)
- is_ot_marked (BooleanField, default=False)
- updated_at_ot (DateTimeField, null=True, blank=True)
- has_saved_regular (BooleanField, default=False)
- has_saved_ot (BooleanField, default=False)

# Data migration: Migrate existing completed_quota → output_regular
```

**Command:**
```bash
python manage.py makemigrations
python manage.py migrate
```

#### Step 2: Update ProductProcess Model
**File:** `backend/djangomonitor/app/models.py`  
**Changes:**
- Add the new fields (see above)
- Add method: `can_save_regular()` - returns True if not yet saved
- Add method: `can_save_ot()` - returns True if regular saved but not OT
- Add method: `get_current_status()` - returns {"regular": {...}, "ot": {...}}

```python
class ProductProcess(models.Model):
    # ... existing fields ...
    
    # Regular work
    output_regular = models.PositiveIntegerField(default=0)
    defect_regular = models.PositiveIntegerField(default=0)
    
    # OT work
    output_ot = models.PositiveIntegerField(null=True, blank=True)
    defect_ot = models.PositiveIntegerField(null=True, blank=True)
    is_ot_marked = models.BooleanField(default=False)
    
    # Tracking
    has_saved_regular = models.BooleanField(default=False)
    has_saved_ot = models.BooleanField(default=False)
    updated_at_ot = models.DateTimeField(null=True, blank=True)
    
    def can_save_regular(self):
        return not self.has_saved_regular
    
    def can_save_ot(self):
        return self.has_saved_regular and not self.has_saved_ot
    
    def get_current_status(self):
        return {
            "regular": {
                "output": self.output_regular,
                "defect": self.defect_regular,
                "saved": self.has_saved_regular,
                "updated_at": self.quota_updated_at
            },
            "ot": {
                "output": self.output_ot,
                "defect": self.defect_ot,
                "saved": self.has_saved_ot,
                "updated_at": self.updated_at_ot
            },
            "is_ot_marked": self.is_ot_marked
        }
```

#### Step 3: Update API Endpoint
**File:** `backend/djangomonitor/app/views.py`  
**Current Endpoint:** `PATCH /app/product/{productProcessId}/`  
**Changes:**
```python
# Add save restriction logic:
def patch_product_process(request, product_id):
    # ... existing code ...
    
    is_ot = request.data.get('is_ot', False)
    
    if is_ot:
        if not product.can_save_ot():
            return JsonResponse({
                "error": "OT save already completed",
                "status": product.get_current_status()
            }, status=400)
        # Save to output_ot, defect_ot
        product.output_ot = request.data['output']
        product.defect_ot = request.data['defect_count']
        product.has_saved_ot = True
        product.updated_at_ot = timezone.now()
    else:
        if not product.can_save_regular():
            return JsonResponse({
                "error": "Regular save already completed",
                "status": product.get_current_status()
            }, status=400)
        # Save to output_regular, defect_regular
        product.output_regular = request.data['output']
        product.defect_regular = request.data['defect_count']
        product.has_saved_regular = True
    
    product.save()
    return JsonResponse({
        "message": "Saved successfully",
        "status": product.get_current_status()
    })
```

#### Step 4: Update API Response
**API Response Should Include:**
```json
{
    "id": 123,
    "task_id": "TSK-001",
    "output_regular": 100,
    "defect_regular": 5,
    "output_ot": 105,
    "defect_ot": 7,
    "is_ot_marked": true,
    "has_saved_regular": true,
    "has_saved_ot": true,
    "updated_at": "2026-04-05T15:45:00Z",
    "updated_at_ot": "2026-04-05T17:30:00Z",
    "save_status": {
        "regular_can_save": false,
        "ot_can_save": false,
        "message_regular": "Already saved for regular work",
        "message_ot": "Already saved for OT work"
    }
}
```

#### Step 5: Test Backend with Postman/curl
Test the API:
```bash
# First save (Regular)
curl -X PATCH http://localhost:8000/app/product/1/ \
  -H "Content-Type: application/json" \
  -d '{"output": 100, "defect_count": 5, "is_ot": false}'
# Expected: ✅ Saved

# Second save attempt (Regular) - should fail
curl -X PATCH http://localhost:8000/app/product/1/ \
  -H "Content-Type: application/json" \
  -d '{"output": 102, "defect_count": 6, "is_ot": false}'
# Expected: ❌ Error - already saved

# OT save (after regular)
curl -X PATCH http://localhost:8000/app/product/1/ \
  -H "Content-Type: application/json" \
  -d '{"output": 105, "defect_count": 7, "is_ot": true}'
# Expected: ✅ Saved to OT fields
```

---

### **PHASE 2: Frontend (Days 2-3)**

#### Step 1: Update TaskDetailModal Component
**File:** `frontend/src/TaskDetailModal.jsx`  
**Changes:**
- Add OT checkbox state
- Show current status (regular + OT)
- Disable save button based on backend response
- Add badge display

#### Step 2: Add OT Badge Component
**File:** Create `frontend/src/components/OTBadge.jsx`  
**Shows:**
- ⏰ OT badge when OT data exists
- Green checkmark for regular save
- Timestamp of when saved

#### Step 3: Handle Save Restrictions
**In TaskDetailModal.jsx:**
- Check `response.save_status.regular_can_save`
- If false → disable [SAVE] button
- Check `response.save_status.ot_can_save`
- If false → disable [SAVE FOR OT] button

#### Step 4: Display Status
- Show: "✓ Saved for regular work" (after regular save)
- Show: "⏰ Saved for OT work" (after OT save)
- Show: "Cannot save again" (when both saved)

---

## 👉 **YOUR NEXT STEPS**

### **TODAY (Phase 1 - Backend):**

1. **Create Database Migration**
   ```bash
   cd c:\Users\Jayvee\Documents\GitHub\TechTrack\backend\djangomonitor
   python manage.py makemigrations app --name add_ot_fields
   python manage.py migrate
   ```

2. **Update ProductProcess Model**
   - Add new fields (output_regular, defect_regular, output_ot, defect_ot, etc.)
   - Add helper methods (can_save_regular, can_save_ot, get_current_status)

3. **Update Views.py API Endpoint**
   - Add save restriction logic
   - Return new response format with save_status

4. **Test with Postman**
   - Verify migrations ran
   - Test all API scenarios

### **ONCE BACKEND IS DONE:**

5. **Update Frontend TaskDetailModal**
   - Add OT checkbox
   - Handle new API response
   - Disable buttons based on save_status

6. **Add OT Badge Component**
   - Display in task list
   - Display in task detail

7. **Test Full Flow**
   - Save regular → ✅ Locked
   - Try save again → ❌ Blocked
   - Mark OT → Fields unlock
   - Save OT → ✅ Locked again

---

## 🎯 Estimated Timeline

| Phase | Task | Time | Start |
|-------|------|------|-------|
| **1a** | Create Migration | 30 min | Now |
| **1b** | Update Model | 1 hour | After migration |
| **1c** | Update API | 1.5 hours | After model |
| **1d** | Test Backend | 1 hour | After API |
| **2a** | Update Frontend | 2 hours | After backend ✓ |
| **2b** | Add Badge Component | 1 hour | After frontend |
| **2c** | Full System Test | 1 hour | After badge |
| **TOTAL** | **Complete Feature** | **~7-8 hours** | Now → End of Day |

---

## ✅ Files to Modify (Summary)

### Backend (Essential):
1. Create new migration file (new file)
2. `backend/djangomonitor/app/models.py` (ProductProcess model)
3. `backend/djangomonitor/app/views.py` (API endpoint)

### Frontend (After Backend):
4. `frontend/src/TaskDetailModal.jsx` (main form)
5. `frontend/src/components/OTBadge.jsx` (new component)

---

## 🚀 Start Here

**Step 1:** Create the migration
**Step 2:** Run migration to test
**Step 3:** Update ProductProcess model
**Step 4:** Update API with save restrictions
**Step 5:** Test with Postman

**Then:** Frontend changes are straightforward!

---

**Ready to start Phase 1?** Should I help you create the migration file? 🎯
