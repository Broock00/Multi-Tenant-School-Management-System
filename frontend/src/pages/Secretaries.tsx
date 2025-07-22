import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, CircularProgress, Alert, InputAdornment
} from '@mui/material';
import { Add, Edit, Delete, Email, Person, Phone, Search, Clear } from '@mui/icons-material';
import api from '../services/api';

interface Secretary {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
}

const initialForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  password: '',
};

const Secretaries: React.FC = () => {
  const [secretaries, setSecretaries] = useState<Secretary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { user } = require('../contexts/AuthContext').useAuth();

  const fetchSecretaries = async (pageNum: number = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: any = {
        page: pageNum,
        page_size: pageSize,
        search: searchQuery || undefined,
      };
      const res = await api.get('/auth/secretaries/', { params });
      setSecretaries(res.data.results || res.data);
      setTotalCount(res.data.count || res.data.length || 0);
      setTotalPages(res.data.total_pages || Math.ceil((res.data.count || res.data.length || 0) / pageSize));
    } catch (err: any) {
      setError('Error fetching secretaries: ' + (err?.message || ''));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecretaries();
    // eslint-disable-next-line
  }, [searchQuery]);

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchSecretaries(value);
  };

  const handleOpenDialog = (sec?: Secretary) => {
    if (sec) {
      setForm({
        username: sec.username,
        email: sec.email,
        first_name: sec.first_name,
        last_name: sec.last_name,
        phone: sec.phone || '',
        password: '',
      });
      setEditingId(sec.id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setDialogOpen(true);
    setError('');
    setSuccess('');
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setError('');
    setSuccess('');
  };

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      if (editingId) {
        const updateData = { ...form } as Partial<typeof form>;
        delete updateData.password;
        await api.put(`/auth/secretaries/${editingId}/`, updateData);
        setSuccess('Secretary updated successfully');
      } else {
        await api.post('/auth/secretaries/', { ...form, role: 'secretary' });
        setSuccess('Secretary created successfully');
      }
      handleCloseDialog();
      fetchSecretaries(1);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save secretary');
    }
  };

  const handleDeactivate = async (id: number, is_active: boolean) => {
    setError('');
    setSuccess('');
    try {
      await api.patch(`/auth/secretaries/${id}/`, { is_active: !is_active });
      setSuccess(is_active ? 'Secretary deactivated' : 'Secretary reactivated');
      fetchSecretaries(page);
    } catch (err: any) {
      setError('Failed to update status');
    }
  };

  const handleDelete = async (id: number) => {
    setError('');
    setSuccess('');
    if (!window.confirm('Are you sure you want to delete this secretary?')) return;
    try {
      await api.delete(`/auth/secretaries/${id}/`);
      setSuccess('Secretary deleted');
      fetchSecretaries(page);
    } catch (err: any) {
      setError('Failed to delete secretary');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Secretaries Management
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Secretaries {totalCount > 0 && `(${totalCount} total)`}
            </Typography>
            {((user?.role === 'school_admin') || (user?.role === 'super_admin')) && (
              <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
                Add Secretary
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
            <TextField
              placeholder="Search secretaries..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              size="small"
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchQuery && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchQuery('')} edge="end">
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Username</TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Email</TableCell>
                      <TableCell>Phone</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {secretaries.map(sec => (
                      <TableRow key={sec.id}>
                        <TableCell>{sec.username}</TableCell>
                        <TableCell>{sec.first_name} {sec.last_name}</TableCell>
                        <TableCell>{sec.email}</TableCell>
                        <TableCell>{sec.phone || '-'}</TableCell>
                        <TableCell>{sec.is_active ? 'Active' : 'Inactive'}</TableCell>
                        <TableCell>
                          {((user?.role === 'school_admin') || (user?.role === 'super_admin')) && (
                            <IconButton onClick={() => handleOpenDialog(sec)}><Edit /></IconButton>
                          )}
                          {((user?.role === 'school_admin') || (user?.role === 'super_admin')) && (
                            <IconButton onClick={() => handleDeactivate(sec.id, sec.is_active)}>
                              {sec.is_active ? <Person color="disabled" /> : <Person color="success" />}
                            </IconButton>
                          )}
                          {((user?.role === 'school_admin') || (user?.role === 'super_admin')) && (
                            <IconButton onClick={() => handleDelete(sec.id)}><Delete color="error" /></IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Page {page} of {totalPages} • Showing {secretaries.length} of {totalCount} secretaries
                  </Typography>
                  {/* Add Pagination component if needed */}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Secretary' : 'Add Secretary'}</DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent>
            <TextField
              label="Username"
              value={form.username}
              onChange={e => handleFormChange('username', e.target.value)}
              fullWidth
              required
              margin="dense"
              InputProps={{ startAdornment: <InputAdornment position="start"><Person /></InputAdornment> }}
            />
            <TextField
              label="First Name"
              value={form.first_name}
              onChange={e => handleFormChange('first_name', e.target.value)}
              fullWidth
              required
              margin="dense"
            />
            <TextField
              label="Last Name"
              value={form.last_name}
              onChange={e => handleFormChange('last_name', e.target.value)}
              fullWidth
              required
              margin="dense"
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={e => handleFormChange('email', e.target.value)}
              fullWidth
              required
              margin="dense"
              InputProps={{ startAdornment: <InputAdornment position="start"><Email /></InputAdornment> }}
            />
            <TextField
              label="Phone"
              value={form.phone}
              onChange={e => handleFormChange('phone', e.target.value)}
              fullWidth
              margin="dense"
              InputProps={{ startAdornment: <InputAdornment position="start"><Phone /></InputAdornment> }}
            />
            {!editingId && (
              <TextField
                label="Password"
                type="password"
                value={form.password}
                onChange={e => handleFormChange('password', e.target.value)}
                fullWidth
                required
                margin="dense"
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">{editingId ? 'Update' : 'Add'}</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Secretaries; 