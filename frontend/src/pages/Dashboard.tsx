import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Badge,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  School,
  People,
  Assessment,
  Settings,
  Notifications,
  Dashboard as DashboardIcon,
  Analytics,
  Payment,
  CheckCircle,
  Warning,
  Error,
  Chat,
  Close,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { dashboardAPI, notificationsAPI } from '../services/api';

interface Notification {
  id: number;
  title?: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

interface DashboardStats {
  totalSchools: number;
  totalUsers: number;
  totalClasses: number;
  totalStudents: number;
  totalTeachers: number;
  activeSubscriptions: number;
  revenue: number;
  growthRate: number;
  systemHealth: 'good' | 'warning' | 'error' | 'excellent';
  recentActivities: Array<{
    id: number;
    action: string;
    user: string;
    time: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
  subscription_alert?: {
    status: string;
    message: string;
  };
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalSchools: 0,
    totalUsers: 0,
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeSubscriptions: 0,
    revenue: 0,
    growthRate: 0,
    systemHealth: 'excellent',
    recentActivities: [],
  });
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activityPage, setActivityPage] = useState(1);
  const [notificationPage, setNotificationPage] = useState(1);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const ITEMS_PER_PAGE = 6;

  // Date formatting function
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'today';
    } else if (diffDays === 2) {
      return 'yesterday';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getDashboardData();
        setStats(response.data);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set fallback data if API fails
        setStats({
          totalSchools: 0,
          totalUsers: 0,
          totalClasses: 0,
          totalStudents: 0,
          totalTeachers: 0,
          activeSubscriptions: 0,
          revenue: 0,
          growthRate: 0,
          systemHealth: 'good',
          recentActivities: [],
        });
      } finally {
        setLoading(false);
      }
    };

    const fetchNotifications = async () => {
      try {
        const response = await notificationsAPI.getNotifications();
        // Ensure response.data is an array
        const data = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data?.results)
          ? response.data.results
          : [];
        setNotifications(data);
        setUnreadNotifications(data.filter((n: Notification) => !n.is_read).length);
      } catch (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setUnreadNotifications(0);
      }
    };

    fetchDashboardData();
    fetchNotifications();
  }, []);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'good':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'excellent':
        return 'success';
      default:
        return 'default';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle color="success" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <CheckCircle color="info" />;
    }
  };

  const superAdminActions = [
    {
      title: 'Manage Schools',
      description: 'Add, edit, or remove schools from platform',
      icon: <School />,
      color: '#e3f2fd',
      action: () => navigate('/schools'),
    },
    {
      title: 'User Management',
      description: 'Manage school admins and system users',
      icon: <People />,
      color: '#e8f5e8',
      action: () => navigate('/users'),
    },
    {
      title: 'System Analytics',
      description: 'Platform-wide statistics and reports',
      icon: <Analytics />,
      color: '#fff3e0',
      action: () => navigate('/analytics'),
    },
    {
      title: 'System Settings',
      description: 'Platform configuration and operations',
      icon: <Settings />,
      color: '#fce4ec',
      action: () => navigate('/settings'),
    },
  ];

  const schoolAdminActions = [
    {
      title: 'Manage Students',
      description: 'Add, edit, or remove students',
      icon: <People />,
      color: '#e8f5e8',
      action: () => navigate('/students'),
    },
    {
      title: 'Manage Teachers',
      description: 'Add, edit, or remove teachers',
      icon: <People />,
      color: '#e3f2fd',
      action: () => navigate('/teachers'),
    },
    {
      title: 'Manage Classes',
      description: 'Create and manage class schedules',
      icon: <School />,
      color: '#fff3e0',
      action: () => navigate('/classes'),
    },
    {
      title: 'Fee Management',
      description: 'Manage student fees and payments',
      icon: <Payment />,
      color: '#fce4ec',
      action: () => navigate('/fees'),
    },
  ];

  const teacherActions = [
    {
      title: 'My Classes',
      description: 'View and manage your classes',
      icon: <School />,
      color: '#e3f2fd',
      action: () => navigate('/classes'),
    },
    {
      title: 'Student Grades',
      description: 'Manage student grades and assessments',
      icon: <Assessment />,
      color: '#e8f5e8',
      action: () => navigate('/exams'),
    },
    {
      title: 'Chat',
      description: 'Communicate with students and parents',
      icon: <Chat />,
      color: '#fff3e0',
      action: () => navigate('/chat'),
    },
  ];

  const studentActions = [
    {
      title: 'My Grades',
      description: 'View your grades and progress',
      icon: <Assessment />,
      color: '#e8f5e8',
      action: () => navigate('/grades'),
    },
    {
      title: 'My Classes',
      description: 'View your class schedule',
      icon: <School />,
      color: '#e3f2fd',
      action: () => navigate('/classes'),
    },
    {
      title: 'Chat',
      description: 'Chat with teachers and classmates',
      icon: <Chat />,
      color: '#fff3e0',
      action: () => navigate('/chat'),
    },
  ];

  const parentActions = [
    {
      title: 'My Children',
      description: "View your children's progress",
      icon: <People />,
      color: '#e8f5e8',
      action: () => navigate('/children'),
    },
    {
      title: 'Fee Payments',
      description: 'View and pay school fees',
      icon: <Payment />,
      color: '#fce4ec',
      action: () => navigate('/fees'),
    },
    {
      title: 'Chat',
      description: 'Chat with teachers and school staff',
      icon: <Chat />,
      color: '#fff3e0',
      action: () => navigate('/chat'),
    },
  ];

  const getQuickActions = () => {
    switch (user?.role) {
      case 'super_admin':
        return superAdminActions;
      case 'school_admin':
        return schoolAdminActions;
      case 'teacher':
        return teacherActions;
      case 'student':
        return studentActions;
      case 'parent':
        return parentActions;
      default:
        return [];
    }
  };

  const handleQuickAction = (action: () => void) => {
    action();
  };

  const handleNotificationClick = async (notification: Notification) => {
    setSelectedNotification(notification);
    setNotificationDialogOpen(true);
    
    if (!notification.is_read) {
      try {
        // Mark notification as read via API
        await notificationsAPI.markAsRead(notification.id);
        
        // Update local state
        setNotifications(prev =>
          prev.map(n =>
            n.id === notification.id ? { ...n, is_read: true } : n
          )
        );
        
        // Update unread count
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  };

  const handleCloseNotificationDialog = () => {
    setNotificationDialogOpen(false);
    setSelectedNotification(null);
  };

  // Paginate recent activities
  const paginatedActivities = (stats.recentActivities || []).slice((activityPage - 1) * ITEMS_PER_PAGE, activityPage * ITEMS_PER_PAGE);
  const activityPageCount = Math.ceil((stats.recentActivities || []).length / ITEMS_PER_PAGE);
  // Paginate notifications
  const paginatedNotifications = (notifications || []).slice((notificationPage - 1) * ITEMS_PER_PAGE, notificationPage * ITEMS_PER_PAGE);
  const notificationPageCount = Math.ceil((notifications || []).length / ITEMS_PER_PAGE);

  // Reset to page 1 when activities or notifications change
  useEffect(() => { setActivityPage(1); }, [stats.recentActivities]);
  useEffect(() => { setNotificationPage(1); }, [notifications]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Subscription Alert for School Admin */}
      {user?.role === 'school_admin' && stats.subscription_alert && (
        <Alert
          severity={
            stats.subscription_alert.status === 'active' ? 'warning' :
            stats.subscription_alert.status === 'expired' ? 'error' :
            stats.subscription_alert.status === 'cancelled' ? 'error' :
            stats.subscription_alert.status === 'pending' ? 'info' :
            'info'
          }
          sx={{ mb: 3, fontWeight: 600 }}
        >
          {stats.subscription_alert.message}
        </Alert>
      )}

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <DashboardIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back, {user?.first_name || user?.username}!
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Tooltip title="Notifications">
            <IconButton>
              <Badge badgeContent={unreadNotifications} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton onClick={() => navigate('/settings')}>
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Schools
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.totalSchools}
                </Typography>
              </Box>
              <School sx={{ fontSize: 40, color: 'primary.main' }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Users
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.totalUsers}
                </Typography>
              </Box>
              <People sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Active Subscriptions
                </Typography>
                <Typography variant="h4" component="div">
                  {stats.activeSubscriptions}
                </Typography>
              </Box>
              <Payment sx={{ fontSize: 40, color: 'warning.main' }} />
            </Box>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  System Health
                </Typography>
                <Typography variant="h4" component="div">
                  <Chip
                    label={stats.systemHealth}
                    color={getHealthColor(stats.systemHealth) as any}
                    size="small"
                  />
                </Typography>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Quick Actions */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2 }}>
            {getQuickActions().map((action, index) => (
              <Paper
                key={index}
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  backgroundColor: action.color,
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => handleQuickAction(action.action)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {action.icon}
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    {action.title}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {action.description}
                </Typography>
              </Paper>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Recent Activities and Notifications */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Activities
            </Typography>
            <List>
              {paginatedActivities.map((activity) => (
                <ListItem key={activity.id}>
                  <ListItemIcon>
                    {getActivityIcon(activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={activity.action}
                    secondary={`${activity.user} • ${formatDate(activity.time)}`}
                  />
                </ListItem>
              ))}
            </List>
            {activityPageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={activityPageCount}
                  page={activityPage}
                  onChange={(_, value) => setActivityPage(value)}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Notifications
            </Typography>
            <List>
              {paginatedNotifications.map((notification) => (
                <ListItem
                  key={notification.id}
                  sx={{ 
                    cursor: 'pointer',
                    fontWeight: notification.is_read ? 'normal' : 'bold',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <ListItemText
                    primary={notification.title || notification.message}
                    secondary={formatDate(notification.created_at)}
                    sx={{ 
                      opacity: notification.is_read ? 0.7 : 1,
                      '& .MuiListItemText-primary': {
                        fontWeight: notification.is_read ? 'normal' : 'bold',
                      },
                    }}
                  />
                </ListItem>
              ))}
            </List>
            {notificationPageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={notificationPageCount}
                  page={notificationPage}
                  onChange={(_, value) => setNotificationPage(value)}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Notification Detail Dialog */}
      <Dialog
        open={notificationDialogOpen}
        onClose={handleCloseNotificationDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedNotification?.title || 'Notification'}
            <IconButton onClick={handleCloseNotificationDialog}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {selectedNotification?.message}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {selectedNotification && formatDate(selectedNotification.created_at)}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseNotificationDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 