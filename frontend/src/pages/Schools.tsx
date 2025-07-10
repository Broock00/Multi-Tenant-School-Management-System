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
  School,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  Error,
  Search,
  Email,
  Phone,
  Language,
} from '@mui/icons-material';
import { schoolsAPI } from '../services/api';

interface SchoolData {
  id: number;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  principal_name: string;
  principal_phone: string;
  principal_email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const Schools: React.FC = () => {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    principal_name: '',
    principal_phone: '',
    principal_email: '',
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const SCHOOLS_PER_PAGE = 15;

  // Function to generate school code (for display purposes only)
  const generateSchoolCode = (schoolName: string): string => {
    if (!schoolName) return 'Enter school name';
    
    // Take the first letter of each word and convert to uppercase
    const words = schoolName.match(/\b\w+/g) || [];
    const baseCode = words.map(word => word[0].toUpperCase()).join('');
    
    return baseCode || 'Enter school name';
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    try {
      const response = await schoolsAPI.getSchools();
      // Handle different response structures
      const schoolsData = response.data.results || response.data || [];
      setSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (error) {
      console.error('Error fetching schools:', error);
      setError('Failed to load schools');
      // Set mock data for demonstration
      setSchools([
        {
          id: 1,
          name: 'Springfield High School',
          code: 'SHS001',
          address: '123 Main St, Springfield',
          phone: '+1-555-0101',
          email: 'info@springfield.edu',
          website: 'https://springfield.edu',
          principal_name: 'Dr. John Smith',
          principal_phone: '+1-555-0102',
          principal_email: 'principal@springfield.edu',
          is_active: true,
          created_at: '2025-01-15T10:00:00Z',
          updated_at: '2025-01-15T10:00:00Z',
        },
        {
          id: 2,
          name: 'Riverside Academy',
          code: 'RA002',
          address: '456 Oak Ave, Riverside',
          phone: '+1-555-0201',
          email: 'info@riverside.edu',
          website: 'https://riverside.edu',
          principal_name: 'Dr. Sarah Johnson',
          principal_phone: '+1-555-0202',
          principal_email: 'principal@riverside.edu',
          is_active: true,
          created_at: '2025-02-20T14:30:00Z',
          updated_at: '2025-02-20T14:30:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Filter schools based on search term
  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.principal_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    school.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort filtered schools
  const sortedSchools = [...filteredSchools].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'code':
        comparison = a.code.localeCompare(b.code);
        break;
      case 'principal':
        comparison = a.principal_name.localeCompare(b.principal_name);
        break;
      case 'created':
        comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        break;
      default:
        comparison = 0;
    }
    return sortDirection === 'desc' ? -comparison : comparison;
  });

  // Paginate sorted schools
  const paginatedSchools = sortedSchools.slice((page - 1) * SCHOOLS_PER_PAGE, page * SCHOOLS_PER_PAGE);
  const pageCount = Math.ceil(sortedSchools.length / SCHOOLS_PER_PAGE);

  const handleOpenDialog = (school?: SchoolData) => {
    if (school) {
      setEditingSchool(school);
      setFormData({
        name: school.name,
        address: school.address,
        phone: school.phone,
        email: school.email,
        website: school.website,
        principal_name: school.principal_name,
        principal_phone: school.principal_phone,
        principal_email: school.principal_email,
      });
    } else {
      setEditingSchool(null);
      setFormData({
        name: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        principal_name: '',
        principal_phone: '',
        principal_email: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingSchool(null);
  };

  const handleSubmit = async () => {
    if (!formData.principal_phone.trim()) {
      setError('Principal phone is required.');
      return;
    }
    if (!formData.name.trim()) {
      setError('School name is required.');
      return;
    }
    try {
      // Debug: Check if user is authenticated
      const token = localStorage.getItem('access_token');
      console.log('DEBUG: Token exists:', !!token);
      console.log('DEBUG: Token:', token ? token.substring(0, 20) + '...' : 'No token');
      
      if (editingSchool) {
        console.log('DEBUG: Updating school:', editingSchool.id);
        // For updates, we need to include the existing code
        const updateData = { ...formData, code: editingSchool.code };
        await schoolsAPI.updateSchool(editingSchool.id, updateData);
      } else {
        console.log('DEBUG: Creating new school');
        // For new schools, don't send code - it will be auto-generated
        await schoolsAPI.createSchool(formData);
      }
      fetchSchools();
      handleCloseDialog();
    } catch (error: any) {
      console.error('Error saving school:', error);
      console.error('DEBUG: Error response:', error.response?.data);
      console.error('DEBUG: Error status:', error.response?.status);
      console.error('DEBUG: Full error:', error.response);
      setError('Failed to save school');
    }
  };

  const handleDelete = async (schoolId: number) => {
    if (window.confirm('Are you sure you want to delete this school?')) {
      try {
        await schoolsAPI.deleteSchool(schoolId);
        fetchSchools();
      } catch (error) {
        console.error('Error deleting school:', error);
        setError('Failed to delete school');
      }
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

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
          <School sx={{ mr: 1, verticalAlign: 'middle' }} />
          Schools Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add School
        </Button>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Box sx={{ flex: 2, minWidth: 240 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search schools by name, code, principal, or email..."
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
        </Box>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
            >
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="code">Code</MenuItem>
              <MenuItem value="principal">Principal</MenuItem>
              <MenuItem value="created">Created Date</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ flex: 1, minWidth: 140 }}>
          <FormControl fullWidth>
            <InputLabel>Direction</InputLabel>
            <Select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value)}
              label="Direction"
            >
              <MenuItem value="asc">Ascending</MenuItem>
              <MenuItem value="desc">Descending</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>School Name</TableCell>
                  <TableCell>Code</TableCell>
                  <TableCell>Principal</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedSchools.map((school) => (
                  <TableRow key={school.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {school.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {school.address}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={school.code} size="small" />
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          {school.principal_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {school.principal_email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2">
                          <Phone sx={{ fontSize: 14, mr: 0.5 }} />
                          {school.phone}
                        </Typography>
                        <Typography variant="body2">
                          <Email sx={{ fontSize: 14, mr: 0.5 }} />
                          {school.email}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={school.is_active ? 'Active' : 'Inactive'}
                        color={school.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(school)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(school.id)}
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
        </CardContent>
      </Card>

      {/* Add/Edit School Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSchool ? 'Edit School' : 'Add New School (Code Auto-Generated)'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField
              label="School Name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              fullWidth
              required
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Generated Code:
              </Typography>
              <Chip 
                label={formData.name ? generateSchoolCode(formData.name) : 'Enter school name'} 
                color="primary" 
                size="small"
              />
            </Box>
            <TextField
              label="Address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              fullWidth
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              fullWidth
              type="email"
            />
            <TextField
              label="Website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              fullWidth
            />
            <TextField
              label="Principal Name"
              value={formData.principal_name}
              onChange={(e) => handleInputChange('principal_name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Principal Phone"
              value={formData.principal_phone}
              onChange={(e) => handleInputChange('principal_phone', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Principal Email"
              value={formData.principal_email}
              onChange={(e) => handleInputChange('principal_email', e.target.value)}
              fullWidth
              type="email"
              sx={{ gridColumn: '1 / -1' }}
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingSchool ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
};

export default Schools; 