import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  InputAdornment,
  CircularProgress,
  Pagination,
} from '@mui/material';
import {
  Payment,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  Error,
  Search,
} from '@mui/icons-material';
import { schoolsAPI, subscriptionsAPI, subscriptionPlansAPI } from '../services/api';

interface SchoolData {
  id: number;
  name: string;
  code: string;
  principal_email: string;
  subscription_status?: 'active' | 'expired' | 'pending' | 'cancelled';
  subscription_end_date?: string;
}

interface Subscription {
  id: number;
  school: number;
  school_name: string;
  school_code: string;
  plan: string;
  plan_display: string;
  status: 'active' | 'expired' | 'pending' | 'cancelled';
  status_display: string;
  start_date: string;
  end_date: string;
  amount: number;
  currency: string;
  features: string[];
  auto_renew: boolean;
  is_active: boolean;
  days_remaining: number;
  is_expiring_soon: boolean;
}

const Subscriptions: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    school: '',
    plan: '',
    status: 'pending',
    start_date: '',
    end_date: '',
    amount: 0,
    auto_renew: false,
  });
  const [page, setPage] = useState(1);
  const SUBSCRIPTIONS_PER_PAGE = 10;
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    fetchPlans();
    fetchSchools();
    fetchSubscriptions();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await schoolsAPI.getSchools();
      const schoolsData = response.data.results || response.data || [];
      setSchools(schoolsData);
    } catch (error) {
      console.error('Error fetching schools:', error);
      setError('Failed to load schools');
    }
  };

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionsAPI.getSubscriptions();
      setSubscriptions(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setError('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await subscriptionPlansAPI.getPlans();
      setPlans(response.data.results || response.data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      setError('Failed to load plans');
    }
  };

  // Sort subscriptions by priority: active first, then by expiration status
  const getSortedSubscriptions = () => {
    return subscriptions.sort((a, b) => {
      // First, sort by subscription status priority
      const statusPriority = { 'active': 1, 'pending': 2, 'expired': 3, 'cancelled': 4 };
      const aPriority = statusPriority[a.status] || 2;
      const bPriority = statusPriority[b.status] || 2;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Then sort by end date (newest first)
      if (a.end_date && b.end_date) {
        return new Date(b.end_date).getTime() - new Date(a.end_date).getTime();
      }
      
      // Finally, sort by school name
      return a.school_name.localeCompare(b.school_name);
    });
  };

  // Filter subscriptions based on search term
  const filteredSubscriptions = getSortedSubscriptions().filter(subscription =>
    subscription.school_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscription.school_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscription.plan_display.toLowerCase().includes(searchTerm.toLowerCase()) ||
    subscription.status_display.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Paginate filtered subscriptions
  const paginatedSubscriptions = filteredSubscriptions.slice((page - 1) * SUBSCRIPTIONS_PER_PAGE, page * SUBSCRIPTIONS_PER_PAGE);
  const pageCount = Math.ceil(filteredSubscriptions.length / SUBSCRIPTIONS_PER_PAGE);

  // Send email notification
  const sendEmailNotification = async (action: string, subscription: Subscription) => {
    try {
      const emailData = {
        to: subscription.school_name, // This would be the principal's email
        subject: `Subscription ${action} - ${subscription.school_name}`,
        message: `Dear Principal,\n\nYour school's subscription has been ${action}.\n\nDetails:\n- Plan: ${subscription.plan_display}\n- Status: ${subscription.status_display}\n- Amount: $${subscription.amount}\n- Start Date: ${subscription.start_date}\n- End Date: ${subscription.end_date}\n\nBest regards,\nSchool Management Platform Team`,
      };
      
      // In a real application, you would call your backend API
      console.log('Sending email notification:', emailData);
      
      // For demo purposes, we'll just log the email
      alert(`Email notification sent for subscription ${action}`);
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  };

  const handleDelete = async (subscriptionId: number) => {
    if (window.confirm('Are you sure you want to delete this subscription?')) {
      try {
        await subscriptionsAPI.deleteSubscription(subscriptionId);
        setSubscriptions(prev => prev.filter(sub => sub.id !== subscriptionId));
        alert('Subscription deleted successfully');
      } catch (error) {
        console.error('Error deleting subscription:', error);
        alert('Failed to delete subscription');
      }
    }
  };

  const handleOpenDialog = (subscription?: Subscription) => {
    if (subscription) {
      setEditingSubscription(subscription);
      setFormData({
        school: subscription.school.toString(),
        plan: subscription.plan,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        amount: subscription.amount,
        auto_renew: subscription.auto_renew,
      });
    } else {
      setEditingSubscription(null);
      setFormData({
        school: '',
        plan: '',
        status: 'pending',
        start_date: '',
        end_date: '',
        amount: 0,
        auto_renew: false,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSubscription(null);
  };

  const handleSubmit = async () => {
    try {
      if (editingSubscription) {
        // Update existing subscription
        const response = await subscriptionsAPI.updateSubscription(editingSubscription.id, formData);
        setSubscriptions(prev =>
          prev.map(sub =>
            sub.id === editingSubscription.id
              ? response.data
              : sub
          )
        );
        await sendEmailNotification('updated', response.data);
      } else {
        // Add new subscription
        const response = await subscriptionsAPI.createSubscription(formData);
        setSubscriptions(prev => [...prev, response.data]);
        await sendEmailNotification('created', response.data);
      }
      handleCloseDialog();
      alert(editingSubscription ? 'Subscription updated successfully' : 'Subscription created successfully');
    } catch (error) {
      console.error('Error saving subscription:', error);
      alert('Failed to save subscription');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'premium':
        return 'error';
      case 'standard':
        return 'warning';
      case 'basic':
        return 'info';
      default:
        return 'default';
    }
  };

  // Reset to page 1 when search/filter changes
  useEffect(() => { setPage(1); }, [searchTerm]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            <Payment sx={{ mr: 1, verticalAlign: 'middle' }} />
            Subscriptions Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage school subscriptions and billing
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Subscription
        </Button>
      </Box>

      {/* Search Bar */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            placeholder="Search subscriptions by school, plan, or status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Subscriptions Table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Card>
          <CardContent>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>School</TableCell>
                    <TableCell>Plan</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Period</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Auto Renew</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {subscription.school_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {subscription.school_code}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscription.plan_display}
                          color={getPlanColor(subscription.plan) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscription.status_display}
                          color={getStatusColor(subscription.status) as any}
                          size="small"
                          icon={
                            subscription.status === 'active' ? <CheckCircle /> :
                            subscription.status === 'pending' ? <Warning /> :
                            <Error />
                          }
                        />
                        {subscription.is_expiring_soon && (
                          <Typography variant="caption" color="warning.main" display="block">
                            Expires in {subscription.days_remaining} days
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2">
                            {new Date(subscription.start_date).toLocaleDateString()} - {new Date(subscription.end_date).toLocaleDateString()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {subscription.days_remaining} days remaining
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          ${subscription.amount}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {subscription.currency}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={subscription.auto_renew ? 'Yes' : 'No'}
                          color={subscription.auto_renew ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(subscription)}
                          title="Edit"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(subscription.id)}
                          title="Delete"
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {pageCount > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, value) => setPage(value)}
                  color="primary"
                  shape="rounded"
                />
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Subscription Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSubscription ? 'Edit Subscription' : 'Add New Subscription'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mt: 1 }}>
            <FormControl fullWidth margin="normal">
              <InputLabel>School</InputLabel>
              <Select
                value={formData.school}
                onChange={(e) => setFormData(prev => ({ ...prev, school: e.target.value }))}
                label="School"
              >
                {schools.map((school) => (
                  <MenuItem key={school.id} value={school.id}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <Typography variant="body2">{school.name} ({school.code})</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {school.principal_email}
                      </Typography>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Plan</InputLabel>
              <Select
                value={formData.plan}
                onChange={(e) => setFormData(prev => ({ ...prev, plan: e.target.value }))}
                label="Plan"
              >
                {plans.map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                label="Status"
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="expired">Expired</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) }))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
              margin="normal"
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSubscription ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Subscriptions; 