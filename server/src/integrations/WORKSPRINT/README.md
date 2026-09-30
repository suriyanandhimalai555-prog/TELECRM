WORKSPRINT integration stub

This folder contains integration notes and adapter stubs for merging the WORKSPRINT attendance
and payroll features into the State CRM codebase.

What this provides now:
- Pointers to the existing WORKSPRINT backend and frontend in the workspace root: `WORKSPRINT/`
- Non-destructive landing zone for adapter code that will translate WORKSPRINT APIs/DB models
  to State CRM `state_crm_*` tables and controllers.

Next steps (options):
1. Create adapter controllers in `server/src/controllers/state/` that re-use WORKSPRINT logic
   but target `state_crm_attendance` and `state_crm_attendance_settings` tables.
2. Copy or convert the WORKSPRINT frontend components from `WORKSPRINT/frontend/src/pages/*` into
   `src/views/state-crm/` (recommend in a feature branch, and convert JSX -> TSX as needed).
3. Wire routes and permissions in `server/src/routes/state/stateRoutes.ts` and the frontend sidebar.

Notes:
- No code has been modified yet; this is a safe staging area. Tell me which of the next steps
  to take first and I will implement them in a dedicated branch/commit.
