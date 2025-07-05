import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, FormControlLabel,
  CircularProgress, Tooltip, Chip, Alert, MenuItem, FormControl, InputLabel, Select
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { Add, Edit, Delete, Group, Schedule } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { classesAPI } from '../services/api';

interface ClassItem {
  id: number;
  name: string;
  section: string;
  school: number;
  school_name: string;
  academic_year: string;
  capacity: number;
  students_count: number;
  subjects_count: number;
  is_active: boolean;
}

interface StudentItem {
  id: number;
  user: { first_name: string; last_name: string; email: string };
  student_id: string;
  academic_status: string;
}

interface ScheduleItem {
  id: number;
  subject: { name: string };
  teacher_info: { name: string } | null;
  day: string;
  start_time: string;
  end_time: string;
  room: string;
}

const initialForm = {
  name: '',
  section: '',
  academic_year: '',
  capacity: 40,
  is_active: true,
};

const Classes: React.FC = () => {
  const { user } = useAuth();
  const canManage = user?.role === 'school_admin' || user?.role === 'principal';
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [studentsModal, setStudentsModal] = useState<{ open: boolean; classId: number | null; students: StudentItem[] }>({ open: false, classId: null, students: [] });
  const [scheduleModal, setScheduleModal] = useState<{ open: boolean; classId: number | null; schedule: ScheduleItem[] }>({ open: false, classId: null, schedule: [] });
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchClasses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await classesAPI.getClasses();
      // Handle paginated response
      const classesData = res.data.results || res.data;
      setClasses(Array.isArray(classesData) ? classesData : []);
    } catch (err) {
      setError('Failed to load classes.');
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleOpenDialog = (cls?: ClassItem) => {
    if (cls) {
      setForm({
        name: cls.name,
        section: cls.section,
        academic_year: cls.academic_year,
        capacity: cls.capacity,
        is_active: cls.is_active,
      });
      setEditingId(cls.id);
    } else {
      setForm(initialForm);
      setEditingId(null);
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await classesAPI.updateClass(editingId, form);
      } else {
        await classesAPI.createClass(form);
      }
      fetchClasses();
      setDialogOpen(false);
    } catch (err) {
      setError('Failed to save class.');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this class?')) return;
    try {
      await classesAPI.deleteClass(id);
      fetchClasses();
    } catch (err) {
      setError('Failed to delete class.');
    }
  };

  const handleViewStudents = async (classId: number) => {
    setStudentsModal({ open: true, classId, students: [] });
    setModalLoading(true);
    setModalError('');
    try {
      const res = await classesAPI.getClassStudents(classId);
      setStudentsModal({ open: true, classId, students: Array.isArray(res.data) ? res.data : [] });
    } catch (err) {
      setModalError('Failed to load students.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleViewSchedule = async (classId: number) => {
    setScheduleModal({ open: true, classId, schedule: [] });
    setModalLoading(true);
    setModalError('');
    try {
      const res = await classesAPI.getClassSchedule(classId);
      setScheduleModal({ open: true, classId, schedule: Array.isArray(res.data) ? res.data : [] });
    } catch (err) {
      setModalError('Failed to load schedule.');
    } finally {
      setModalLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Classes Management
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        {canManage && (
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpenDialog()}>
            Add Class
          </Button>
        )}
      </Box>
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
                    <TableCell>Name</TableCell>
                    <TableCell>Section</TableCell>
                    <TableCell>Academic Year</TableCell>
                    <TableCell>Capacity</TableCell>
                    <TableCell>Students</TableCell>
                    <TableCell>Subjects</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {classes.map(cls => (
                    <TableRow key={cls.id}>
                      <TableCell>{cls.name}</TableCell>
                      <TableCell>{cls.section}</TableCell>
                      <TableCell>{cls.academic_year}</TableCell>
                      <TableCell>{cls.capacity}</TableCell>
                      <TableCell>
                        <Button size="small" startIcon={<Group />} onClick={() => handleViewStudents(cls.id)}>
                          {cls.students_count}
                        </Button>
                      </TableCell>
                      <TableCell>{cls.subjects_count}</TableCell>
                      <TableCell>
                        <Chip label={cls.is_active ? 'Active' : 'Inactive'} color={cls.is_active ? 'success' : 'default'} size="small" />
                      </TableCell>
                      <TableCell>
                        <Tooltip title="View Schedule">
                          <IconButton onClick={() => handleViewSchedule(cls.id)}>
                            <Schedule />
                          </IconButton>
                        </Tooltip>
                        {canManage && (
                          <>
                            <Tooltip title="Edit">
                              <IconButton onClick={() => handleOpenDialog(cls)}>
                                <Edit />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                              <IconButton onClick={() => handleDelete(cls.id)}>
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
          )}
        </CardContent>
      </Card>
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Class' : 'Add Class'}</DialogTitle>
        <form onSubmit={handleFormSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Name"
                  value={form.name}
                  onChange={e => handleFormChange('name', e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Section"
                  value={form.section}
                  onChange={e => handleFormChange('section', e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Academic Year"
                  value={form.academic_year}
                  onChange={e => handleFormChange('academic_year', e.target.value)}
                  fullWidth
                  required
                  margin="dense"
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <TextField
                  label="Capacity"
                  type="number"
                  value={form.capacity}
                  onChange={e => handleFormChange('capacity', Number(e.target.value))}
                  fullWidth
                  required
                  margin="dense"
                  inputProps={{ min: 1 }}
                />
              </Grid>
              <Grid item xs={12} md={6} {...({ item: true } as any)}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={form.is_active}
                      onChange={e => handleFormChange('is_active', e.target.checked)}
                    />
                  }
                  label="Active"
                />
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
      <Dialog open={studentsModal.open} onClose={() => setStudentsModal({ open: false, classId: null, students: [] })} maxWidth="sm" fullWidth>
        <DialogTitle>Class Students</DialogTitle>
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
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {studentsModal.students.map(stu => (
                    <TableRow key={stu.id}>
                      <TableCell>{stu.user.first_name} {stu.user.last_name}</TableCell>
                      <TableCell>{stu.student_id}</TableCell>
                      <TableCell>
                        <Chip label={stu.academic_status} size="small" color={stu.academic_status === 'enrolled' ? 'success' : 'default'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentsModal({ open: false, classId: null, students: [] })}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* Schedule Modal */}
      <Dialog open={scheduleModal.open} onClose={() => setScheduleModal({ open: false, classId: null, schedule: [] })} maxWidth="md" fullWidth>
        <DialogTitle>Class Schedule</DialogTitle>
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
                    <TableCell>Subject</TableCell>
                    <TableCell>Teacher</TableCell>
                    <TableCell>Day</TableCell>
                    <TableCell>Start Time</TableCell>
                    <TableCell>End Time</TableCell>
                    <TableCell>Room</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {scheduleModal.schedule.map(sch => (
                    <TableRow key={sch.id}>
                      <TableCell>{sch.subject?.name}</TableCell>
                      <TableCell>{sch.teacher_info?.name || '-'}</TableCell>
                      <TableCell>{sch.day}</TableCell>
                      <TableCell>{sch.start_time}</TableCell>
                      <TableCell>{sch.end_time}</TableCell>
                      <TableCell>{sch.room}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScheduleModal({ open: false, classId: null, schedule: [] })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Classes; 