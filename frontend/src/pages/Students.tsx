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
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Edit, Delete, Search } from '@mui/icons-material';
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
  current_class?: { name: string; section: string } | null;
  academic_status: string;
  payment_status: 'paid' | 'pending';
}

interface StudentFormData {
  first_name: string;
  last_name: string;
  email: string;
  current_class_id: string;
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

const currentYear = dayjs().year();
const years = Array.from({ length: 11 }, (_, i) => (currentYear - i).toString());

const initialFormData: StudentFormData = {
  first_name: '',
  last_name: '',
  email: '',
  current_class_id: '',
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>(initialFormData);
  const [classes, setClasses] = useState<{ id: number; name: string; section: string }[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');

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

  const fetchClasses = async () => {
    try {
      const response = await classesAPI.getClasses();
      setClasses(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setClasses([]);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleSearch = () => {
    fetchStudents(search);
  };

  const handleOpenDialog = (student?: Student) => {
    fetchClasses();
    if (student) {
      setFormData({
        first_name: student.user.first_name,
        last_name: student.user.last_name,
        email: student.user.email,
        current_class_id: student.current_class ? student.current_class.name : '',
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
      setSelectedClassId(student.current_class ? student.current_class.name : '');
    } else {
      setFormData(initialFormData);
      setSelectedClassId('');
    }
    setSelectedStudent(student || null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedStudent(null);
  };

  const handleFormChange = (field: keyof StudentFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Student form data:', formData);
    setDialogOpen(false);
  };

  const handleDelete = (student: Student) => {
    alert(`Delete student ${student.student_id}`);
  };

  const renderClassDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined" sx={{ minWidth: 220 }}>
      <InputLabel shrink={true} variant="outlined" sx={{ width: 'auto', minWidth: 220 }}>Class *</InputLabel>
      <Select
        value={selectedClassId}
        onChange={e => {
          setSelectedClassId(e.target.value);
          handleFormChange('current_class_id', e.target.value);
        }}
        label="Class *"
        required
        fullWidth
        variant="outlined"
        style={{ minWidth: 220 }}
      >
        {Array.from(new Set(classes.map(cls => cls.name))).map(className => (
          <MenuItem key={className} value={className}>{className}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderGenderDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined" sx={{ minWidth: 220 }}>
      <InputLabel shrink={true} variant="outlined" sx={{ width: 'auto', minWidth: 220 }}>Gender *</InputLabel>
      <Select
        value={formData.gender}
        onChange={e => handleFormChange('gender', e.target.value)}
        label="Gender *"
        required
        fullWidth
        variant="outlined"
        style={{ minWidth: 220 }}
      >
        {GENDER_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderYearDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined" sx={{ minWidth: 220 }}>
      <InputLabel shrink={true} variant="outlined" sx={{ width: 'auto', minWidth: 220 }}>Year *</InputLabel>
      <Select
        value={formData.year}
        onChange={e => handleFormChange('year', e.target.value)}
        label="Year *"
        required
        fullWidth
        variant="outlined"
        style={{ minWidth: 220 }}
      >
        {years.map(year => (
          <MenuItem key={year} value={year}>{year}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderAcademicStatusDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined" sx={{ minWidth: 220 }}>
      <InputLabel shrink={true} variant="outlined" sx={{ width: 'auto', minWidth: 220 }}>Academic Status *</InputLabel>
      <Select
        value={formData.academic_status}
        onChange={e => handleFormChange('academic_status', e.target.value)}
        label="Academic Status *"
        required
        fullWidth
        variant="outlined"
        style={{ minWidth: 220 }}
      >
        {ACADEMIC_STATUS_OPTIONS.map(opt => (
          <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  const renderBloodGroupDropdown = (): React.ReactNode => (
    <FormControl fullWidth margin="dense" variant="outlined" sx={{ minWidth: 220 }}>
      <InputLabel shrink={true} variant="outlined" sx={{ width: 'auto', minWidth: 220 }}>Blood Group</InputLabel>
      <Select
        value={formData.blood_group}
        onChange={e => handleFormChange('blood_group', e.target.value)}
        label="Blood Group"
        fullWidth
        variant="outlined"
        style={{ minWidth: 220 }}
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
                          ? `${student.current_class.name}${student.current_class.section ? ' - ' + student.current_class.section : ''}`
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
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>{selectedStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              {/* Row 1 */}
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
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
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
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
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                <TextField
                  label="Email"
                  value={formData.email}
                  onChange={e => handleFormChange('email', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {/* Row 2 */}
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                {renderClassDropdown()}
              </Grid>
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                {renderGenderDropdown()}
              </Grid>
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                {renderYearDropdown()}
              </Grid>
              {/* Row 3 */}
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
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
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                <TextField
                  label="Address"
                  value={formData.address}
                  onChange={e => handleFormChange('address', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                <TextField
                  label="Phone Number"
                  value={formData.phone_number}
                  onChange={e => handleFormChange('phone_number', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {/* Row 4 */}
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                <TextField
                  label="Emergency Contact"
                  value={formData.emergency_contact}
                  onChange={e => handleFormChange('emergency_contact', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                <TextField
                  label="Emergency Contact Name"
                  value={formData.emergency_contact_name}
                  onChange={e => handleFormChange('emergency_contact_name', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                {renderAcademicStatusDropdown()}
              </Grid>
              {/* Row 5 */}
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                {renderBloodGroupDropdown()}
              </Grid>
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                <TextField
                  label="Allergies"
                  value={formData.allergies}
                  onChange={e => handleFormChange('allergies', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4} {...({ item: true } as any)}>
                <TextField
                  label="Medical Condition"
                  value={formData.medical_conditions}
                  onChange={e => handleFormChange('medical_conditions', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {/* Row 6: Notes full width */}
              <Grid item xs={12} {...({ item: true } as any)}>
                <TextField
                  label="Notes"
                  value={formData.notes}
                  onChange={e => handleFormChange('notes', e.target.value)}
                  fullWidth
                  margin="dense"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              {/* Active checkbox at the left bottom corner */}
              <Grid item xs={12} md={4} {...({ item: true } as any)} sx={{ display: 'flex', alignItems: 'flex-end' }}>
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
              {selectedClassId && (
                <Grid item xs={12} md={4} {...({ item: true } as any)}>
                  <FormControl fullWidth margin="dense" variant="outlined" sx={{ minWidth: 220 }}>
                    <InputLabel shrink={true} variant="outlined" sx={{ width: 'auto', minWidth: 220 }}>Section</InputLabel>
                    <Select
                      value={formData.section}
                      onChange={e => handleFormChange('section', e.target.value)}
                      label="Section"
                      fullWidth
                      variant="outlined"
                      style={{ minWidth: 220 }}
                    >
                      {SECTION_OPTIONS.map(section => (
                        <MenuItem key={section} value={section}>{section}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button variant="contained" type="submit">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Students; 