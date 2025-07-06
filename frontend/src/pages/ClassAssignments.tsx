import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  TextField,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  School as SchoolIcon,
  Person as PersonIcon,
  Book as BookIcon,
} from '@mui/icons-material';
import { classesAPI, subjectsAPI, teachersAPI, classSubjectsAPI } from '../services/api';

interface Class {
  id: number;
  name: string;
  section: string;
  academic_year: string;
  school_name: string;
}

interface Subject {
  id: number;
  name: string;
  code: string;
  is_core: boolean;
}

interface Teacher {
  id: number;
  user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  employee_id: string;
  department: string;
}

interface ClassSubject {
  id: number;
  class_obj: Class;
  subject: Subject;
  teacher: Teacher | null;
  teacher_info: {
    id: number;
    name: string;
    employee_id: string;
  } | null;
  is_compulsory: boolean;
  created_at: string;
}

const ClassAssignments: React.FC = () => {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedClassSubject, setSelectedClassSubject] = useState<ClassSubject | null>(null);
  
  // Form states
  const [selectedClass, setSelectedClass] = useState<number | ''>('');
  const [selectedSubjects, setSelectedSubjects] = useState<number[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<number | ''>('');
  const [isCompulsory, setIsCompulsory] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesRes, subjectsRes, teachersRes, classSubjectsRes] = await Promise.all([
        classesAPI.getClasses(),
        subjectsAPI.getSubjects(),
        teachersAPI.getTeachers(),
        classSubjectsAPI.getClassSubjects()
      ]);
      
      setClasses(classesRes.data.results || classesRes.data);
      setSubjects(subjectsRes.data.results || subjectsRes.data);
      setTeachers(teachersRes.data.results || teachersRes.data);
      setClassSubjects(classSubjectsRes.data.results || classSubjectsRes.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTeacher = async () => {
    if (!selectedClass || selectedSubjects.length === 0) {
      setError('Please select a class and at least one subject');
      return;
    }

    try {
      setLoading(true);
      const promises = selectedSubjects.map(subjectId =>
        classSubjectsAPI.createClassSubject({
          class_obj_id: selectedClass,
          subject_id: subjectId,
          teacher_id: selectedTeacher || null,
          is_compulsory: isCompulsory
        })
      );
      
      await Promise.all(promises);
      await fetchData();
      handleCloseAssignDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign teacher');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAssignment = async () => {
    if (!selectedClassSubject) return;

    try {
      setLoading(true);
      await classSubjectsAPI.updateClassSubject(selectedClassSubject.id, {
        class_obj_id: selectedClassSubject.class_obj.id,
        subject_id: selectedClassSubject.subject.id,
        teacher_id: selectedTeacher || null,
        is_compulsory: isCompulsory
      });
      
      await fetchData();
      handleCloseEditDialog();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;

    try {
      setLoading(true);
      await classSubjectsAPI.deleteClassSubject(id);
      await fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignDialog = () => {
    setSelectedClass('');
    setSelectedSubjects([]);
    setSelectedTeacher('');
    setIsCompulsory(true);
    setAssignDialogOpen(true);
  };

  const handleCloseAssignDialog = () => {
    setAssignDialogOpen(false);
    setError(null);
  };

  const handleOpenEditDialog = (classSubject: ClassSubject) => {
    setSelectedClassSubject(classSubject);
    setSelectedClass(classSubject.class_obj.id);
    setSelectedSubjects([classSubject.subject.id]);
    setSelectedTeacher(classSubject.teacher?.id || '');
    setIsCompulsory(classSubject.is_compulsory);
    setEditDialogOpen(true);
  };

  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
    setSelectedClassSubject(null);
    setError(null);
  };

  const getClassSubjectsByClass = (classId: number) => {
    return classSubjects.filter(cs => cs.class_obj.id === classId);
  };

  if (loading && classSubjects.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Class Assignments
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAssignDialog}
        >
          Assign Teacher
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {classes.map((classItem) => (
          <Grid key={classItem.id} xs={12} md={6} lg={4} {...({ item: true } as any)}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">
                    {classItem.name} - {classItem.section}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mb={2}>
                  {classItem.academic_year} • {classItem.school_name}
                </Typography>
                
                <Divider sx={{ my: 2 }} />
                
                <Typography variant="subtitle2" mb={1}>
                  Subject Assignments:
                </Typography>
                
                {getClassSubjectsByClass(classItem.id).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No subjects assigned
                  </Typography>
                ) : (
                  <Box>
                    {getClassSubjectsByClass(classItem.id).map((cs) => (
                      <Box key={cs.id} display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box>
                          <Chip
                            label={cs.subject.name}
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mr: 1 }}
                          />
                          {cs.teacher_info ? (
                            <Chip
                              label={cs.teacher_info.name}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label="No teacher"
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                        </Box>
                        <Box>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenEditDialog(cs)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteAssignment(cs.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Assign Teacher Dialog */}
      <Dialog open={assignDialogOpen} onClose={handleCloseAssignDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Teacher to Class</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Class</InputLabel>
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as number)}
              label="Class"
            >
              {classes.map((classItem) => (
                <MenuItem key={classItem.id} value={classItem.id}>
                  {classItem.name} - {classItem.section} ({classItem.academic_year})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Subjects</InputLabel>
            <Select
              multiple
              value={selectedSubjects}
              onChange={(e) => setSelectedSubjects(e.target.value as number[])}
              label="Subjects"
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((value) => {
                    const subject = subjects.find(s => s.id === value);
                    return (
                      <Chip key={value} label={subject?.name} size="small" />
                    );
                  })}
                </Box>
              )}
            >
              {subjects.map((subject) => (
                <MenuItem key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Teacher (Optional)</InputLabel>
            <Select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value as number)}
              label="Teacher (Optional)"
            >
              <MenuItem value="">
                <em>No teacher assigned</em>
              </MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher.id} value={teacher.id}>
                  {teacher.user.first_name} {teacher.user.last_name} ({teacher.employee_id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={isCompulsory}
                onChange={(e) => setIsCompulsory(e.target.checked)}
              />
            }
            label="Compulsory subject"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssignDialog}>Cancel</Button>
          <Button onClick={handleAssignTeacher} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Assign'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Assignment</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Class</InputLabel>
            <Select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value as number)}
              label="Class"
              disabled
            >
              {classes.map((classItem) => (
                <MenuItem key={classItem.id} value={classItem.id}>
                  {classItem.name} - {classItem.section} ({classItem.academic_year})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Subject</InputLabel>
            <Select
              value={selectedSubjects[0] || ''}
              onChange={(e) => setSelectedSubjects([e.target.value as number])}
              label="Subject"
              disabled
            >
              {subjects.map((subject) => (
                <MenuItem key={subject.id} value={subject.id}>
                  {subject.name} ({subject.code})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Teacher</InputLabel>
            <Select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value as number)}
              label="Teacher"
            >
              <MenuItem value="">
                <em>No teacher assigned</em>
              </MenuItem>
              {teachers.map((teacher) => (
                <MenuItem key={teacher.id} value={teacher.id}>
                  {teacher.user.first_name} {teacher.user.last_name} ({teacher.employee_id})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={isCompulsory}
                onChange={(e) => setIsCompulsory(e.target.checked)}
              />
            }
            label="Compulsory subject"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>Cancel</Button>
          <Button onClick={handleUpdateAssignment} variant="contained" disabled={loading}>
            {loading ? <CircularProgress size={20} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClassAssignments; 