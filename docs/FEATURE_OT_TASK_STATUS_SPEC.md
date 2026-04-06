# Task Status Revision - OT (Overtime) Feature Specification

**Date**: April 5, 2026  
**Feature**: Task Status Save with Overtime (OT) Override  
**Status**: 🔄 In Planning

---

## 📋 Feature Overview

Currently, task status updates can be saved multiple times. This feature will:
- ✅ Restrict to **1 save per mode** (Regular work + OT work)
- ✅ Add OT (Overtime) checkbox for after-hours updates (after 5 PM)
- ✅ Track whether output came from regular or OT work
- ✅ Show OT badge/indicator in task status and task details
- ✅ Allow rewriting output only when marked as OT

---

## 🎯 Requirements

### 1. Save Restriction (One Save Per Mode)

**Regular Work:**
- Save output + defect count: ✅ **ALLOWED (1 time)**
- Save again same day: ❌ **BLOCKED** - "Already saved for today"
- Button state: Disabled after first save

**OT Work (After clicking "Mark as OT"):**
- Save OT output + defect count: ✅ **ALLOWED (1 time)**
- Independent of regular save (each mode has own save)
- Can only be done AFTER regular save is complete

**Example Flow:**
```
1. At 3 PM: Save output=100, defect=5 ✅ (Regular mode - SAVED)
2. At 3:30 PM: Try save output=102 ❌ (Blocked - already saved in regular mode)
3. At 5:30 PM: Check "Mark as OT" checkbox
4. At 5:30 PM: Save output=105, defect=7 ✅ (OT mode - SAVED)
5. At 5:45 PM: Try save OT output=106 ❌ (Blocked - already saved in OT mode)
```

---

### 2. OT Checkbox Visibility

- **Always available** in task status update form
- Label: "Mark as Overtime (OT)"
- Location: Below output & defect count fields
- Icon: ⏰ or similar
- Visual: Checkbox with warning color (orange/yellow)

---

### 3. Data Storage (Separate Fields)

**Database Schema Changes Needed:**

```
TaskStatus (Current):
- id
- task_id
- output (single value)
- defect_count (single value)
- updated_at
- worker_id

TaskStatus (Updated):
- id
- task_id
- output_regular (regular work output)
- defect_regular (regular work defects)
- output_ot (OT work output - nullable)
- defect_ot (OT work defects - nullable)
- is_ot_marked (boolean - true if OT was marked)
- updated_at (when regular saved)
- updated_at_ot (when OT saved - nullable)
- worker_id
```

---

### 4. Workflow & User Experience

#### Step 1: Regular Work Save (Before 5 PM)
```
Worker fills: output=100, defect=5
OT checkbox: ☐ (unchecked, greyed out or optional message)
Clicks: [SAVE STATUS] button
Result: Data saved to output_regular, defect_regular
Button state: Becomes DISABLED
Message: "✓ Status saved. Cannot update again today."
```

#### Step 2: After 5 PM - OT Option Available
```
Same task shown in task details
OT checkbox becomes PROMINENT: ☑ "Mark as Overtime"
Badge shows: "🏷️ Regular: Output=100, Defect=5"
Message: "Regular save already completed. Check OT to override with timeout work."
```

#### Step 3: Worker Checks OT Checkbox
```
OT checkbox: ☑ (checked)
UI changes:
  - Output field becomes EDITABLE again
  - Defect field becomes EDITABLE again
  - Color changes to ORANGE (OT theme)
  - New button appears: [SAVE FOR OT] (replaces or alongside SAVE)
  - Badge updates: "🏷️ Regular: 100 | ⏰ OT (Ready to save)"
Message: "You've marked this as overtime. You can now save OT data once."
```

#### Step 4: Save OT Data
```
Worker updates: output=105, defect=7
Clicks: [SAVE FOR OT] button
Result:
  - Data saved to output_ot, defect_ot
  - is_ot_marked = true
  - OT badge shows on saved task
Button state: Both buttons DISABLED
Message: "✓ OT status saved. Cannot update again."
Badge visible: "🏷️ Regular: 100 | ⏰ OT: 105"
```

---

### 5. Badge & Indicators

#### Badge Display Locations:

**1. Task Status List/Dashboard:**
```
Task #123 - Product A
Output: 100 | Defect: 5 | [Badge: ⏰ OT]
```

**2. Task Detail Modal/Page:**
```
Task Information:
  Regular Work: ✓
    - Output: 100
    - Defect: 5
    - Saved at: 3:45 PM
  
  Overtime (OT): ⏰
    - Output: 105
    - Defect: 7
    - Saved at: 5:30 PM
    - [NEW BADGE: "OT - 5:30 PM"]
```

**3. Update Form:**
```
Current Status:
  🏷️ Regular: Output 100 | Defect 5 (LOCKED)
  ⏰ OT: Output 105 | Defect 7 (LOCKED) [Check OT checkbox to edit]

[OT Checkbox] Mark as Overtime
[UPDATE output/defect fields] - Only if OT checked
[SAVE FOR OT button] - Only if OT checked
```

---

### 6. Badge Styling

**Regular Save (After First Save):**
- Color: Green ✅
- Icon: ✓
- Text: "Saved"

**OT Badge (After OT Save):**
- Color: Orange ⏰
- Icon: ⏰
- Text: "OT - 5:30 PM" (or timestamp)
- Position: Prominent, visible in list and detail views

