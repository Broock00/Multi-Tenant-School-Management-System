import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel,
  CircularProgress, Tooltip, Chip, Alert, MenuItem, FormControl, InputLabel, Select, InputAdornment
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Edit, Delete, Group, School, Person, Email, Phone, Search, Clear } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { teachersAPI, usersAPI, subjectsAPI, classSubjectsAPI } from '../services/api';
import Pagination from '@mui/material/Pagination';

interface TeacherItem {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    is_active: boolean;
    created_at: string;
  };
  employee_id: string;
  department: string;
  qualification: string;
  experience_years: number;
  subjects: Array<{
    id: number;
    name: string;
    code: string;
  }>;
  is_head_teacher: boolean;
  can_manage_students: boolean;
  can_manage_attendance: boolean;
  can_manage_grades: boolean;
  can_send_notifications: boolean;
  can_view_reports: boolean;
}

interface StudentItem {
  id: number;
  user: { first_name: string; last_name: string; email: string };
  student_id: string;
  academic_status: string;
}

interface ClassItem {
  id: number;
  name: string;
  section: string;
  academic_year: string;
  students_count: number;
  subjects_count: number;
}

interface ClassAssignmentItem {
  id: number;
  class_obj: {
    id: number;
    name: string;
    section: string;
    academic_year: string;
    school_name: string;
  };
  subject: {
    id: number;
    name: string;
    code: string;
  };
  teacher_info: {
    id: number;
    name: string;
    employee_id: string;
  } | null;
  is_compulsory: boolean;
  created_at: string;
}

interface SubjectItem {
  id: number;
  name: string;
  code: string;
  description: string;
  is_core: boolean;
  is_active: boolean;
}

const initialForm = {
  user_id: '',
  employee_id: '',
  department: '',
  qualification: '',
  experience_years: 0,
  is_head_teacher: false,
  can_manage_students: true,
  can_manage_attendance: true,
  can_manage_grades: true,
  can_send_notifications: true,
  can_view_reports: true,
};

const initialUserForm = {
  username: '',
  email: '',
  first_name: '',
  last_name: '',
  phone: '',
  password: '',
  role: 'teacher',
};

