# TechTrack Implementation Plan

**Last Updated**: February 26, 2026  
**Status**: In Progress

---

## Priority Tasks (From Adviser Consultation)

### Phase 1: Authentication & Core Features
- [ ] **1.1** Restore user self-registration for account creation
- [ ] **1.2** Ensure admin account creation still works
- [ ] **1.3** Implement permission: Only Production Manager can start projects (not admin)
- [ ] **1.4** Test login/registration flow
- [ ] **1.5** Test project start permission enforcement

### Phase 2: Product/Part Management Refactor
- [ ] **2.1** Rename "Add Product" button to "Add Product/Part"
- [ ] **2.2** Move "Add Product/Part" button to task status area (right side, level with filter)
- [ ] **2.3** Restrict "Add Product/Part" to admin only
- [ ] **2.4** Update modal form fields:
  - [ ] **2.4.1** **Part/Description Name** - The part name customers choose from in requests (e.g., "Bracket-Stand")
  - [ ] **2.4.2** **Part/Process Number** - Sequential process code paired with process name (e.g., "PST-01" for "Withdrawal", "PST-02" for "Shearing", etc.)
- [ ] **2.5** Ensure process structure displays Part/Description Name and Part/Process Number correctly

### Phase 3: Customer/Request Management
- [ ] **3.1** Add "Create Request" button to customer UI
- [ ] **3.2** Create request form for customers
- [ ] **3.3** Set redirect to request list after customer creates request
- [ ] **3.4** Test customer request creation flow

### Phase 4: Worker Removal (Database & Code)
**⚠️ BREAKING CHANGE - Workers will be deleted**
- [ ] **4.1** Identify all worker-related code in backend
- [ ] **4.2** Identify all worker-related UI in frontend
- [ ] **4.3** Delete worker database records (migrate existing data if needed)
- [ ] **4.4** Remove "Assign to" field from all task forms
- [ ] **4.5** Remove worker-related models/serializers from Django
- [ ] **4.6** Remove worker components from React frontend
- [ ] **4.7** Test task creation without worker assignment

### Phase 5: Task Information Panel Enhancement
- [ ] **5.1** Remove "Assign to" field from task information
- [ ] **5.2** Add "Request Customer Name" field
- [ ] **5.3** Add "Requester Name" field
- [ ] **5.4** Highlight "Request ID" prominently in task information
- [ ] **5.5** Style Request ID for visibility (consider badge/highlight)

### Phase 6: Deadline Extension Bug Fix
- [ ] **6.1** Investigate: Why Deadline Extension copies Due Date incorrectly
- [ ] **6.2** Fix: Only copy Due Date when extension request is actually sent
- [ ] **6.3** Add test cases for deadline extension logic
- [ ] **6.4** Verify fix in testing

### Phase 7: Quota/Defects Report (New Feature)
**Separate Report Page Required**
- [ ] **7.1** Create new "Quota Report" page
- [ ] **7.2** Implement quota overage tracking (e.g., input 100 in 80-qty field)
- [ ] **7.3** Design report layout (table, filters, charts)
- [ ] **7.4** Add report data endpoint in Django
- [ ] **7.5** Add defects tracking to report
- [ ] **7.6** Test report generation and filtering

### Phase 8: Audit Log Enhancement
**Admin-Only Access**
- [ ] **8.1** Enhance audit log to record detailed user actions (not just events)
- [ ] **8.2** Add audit log entries for all major operations (create, update, delete)
- [ ] **8.3** Ensure audit log is admin-only
- [ ] **8.4** Create/improve audit log view in admin panel
- [ ] **8.5** Test audit log entries

---

## Completion Checklist

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Authentication & Core Features | 🔄 In Progress |
| Phase 2 | Product/Part Management Refactor | ⏳ Not Started |
| Phase 3 | Customer/Request Management | ⏳ Not Started |
| Phase 4 | Worker Removal | ⏳ Not Started |
| Phase 5 | Task Information Enhancement | ⏳ Not Started |
| Phase 6 | Deadline Extension Fix | ⏳ Not Started |
| Phase 7 | Quota/Defects Report | ⏳ Not Started |
| Phase 8 | Audit Log Enhancement | ⏳ Not Started |

---

## Notes
- Worker removal will require database migration
- Report page needs design/layout decision
- All changes should be tested before production deployment

