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
  InputAdornment,
  Pagination,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Edit, Delete, Search, Visibility, VisibilityOff } from '@mui/icons-material';
import { studentsAPI, classesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import dayjs from 'dayjs';
import Avatar from '@mui/material/Avatar';
import { deepPurple, deepOrange, blue, green, pink, teal } from '@mui/material/colors';
import { PieChart } from '@mui/x-charts/PieChart';

interface Student {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    username?: string; // Added for password change
    profile_picture?: string; // Added for profile picture/avatar
  };
  student_id: string;
  current_class?: { id: number; name: string; section: string; academic_year: string } | null;
  academic_status: string;
  payment_status: 'paid' | 'pending';
  date_of_birth?: string;
  gender?: string;
  address?: string;
  phone_number?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  is_active?: boolean;
  blood_group?: string;
  allergies?: string;
  medical_conditions?: string;
  notes?: string;
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

const initialFormData: StudentFormData = {
  first_name: '',
  last_name: '',
  email: '',
  current_class_id: null,
  section: '',
  year: dayjs().year().toString(),
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

const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
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
  const [formAcademicYear, setFormAcademicYear] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [editTab, setEditTab] = useState(0);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [selectedViewStudent, setSelectedViewStudent] = useState<Student | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState(0);
  const [activityStatusFilter, setActivityStatusFilter] = useState<'All' | 'Present' | 'Absent'>('All');

  // Mock data for activities, assessments, and payments
  const mockActivities = [
    { date: '2024-06-01', activity: 'Attended Math class', status: 'Present' },
    { date: '2024-06-02', activity: 'Attended Science class', status: 'Absent' },
  ];
  // Attendance summary for pie chart (mock)
  const attendanceSummary = [
    { id: 0, value: 8, label: 'Present' },
    { id: 1, value: 2, label: 'Absent' },
  ];
  const mockAssessments = [
    { subject: 'Math', type: 'Exam', score: 85, total: 100, date: '2024-06-10' },
    { subject: 'Science', type: 'Assignment', score: 18, total: 20, date: '2024-06-12' },
  ];
  const mockPayments = [
    { month: 'June 2024', status: 'Paid', amount: 100 },
    { month: 'May 2024', status: 'Pending', amount: 100 },
  ];

  const canManage = user?.role === 'school_admin' || user?.role === 'secretary';

  const fetchStudents = async (pageNum: number = 1, query: string = '') => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page: pageNum, page_size: pageSize, ordering: '-current_class__academic_year,-created_at' };
      if (query) {
        params.search = query;
      }
      if (selectedAcademicYear) {
        params['academic_year'] = selectedAcademicYear;
      }
      const response = await studentsAPI.getStudents(params);
      const studentsData = response.data.results || response.data;
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      if (response.data.count !== undefined) {
        setTotalCount(response.data.count);
        setTotalPages(Math.ceil(response.data.count / pageSize));
      }
      setPage(pageNum);
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
      const classesData = response.data.results || response.data;
      console.log(`fetchClasses for ${academicYear || 'all years'}:`, classesData);
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (err) {
      console.error(`Error fetching classes for ${academicYear || 'all years'}:`, err);
      setClasses([]);
    }
  };

  const fetchAcademicYears = async () => {
    try {
      const response = await classesAPI.getAcademicYears();
      const years = response.data.academic_years || [];
      console.log('fetchAcademicYears:', years);
      setAcademicYears(years);
      if (years.length > 0) {
        const latestYear = years[0];
        setSelectedAcademicYear(latestYear);
        setFormAcademicYear(latestYear);
        fetchClasses(latestYear);
      }
    } catch (err) {
      console.error('Error fetching academic years:', err);
      setAcademicYears([]);
    }
  };

  useEffect(() => {
    fetchStudents(1);
    fetchAcademicYears();
  }, []);

  useEffect(() => {
    if (selectedAcademicYear) {
      fetchClasses(selectedAcademicYear);
      fetchStudents(1, search);
      setPage(1);
    }
    // eslint-disable-next-line
  }, [selectedAcademicYear]);

  useEffect(() => {
    if (formAcademicYear) {
      fetchClasses(formAcademicYear);
      setFormData(prev => ({
        ...prev,
        current_class_id: null,
      }));
    }
    // eslint-disable-next-line
  }, [formAcademicYear]);

  const handleSearch = () => {
    setPage(1);
    fetchStudents(1, search);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchStudents(value, search);
  };

  const handleOpenDialog = (student?: Student) => {
    setFormErrors({});
    if (student) {
      setSelectedStudent(student);
      setFormData({
        first_name: student.user.first_name,
        last_name: student.user.last_name,
        email: student.user.email,
        current_class_id: student.current_class ? student.current_class.id : null,
        section: student.current_class ? student.current_class.section : '',
        year: student.current_class ? student.current_class.academic_year : '',
        date_of_birth: student.date_of_birth || '',
        gender: student.gender || '',
        address: student.address || '',
        phone_number: student.phone_number || '',
        emergency_contact: student.emergency_contact || '',
        emergency_contact_name: student.emergency_contact_name || '',
        is_active: student.is_active ?? true,
        academic_status: student.academic_status || 'enrolled',
        blood_group: student.blood_group || '',
        allergies: student.allergies || '',
        medical_conditions: student.medical_conditions || '',
        notes: student.notes || '',
      });
      setFormAcademicYear(student.current_class ? student.current_class.academic_year : '');
      if (student.current_class && student.current_class.academic_year) {
        fetchClasses(student.current_class.academic_year);
      }
    } else {
      setSelectedStudent(null);
      setFormData(initialFormData);
      setFormAcademicYear('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCredentialsDialogOpen(false);
    setSelectedStudent(null);
    setFormData(initialFormData);
    setCredentialsData(initialCredentialsData);
    setFormAcademicYear(academicYears[0] || '');
  };

  const handleFormChange = (field: keyof StudentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormErrors({}); // Clear previous errors
    const currentPageCount = totalPages;
    try {
      if (selectedStudent) {
        await studentsAPI.updateStudent(selectedStudent.id, formData);
        await fetchStudents(page, search);
        handleCloseDialog();
      } else {
        const response = await studentsAPI.createStudentWithCredentials(formData);
        setCredentialsData({
          username: response.data.credentials.username,
          password: response.data.credentials.password,
          showPassword: false,
        });
        setCredentialsDialogOpen(true);
        await fetchStudents(page, search);
        // Do NOT call handleCloseDialog() here!
      }
      // Adjust page only if on the last page and a new page is created
      const newPageCount = Math.ceil(totalCount / pageSize);
      if (!selectedStudent && page === currentPageCount && newPageCount > currentPageCount) {
        setPage(newPageCount);
        fetchStudents(newPageCount, search);
      }
    } catch (err: any) {
      // Field-level error mapping
      if (err.response && err.response.data && typeof err.response.data === 'object') {
        const errors: { [key: string]: string } = {};
        Object.entries(err.response.data).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errors[field] = messages[0];
          } else if (typeof messages === 'string') {
            errors[field] = messages;
          }
        });
        setFormErrors(errors);
      } else {
        setError(err.response?.data?.message || 'Failed to save student.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await studentsAPI.deleteStudent(student.id);
        await fetchStudents(page, search);
        // Adjust page if current page is invalid
        const newPageCount = Math.ceil(totalCount / pageSize);
        if (page > newPageCount && newPageCount > 0) {
          setPage(newPageCount);
          fetchStudents(newPageCount, search);
        }
      } catch (err) {
        setError('Failed to delete student.');
      }
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setEditTab(newValue);
  };
  const handlePasswordFormChange = (field: 'password' | 'confirm', value: string) => {
    setPasswordForm(prev => ({ ...prev, [field]: value }));
    setPasswordError('');
    setPasswordSuccess('');
  };
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (!passwordForm.password || !passwordForm.confirm) {
      setPasswordError('Both fields are required.');
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordError('Passwords do not match.');
      return;
    }
    try {
      await studentsAPI.changeStudentPassword(selectedStudent!.id, passwordForm.password);
      setPasswordSuccess('Password updated successfully.');
      setPasswordForm({ password: '', confirm: '' });
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Failed to update password.');
    }
  };

  const renderClassDropdown = () => (
    <FormControl
      fullWidth
      margin="normal"
      sx={{ minWidth: 120, '& .MuiInputBase-root': { height: 56 } }}
    >
      <InputLabel id="class-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
        Class *
      </InputLabel>
      <Select
        labelId="class-label"
        value={formData.current_class_id || ''}
        onChange={e => handleFormChange('current_class_id', Number(e.target.value) || null)}
        label="Class *"
        required
        inputProps={{ 'aria-label': 'Class' }}
      >
        {classes.length === 0 ? (
          <MenuItem value="" disabled>
            No classes available
          </MenuItem>
        ) : (
          classes.map(cls => (
            <MenuItem key={cls.id} value={cls.id}>
              {cls.name} - {cls.section} ({cls.academic_year})
            </MenuItem>
          ))
        )}
      </Select>
      {formErrors.current_class_id && (
        <Typography color="error" variant="caption">{formErrors.current_class_id}</Typography>
      )}
    </FormControl>
  );

  const renderFormAcademicYearDropdown = () => (
    <FormControl
      fullWidth
      margin="normal"
      sx={{ minWidth: 120, '& .MuiInputBase-root': { height: 56 } }}
    >
      <InputLabel id="academic-year-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
        Academic Year *
      </InputLabel>
      <Select
        labelId="academic-year-label"
        value={formAcademicYear}
        onChange={e => {
          setFormAcademicYear(e.target.value);
          handleFormChange('year', e.target.value);
          handleFormChange('current_class_id', null);
        }}
        label="Academic Year *"
        required
        inputProps={{ 'aria-label': 'Academic Year' }}
      >
        {academicYears.map(year => (
          <MenuItem key={year} value={year}>{year}</MenuItem>
        ))}
      </Select>
      {formErrors.year && (
        <Typography color="error" variant="caption">{formErrors.year}</Typography>
      )}
    </FormControl>
  );

  const renderGenderDropdown = () => (
    <FormControl
      fullWidth
      margin="normal"
      sx={{ minWidth: 120, '& .MuiInputBase-root': { height: 56 } }}
    >
      <InputLabel id="gender-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
        Gender *
      </InputLabel>
      <Select
        labelId="gender-label"
        value={formData.gender}
        onChange={e => handleFormChange('gender', e.target.value)}
        label="Gender *"
        required
        inputProps={{ 'aria-label': 'Gender' }}
      >
        {GENDER_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
      {formErrors.gender && (
        <Typography color="error" variant="caption">{formErrors.gender}</Typography>
      )}
    </FormControl>
  );

  const renderAcademicStatusDropdown = () => (
    <FormControl
      fullWidth
      margin="normal"
      sx={{ minWidth: 120, '& .MuiInputBase-root': { height: 56 } }}
    >
      <InputLabel id="academic-status-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
        Academic Status *
      </InputLabel>
      <Select
        labelId="academic-status-label"
        value={formData.academic_status}
        onChange={e => handleFormChange('academic_status', e.target.value)}
        label="Academic Status *"
        required
        inputProps={{ 'aria-label': 'Academic Status' }}
      >
        {ACADEMIC_STATUS_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
      {formErrors.academic_status && (
        <Typography color="error" variant="caption">{formErrors.academic_status}</Typography>
      )}
    </FormControl>
  );

  const renderBloodGroupDropdown = () => (
    <FormControl
      fullWidth
      margin="normal"
      sx={{ minWidth: 120, '& .MuiInputBase-root': { height: 56 } }}
    >
      <InputLabel id="blood-group-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
        Blood Group
      </InputLabel>
      <Select
        labelId="blood-group-label"
        value={formData.blood_group}
        onChange={e => handleFormChange('blood_group', e.target.value)}
        label="Blood Group"
        inputProps={{ 'aria-label': 'Blood Group' }}
      >
        {BLOOD_GROUP_OPTIONS.map(bg => (
          <MenuItem key={bg} value={bg}>{bg}</MenuItem>
        ))}
      </Select>
      {formErrors.blood_group && (
        <Typography color="error" variant="caption">{formErrors.blood_group}</Typography>
      )}
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
        <FormControl
          sx={{ minWidth: 200, '& .MuiInputBase-root': { height: 56 } }}
          margin="normal"
        >
          <InputLabel id="filter-academic-year-label" shrink sx={{ transform: 'translate(14px, -6px) scale(0.75)' }}>
            Academic Year
          </InputLabel>
          <Select
            labelId="filter-academic-year-label"
            value={selectedAcademicYear}
            onChange={e => setSelectedAcademicYear(e.target.value)}
            label="Academic Year"
            inputProps={{ 'aria-label': 'Filter Academic Year' }}
          >
            {academicYears.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          variant="outlined"
          size="small"
          placeholder="Search by name or student ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          InputProps={{ startAdornment: <Search sx={{ mr: 1 }} /> }}
          InputLabelProps={{ shrink: true }}
          sx={{ '& .MuiInputBase-root': { height: 40 }, minWidth: 250 }}
        />
        <Button variant="outlined" onClick={handleSearch} disabled={loading} sx={{ height: 40 }}>
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
            <>
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
                    {(Array.isArray(students) ? students : []).map((student, index) => (
                      <TableRow
                        key={student.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={e => {
                          // Prevent opening view dialog when clicking action icons
                          if ((e.target as HTMLElement).closest('button')) return;
                          setSelectedViewStudent(student);
                          setViewDialogOpen(true);
                          setDetailsTab(0);
                        }}
                      >
                        <TableCell>{(page - 1) * pageSize + index + 1}</TableCell>
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
                              <IconButton onClick={e => { e.stopPropagation(); handleOpenDialog(student); }}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton onClick={e => { e.stopPropagation(); handleDelete(student); }}>
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
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Page {page} of {totalPages} • Showing {students.length} of {totalCount} students
                  </Typography>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={handlePageChange}
                    color="primary"
                  />
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Student Form Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
        {selectedStudent ? (
          <Tabs value={editTab} onChange={handleTabChange} sx={{ px: 3, pt: 1 }}>
            <Tab label="Main Information" />
            <Tab label="Password Change" />
          </Tabs>
        ) : null}
        <form onSubmit={handleFormSubmit} style={{ display: editTab === 0 ? 'block' : 'none' }}>
          <DialogContent sx={{ py: 3 }}>
            <Typography variant="h6" gutterBottom>
              Personal Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="First Name"
                  value={formData.first_name}
                  onChange={e => handleFormChange('first_name', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.first_name}
                  helperText={formErrors.first_name}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Last Name"
                  value={formData.last_name}
                  onChange={e => handleFormChange('last_name', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.last_name}
                  helperText={formErrors.last_name}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Email"
                  value={formData.email}
                  onChange={e => handleFormChange('email', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.email}
                  helperText={formErrors.email}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Date of Birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={e => handleFormChange('date_of_birth', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.date_of_birth}
                  helperText={formErrors.date_of_birth}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                {renderGenderDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                {renderBloodGroupDropdown()}
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Academic Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                {renderFormAcademicYearDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                {renderClassDropdown()}
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                {renderAcademicStatusDropdown()}
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Contact Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Address"
                  value={formData.address}
                  onChange={e => handleFormChange('address', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.address}
                  helperText={formErrors.address}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Phone Number"
                  value={formData.phone_number}
                  onChange={e => handleFormChange('phone_number', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.phone_number}
                  helperText={formErrors.phone_number}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Emergency Contact"
                  value={formData.emergency_contact}
                  onChange={e => handleFormChange('emergency_contact', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.emergency_contact}
                  helperText={formErrors.emergency_contact}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Emergency Contact Name"
                  value={formData.emergency_contact_name}
                  onChange={e => handleFormChange('emergency_contact_name', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  required
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.emergency_contact_name}
                  helperText={formErrors.emergency_contact_name}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
              Additional Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Allergies"
                  value={formData.allergies}
                  onChange={e => handleFormChange('allergies', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.allergies}
                  helperText={formErrors.allergies}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Medical Condition"
                  value={formData.medical_conditions}
                  onChange={e => handleFormChange('medical_conditions', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  sx={{ '& .MuiInputBase-root': { height: 56 } }}
                  error={!!formErrors.medical_conditions}
                  helperText={formErrors.medical_conditions}
                />
              </Grid>
              <Grid sx={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center' }}>
                <TextField
                  label="Notes"
                  value={formData.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  fullWidth
                  margin="normal"
                  InputLabelProps={{ shrink: true }}
                  variant="outlined"
                  multiline
                  rows={4}
                />
              </Grid>
              <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}>
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
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseDialog} variant="outlined">
              Cancel
            </Button>
            <Button
              variant="contained"
              type="submit"
              disabled={submitting}
            >
              {submitting ? <CircularProgress size={20} /> : 'Save'}
            </Button>
          </DialogActions>
        </form>
        {selectedStudent && (
          <form onSubmit={handlePasswordChange} style={{ display: editTab === 1 ? 'block' : 'none' }}>
            <DialogContent sx={{ py: 3 }}>
              <Typography variant="h6" gutterBottom>Change Password</Typography>
              <Divider sx={{ mb: 2 }} />
              <TextField
                label="Username"
                value={selectedStudent.user?.username || ''}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                sx={{ '& .MuiInputBase-root': { height: 56 } }}
                InputProps={{ readOnly: true }}
              />
              <TextField
                label="New Password"
                type="password"
                value={passwordForm.password}
                onChange={e => handlePasswordFormChange('password', e.target.value)}
                fullWidth
                margin="normal"
                required
                variant="outlined"
                sx={{ '& .MuiInputBase-root': { height: 56 } }}
              />
              <TextField
                label="Confirm Password"
                type="password"
                value={passwordForm.confirm}
                onChange={e => handlePasswordFormChange('confirm', e.target.value)}
                fullWidth
                margin="normal"
                required
                variant="outlined"
                sx={{ '& .MuiInputBase-root': { height: 56 } }}
              />
              {passwordError && <Alert severity="error" sx={{ mt: 2 }}>{passwordError}</Alert>}
              {passwordSuccess && <Alert severity="success" sx={{ mt: 2 }}>{passwordSuccess}</Alert>}
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={handleCloseDialog} variant="outlined">Cancel</Button>
              <Button variant="contained" type="submit">Change Password</Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* Credentials Dialog */}
      <Dialog open={credentialsDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Student Credentials Generated</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            The student account has been created successfully. Please save these credentials securely.
          </Alert>
          <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
            <Grid sx={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Username"
                value={credentialsData.username}
                onChange={e => setCredentialsData(prev => ({ ...prev, username: e.target.value }))}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                sx={{ '& .MuiInputBase-root': { height: 56 } }}
              />
            </Grid>
            <Grid sx={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center' }}>
              <TextField
                label="Password"
                type={credentialsData.showPassword ? 'text' : 'password'}
                value={credentialsData.password}
                onChange={e => setCredentialsData(prev => ({ ...prev, password: e.target.value }))}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
                variant="outlined"
                sx={{ '& .MuiInputBase-root': { height: 56 } }}
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleCloseDialog} variant="contained">
            Done
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Student Details</DialogTitle>
        <DialogContent sx={{ py: 3 }}>
          {selectedViewStudent && (
            <Box>
              <Tabs value={detailsTab} onChange={(_e, v) => setDetailsTab(v)} sx={{ mb: 2 }}>
                <Tab label="Info" />
                <Tab label="Activities" />
                <Tab label="Assessments" />
                <Tab label="Payments" />
              </Tabs>
              {detailsTab === 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2 }}>Personal & Academic Info</Typography>
                  <Divider sx={{ mb: 2 }} />
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 4, mb: 2 }}>
                    {/* Profile Image/Avatar */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 120 }}>
                      {selectedViewStudent.user.profile_picture ? (
                        <Avatar
                          src={selectedViewStudent.user.profile_picture}
                          alt={selectedViewStudent.user.first_name + ' ' + selectedViewStudent.user.last_name}
                          sx={{ width: 96, height: 96, mb: 1 }}
                        />
                      ) : (
                        <Avatar
                          sx={{ width: 96, height: 96, mb: 1, bgcolor: getAvatarColor(selectedViewStudent.user.id) }}
                        >
                          {selectedViewStudent.user.first_name?.[0] || ''}{selectedViewStudent.user.last_name?.[0] || ''}
                        </Avatar>
                      )}
                      <Button size="small" variant="outlined" sx={{ mt: 1 }} disabled>
                        Upload Image
                      </Button>
                    </Box>
                    {/* Info Columns */}
                    <Grid container spacing={2} sx={{ flex: 1 }}>
                      <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><b>Name:</b> {selectedViewStudent.user.first_name} {selectedViewStudent.user.last_name}</Typography>
                        <Typography><b>Email:</b> {selectedViewStudent.user.email}</Typography>
                        <Typography><b>Student ID:</b> {selectedViewStudent.student_id}</Typography>
                        <Typography><b>Username:</b> {selectedViewStudent.user.username || '-'}</Typography>
                        <Typography><b>Date of Birth:</b> {selectedViewStudent.date_of_birth || '-'}</Typography>
                        <Typography><b>Gender:</b> {selectedViewStudent.gender || '-'}</Typography>
                        <Typography><b>Blood Group:</b> {selectedViewStudent.blood_group || '-'}</Typography>
                      </Grid>
                      <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Typography><b>Class:</b> {selectedViewStudent.current_class ? `${selectedViewStudent.current_class.name}${selectedViewStudent.current_class.section ? ' - ' + selectedViewStudent.current_class.section : ''} (${selectedViewStudent.current_class.academic_year})` : '-'}</Typography>
                        <Typography><b>Academic Status:</b> {selectedViewStudent.academic_status}</Typography>
                        <Typography><b>Payment Status:</b> {selectedViewStudent.payment_status === 'paid' ? 'Paid' : 'Pending'}</Typography>
                        <Typography><b>Phone Number:</b> {selectedViewStudent.phone_number || '-'}</Typography>
                        <Typography><b>Address:</b> {selectedViewStudent.address || '-'}</Typography>
                        <Typography><b>Emergency Contact:</b> {selectedViewStudent.emergency_contact || '-'}</Typography>
                        <Typography><b>Emergency Contact Name:</b> {selectedViewStudent.emergency_contact_name || '-'}</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Additional Information</Typography>
                  <Grid container spacing={2} sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
                    <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}><b>Allergies:</b> {selectedViewStudent.allergies || '-'}</Grid>
                    <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' }, display: 'flex', alignItems: 'center' }}><b>Medical Conditions:</b> {selectedViewStudent.medical_conditions || '-'}</Grid>
                    <Grid sx={{ gridColumn: 'span 12', display: 'flex', alignItems: 'center' }}><b>Notes:</b> {selectedViewStudent.notes || '-'}</Grid>
                  </Grid>
                </Box>
              )}
              {detailsTab === 1 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Class Activities</Typography>
                  <Box sx={{ maxWidth: 300, mb: 2 }}>
                    <PieChart
                      series={[{
                        data: attendanceSummary,
                        innerRadius: 40,
                        outerRadius: 80,
                        paddingAngle: 2,
                      }]}
                      width={300}
                      height={200}
                    />
                  </Box>
                  {/* Filter for Present/Absent */}
                  <Box sx={{ mb: 2, maxWidth: 200 }}>
                    <TextField
                      select
                      label="Filter by Status"
                      value={activityStatusFilter}
                      onChange={e => setActivityStatusFilter(e.target.value as 'All' | 'Present' | 'Absent')}
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="All">All</MenuItem>
                      <MenuItem value="Present">Present</MenuItem>
                      <MenuItem value="Absent">Absent</MenuItem>
                    </TextField>
                  </Box>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Activity</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockActivities
                        .filter(a => activityStatusFilter === 'All' || a.status === activityStatusFilter)
                        .map((a, i) => (
                          <TableRow key={i}>
                            <TableCell>{a.date}</TableCell>
                            <TableCell>{a.activity}</TableCell>
                            <TableCell>{a.status}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              {detailsTab === 2 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Assessment Results</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Subject</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Score</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockAssessments.map((a, i) => (
                        <TableRow key={i}>
                          <TableCell>{a.subject}</TableCell>
                          <TableCell>{a.type}</TableCell>
                          <TableCell>{a.score}</TableCell>
                          <TableCell>{a.total}</TableCell>
                          <TableCell>{a.date}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              {detailsTab === 3 && (
                <Box>
                  <Typography variant="h6" gutterBottom>Payment Information</Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockPayments.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell>{p.month}</TableCell>
                          <TableCell>{p.status}</TableCell>
                          <TableCell>{p.amount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewDialogOpen(false)} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Helper for avatar color
function getAvatarColor(id: number) {
  const colors = [deepPurple[500], deepOrange[500], blue[500], green[500], pink[500], teal[500]];
  return colors[id % colors.length];
}

export default Students;