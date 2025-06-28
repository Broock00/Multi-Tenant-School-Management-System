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
  FormHelperText,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
  School,
  Email,
  Phone,
  Search,
  Sort,
} from '@mui/icons-material';
import { usersAPI } from '../services/api';
import { schoolsAPI } from '../services/api';
import { authAPI } from '../services/api';
import Pagination from '@mui/material/Pagination';
import Tooltip from '@mui/material/Tooltip';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  role_display: string;
  phone: string;
  school?: {
    id: number;
    name: string;
    code: string;
  };
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

type UserFormData = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  school: string | number;
  password?: string;
  confirmPassword?: string;
};

type UserSubmitData = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  phone: string;
  school?: number;
  password?: string;
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [schools, setSchools] = useState<Array<{ id: number; name: string; code: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: '',
    phone: '',
    school: '',
    password: '',
    confirmPassword: '',
  });
  const [page, setPage] = useState(1);
  const USERS_PER_PAGE = 15;
  const [planLimits, setPlanLimits] = useState({
    max_teachers: 0,
    max_secretaries: 0,
  });
  const [userCounts, setUserCounts] = useState({
    teachers: 0,
    secretaries: 0,
  });

  useEffect(() => {
    fetchUsers();
    fetchSchools();
    fetchCurrentUser();
    fetchPlanLimitsAndUserCounts();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await usersAPI.getUsers();
      // Handle different response structures
      const usersData = response.data.results || response.data || [];
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
      // Set mock data for demonstration
      setUsers([
        {
          id: 1,
          username: 'admin1',
          email: 'admin1@school.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'school_admin',
          role_display: 'School Admin',
          phone: '+1234567890',
          school: { id: 1, name: 'Springfield High School', code: 'SHS' },
          is_active: true,
          is_verified: true,
          created_at: '2025-01-15T10:00:00Z',
        },
        {
          id: 2,
          username: 'teacher1',
          email: 'teacher1@school.com',
          first_name: 'Jane',
          last_name: 'Smith',
          role: 'teacher',
          role_display: 'Teacher',
          phone: '+1234567891',
          school: { id: 1, name: 'Springfield High School', code: 'SHS' },
          is_active: true,
          is_verified: true,
          created_at: '2025-01-20T14:30:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

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
        { id: 1, name: 'Springfield High School', code: 'SHS' },
        { id: 2, name: 'Riverside Academy', code: 'RA' },
      ]);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const response = await authAPI.getProfile();
      setCurrentUser(response.data);
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchPlanLimitsAndUserCounts = async () => {
    // TODO: Replace with real API call to fetch current plan limits and user counts
    setPlanLimits({ max_teachers: 2, max_secretaries: 1 });
    setUserCounts({
      teachers: users.filter(u => u.role === 'teacher').length,
      secretaries: users.filter(u => u.role === 'secretary').length,
    });
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role_display.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.school?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'alphabet':
        return (a.first_name + ' ' + a.last_name).localeCompare(b.first_name + ' ' + b.last_name);
      case 'role':
        return a.role_display.localeCompare(b.role_display);
      default:
        return 0;
    }
  });

  // Paginate sorted users
  const paginatedUsers = sortedUsers.slice((page - 1) * USERS_PER_PAGE, page * USERS_PER_PAGE);
  const pageCount = Math.ceil(sortedUsers.length / USERS_PER_PAGE);

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        username: user.username,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone,
        school: user.school?.id?.toString() || '',
        password: '',
        confirmPassword: '',
      });
    } else {
      setEditingUser(null);
      // For school admin, automatically set their school
      const defaultSchool = currentUser?.role === 'school_admin' && currentUser?.school?.id 
        ? currentUser.school.id.toString() 
        : '';
      
      setFormData({
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: '',
        phone: '',
        school: defaultSchool,
        password: '',
        confirmPassword: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSubmit = async () => {
    try {
      // Validate password confirmation
      if (formData.password && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }

      // Validate required fields for new users
      if (!editingUser && (!formData.password || !formData.confirmPassword)) {
        setError('Password and confirmation are required for new users');
        return;
      }

      // Validate school field for school admins
      if (currentUser?.role === 'school_admin' && !formData.school) {
        setError('School is required for school admin users');
        return;
      }

      // Create API submission data with proper types
      const apiData: any = {
        username: formData.username,
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        phone: formData.phone,
      };

      // Handle school field conversion
      if (formData.school && formData.school !== '') {
        apiData.school_id = parseInt(formData.school.toString(), 10);
      }

      // Handle password field
      if (formData.password) {
        apiData.password = formData.password;
      }

      if (editingUser) {
        await usersAPI.updateUser(editingUser.id, apiData);
      } else {
        await usersAPI.createUser(apiData);
      }
      fetchUsers();
      handleCloseDialog();
      setSearchTerm(''); // Reset search field after user creation/update
      setError('');
    } catch (error: any) {
      // Show the form dialog if error occurs
      setOpenDialog(true);
      // Try to extract field errors from backend
      let errorMsg = 'Failed to save user: ';
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg += error.response.data;
        } else if (typeof error.response.data === 'object') {
          errorMsg += Object.entries(error.response.data)
            .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
        }
      } else {
        errorMsg += error.message;
      }
      setError(errorMsg);
    }
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await usersAPI.deleteUser(userId);
        fetchUsers();
      } catch (error: any) {
        let errorMsg = 'Failed to delete user';
        if (error.response?.data) {
          if (typeof error.response.data === 'string') {
            errorMsg += ': ' + error.response.data;
          } else if (typeof error.response.data === 'object') {
            errorMsg += ': ' + Object.entries(error.response.data)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join(' | ');
          }
        } else {
          errorMsg += ': ' + error.message;
        }
        setError(errorMsg);
      }
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'error';
      case 'school_admin':
        return 'warning';
      case 'teacher':
        return 'info';
      case 'student':
        return 'success';
      case 'parent':
        return 'secondary';
      case 'principal':
        return 'primary';
      case 'accountant':
        return 'info';
      default:
        return 'default';
    }
  };

  const getAvailableRoles = () => {
    if (!currentUser) return [];
    
    switch (currentUser.role) {
      case 'super_admin':
        return [
          { value: 'super_admin', label: 'Super Admin' },
          { value: 'school_admin', label: 'School Admin' }
        ];
      case 'school_admin':
        return [
          { value: 'principal', label: 'Principal' },
          { value: 'teacher', label: 'Teacher' },
          { value: 'student', label: 'Student' },
          { value: 'parent', label: 'Parent' },
          { value: 'accountant', label: 'Accountant' },
          { value: 'librarian', label: 'Librarian' },
          { value: 'nurse', label: 'Nurse' },
          { value: 'security', label: 'Security' }
        ];
      default:
        return [];
    }
  };

  const getAvailableSchools = () => {
    if (!currentUser) return schools;
    
    switch (currentUser.role) {
      case 'super_admin':
        return schools; // Super admin can see all schools
      case 'school_admin':
        // School admin can only see their own school
        return schools.filter(school => school.id === currentUser.school?.id);
      default:
        return [];
    }
  };

  const canAddTeacher = userCounts.teachers < planLimits.max_teachers;
  const canAddSecretary = userCounts.secretaries < planLimits.max_secretaries;

  if (loading || !currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Check if user has permission to manage users
  if (!['super_admin', 'school_admin'].includes(currentUser.role)) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          You don't have permission to access user management.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          <Person sx={{ mr: 1, verticalAlign: 'middle' }} />
          User Management
        </Typography>
        
        <Tooltip title={!canAddSecretary ? 'Secretary limit reached for your plan' : ''}>
          <span>
            <Button
              variant="contained"
              startIcon={<Add />}
              disabled={!canAddSecretary}
              onClick={() => handleOpenDialog()}
            >
              Add Users
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
        <Box sx={{ flex: 2, minWidth: 240 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search users by name, email, username, role, or school..."
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
        <Box sx={{ flex: 1, minWidth: 180 }}>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="Sort By"
              startAdornment={
                <InputAdornment position="start">
                  <Sort />
                </InputAdornment>
              }
            >
              <MenuItem value="newest">Newest First</MenuItem>
              <MenuItem value="oldest">Oldest First</MenuItem>
              <MenuItem value="alphabet">Alphabetical</MenuItem>
              <MenuItem value="role">By Role</MenuItem>
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
                  <TableCell>User</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>School</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {user.first_name} {user.last_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          @{user.username}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.role_display}
                        color={getRoleColor(user.role) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {user.school ? (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <School sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            {user.school.name}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No school assigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                          <Email sx={{ mr: 1, fontSize: 16 }} />
                          <Typography variant="body2">
                            {user.email}
                          </Typography>
                        </Box>
                        {user.phone && (
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Phone sx={{ mr: 1, fontSize: 16 }} />
                            <Typography variant="body2">
                              {user.phone}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Chip
                          label={user.is_active ? 'Active' : 'Inactive'}
                          color={user.is_active ? 'success' : 'default'}
                          size="small"
                          sx={{ mb: 0.5 }}
                        />
                        {user.is_verified && (
                          <Chip
                            label="Verified"
                            color="info"
                            size="small"
                          />
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleOpenDialog(user)}
                        color="primary"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(user.id)}
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

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Add New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
            <TextField
              label="First Name"
              value={formData.first_name}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              fullWidth
              type="email"
              required
            />
            <TextField
              label="Phone"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              fullWidth
            />
            <FormControl fullWidth required={currentUser?.role === 'school_admin'}>
              <InputLabel>School</InputLabel>
              <Select
                value={formData.school?.toString() || ''}
                onChange={(e) => handleInputChange('school', e.target.value)}
                label="School"
              >
                <MenuItem value="">No School</MenuItem>
                {getAvailableSchools().map((school) => (
                  <MenuItem key={school.id} value={school.id.toString()}>
                    {school.name} ({school.code})
                  </MenuItem>
                ))}
              </Select>
              {currentUser?.role === 'school_admin' && (
                <FormHelperText>School is required for school admin users</FormHelperText>
              )}
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                label="Role"
              >
                {getAvailableRoles().map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              fullWidth
              type="password"
              sx={{ gridColumn: '1 / -1' }}
              helperText={editingUser ? 'Leave blank to keep current password' : 'Required for new users'}
            />
            <TextField
              label="Confirm Password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              fullWidth
              type="password"
              sx={{ gridColumn: '1 / -1' }}
              helperText="Required to confirm new password"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update' : 'Create'}
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

export default Users; 