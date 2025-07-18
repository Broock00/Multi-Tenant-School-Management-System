import React, { useState } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  CssBaseline,
  Divider,
  Badge,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  Logout as LogoutIcon,
  Notifications as NotificationsIcon,
  Chat as ChatIcon,
  Assessment as AssessmentIcon,
  Payment as PaymentIcon,
  Class as ClassIcon,
  Refresh as RefreshIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

const drawerWidth = 240;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications] = useState([
    { id: 1, message: 'New message from Springfield High School', read: false },
    { id: 2, message: 'System maintenance scheduled', read: false },
  ]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleRefreshUser = async () => {
    await refreshUser();
  };

  const getNavigationItems = () => {
    if (!user) return [];

    switch (user.role) {
      case 'super_admin':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
          { text: 'Schools', icon: <SchoolIcon />, path: '/schools' },
          { text: 'User Management', icon: <PeopleIcon />, path: '/users' },
          { text: 'Analytics', icon: <AssessmentIcon />, path: '/analytics' },
          { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
          { text: 'Subscriptions', icon: <PaymentIcon />, path: '/subscriptions' },
          { text: 'Announcements', icon: <NotificationsIcon />, path: '/announcements' },
          { text: 'System Chat', icon: <ChatIcon />, path: '/system-chat' },
        ];
      case 'school_admin':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
          { text: 'Students', icon: <PeopleIcon />, path: '/students' },
          { text: 'Teachers', icon: <PeopleIcon />, path: '/teachers' },
          { text: 'Classes', icon: <ClassIcon />, path: '/classes' },
          { text: 'Class Assignments', icon: <AssignmentIcon />, path: '/class-assignments' },
          { text: 'Announcements', icon: <NotificationsIcon />, path: '/announcements' },
          { text: 'Secretary', icon: <PeopleIcon />, path: '/users' },
          { text: 'Fees', icon: <PaymentIcon />, path: '/fees' },
          { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
        ];
      case 'teacher':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
          { text: 'Classes', icon: <ClassIcon />, path: '/classes' },
          { text: 'Students', icon: <PeopleIcon />, path: '/students' },
          { text: 'Exams', icon: <AssessmentIcon />, path: '/exams' },
          { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
        ];
      case 'secretary':
        return [
          { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
          { text: 'Students', icon: <PeopleIcon />, path: '/students' },
          { text: 'Fees', icon: <PaymentIcon />, path: '/fees' },
          { text: 'Chat', icon: <ChatIcon />, path: '/chat' },
        ];
      default:
        return [];
    }
  };

  const navigationItems = getNavigationItems();

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div">
          School Management
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navigationItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              sx={{
                minHeight: 48,
                px: 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 3,
                  justifyContent: 'center',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {user?.role === 'super_admin' ? 'Super Admin Dashboard' : 'School Management Platform'}
          </Typography>
          
          {/* Refresh User Data */}
          <IconButton color="inherit" onClick={handleRefreshUser} sx={{ mr: 1 }} title="Refresh user data">
            <RefreshIcon />
          </IconButton>
          
          {/* Notifications */}
          <IconButton color="inherit" sx={{ mr: 1 }}>
            <Badge badgeContent={unreadCount} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ mr: 2 }}>
              {user?.first_name} {user?.last_name}
            </Typography>
            <IconButton color="inherit" onClick={handleLogout}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 