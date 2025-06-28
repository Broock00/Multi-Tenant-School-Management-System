import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Assessment,
  School,
  People,
  Payment,
  CheckCircle,
} from '@mui/icons-material';
import { dashboardAPI } from '../services/api';

interface AnalyticsData {
  totalSchools: number;
  totalUsers: number;
  totalStudents: number;
  totalTeachers: number;
  activeSubscriptions: number;
  revenue: number;
  growthRate: number;
  systemUptime: number;
  recentMetrics: Array<{
    id: number;
    metric: string;
    value: string;
    change: number;
    trend: 'up' | 'down' | 'stable';
  }>;
}

const Analytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalSchools: 0,
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    activeSubscriptions: 0,
    revenue: 0,
    growthRate: 0,
    systemUptime: 99.9,
    recentMetrics: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setLoading(true);
        const response = await dashboardAPI.getDashboardData();
        const data = response.data;
        
        // Transform dashboard data to analytics format
        setAnalytics({
          totalSchools: data.totalSchools || 0,
          totalUsers: data.totalUsers || 0,
          totalStudents: data.totalStudents || 0,
          totalTeachers: data.totalTeachers || 0,
          activeSubscriptions: data.activeSubscriptions || 0,
          revenue: data.revenue || 0,
          growthRate: data.growthRate || 0,
          systemUptime: 99.9, // Mock system uptime
          recentMetrics: [
            { id: 1, metric: 'New Schools', value: '3', change: 25, trend: 'up' },
            { id: 2, metric: 'Active Users', value: data.totalUsers?.toString() || '0', change: 8.5, trend: 'up' },
            { id: 3, metric: 'Revenue', value: `$${data.revenue?.toLocaleString() || '0'}`, change: -2.1, trend: 'down' },
            { id: 4, metric: 'System Performance', value: '99.9%', change: 0.1, trend: 'up' },
          ],
        });
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        // Set fallback data if API fails
        setAnalytics({
          totalSchools: 0,
          totalUsers: 0,
          totalStudents: 0,
          totalTeachers: 0,
          activeSubscriptions: 0,
          revenue: 0,
          growthRate: 0,
          systemUptime: 99.9,
          recentMetrics: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      default:
        return <CheckCircle color="info" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'success';
      case 'down':
        return 'error';
      default:
        return 'info';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        <Assessment sx={{ mr: 1, verticalAlign: 'middle' }} />
        System Analytics
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Platform-wide statistics and performance metrics
      </Typography>

      {/* Key Metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3, mb: 4 }}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography color="text.secondary" gutterBottom variant="body2">
                  Total Schools
                </Typography>
                <Typography variant="h4" component="div">
                  {analytics.totalSchools}
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
                  {analytics.totalUsers}
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
                  {analytics.activeSubscriptions}
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
                  System Uptime
                </Typography>
                <Typography variant="h4" component="div">
                  {analytics.systemUptime}%
                </Typography>
              </Box>
              <CheckCircle sx={{ fontSize: 40, color: 'success.main' }} />
            </Box>
          </CardContent>
        </Card>
      </Box>

      {/* Growth Metrics */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Growth Metrics
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Platform Growth Rate
              </Typography>
              <Typography variant="h4" color="success.main">
                +{analytics.growthRate}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analytics.growthRate}
                color="success"
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Monthly Revenue
              </Typography>
              <Typography variant="h4" color="primary.main">
                ${analytics.revenue.toLocaleString()}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={75}
                color="primary"
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Recent Metrics */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Performance Metrics
          </Typography>
          <List>
            {analytics.recentMetrics.map((metric) => (
              <ListItem key={metric.id} divider>
                <ListItemIcon>
                  {getTrendIcon(metric.trend)}
                </ListItemIcon>
                <ListItemText
                  primary={metric.metric}
                  secondary={`${metric.value} • ${metric.change > 0 ? '+' : ''}${metric.change}% change`}
                />
                <Chip
                  label={metric.trend}
                  color={getTrendColor(metric.trend) as any}
                  size="small"
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Analytics; 