# Work Tracking System

An enterprise-grade, role-based Work Tracking Application built with React 18, TypeScript, Express, and Tailwind CSS.

## Features

- **Role-Based Access Control (RBAC)**:
- **Managing Director**: Full system access, user management, and work approvals.
  - **Admin**: System management and team review privileges.
  - **Manager**: Review and approve/reject team daily work submissions with mandatory feedback comments.
  - **Employee**: Daily work submission, view history, edit rejected works.
- **Daily Work Entry & File Attachments**:
  - Daily work log form with Rich Text formatting (Bold, Italic, Bullet Lists, Code blocks).
  - Hours spent validation (0.5 - 24.0 hours).
  - Category / Project dropdown assignment.
  - Drag-and-drop file uploader supporting up to 5 attachments (10MB limit per file).
- **Approval Workflow**:
  - Real-time status badges (Pending: `#FBBF24`, Approved: `#10B981`, Rejected: `#EF4444`).
  - Mandatory 20+ character comments for rejections.
  - Bulk approval and bulk rejection functionality.
  - Status Timeline visualization (Submitted → Reviewed → Rejected / Resubmitted → Approved).
  - Audit Trail / Edit History viewer comparing field-level diffs.
- **Advanced Filtering & Pagination**:
  - Filter by status, category, date ranges, and title/description search.
  - Infinite scroll and incremental list loading.
- **Analytics Dashboard**:
  - KPI metric widgets (Total Hours, Pending Reviews, Approval Rate, Active Contributors).
  - Hours breakdown by Category and Department.
  - One-click JSON report export.
- **User Management**:
  - Create, update, or deactivate user accounts.
  - Role assignment and manager hierarchy mapping.

---

## Technical Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS v4, Lucide React icons
- **Backend**: Express.js server running as unified Vite development middleware
- **Authentication**: JWT with Access & Refresh tokens, bcrypt password hashing
- **State Management**: React Context (AuthContext, ToastContext, ThemeContext)
- **Database Engine**: PostgreSQL via Prisma

## Project Structure

```
frontend/             # React user interface
  src/                # Pages, components, contexts, API client, and styles
  index.html          # Frontend entry page
  vite.config.ts      # Vite and Tailwind configuration
backend/              # Express API and database layer
  server.ts           # Backend server entry point
  src/                # Routes, authentication, Prisma client, and data access
  prisma/             # Prisma schema, migrations, seed, and JSON migration
```

---

## Setup & Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Configuration**:
   Ensure `.env` exists based on `.env.example`:
   ```env
   APP_URL="http://localhost:3000"
   JWT_SECRET="work_tracker_super_secret_jwt_key_2026"
   JWT_REFRESH_SECRET="work_tracker_super_secret_refresh_key_2026"
   ```

3. **Development Mode**:
   ```bash
   npm run dev
   ```
   Access the web app at `http://localhost:3000`.

4. **Production Build & Start**:
   ```bash
   npm run build
   npm start
   ```

---

## Default Demo Credentials

- **Managing Director**: `md@company.com` / `md@1230`
- **Manager**: `manager@company.com` / `manager123`
- **Employee**: `john.doe@company.com` / `employee123`
