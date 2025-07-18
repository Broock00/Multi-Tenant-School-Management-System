import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
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
  CircularProgress,
  Snackbar,
  Pagination,
} from '@mui/material';
import {
  Announcement,
  Add,
  Edit,
  Delete,
  Info,
  Warning,
  Error,
  CheckCircle,
  Person,
  Schedule,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

interface AnnouncementItem {
  id: number;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high';
  author: string | number;
  author_info?: { id: number; username: string; full_name: string; role: string };
  created_at: string;
  is_active: boolean;
  target_audience: string[];
  school?: number;
}

interface FormData {
  title: string;
  content: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high';
  target_audience: string[];
}

interface TargetAudienceOption {
  value: string;
  label: string;
}

const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<AnnouncementItem | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    type: 'info',
    priority: 'medium',
    target_audience: ['all'],
  });
  const [announcementPage, setAnnouncementPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  // Fetch announcements on component mount
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/announcements/');
      console.log('API response:', response.data);
      const data = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.results)
        ? response.data.results
        : [];
      console.log('Fetched announcements:', data);
      setAnnouncements(data);
      setError(null);
      // Adjust page if current page is invalid after fetch
      const newPageCount = Math.ceil(getFilteredAnnouncements().length / ITEMS_PER_PAGE);
      if (announcementPage > newPageCount && newPageCount > 0) {
        setAnnouncementPage(newPageCount);
      }
    } catch (err: any) {
      console.error('Failed to fetch announcements:', err);
      setError(err.response?.data?.message || 'Failed to fetch announcements');
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  // Date formatting function (aligned with Dashboard.tsx)
  const formatDate = (dateString: string): string => {
    if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
      console.warn(`Invalid dateString (empty, non-string, or whitespace): ${JSON.stringify(dateString)}`);
      return 'Unknown date';
    }
    const trimmedDateString = dateString.trim();
    const date = new Date(trimmedDateString);
    if (isNaN(date.getTime())) {
      console.warn(`Unparsable dateString: ${trimmedDateString}`);
      return 'Unknown date';
    }
    console.debug(`Parsed dateString: ${trimmedDateString} -> ${date.toISOString()}`);
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
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info color="info" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Info color="info" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'info':
        return 'info';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      case 'success':
        return 'success';
      default:
        return 'default';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'success';
      default:
        return 'default';
    }
  };

  const handleOpenDialog = (announcement?: AnnouncementItem) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        type: announcement.type,
        priority: announcement.priority,
        target_audience: Array.isArray(announcement.target_audience) ? announcement.target_audience : [announcement.target_audience],
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        type: 'info',
        priority: 'medium',
        target_audience: ['all'],
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAnnouncement(null);
  };

  const handleSubmit = async () => {
    try {
      const currentPageCount = Math.ceil(getFilteredAnnouncements().length / ITEMS_PER_PAGE);
      const payload = { ...formData, target_audience: formData.target_audience };
      if (editingAnnouncement) {
        await api.put(`/notifications/announcements/${editingAnnouncement.id}/`, payload);
        setSnackbar({ open: true, message: 'Announcement updated successfully', severity: 'success' });
      } else {
        await api.post('/notifications/announcements/', payload);
        setSnackbar({ open: true, message: 'Announcement created successfully', severity: 'success' });
      }
      await fetchAnnouncements();
      handleCloseDialog(); // Close dialog after success
      // Adjust page only if on the last page and a new page is created
      const newFilteredAnnouncements = getFilteredAnnouncements();
      const newPageCount = Math.ceil(newFilteredAnnouncements.length / ITEMS_PER_PAGE);
      if (!editingAnnouncement && announcementPage === currentPageCount && newPageCount > currentPageCount) {
        setAnnouncementPage(newPageCount);
      }
    } catch (err: any) {
      console.error('Failed to save announcement:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to save announcement',
        severity: 'error',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      try {
        await api.delete(`/notifications/announcements/${id}/`);
        setSnackbar({ open: true, message: 'Announcement deleted successfully', severity: 'success' });
        await fetchAnnouncements();
      } catch (err: any) {
        console.error('Failed to delete announcement:', err);
        setSnackbar({
          open: true,
          message: err.response?.data?.message || 'Failed to delete announcement',
          severity: 'error',
        });
      }
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const announcement = announcements.find(ann => ann.id === id);
      if (!announcement) return;

      await api.patch(`/notifications/announcements/${id}/`, {
        is_active: !announcement.is_active,
      });
      setSnackbar({
        open: true,
        message: `Announcement ${announcement.is_active ? 'deactivated' : 'activated'} successfully`,
        severity: 'success',
      });
      await fetchAnnouncements();
    } catch (err: any) {
      console.error('Failed to toggle announcement status:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.message || 'Failed to update announcement status',
        severity: 'error',
      });
    }
  };

  // Filter announcements based on user role and target audience
  const getFilteredAnnouncements = () => {
    if (!user) return [];
    const schoolAdminAudiences = ['all', 'secretary', 'teacher', 'student', 'school_admin'];
    return announcements.filter(announcement => {
      // Support both string and array for backward compatibility
      const ta = announcement.target_audience;
      if (user.role === 'super_admin') return true;
      if (user.role === 'school_admin') {
        if (Array.isArray(ta)) {
          return ta.some(aud => schoolAdminAudiences.includes(aud));
        } else {
          return schoolAdminAudiences.includes(ta);
        }
      }
      if (Array.isArray(ta)) {
        return ta.includes(user.role) || ta.includes('all');
      } else {
        return ta === user.role || ta === 'all';
      }
    });
  };

  // Get available target audience options based on user role
  const getTargetAudienceOptions = (): TargetAudienceOption[] => {
    if (!user) return [];
    if (user.role === 'school_admin') {
      return [
        { value: 'all', label: 'All (Secretaries, Teachers, Students)' },
        { value: 'secretary', label: 'Secretaries' },
        { value: 'teacher', label: 'Teachers' },
        { value: 'student', label: 'Students' },
      ];
    }
    return [
      { value: 'all', label: 'All Users' },
      { value: 'super_admin', label: 'Super Admins' },
      { value: 'school_admin', label: 'School Admins' },
    ];
  };

  const filteredAnnouncements = getFilteredAnnouncements();
  const announcementPageCount = Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE);
  const paginatedAnnouncements = filteredAnnouncements.slice(
    (announcementPage - 1) * ITEMS_PER_PAGE,
    announcementPage * ITEMS_PER_PAGE
  );

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <Announcement sx={{ mr: 1, verticalAlign: 'middle' }} />
          System Announcements
        </Typography>
        {(user?.role === 'super_admin' || user?.role === 'school_admin') && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            New Announcement
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          {filteredAnnouncements.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              No announcements available.
            </Typography>
          ) : (
            <>
              <List>
                {paginatedAnnouncements.map((announcement) => (
                  <ListItem
                    key={announcement.id}
                    divider
                    sx={{
                      opacity: announcement.is_active ? 1 : 0.6,
                      backgroundColor: announcement.is_active ? 'transparent' : 'action.hover',
                    }}
                  >
                    <ListItemIcon>
                      {getTypeIcon(announcement.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="h6" component="span">
                            {announcement.title}
                          </Typography>
                          <Chip
                            label={announcement.type}
                            color={getTypeColor(announcement.type) as any}
                            size="small"
                          />
                          <Chip
                            label={announcement.priority}
                            color={getPriorityColor(announcement.priority) as any}
                            size="small"
                          />
                          {!announcement.is_active && (
                            <Chip label="Inactive" color="default" size="small" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            {announcement.content}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: '0.875rem', color: 'text.secondary' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Person sx={{ fontSize: 16, mr: 0.5 }} />
                              {announcement.author_info?.full_name || announcement.author_info?.username || announcement.author}
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Schedule sx={{ fontSize: 16, mr: 0.5 }} />
                              {formatDate(announcement.created_at)}
                            </Box>
                          </Box>
                        </Box>
                      }
                    />
                    {(user?.role === 'super_admin' || user?.role === 'school_admin') && (
                      <Box>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(announcement)}
                          title="Edit"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleToggleActive(announcement.id)}
                          title={announcement.is_active ? 'Deactivate' : 'Activate'}
                          color={announcement.is_active ? 'warning' : 'success'}
                        >
                          {announcement.is_active ? <Warning /> : <CheckCircle />}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(announcement.id)}
                          title="Delete"
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    )}
                  </ListItem>
                ))}
              </List>
              {announcementPageCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                  <Pagination
                    count={announcementPageCount}
                    page={announcementPage}
                    onChange={(_, value) => setAnnouncementPage(value)}
                    color="primary"
                    shape="rounded"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Announcement Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
        </DialogTitle>
        <DialogContent>
          <Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                margin="normal"
                required
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>Type</InputLabel>
                <Select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  label="Type"
                >
                  <MenuItem value="info">Information</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                  <MenuItem value="error">Error</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as any }))}
                  label="Priority"
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth margin="normal">
                <InputLabel>Target Audience</InputLabel>
                <Select
                  value={formData.target_audience[0]}
                  onChange={e => {
                    const selected = e.target.value as string;
                    // Always include 'school_admin' in the target audience for school admins (except when 'all' is selected)
                    setFormData(prev => ({
                      ...prev,
                      target_audience: selected === 'all' ? ['all'] : [selected, 'school_admin'],
                    }));
                  }}
                  label="Target Audience"
                >
                  {getTargetAudienceOptions().map((option: TargetAudienceOption) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <TextField
              fullWidth
              label="Content"
              multiline
              rows={4}
              value={formData.content}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, content: e.target.value }))}
              margin="normal"
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={!formData.title.trim() || !formData.content.trim()}
          >
            {editingAnnouncement ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Announcements;