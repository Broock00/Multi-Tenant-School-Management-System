import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, MenuItem, Select, FormControl, InputLabel, Snackbar, Alert
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const DAYS = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

const emptyForm = {
  day: 'monday',
  start_time: '',
  end_time: '',
  subject: '',
  teacher: '',
  room: '',
};

const ClassSchedule: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const canManage = ['school_admin', 'principal', 'secretary'].includes(user?.role ?? '');

  useEffect(() => {
    api.get('/classes/').then(res => setClasses(res.data.results || res.data || []));
  }, []);

  useEffect(() => {
    if (selectedClass) {
      api.get(`/classes/${selectedClass.id}/schedule/`).then(res => setSchedule(res.data || []));
      api.get('/classes/class-subjects/', { params: { class_id: selectedClass.id } }).then(res => setSubjects(res.data.results || res.data || []));
      api.get('/auth/teachers/', { params: { school: selectedClass.school } }).then(res => setTeachers(res.data.results || res.data || []));
    }
  }, [selectedClass]);

  const handleOpenDialog = (entry?: any) => {
    if (entry) {
      setEditing(entry);
      setForm({
        day: entry.day,
        start_time: entry.start_time,
        end_time: entry.end_time,
        subject: entry.subject,
        teacher: entry.teacher,
        room: entry.room || '',
      });
    } else {
      setEditing(null);
      setForm({ ...emptyForm });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm({ ...emptyForm });
  };

  const handleFormChange = (field: string, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    try {
      const data = {
        class_obj: selectedClass.id,
        day: form.day,
        start_time: form.start_time,
        end_time: form.end_time,
        subject: form.subject,
        teacher: form.teacher,
        room: form.room,
      };
      if (editing) {
        await api.put(`/classes/class-schedules/${editing.id}/`, data);
        setSnackbar({ open: true, message: 'Schedule updated', severity: 'success' });
      } else {
        await api.post('/classes/class-schedules/', data);
        setSnackbar({ open: true, message: 'Schedule added', severity: 'success' });
      }
      api.get(`/classes/${selectedClass.id}/schedule/`).then(res => setSchedule(res.data || []));
      handleCloseDialog();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Failed to save schedule', severity: 'error' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.delete(`/classes/class-schedules/${id}/`);
      setSnackbar({ open: true, message: 'Schedule deleted', severity: 'success' });
      api.get(`/classes/${selectedClass.id}/schedule/`).then(res => setSchedule(res.data || []));
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.detail || 'Failed to delete schedule', severity: 'error' });
    }
  };

  // Build timetable grid: days as columns, periods as rows
  const periods = Array.from(new Set(schedule.map(s => `${s.start_time}-${s.end_time}`))).sort();
  const grid: { [period: string]: { [day: string]: any } } = {};
  periods.forEach(period => {
    grid[period] = {};
    DAYS.forEach(day => {
      grid[period][day.value] = schedule.find(s => `${s.start_time}-${s.end_time}` === period && s.day === day.value);
    });
  });

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>Class Schedule</Typography>
      <FormControl sx={{ minWidth: 240, mb: 3 }}>
        <InputLabel>Select Class</InputLabel>
        <Select
          value={selectedClass?.id || ''}
          label="Select Class"
          onChange={e => {
            const cls = classes.find(c => c.id === e.target.value);
            setSelectedClass(cls || null);
          }}
        >
          {classes.map(cls => (
            <MenuItem key={cls.id} value={cls.id}>{cls.name}{cls.section ? ` - ${cls.section}` : ''} ({cls.academic_year})</MenuItem>
          ))}
        </Select>
      </FormControl>
      {selectedClass && (
        <Card>
          <CardContent>
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ccc', padding: 8, minWidth: 120 }}>Period</th>
                    {DAYS.map(day => (
                      <th key={day.value} style={{ border: '1px solid #ccc', padding: 8 }}>{day.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(period => (
                    <tr key={period}>
                      <td style={{ border: '1px solid #ccc', padding: 8 }}>{period.replace('-', ' - ')}</td>
                      {DAYS.map(day => {
                        const entry = grid[period][day.value];
                        return (
                          <td key={day.value} style={{ border: '1px solid #ccc', padding: 8, minWidth: 160 }}>
                            {entry ? (
                              <>
                                <Typography variant="subtitle2">{entry.subject_name || entry.subject?.name}</Typography>
                                <Typography variant="body2" color="text.secondary">{entry.teacher_name || entry.teacher?.user?.full_name}</Typography>
                                <Typography variant="caption" color="text.secondary">{entry.room}</Typography>
                                {canManage && (
                                  <Box sx={{ mt: 1 }}>
                                    <IconButton size="small" onClick={() => handleOpenDialog(entry)}><Edit fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(entry.id)}><Delete fontSize="small" color="error" /></IconButton>
                                  </Box>
                                )}
                              </>
                            ) : (
                              canManage && (
                                <IconButton size="small" onClick={() => handleOpenDialog({ day: day.value, start_time: period.split('-')[0], end_time: period.split('-')[1], subject: '', teacher: '', room: '' })}>
                                  <Add fontSize="small" />
                                </IconButton>
                              )
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </CardContent>
        </Card>
      )}
      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Edit Schedule' : 'Add Schedule'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth margin="normal">
            <InputLabel>Day</InputLabel>
            <Select value={form.day} label="Day" onChange={e => handleFormChange('day', e.target.value)}>
              {DAYS.map(day => (
                <MenuItem key={day.value} value={day.value}>{day.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Start Time"
            type="time"
            value={form.start_time}
            onChange={e => handleFormChange('start_time', e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="End Time"
            type="time"
            value={form.end_time}
            onChange={e => handleFormChange('end_time', e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Subject</InputLabel>
            <Select value={form.subject} label="Subject" onChange={e => handleFormChange('subject', e.target.value)}>
              {subjects.map(subj => (
                <MenuItem key={subj.subject?.id || subj.subject} value={subj.subject?.id || subj.subject}>{subj.subject_name || subj.subject?.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Teacher</InputLabel>
            <Select value={form.teacher} label="Teacher" onChange={e => handleFormChange('teacher', e.target.value)}>
              {teachers.map(teacher => (
                <MenuItem key={teacher.id} value={teacher.id}>{teacher.user?.full_name || teacher.user?.username}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Room"
            value={form.room}
            onChange={e => handleFormChange('room', e.target.value)}
            fullWidth
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmit}>{editing ? 'Update' : 'Add'}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ClassSchedule; 