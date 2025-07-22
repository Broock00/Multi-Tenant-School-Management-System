import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Alert, Collapse } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import ClassAssignments from './pages/ClassAssignments';
import Fees from './pages/Fees';
import Exams from './pages/Exams';
import Chat from './pages/Chat';
import Schools from './pages/Schools';
import Users from './pages/Users';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Subscriptions from './pages/Subscriptions';
import Announcements from './pages/Announcements';
import SystemChat from './pages/SystemChat';
import Secretaries from './pages/Secretaries';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12,
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Role-based Route Component
const RoleRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles: string[];
}> = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  const [subscriptionAccessError, setSubscriptionAccessError] = React.useState<string | null>(null);
  React.useEffect(() => {
    const handler = (event: any) => {
      setSubscriptionAccessError(event.detail);
      setTimeout(() => setSubscriptionAccessError(null), 10000);
    };
    window.addEventListener('subscription-access-error', handler);
    return () => window.removeEventListener('subscription-access-error', handler);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Collapse in={!!subscriptionAccessError}>
              {subscriptionAccessError && (
                <Alert
                  severity="error"
                  onClose={() => setSubscriptionAccessError(null)}
                  sx={{ mb: 2, borderRadius: 0 }}
                >
                  {subscriptionAccessError}
                </Alert>
              )}
            </Collapse>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Dashboard />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/students"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher']}>
                      <Layout>
                        <Students />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teachers"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin', 'school_admin', 'principal']}>
                      <Layout>
                        <Teachers />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/classes"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher']}>
                      <Layout>
                        <Classes />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/class-assignments"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin', 'school_admin', 'principal']}>
                      <Layout>
                        <ClassAssignments />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/fees"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin', 'school_admin', 'principal', 'accountant', 'student', 'parent']}>
                      <Layout>
                        <Fees />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/exams"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin', 'school_admin', 'principal', 'teacher', 'student', 'parent']}>
                      <Layout>
                        <Exams />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Chat />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/schools"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin']}>
                      <Layout>
                        <Schools />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/users"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin']}>
                      <Layout>
                        <Users />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Analytics />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Settings />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/subscriptions"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Subscriptions />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <Announcements />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/system-chat"
                element={
                  <ProtectedRoute>
                    <Layout>
                      <SystemChat />
                    </Layout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/secretaries"
                element={
                  <ProtectedRoute>
                    <RoleRoute allowedRoles={['super_admin', 'school_admin', 'principal']}>
                      <Layout>
                        <Secretaries />
                      </Layout>
                    </RoleRoute>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Box>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