const Teachers: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'school_admin' || user?.role === 'principal';
  
  // State for teachers list
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // State for filtering
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [qualificationFilter, setQualificationFilter] = useState<string>('');
  const [subjectFilter, setSubjectFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [qualifications, setQualifications] = useState<string[]>([]);
  
  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // State for subjects
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  
  // State for dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [createUserMode, setCreateUserMode] = useState(false);
  
  // State for subject creation dialog
  const [subjectDialogOpen, setSubjectDialogOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    name: '',
    code: '',
    description: '',
    is_core: true,
    is_active: true,
  });
  
  // State for modals
  const [studentsModal, setStudentsModal] = useState<{ open: boolean; teacherId: number | null; students: StudentItem[] }>({ open: false, teacherId: null, students: [] });
  const [classesModal, setClassesModal] = useState<{ open: boolean; teacherId: number | null; assignments: ClassAssignmentItem[] }>({ open: false, teacherId: null, assignments: [] });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchTeachers = async (pageNum: number = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page: pageNum, page_size: pageSize };
      if (departmentFilter) {
        params.department = departmentFilter;
      }
      if (qualificationFilter) {
        params.qualification = qualificationFilter;
      }
      if (subjectFilter) {
        params.subject = subjectFilter;
      }
      if (searchQuery) {
        params.search = searchQuery;
      }
      
      const res = await teachersAPI.getTeachers(params);
      const teachersData = res.data.results || res.data;
      const teachersArray = Array.isArray(teachersData) ? teachersData : [];
      
      setTeachers(teachersArray);
      
      // Update pagination info
      if (res.data.count !== undefined) {
        setTotalCount(res.data.count);
        setTotalPages(Math.ceil(res.data.count / pageSize));
      }
      setPage(pageNum);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      setError('Failed to fetch teachers.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await teachersAPI.getDepartments();
      setDepartments(res.data.departments || []);
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchQualifications = async () => {
    try {
      const res = await teachersAPI.getQualifications();
      setQualifications(res.data.qualifications || []);
    } catch (err) {
      console.error('Error fetching qualifications:', err);
    }
  };

  const fetchSubjects = async () => {
    setSubjectsLoading(true);
    try {
      const res = await subjectsAPI.getSubjects();
      const subjectsData = res.data.results || res.data;
      const subjectsArray = Array.isArray(subjectsData) ? subjectsData : [];
      setSubjects(subjectsArray);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    } finally {
      setSubjectsLoading(false);
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    fetchTeachers(value);
  };

  const handleDepartmentFilterChange = (department: string) => {
    setDepartmentFilter(department);
    setPage(1);
    fetchTeachers(1);
  };

  const handleQualificationFilterChange = (qualification: string) => {
    setQualificationFilter(qualification);
    setPage(1);
    fetchTeachers(1);
  };

  const handleSubjectFilterChange = (subject: string) => {
    setSubjectFilter(subject);
    setPage(1);
    fetchTeachers(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1);
    
    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Set new timeout for debounced search
    const newTimeout = setTimeout(() => {
      fetchTeachers(1);
    }, 300); // 300ms delay
    
    setSearchTimeout(newTimeout);
  };

  const clearFilters = () => {
    // Clear all filters
    setDepartmentFilter('');
    setQualificationFilter('');
    setSubjectFilter('');
    setSearchQuery('');
    setPage(1);
    
    // Clear any pending search timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
      setSearchTimeout(null);
    }
    
    // Fetch teachers without any filters
    fetchTeachers(1);
  };

  const handleOpenDialog = (teacher?: TeacherItem) => {
    if (teacher) {
      setForm({
        user_id: teacher.user.id.toString(),
        employee_id: teacher.employee_id,
        department: teacher.department,
        qualification: teacher.qualification,
        experience_years: teacher.experience_years,
        is_head_teacher: teacher.is_head_teacher,
        can_manage_students: teacher.can_manage_students,
        can_manage_attendance: teacher.can_manage_attendance,
        can_manage_grades: teacher.can_manage_grades,
        can_send_notifications: teacher.can_send_notifications,
        can_view_reports: teacher.can_view_reports,
      });
      setUserForm({
        username: teacher.user.first_name.toLowerCase() + '.' + teacher.user.last_name.toLowerCase(),
        email: teacher.user.email,
        first_name: teacher.user.first_name,
        last_name: teacher.user.last_name,
        phone: teacher.user.phone || '',
        password: '',
        role: 'teacher',
      });
      setSelectedSubjects(teacher.subjects.map(s => s.id));
      setEditingId(teacher.id);
      setCreateUserMode(false);
    } else {
      setForm(initialForm);
      setUserForm(initialUserForm);
      setSelectedSubjects([]);
      setEditingId(null);
      setCreateUserMode(true);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
    setUserForm(initialUserForm);
    setSelectedSubjects([]);
    setCreateUserMode(false);
    setError(''); // Clear any previous errors
  };

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleUserFormChange = (field: string, value: any) => {
    setUserForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        // Update existing teacher
        const teacherData = { ...form, subjects_ids: selectedSubjects };
        await teachersAPI.updateTeacher(editingId, teacherData);
      } else {
        // Create new teacher
        if (createUserMode) {
          // Create user first, then teacher
          const userRes = await usersAPI.createUser(userForm);
          const newUser = userRes.data;
          const teacherData = { ...form, user_id: newUser.id, subjects_ids: selectedSubjects };
          await teachersAPI.createTeacher(teacherData);
        } else {
          const teacherData = { ...form, subjects_ids: selectedSubjects };
          await teachersAPI.createTeacher(teacherData);
        }
      }
      
      // Reset form and close dialog
      setForm(initialForm);
      setUserForm(initialUserForm);
      setSelectedSubjects([]);
      setCreateUserMode(false);
      setEditingId(null);
      setDialogOpen(false);
      
      // Refresh the teachers list
      await fetchTeachers(1); // Go back to first page
    } catch (err: any) {
      console.error('Error saving teacher:', err);
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to save teacher.';
      setError(errorMessage);
    }
  };

  const handleSubjectFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await subjectsAPI.createSubject(subjectForm);
      setSubjectDialogOpen(false);
      setSubjectForm({ name: '', code: '', description: '', is_core: true, is_active: true });
      fetchSubjects(); // Refresh subjects list
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create subject.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    try {
      await teachersAPI.deleteTeacher(id);
      fetchTeachers(page);
    } catch (err) {
      setError('Failed to delete teacher.');
    }
  };

  const handleViewStudents = async (teacherId: number) => {
    setStudentsModal({ open: true, teacherId, students: [] });
    setModalLoading(true);
    setModalError('');
    try {
      const res = await teachersAPI.getTeacherStudents(teacherId);
      setStudentsModal({ open: true, teacherId, students: Array.isArray(res.data) ? res.data : [] });
    } catch (err) {
      setModalError('Failed to load students.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewClasses = async (teacherId: number) => {
    setClassesModal({ open: true, teacherId, assignments: [] });
    setModalLoading(true);
    setModalError('');
    try {
      const res = await classSubjectsAPI.getByTeacher(teacherId);
      setClassesModal({ open: true, teacherId, assignments: Array.isArray(res.data) ? res.data : [] });
    } catch (err) {
      setModalError('Failed to load class assignments.');
    } finally {
      setModalLoading(false);
    }
  };

  useEffect(() => {
    fetchTeachers();
    fetchDepartments();
    fetchQualifications();
    fetchSubjects();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Teachers Management
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {/* Filters and Actions */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Teachers {totalCount > 0 && `(${totalCount} total)`}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              {canManage && (
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
                  Add Teacher
                </Button>
              )}
            </Box>
          </Box>
          
          {/* Search and Filters */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
            {/* Search Bar */}
            <TextField
              placeholder="Search teachers..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
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
                    <IconButton
                      size="small"
                      onClick={() => handleSearchChange('')}
                      edge="end"
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Department Filter */}
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel>Department</InputLabel>
              <Select
                value={departmentFilter}
                onChange={(e) => handleDepartmentFilterChange(e.target.value)}
                label="Department"
              >
                <MenuItem value="">All Departments</MenuItem>
                {departments.map((dept) => (
                  <MenuItem key={dept} value={dept}>
                    {dept}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Qualification Filter */}
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel>Qualification</InputLabel>
              <Select
                value={qualificationFilter}
                onChange={(e) => handleQualificationFilterChange(e.target.value)}
                label="Qualification"
              >
                <MenuItem value="">All Qualifications</MenuItem>
                {qualifications.map((qual) => (
                  <MenuItem key={qual} value={qual}>
                    {qual}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Subject Filter */}
            <FormControl sx={{ minWidth: 180 }} size="small">
              <InputLabel>Subject</InputLabel>
              <Select
                value={subjectFilter}
                onChange={(e) => handleSubjectFilterChange(e.target.value)}
                label="Subject"
              >
                <MenuItem value="">All Subjects</MenuItem>
                {subjects.map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Clear Filters Button */}
            {(departmentFilter || qualificationFilter || subjectFilter || searchQuery) && (
              <Button
                variant="outlined"
                onClick={clearFilters}
                startIcon={<Clear />}
                size="small"
              >
                Clear Filters
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Teachers Table */}
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
                      <TableCell>Name</TableCell>
                      <TableCell>Employee ID</TableCell>
                      <TableCell>Department</TableCell>
                      <TableCell>Qualification</TableCell>
                      <TableCell>Experience</TableCell>
                      <TableCell>Subjects</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {teachers.map(teacher => (
                      <TableRow key={teacher.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {teacher.user.first_name} {teacher.user.last_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {teacher.user.email}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{teacher.employee_id}</TableCell>
                        <TableCell>{teacher.department}</TableCell>
                        <TableCell>{teacher.qualification}</TableCell>
                        <TableCell>{teacher.experience_years} years</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {teacher.subjects.slice(0, 2).map(subject => (
                              <Chip key={subject.id} label={subject.name} size="small" variant="outlined" />
                            ))}
                            {teacher.subjects.length > 2 && (
                              <Chip label={`+${teacher.subjects.length - 2} more`} size="small" variant="outlined" />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={teacher.user.is_active ? 'Active' : 'Inactive'} 
                            color={teacher.user.is_active ? 'success' : 'default'} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="View Students">
                            <IconButton onClick={() => handleViewStudents(teacher.id)}>
                              <Group />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Classes">
                            <IconButton onClick={() => handleViewClasses(teacher.id)}>
                              <School />
                            </IconButton>
                          </Tooltip>
                          {canManage && (
                            <>
                              <Tooltip title="Edit">
                                <IconButton onClick={() => handleOpenDialog(teacher)}>
                                  <Edit />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton onClick={() => handleDelete(teacher.id)}>
                                  <Delete />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Page {page} of {totalPages} • Showing {teachers.length} of {totalCount} teachers
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

      {/* Add/Edit Teacher Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">{editingId ? 'Edit Teacher' : 'Add Teacher'}</Typography>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Select Subjects</InputLabel>
                <Select
                  multiple
                  value={selectedSubjects}
                  onChange={(e) => setSelectedSubjects(e.target.value as number[])}
                  label="Select Subjects"
                  size="small"
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                        const subject = subjects.find(s => s.id === value);
                        return (
                          <Chip key={value} label={subject?.name || value} size="small" />
                        );
                      })}
                    </Box>
                  )}
                >
                  {subjectsLoading ? (
                    <MenuItem disabled>Loading subjects...</MenuItem>
                  ) : (
                    subjects.map((subject) => (
                      <MenuItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setSubjectDialogOpen(true)}
                size="small"
                sx={{ minWidth: 'fit-content' }}
              >
                Add Subject
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              
              {/* User fields for new teacher creation */}
              {createUserMode && !editingId && (
                <>
                  <Grid item xs={12} md={6} {...({ item: true } as any)}>
                    <TextField
                      label="First Name"
                      value={userForm.first_name}
                      onChange={e => handleUserFormChange('first_name', e.target.value)}
                      fullWidth
                      required
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={12} md={6} {...({ item: true } as any)}>
                    <TextField
                      label="Last Name"
                      value={userForm.last_name}
                      onChange={e => handleUserFormChange('last_name', e.target.value)}
                      fullWidth
                      required
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={12} md={6} {...({ item: true } as any)}>
                    <TextField
                      label="Email"
                      type="email"
                      value={userForm.email}
                      onChange={e => handleUserFormChange('email', e.target.value)}
                      fullWidth
                      required
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={12} md={6} {...({ item: true } as any)}>
                    <TextField
                      label="Phone"
                      value={userForm.phone}
                      onChange={e => handleUserFormChange('phone', e.target.value)}
                      fullWidth
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={12} md={6} {...({ item: true } as any)}>
                    <TextField
                      label="Username"
                      value={userForm.username}
                      onChange={e => handleUserFormChange('username', e.target.value)}
                      fullWidth
                      required
                      margin="dense"
                    />
                  </Grid>
                  <Grid item xs={12} md={6} {...({ item: true } as any)}>
                    <TextField
                      label="Password"
                      type="password"
                      value={userForm.password}
                      onChange={e => handleUserFormChange('password', e.target.value)}
                      fullWidth
                      required
                      margin="dense"
                    />
                  </Grid>
                </>
              )}
              
              {/* Teacher fields */}
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Employee ID"
                  value={form.employee_id}
                  onChange={e => handleFormChange('employee_id', e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Department"
                  value={form.department}
                  onChange={e => handleFormChange('department', e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Qualification"
                  value={form.qualification}
                  onChange={e => handleFormChange('qualification', e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Experience (Years)"
                  type="number"
                  value={form.experience_years}
                  onChange={e => handleFormChange('experience_years', Number(e.target.value))}
                  fullWidth
                  required
                  margin="dense"
                  inputProps={{ min: 0 }}
                />
              </Grid>
              
              {/* Permissions */}
              <Grid item xs={12} {...({ item: true } as any)}>
                <Box sx={{ mt: 3 }}>
                  <Typography variant="h6" gutterBottom>Permissions</Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.is_head_teacher}
                          onChange={e => handleFormChange('is_head_teacher', e.target.checked)}
                        />
                      }
                      label="Head Teacher"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.can_manage_students}
                          onChange={e => handleFormChange('can_manage_students', e.target.checked)}
                        />
                      }
                      label="Can Manage Students"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.can_manage_attendance}
                          onChange={e => handleFormChange('can_manage_attendance', e.target.checked)}
                        />
                      }
                      label="Can Manage Attendance"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.can_manage_grades}
                          onChange={e => handleFormChange('can_manage_grades', e.target.checked)}
                        />
                      }
                      label="Can Manage Grades"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.can_send_notifications}
                          onChange={e => handleFormChange('can_send_notifications', e.target.checked)}
                        />
                      }
                      label="Can Send Notifications"
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={form.can_view_reports}
                          onChange={e => handleFormChange('can_view_reports', e.target.checked)}
                        />
                      }
                      label="Can View Reports"
                    />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">{editingId ? 'Update' : 'Add'}</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Students Modal */}
      <Dialog open={studentsModal.open} onClose={() => setStudentsModal({ open: false, teacherId: null, students: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Teacher's Students</DialogTitle>
        <DialogContent>
          {modalLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
              <CircularProgress />
            </Box>
          ) : modalError ? (
            <Alert severity="error">{modalError}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Student ID</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentsModal.students.map(student => (
                    <TableRow key={student.id}>
                      <TableCell>{student.user.first_name} {student.user.last_name}</TableCell>
                      <TableCell>{student.student_id}</TableCell>
                      <TableCell>{student.user.email}</TableCell>
                      <TableCell>
                        <Chip label={student.academic_status} size="small" color={student.academic_status === 'enrolled' ? 'success' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentsModal({ open: false, teacherId: null, students: [] })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Classes Modal */}
      <Dialog open={classesModal.open} onClose={() => setClassesModal({ open: false, teacherId: null, assignments: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Teacher's Class Assignments</DialogTitle>
        <DialogContent>
          {modalLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 100 }}>
              <CircularProgress />
            </Box>
          ) : modalError ? (
            <Alert severity="error">{modalError}</Alert>
          ) : (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Class</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Academic Year</TableCell>
                    <TableCell>Compulsory</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classesModal.assignments.map(assignment => (
                    <TableRow key={assignment.id}>
                      <TableCell>{assignment.class_obj.name} - {assignment.class_obj.section}</TableCell>
                      <TableCell>
                        <Chip label={assignment.subject.name} size="small" variant="outlined" />
                      </TableCell>
                      <TableCell>{assignment.class_obj.academic_year}</TableCell>
                      <TableCell>
                        <Chip 
                          label={assignment.is_compulsory ? 'Yes' : 'No'} 
                          color={assignment.is_compulsory ? 'primary' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClassesModal({ open: false, teacherId: null, assignments: [] })}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Subject Dialog */}
      <Dialog open={subjectDialogOpen} onClose={() => setSubjectDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Subject</DialogTitle>
        <form onSubmit={handleSubjectFormSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Subject Name"
                  value={subjectForm.name}
                  onChange={e => setSubjectForm(prev => ({ ...prev, name: e.target.value }))}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Subject Code"
                  value={subjectForm.code}
                  onChange={e => setSubjectForm(prev => ({ ...prev, code: e.target.value }))}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} {...({ item: true } as any)}>
                <TextField
                  label="Description"
                  value={subjectForm.description}
                  onChange={e => setSubjectForm(prev => ({ ...prev, description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={subjectForm.is_core}
                      onChange={e => setSubjectForm(prev => ({ ...prev, is_core: e.target.checked }))}
                    />
                  }
                  label="Core Subject"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={subjectForm.is_active}
                      onChange={e => setSubjectForm(prev => ({ ...prev, is_active: e.target.checked }))}
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSubjectDialogOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Add Subject</Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default Teachers; 