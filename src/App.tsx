import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SearchProvider } from './context/SearchContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout/Layout';
import Login from './views/auth/Login';
import Register from './views/auth/Register';
import Dashboard from './views/dashboard/Dashboard';
import Leads from './views/leads/Leads';
import Tasks from './views/tasks/Tasks';
import Notes from './views/notes/Notes';
import WhatsAppInbox from './views/whatsapp/WhatsAppInbox';
import Campaigns from './views/campaigns/Campaigns';
import Projects from './views/projects/Projects';
import Reports from './views/reports/Reports';
import CallHistory from './views/calls/CallHistory';
import Settings from './views/settings/Settings';
import Pipeline from './views/pipeline/Pipeline';
import Contacts from './views/contacts/Contacts';
import Integrations from './views/integrations/Integrations';
import Notifications from './views/notifications/Notifications';
import Workflow from './views/workflow/Workflow';
import AdminPanel from './views/admin/AdminPanel';
import Attendance from './views/attendance/Attendance';
import Landing from './views/landing/Landing';
import AdCampaigns from './views/adcampaigns/AdCampaigns';
import Reminders from './views/reminders/Reminders';
import LeadScoring from './views/leadscoring/LeadScoring';
import CustomFields from './views/customfields/CustomFields';
import RolePermissions from './views/roles/RolePermissions';
import TeamManagement from './views/team/TeamManagement';
import FieldForce from './views/fieldforce/FieldForce';
import CompaniesPage from './pages/CompaniesPage';
import UsersPage from './pages/UsersPage';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const hasToken = !!localStorage.getItem('token');
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user && !hasToken) return <Navigate to="/login" />;
  if (!user && hasToken) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return <>{children}</>;
};

const RequireRole: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!roles.map(r => r.toLowerCase()).includes(user.role?.toLowerCase())) return <Navigate to="/app" />;
  return <>{children}</>;
};

// Block master_admin from accessing a route
const BlockMasterAdmin: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (user?.role === 'master_admin') return <Navigate to="/app" />;
  return <>{children}</>;
};

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <SearchProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<Landing />} />
              <Route path="/app" element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route index element={<Dashboard />} />
                <Route path="leads" element={<BlockMasterAdmin><Leads /></BlockMasterAdmin>} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />

                {/* master_admin only */}
                <Route path="companies" element={
                  <RequireRole roles={['master_admin']}><CompaniesPage /></RequireRole>
                } />
                <Route path="users" element={
                  <RequireRole roles={['master_admin','company_admin']}><UsersPage /></RequireRole>
                } />

                {/* blocked for master_admin */}
                <Route path="tasks" element={<BlockMasterAdmin><Tasks /></BlockMasterAdmin>} />
                <Route path="calls" element={<BlockMasterAdmin><CallHistory /></BlockMasterAdmin>} />
                <Route path="notes" element={<BlockMasterAdmin><Notes /></BlockMasterAdmin>} />
                <Route path="projects" element={<BlockMasterAdmin><Projects /></BlockMasterAdmin>} />
                <Route path="campaigns" element={<BlockMasterAdmin><Campaigns /></BlockMasterAdmin>} />
                <Route path="whatsapp" element={<BlockMasterAdmin><WhatsAppInbox accountIndex={0} /></BlockMasterAdmin>} />
                <Route path="whatsapp2" element={<BlockMasterAdmin><WhatsAppInbox accountIndex={1} /></BlockMasterAdmin>} />
                <Route path="whatsapp3" element={<BlockMasterAdmin><WhatsAppInbox accountIndex={2} /></BlockMasterAdmin>} />
                <Route path="pipeline" element={<BlockMasterAdmin><Pipeline /></BlockMasterAdmin>} />
                <Route path="contacts" element={<BlockMasterAdmin><Contacts /></BlockMasterAdmin>} />
                <Route path="integrations" element={<BlockMasterAdmin><Integrations /></BlockMasterAdmin>} />
                <Route path="notifications" element={<BlockMasterAdmin><Notifications /></BlockMasterAdmin>} />
                <Route path="workflow" element={<BlockMasterAdmin><Workflow /></BlockMasterAdmin>} />
                <Route path="admin" element={<RequireRole roles={['company_admin','ADMIN']}><AdminPanel /></RequireRole>} />
                <Route path="team" element={<RequireRole roles={['company_admin','ADMIN','MANAGER']}><TeamManagement /></RequireRole>} />
                <Route path="attendance" element={<BlockMasterAdmin><Attendance /></BlockMasterAdmin>} />
                <Route path="reminders" element={<BlockMasterAdmin><Reminders /></BlockMasterAdmin>} />
                <Route path="lead-scoring" element={<BlockMasterAdmin><LeadScoring /></BlockMasterAdmin>} />
                <Route path="custom-fields" element={<RequireRole roles={['company_admin','ADMIN']}><CustomFields /></RequireRole>} />
                <Route path="roles" element={<RequireRole roles={['company_admin','ADMIN']}><RolePermissions /></RequireRole>} />
                <Route path="adcampaigns" element={<BlockMasterAdmin><AdCampaigns /></BlockMasterAdmin>} />
                <Route path="fieldforce" element={<BlockMasterAdmin><FieldForce /></BlockMasterAdmin>} />

              </Route>
            </Routes>
          </Router>
        </SearchProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
