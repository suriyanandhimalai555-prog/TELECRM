Work Tracking integration stub

This folder is a staging area for merging the "work tracking" frontend/backend into the
State CRM codebase.

What this provides now:
- Pointer to the project root folder `work tracking` (note: the folder name contains a space).
- Safe place to add adapter code that maps Work Tracking attendance and work sprint features
  to the State CRM `state_crm_*` schema and controllers.

Recommended next actions:
- Create adapter controllers under `server/src/controllers/state/`.
- Convert or import frontend pages into `src/views/state-crm/` and wire new routes.
- Run backend tests and do a local build to ensure no runtime conflicts.
