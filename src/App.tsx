import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { SearchProvider } from './context/SearchContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout/Layout';

// Views
import Login from './views/auth/Login';
import Register from './views/auth/Register';
import Dashboard from './views/dashboard/Dashboard';
import Leads from './views/leads/Leads';
import CallHistory from './views/calls/CallHistory';
import Tasks from './views/tasks/Tasks';
import Notes from './views/notes/Notes';
import WhatsAppInbox from './views/whatsapp/WhatsAppInbox';
import Campaigns from './views/campaigns/Campaigns';
import Projects from './views/projects/Projects';
import Reports from './views/reports/Reports';
import Settings from './views/settings/Settings';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  return user ? <>{children}</> : <Navigate to="/login" />;
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
              
              <Route path="/" element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }>
                <Route index element={<Dashboard />} />
                <Route path="leads" element={<Leads />} />
                <Route path="calls" element={<CallHistory />} />
                <Route path="tasks" element={<Tasks />} />
                <Route path="notes" element={<Notes />} />
                <Route path="whatsapp" element={<WhatsAppInbox />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="projects" element={<Projects />} />
                <Route path="reports" element={<Reports />} />
                <Route path="settings" element={<Settings />} />
              </Route>
            </Routes>
          </Router>
        </SearchProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
