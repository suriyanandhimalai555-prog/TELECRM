import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SearchProvider } from './context/SearchContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout/Layout';
import Login from './views/auth/Login';
import StateLogin from './views/auth/StateLogin';
import StateLayout from './components/StateLayout/StateLayout';
import StateDashboardHome from './views/state-crm/StateDashboardHome';
import StateUsers from './views/state-crm/StateUsers';
import StateStatesPage from './views/state-crm/StateStatesPage';
import StateLeads from './views/state-crm/StateLeads';
import StateTasks from './views/state-crm/StateTasks';
import StateProjects from './views/state-crm/StateProjects';
import StateNotes from './views/state-crm/StateNotes';
import StateCalls from './views/state-crm/StateCalls';
import StateWhatsApp from './views/state-crm/StateWhatsApp';
import StateCampaigns from './views/state-crm/StateCampaigns';
import StateReports from './views/state-crm/StateReports';
import StatePipeline from './views/state-crm/StatePipeline';
import StateContacts from './views/state-crm/StateContacts';
import StateNotifications from './views/state-crm/StateNotifications';
import StateAdmin from './views/state-crm/StateAdmin';
import StateTeam from './views/state-crm/StateTeam';
import StateReminders from './views/state-crm/StateReminders';
import StateCustomFields from './views/state-crm/StateCustomFields';
import StateRoles from './views/state-crm/StateRoles';
import StateAttendance from './views/state-crm/StateAttendance';
import StateWorkSprint from './views/state-crm/StateWorkSprint';
import StateFieldForce from './views/state-crm/StateFieldForce';
import StateSettings from './views/state-crm/StateSettings';
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
import Notifications from './views/notifications/Notifications';
import AdminPanel from './views/admin/AdminPanel';
import Attendance from './views/attendance/Attendance';
import Landing from './views/landing/Landing';
import Reminders from './views/reminders/Reminders';
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
  if (!user && hasToken) {
    // Decode JWT inline as fallback
    try {
      const token = localStorage.getItem('token')!;
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload?.id) return <>{children}</>;
    } catch {}
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }
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
              <Route path="/state-login" element={<StateLogin />} />
              <Route path="/state-crm" element={<StateLayout />}>
                <Route index element={<StateDashboardHome />} />
                <Route path="users" element={<StateUsers />} />
                <Route path="states" element={<StateStatesPage />} />
                <Route path="leads" element={<StateLeads />} />
                <Route path="tasks" element={<StateTasks />} />
                <Route path="projects" element={<StateProjects />} />
                <Route path="notes" element={<StateNotes />} />
                <Route path="calls" element={<StateCalls />} />
                <Route path="whatsapp" element={<StateWhatsApp />} />
                <Route path="campaigns" element={<StateCampaigns />} />
                <Route path="reports" element={<StateReports />} />
                <Route path="pipeline" element={<StatePipeline />} />
                <Route path="contacts" element={<StateContacts />} />
                <Route path="notifications" element={<StateNotifications />} />
                <Route path="admin" element={<StateAdmin />} />
                <Route path="team" element={<StateTeam />} />
                <Route path="reminders" element={<StateReminders />} />
                <Route path="custom-fields" element={<StateCustomFields />} />
                <Route path="roles" element={<StateRoles />} />
                <Route path="attendance" element={<StateAttendance />} />
                <Route path="worksprint" element={<StateWorkSprint />} />
                <Route path="fieldforce" element={<StateFieldForce />} />
                <Route path="settings" element={<StateSettings />} />
              </Route>
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
                <Route path="whatsapp4" element={<BlockMasterAdmin><WhatsAppInbox accountIndex={3} /></BlockMasterAdmin>} />
                <Route path="whatsapp5" element={<BlockMasterAdmin><WhatsAppInbox accountIndex={4} /></BlockMasterAdmin>} />
                <Route path="pipeline" element={<BlockMasterAdmin><Pipeline /></BlockMasterAdmin>} />
                <Route path="contacts" element={<BlockMasterAdmin><Contacts /></BlockMasterAdmin>} />
                <Route path="notifications" element={<BlockMasterAdmin><Notifications /></BlockMasterAdmin>} />
                <Route path="admin" element={<RequireRole roles={['company_admin','ADMIN']}><AdminPanel /></RequireRole>} />
                <Route path="team" element={<RequireRole roles={['company_admin','ADMIN','MANAGER']}><TeamManagement /></RequireRole>} />
                <Route path="attendance" element={<BlockMasterAdmin><Attendance /></BlockMasterAdmin>} />
                <Route path="reminders" element={<BlockMasterAdmin><Reminders /></BlockMasterAdmin>} />
                <Route path="custom-fields" element={<RequireRole roles={['company_admin','ADMIN']}><CustomFields /></RequireRole>} />
                <Route path="roles" element={<RequireRole roles={['company_admin','ADMIN']}><RolePermissions /></RequireRole>} />
                <Route path="fieldforce" element={<BlockMasterAdmin><FieldForce /></BlockMasterAdmin>} />

              </Route>
            </Routes>
          </Router>
        </SearchProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
