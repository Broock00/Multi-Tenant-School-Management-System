import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Tooltip,
  Chip,
  Alert,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Checkbox,
  FormControlLabel,
  Stepper,
  Step,
  StepLabel,
  InputAdornment,
  IconButton as MuiIconButton,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Edit, Delete, Search, Visibility, VisibilityOff } from '@mui/icons-material';
import { studentsAPI, classesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';

interface Student {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  student_id: string;
  current_class?: { id: number; name: string; section: string; academic_year: string } | null;
  academic_status: string;
  payment_status: 'paid' | 'pending';
}

interface Class {
  id: number;
  name: string;
  section: string;
  academic_year: string;
  school: number;
  school_name: string;
  capacity: number;
  students_count: number;
  subjects_count: number;
  is_active: boolean;
}

interface StudentFormData {
  first_name: string;
  last_name: string;
  email: string;
  current_class_id: number | null;
  section: string;
  year: string;
  date_of_birth: string;
  gender: string;
  address: string;
  phone_number: string;
  emergency_contact: string;
  emergency_contact_name: string;
  is_active: boolean;
  academic_status: string;
  blood_group: string;
  allergies: string;
  medical_conditions: string;
  notes: string;
}

interface CredentialsData {
  username: string;
  password: string;
  showPassword: boolean;
}

const currentYear = dayjs().year();
const years = Array.from({ length: 11 }, (_, i) => (currentYear - i).toString());

const initialFormData: StudentFormData = {
  first_name: '',
  last_name: '',
  email: '',
  current_class_id: null,
  section: '',
  year: currentYear.toString(),
  date_of_birth: '',
  gender: '',
  address: '',
  phone_number: '',
  emergency_contact: '',
  emergency_contact_name: '',
  is_active: true,
  academic_status: 'enrolled',
  blood_group: '',
  allergies: '',
  medical_conditions: '',
  notes: '',
};

const initialCredentialsData: CredentialsData = {
  username: '',
  password: '',
  showPassword: false,
};

const BLOOD_GROUP_OPTIONS = [
  'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'
];
const GENDER_OPTIONS = [
  { value: 'M', label: 'Male' },
  { value: 'F', label: 'Female' },
  { value: 'O', label: 'Other' },
];
const ACADEMIC_STATUS_OPTIONS = [
  { value: 'enrolled', label: 'Enrolled' },
  { value: 'transferred', label: 'Transferred' },
  { value: 'expelled', label: 'Expelled' },
];

const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

const Students: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [credentialsDialogOpen, setCredentialsDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>(initialFormData);
  const [credentialsData, setCredentialsData] = useState<CredentialsData>(initialCredentialsData);
  const [classes, setClasses] = useState<Class[]>([]);
  const [academicYears, setAcademicYears] = useState<string[]>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [activeStep, setActiveStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === 'school_admin' || user?.role === 'secretary';

  const fetchStudents = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      let response;
      if (query) {
        response = await studentsAPI.searchStudents(query);
      } else {
        response = await studentsAPI.getStudents();
      }
      setStudents(Array.isArray(response.data) ? response.data : []);
    } catch (err: any) {
      setError('Failed to load students.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async (academicYear?: string) => {
    try {
      const params = academicYear ? { academic_year: academicYear } : {};
      const response = await classesAPI.getClasses(params);
      // Handle both paginated and non-paginated responses
      const classesData = response.data.results || response.data;
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setClasses([]);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await classesAPI.getAcademicYears();
      const years = response.data.academic_years || [];
      setAcademicYears(years);
      if (years.length > 0 && !selectedAcademicYear) {
        setSelectedAcademicYear(years[0]); // Set to latest year
        fetchClasses(years[0]);
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setAcademicYears([]);
    }
  };

  useEffect(() => {
    fetchStudents();
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedAcademicYear) {
      fetchClasses(selectedAcademicYear);
    }
  }, [selectedAcademicYear]);

  const handleSearch = () => {
    fetchStudents(search);
  };

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setFormData({
        first_name: student.user.first_name,
        last_name: student.user.last_name,
        email: student.user.email,
        current_class_id: student.current_class ? student.current_class.id : null,
        section: student.current_class && student.current_class.section ? student.current_class.section : '',
        year: currentYear.toString(),
        date_of_birth: '',
        gender: '',
        address: '',
        phone_number: '',
        emergency_contact: '',
        emergency_contact_name: '',
        is_active: true,
        academic_status: student.academic_status,
        blood_group: '',
        allergies: '',
        medical_conditions: '',
        notes: '',
      });
    } else {
      setFormData(initialFormData);
    }
    setSelectedStudent(student || null);
    setActiveStep(0);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedStudent(null);
    setCredentialsDialogOpen(false);
    setCredentialsData(initialCredentialsData);
  };

  const handleFormChange = (field: keyof StudentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      if (selectedStudent) {
        // Update existing student
        await studentsAPI.updateStudent(selectedStudent.id, formData);
        fetchStudents();
        handleCloseDialog();
      } else {
        // Create new student with credentials
        const response = await studentsAPI.createStudentWithCredentials(formData);
        setCredentialsData({
          username: response.data.credentials.username,
          password: response.data.credentials.password,
          showPassword: false,
        });
        setCredentialsDialogOpen(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save student.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (student: Student) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      studentsAPI.deleteStudent(student.id).then(() => {
        fetchStudents();
      }).catch(() => {
        setError('Failed to delete student.');
      });
    }
  };

  const renderClassDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel>Class *</InputLabel>
      <Select
        value={formData.current_class_id || ''}
        onChange={e => handleFormChange('current_class_id', e.target.value)}
        label="Class *"
        required
      >
        {classes.map(cls => (
          <MenuItem key={cls.id} value={cls.id}>
            {cls.name} - {cls.section} ({cls.academic_year})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderAcademicYearDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel>Academic Year</InputLabel>
      <Select
        value={selectedAcademicYear}
        onChange={e => setSelectedAcademicYear(e.target.value)}
        label="Academic Year"
      >
        {academicYears.map(year => (
          <MenuItem key={year} value={year}>{year}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderGenderDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel>Gender *</InputLabel>
      <Select
        value={formData.gender}
        onChange={e => handleFormChange('gender', e.target.value)}
        label="Gender *"
        required
      >
        {GENDER_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderYearDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel>Year *</InputLabel>
      <Select
        value={formData.year}
        onChange={e => handleFormChange('year', e.target.value)}
        label="Year *"
        required
      >
        {years.map(year => (
          <MenuItem key={year} value={year}>{year}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderAcademicStatusDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel>Academic Status *</InputLabel>
      <Select
        value={formData.academic_status}
        onChange={e => handleFormChange('academic_status', e.target.value)}
        label="Academic Status *"
        required
      >
        {ACADEMIC_STATUS_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderBloodGroupDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined">
      <InputLabel>Blood Group</InputLabel>
      <Select
        value={formData.blood_group}
        onChange={e => handleFormChange('blood_group', e.target.value)}
        label="Blood Group"
      >
        {BLOOD_GROUP_OPTIONS.map(bg => (
          <MenuItem key={bg} value={bg}>{bg}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Students Management
        </Typography>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Student
          </Button>
        )}
      </Box>
      
      {/* Academic Year Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
        <Typography variant="body2" sx={{ minWidth: 100 }}>
          Academic Year:
        </Typography>
        {renderAcademicYearDropdown()}
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by name or student ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          InputProps={{ startAdornment: <Search sx={{ mr: 1 }} /> }}
        />
        <Button variant="outlined" onClick={handleSearch} disabled={loading}>
          Search
        </Button>
      </Box>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Class</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Payment Status</TableCell>
                    {canManage && <TableCell>Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(Array.isArray(students) ? students : []).map(student => (
                    <TableRow key={student.id}>
                      <TableCell>{student.id}</TableCell>
                      <TableCell>{student.user.first_name} {student.user.last_name}</TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>
                        {student.current_class
                          ? `${student.current_class.name}${student.current_class.section ? ' - ' + student.current_class.section : ''} (${student.current_class.academic_year})`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={student.academic_status}
                          size="small"
                          color={student.academic_status === 'enrolled' ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={student.payment_status === 'paid' ? 'Paid' : 'Pending'}
                          color={student.payment_status === 'paid' ? 'success' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                      {canManage && (
                        <TableCell>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleOpenDialog(student)}>
                              <Edit />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton onClick={() => handleDelete(student)}>
                              <Delete />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Student Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent>
            <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="First Name"
                  value={formData.first_name}
                  onChange={e => handleFormChange('first_name', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Last Name"
                  value={formData.last_name}
                  onChange={e => handleFormChange('last_name', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Email"
                  value={formData.email}
                  onChange={e => handleFormChange('email', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                {renderClassDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                {renderGenderDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                {renderYearDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={e => handleFormChange('date_of_birth', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Address"
                  value={formData.address}
                  onChange={e => handleFormChange('address', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Phone Number"
                  value={formData.phone_number}
                  onChange={e => handleFormChange('phone_number', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Emergency Contact"
                  value={formData.emergency_contact}
                  onChange={e => handleFormChange('emergency_contact', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Emergency Contact Name"
                  value={formData.emergency_contact_name}
                  onChange={e => handleFormChange('emergency_contact_name', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                {renderAcademicStatusDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                {renderBloodGroupDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Allergies"
                  value={formData.allergies}
                  onChange={e => handleFormChange('allergies', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                <TextField
                  label="Medical Condition"
                  value={formData.medical_conditions}
                  onChange={e => handleFormChange('medical_conditions', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: 'span 12' }}>
                <TextField
                  label="Notes"
                  value={formData.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'flex-end' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={formData.is_active}
                      onChange={e => handleFormChange('is_active', e.target.checked)}
                    />
                  }
                  label="Active"
                  sx={{ mb: 1 }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              variant="contained" 
              type="submit" 
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Student Credentials Generated</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            The student account has been created successfully. Please save these credentials securely.
          </Alert>
          <Grid container spacing={2}>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <TextField
                label="Username"
                value={credentialsData.username}
                onChange={e => setCredentialsData(prev => ({ ...prev, username: e.target.value }))}
                fullWidth
                margin="dense"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <TextField
                label="Password"
                type={credentialsData.showPassword ? 'text' : 'password'}
                value={credentialsData.password}
                onChange={e => setCredentialsData(prev => ({ ...prev, password: e.target.value }))}
                fullWidth
                margin="dense"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setCredentialsData(prev => ({ ...prev, showPassword: !prev.showPassword }))}
                        edge="end"
                      >
                        {credentialsData.showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Students; 