---

### 7. Frontend Components to Modify

| Component | Changes |
|-----------|---------|
| `TaskStatusUpdateForm.jsx` (or similar) | Add OT checkbox, conditional rendering for OT fields |
| `TaskDetailModal.jsx` | Show both regular and OT data with badges |
| `TaskList.jsx` | Show OT badge in task list |
| `TaskStatus.jsx` | Display current status (regular) and OT status |
| `Request.jsx` or task card | Add OT badge indicator |

---

### 8. Backend Changes

**API Endpoint:** `PATCH /api/app/task-status/update/`

**Request Body:**
```json
{
  "task_id": 123,
  "output": 100,
  "defect_count": 5,
  "is_ot": false  // New field
}
```

**When OT=true:**
```json
{
  "task_id": 123,
  "output": 105,
  "defect_count": 7,
  "is_ot": true  // Saves to OT fields instead
}
```

**Response:**
```json
{
  "id": 1,
  "task_id": 123,
  "output_regular": 100,
  "defect_regular": 5,
  "output_ot": 105,
  "defect_ot": 7,
  "is_ot_marked": true,
  "updated_at": "2026-04-05T15:45:00Z",
  "updated_at_ot": "2026-04-05T17:30:00Z",
  "message": "OT status saved successfully"
}
```

---

### 9. Validation Rules

**Regular Save:**
- Can only save once per day
- Cannot save if already saved once
- Output must be > 0
- Defect count can be 0 or more

**OT Save:**
- Can only save after regular save is complete
- Can only save once (independent from regular)
- OT checkbox must be checked
- Output must be > 0
- Defect count can be 0 or more
- Cannot save if already saved in OT mode

**Time-Based (Optional Enhancement):**
- OT becomes more prominent/encouraged after 5 PM
- Warning: "It's after 5 PM - mark as OT if you worked overtime"

---

### 10. UI/UX Flow Diagram

```
TASK STATUS UPDATE
       ↓
   [Regular Save]
   Output: [____]
   Defect: [____]
   [SAVE] ← 1st save allowed
       ↓
   ✅ SAVED (Button disabled)
       ↓
   Later (5+ PM)...
       ↓
   [Check OT?] ☑
       ↓
   Fields become editable
   [SAVE FOR OT] button appears
       ↓
   [SAVE FOR OT] ← 1 save allowed for OT
       ↓
   ✅ OT SAVED (Both buttons disabled)
   📍 Badge: "⏰ OT" shown
```

---

### 11. Implementation Checklist

**Database:**
- [ ] Create migration for new fields (output_ot, defect_ot, is_ot_marked, updated_at_ot)
- [ ] Update TaskStatus model
- [ ] Add validation at model level

**Backend API:**
- [ ] Modify task status update endpoint to handle is_ot flag
- [ ] Add business logic to prevent duplicate saves
- [ ] Add response to include both regular and OT data
- [ ] Add timestamp tracking for OT saves

**Frontend:**
- [ ] Add OT checkbox to task status form
- [ ] Hide/show fields based on OT checkbox state
- [ ] Implement save restriction logic (disable buttons after save)
- [ ] Display badges in task list and detail views
- [ ] Add visual indicators for OT data
- [ ] Show error/message when trying to save twice

**Testing:**
- [ ] Test regular save (should allow once)
- [ ] Test duplicate regular save (should block)
- [ ] Test OT save after regular (should allow once)
- [ ] Test duplicate OT save (should block)
- [ ] Test badge display in list view
- [ ] Test badge display in detail view
- [ ] Test data persistence and retrieval

---

### 12. Edge Cases to Handle

1. **Scenario:** Worker saves at 4:59 PM, then tries OT at 5:01 PM
   - **Expected:** Both regular and OT allowed
   - **Implementation:** Time not the restriction; regular/OT mode is

2. **Scenario:** Worker saves, then tries to click "Mark as OT" before saving OT data
   - **Expected:** Allow editing but block save if button shows as disabled
   - **Implementation:** OT save button disabled until "Mark as OT" checked

3. **Scenario:** Multiple workers on same task
   - **Expected:** Each worker has independent regular/OT saves
   - **Implementation:** Track worker_id in task status

4. **Scenario:** Worker marks OT but system reloads before save
   - **Expected:** OT form data retained, can save
   - **Implementation:** Persist to localStorage temporarily

---

## 📝 Summary

| Aspect | Details |
|--------|---------|
| **Saves Allowed** | 1 Regular + 1 OT = 2 total (each mode: 1 save) |
| **OT Trigger** | Checkbox (always available, encouraged after 5 PM) |
| **Data Storage** | Separate fields (regular vs OT) |
| **Badge Location** | Task status display + Task detail view |
| **Save Button State** | Disabled after each save (regular/OT independent) |
| **Visibility** | OT badge visible to all users |
| **Reload Behavior** | Reload when OT checkbox toggled |

---

## 🚀 Next Steps

1. Discuss this spec with your team
2. Approve data model changes
3. Start backend migration
4. Design OT UI components
5. Implement and test
6. Deploy

**Estimated Effort:** 8-12 hours of development  
**Files to Modify:** 5-8 files (backend + frontend)

---

**Questions?** Let me know which part you'd like to start implementing first!
