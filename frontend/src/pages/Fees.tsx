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
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Payment,
  Add,
  Edit,
  Delete,
  CheckCircle,
  Warning,
  Error,
  Search,
  School,
  Person,
  AttachMoney,
  Schedule,
  Receipt,
} from '@mui/icons-material';
import { feesAPI } from '../services/api';

interface FeeStructure {
  id: number;
  name: string;
  class_obj: {
    id: number;
    name: string;
    section: string;
  };
  category: {
    id: number;
    name: string;
    description: string;
  };
  amount: number;
  frequency: string;
  due_date: string;
  is_active: boolean;
  created_at: string;
}

interface StudentFee {
  id: number;
  student: number;
  student_info: {
    id: number;
    name: string;
    student_id: string;
    class: string;
  };
  fee_structure: FeeStructure;
  amount: number;
  due_date: string;
  status: string;
  paid_amount: number;
  remaining_amount: number;
  payments: Array<{
    id: number;
    amount: number;
    payment_method: string;
    status: string;
    created_at: string;
  }>;
  created_at: string;
}

interface Payment {
  id: number;
  student_fee: StudentFee;
  amount: number;
  payment_method: string;
  reference_number: string;
  status: string;
  processed_by: number;
  processed_by_info: {
    id: number;
    name: string;
    role: string;
  };
  created_at: string;
}

interface FeeCategory {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

const Fees: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fee Structures
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [openStructureDialog, setOpenStructureDialog] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [structureFormData, setStructureFormData] = useState({
    name: '',
    class_obj: '',
    category: '',
    amount: '',
    frequency: 'monthly',
    due_date: '',
  });

  // Student Fees
  const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
  const [openStudentFeeDialog, setOpenStudentFeeDialog] = useState(false);
  const [editingStudentFee, setEditingStudentFee] = useState<StudentFee | null>(null);
  const [studentFeeFormData, setStudentFeeFormData] = useState({
    student: '',
    fee_structure: '',
    amount: '',
    due_date: '',
    status: 'pending',
  });

  // Payments
  const [payments, setPayments] = useState<Payment[]>([]);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    student_fee: '',
    amount: '',
    payment_method: 'cash',
    reference_number: '',
  });

  // Categories
  const [categories, setCategories] = useState<FeeCategory[]>([]);
  const [openCategoryDialog, setOpenCategoryDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FeeCategory | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });

  // Common state
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch fee structures
      const structuresResponse = await feesAPI.getFees({ type: 'structures' });
      setFeeStructures(structuresResponse.data.results || structuresResponse.data || []);

      // Fetch student fees
      const studentFeesResponse = await feesAPI.getFees({ type: 'student-fees' });
      setStudentFees(studentFeesResponse.data.results || studentFeesResponse.data || []);

      // Fetch payments
      const paymentsResponse = await feesAPI.getFees({ type: 'payments' });
      setPayments(paymentsResponse.data.results || paymentsResponse.data || []);

      // Fetch categories
      const categoriesResponse = await feesAPI.getFees({ type: 'categories' });
      setCategories(categoriesResponse.data.results || categoriesResponse.data || []);

    } catch (error) {
      console.error('Error fetching fees data:', error);
      setError('Failed to load fees data');
      
      // Set mock data for demonstration
      setFeeStructures([
        {
          id: 1,
          name: 'Tuition Fee',
          class_obj: { id: 1, name: 'Class 10', section: 'A' },
          category: { id: 1, name: 'Tuition', description: 'Regular tuition fees' },
          amount: 5000,
          frequency: 'monthly',
          due_date: '2025-02-15',
          is_active: true,
          created_at: '2025-01-15T10:00:00Z',
        },
        {
          id: 2,
          name: 'Library Fee',
          class_obj: { id: 1, name: 'Class 10', section: 'A' },
          category: { id: 2, name: 'Library', description: 'Library access fees' },
          amount: 500,
          frequency: 'annually',
          due_date: '2025-03-01',
          is_active: true,
          created_at: '2025-01-15T10:00:00Z',
        },
      ]);

      setStudentFees([
        {
          id: 1,
          student: 1,
          student_info: { id: 1, name: 'John Doe', student_id: 'STU001', class: 'Class 10A' },
          fee_structure: {
            id: 1,
            name: 'Tuition Fee',
            class_obj: { id: 1, name: 'Class 10', section: 'A' },
            category: { id: 1, name: 'Tuition', description: 'Regular tuition fees' },
            amount: 5000,
            frequency: 'monthly',
            due_date: '2025-02-15',
            is_active: true,
            created_at: '2025-01-15T10:00:00Z',
          },
          amount: 5000,
          due_date: '2025-02-15',
          status: 'pending',
          paid_amount: 0,
          remaining_amount: 5000,
          payments: [],
          created_at: '2025-01-15T10:00:00Z',
        },
      ]);

      setPayments([
        {
          id: 1,
          student_fee: {
            id: 1,
            student: 1,
            student_info: { id: 1, name: 'John Doe', student_id: 'STU001', class: 'Class 10A' },
            fee_structure: {
              id: 1,
              name: 'Tuition Fee',
              class_obj: { id: 1, name: 'Class 10', section: 'A' },
              category: { id: 1, name: 'Tuition', description: 'Regular tuition fees' },
              amount: 5000,
              frequency: 'monthly',
              due_date: '2025-02-15',
              is_active: true,
              created_at: '2025-01-15T10:00:00Z',
            },
            amount: 5000,
            due_date: '2025-02-15',
            status: 'partial',
            paid_amount: 2500,
            remaining_amount: 2500,
            payments: [],
            created_at: '2025-01-15T10:00:00Z',
          },
          amount: 2500,
          payment_method: 'cash',
          reference_number: 'REF001',
          status: 'completed',
          processed_by: 1,
          processed_by_info: { id: 1, name: 'Admin User', role: 'Accountant' },
          created_at: '2025-01-20T10:00:00Z',
        },
      ]);

      setCategories([
        {
          id: 1,
          name: 'Tuition',
          description: 'Regular tuition fees',
          is_active: true,
          created_at: '2025-01-15T10:00:00Z',
        },
        {
          id: 2,
          name: 'Library',
          description: 'Library access fees',
          is_active: true,
          created_at: '2025-01-15T10:00:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial':
        return 'warning';
      case 'pending':
        return 'info';
      case 'overdue':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <AttachMoney />;
      case 'card':
        return <Receipt />;
      case 'bank_transfer':
        return <School />;
      default:
        return <Payment />;
    }
  };

  const renderFeeStructures = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Fee Structures</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenStructureDialog(true)}
        >
          Add Structure
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Class</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Frequency</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {feeStructures.map((structure) => (
              <TableRow key={structure.id}>
                <TableCell>{structure.name}</TableCell>
                <TableCell>{structure.class_obj.name} {structure.class_obj.section}</TableCell>
                <TableCell>{structure.category.name}</TableCell>
                <TableCell>${structure.amount}</TableCell>
                <TableCell>
                  <Chip label={structure.frequency} size="small" />
                </TableCell>
                <TableCell>{new Date(structure.due_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  Const<Chip
                    label={structure.is_active ? 'Active' : 'Inactive'}
                    color={structure.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEditStructure(structure)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteStructure(structure.id)}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderStudentFees = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Student Fees</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenStudentFeeDialog(true)}
        >
          Add Student Fee
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Fee Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Paid</TableCell>
              <TableCell>Remaining</TableCell>
              <TableCell>Due Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {studentFees.map((fee) => (
              <TableRow key={fee.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {fee.student_info.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {fee.student_info.student_id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{fee.fee_structure.name}</TableCell>
                <TableCell>${fee.amount}</TableCell>
                <TableCell>${fee.paid_amount}</TableCell>
                <TableCell>${fee.remaining_amount}</TableCell>
                <TableCell>{new Date(fee.due_date).toLocaleDateString()}</TableCell>
                <TableCell>
                  <Chip
                    label={fee.status}
                    color={getStatusColor(fee.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => handleEditStudentFee(fee)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleProcessPayment(fee)}>
                    <Payment />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderPayments = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Payments</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenPaymentDialog(true)}
        >
          Record Payment
        </Button>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Student</TableCell>
              <TableCell>Fee Type</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>Reference</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Processed By</TableCell>
              <TableCell>Date</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      {payment.student_fee.student_info.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {payment.student_fee.student_info.student_id}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{payment.student_fee.fee_structure.name}</TableCell>
                <TableCell>${payment.amount}</TableCell>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={1}>
                    {getPaymentMethodIcon(payment.payment_method)}
                    <Typography variant="body2">
                      {payment.payment_method.replace('_', ' ')}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>{payment.reference_number}</TableCell>
                <TableCell>
                  <Chip
                    label={payment.status}
                    color={payment.status === 'completed' ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{payment.processed_by_info?.name}</TableCell>
                <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );

  const renderCategories = () => (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">Fee Categories</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenCategoryDialog(true)}
        >
          Add Category
        </Button>
      </Box>

      <Grid container sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
        {categories.map((category) => (
          <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 4' } }} key={category.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="h6">{category.name}</Typography>
                  <Chip
                    label={category.is_active ? 'Active' : 'Inactive'}
                    color={category.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
                <Typography variant="body2" color="textSecondary" mt={1}>
                  {category.description}
                </Typography>
                <Box display="flex" gap={1} mt={2}>
                  <IconButton size="small" onClick={() => handleEditCategory(category)}>
                    <Edit />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDeleteCategory(category.id)}>
                    <Delete />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Handler functions
  const handleEditStructure = (structure: FeeStructure) => {
    setEditingStructure(structure);
    setStructureFormData({
      name: structure.name,
      class_obj: structure.class_obj.id.toString(),
      category: structure.category.id.toString(),
      amount: structure.amount.toString(),
      frequency: structure.frequency,
      due_date: structure.due_date,
    });
    setOpenStructureDialog(true);
  };

  const handleDeleteStructure = (id: number) => {
    console.log('Delete structure:', id);
  };

  const handleEditStudentFee = (fee: StudentFee) => {
    setEditingStudentFee(fee);
    setStudentFeeFormData({
      student: fee.student.toString(),
      fee_structure: fee.fee_structure.id.toString(),
      amount: fee.amount.toString(),
      due_date: fee.due_date,
      status: fee.status,
    });
    setOpenStudentFeeDialog(true);
  };

  const handleProcessPayment = (fee: StudentFee) => {
    setPaymentFormData({
      student_fee: fee.id.toString(),
      amount: fee.remaining_amount.toString(),
      payment_method: 'cash',
      reference_number: '',
    });
    setOpenPaymentDialog(true);
  };

  const handleEditCategory = (category: FeeCategory) => {
    setEditingCategory(category);
    setCategoryFormData({
      name: category.name,
      description: category.description,
    });
    setOpenCategoryDialog(true);
  };

  const handleDeleteCategory = (id: number) => {
    console.log('Delete category:', id);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Fees Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
            <Tab label="Fee Structures" icon={<School />} />
            <Tab label="Student Fees" icon={<Person />} />
            <Tab label="Payments" icon={<Payment />} />
            <Tab label="Categories" icon={<Receipt />} />
          </Tabs>

          <Divider sx={{ mb: 3 }} />

          {activeTab === 0 && renderFeeStructures()}
          {activeTab === 1 && renderStudentFees()}
          {activeTab === 2 && renderPayments()}
          {activeTab === 3 && renderCategories()}
        </CardContent>
      </Card>

      {/* Fee Structure Dialog */}
      <Dialog open={openStructureDialog} onClose={() => setOpenStructureDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingStructure ? 'Edit Fee Structure' : 'Add Fee Structure'}
        </DialogTitle>
        <DialogContent>
          <Grid container sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }} mt={1}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <TextField
                fullWidth
                label="Name"
                value={structureFormData.name}
                onChange={(e) => setStructureFormData({ ...structureFormData, name: e.target.value })}
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={structureFormData.amount}
                onChange={(e) => setStructureFormData({ ...structureFormData, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <FormControl fullWidth>
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={structureFormData.frequency}
                  onChange={(e) => setStructureFormData({ ...structureFormData, frequency: e.target.value })}
                >
                  <MenuItem value="monthly">Monthly</MenuItem>
                  <MenuItem value="quarterly">Quarterly</MenuItem>
                  <MenuItem value="annually">Annually</MenuItem>
                  <MenuItem value="one_time">One Time</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={structureFormData.due_date}
                onChange={(e) => setStructureFormData({ ...structureFormData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStructureDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenStructureDialog(false)}>
            {editingStructure ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Fee Dialog */}
      <Dialog open={openStudentFeeDialog} onClose={() => setOpenStudentFeeDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingStudentFee ? 'Edit Student Fee' : 'Add Student Fee'}
        </DialogTitle>
        <DialogContent>
          <Grid container sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }} mt={1}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={studentFeeFormData.amount}
                onChange={(e) => setStudentFeeFormData({ ...studentFeeFormData, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <TextField
                fullWidth
                label="Due Date"
                type="date"
                value={studentFeeFormData.due_date}
                onChange={(e) => setStudentFeeFormData({ ...studentFeeFormData, due_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={studentFeeFormData.status}
                  onChange={(e) => setStudentFeeFormData({ ...studentFeeFormData, status: e.target.value })}
                >
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="partial">Partial</MenuItem>
                  <MenuItem value="paid">Paid</MenuItem>
                  <MenuItem value="overdue">Overdue</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenStudentFeeDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenStudentFeeDialog(false)}>
            {editingStudentFee ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={openPaymentDialog} onClose={() => setOpenPaymentDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Record Payment</DialogTitle>
        <DialogContent>
          <Grid container sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }} mt={1}>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <TextField
                fullWidth
                label="Amount"
                type="number"
                value={paymentFormData.amount}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, amount: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid sx={{ gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
              <FormControl fullWidth>
                <InputLabel>Payment Method</InputLabel>
                <Select
                  value={paymentFormData.payment_method}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, payment_method: e.target.value })}
                >
                  <MenuItem value="cash">Cash</MenuItem>
                  <MenuItem value="card">Card</MenuItem>
                  <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  <MenuItem value="mobile_money">Mobile Money</MenuItem>
                  <MenuItem value="check">Check</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <TextField
                fullWidth
                label="Reference Number"
                value={paymentFormData.reference_number}
                onChange={(e) => setPaymentFormData({ ...paymentFormData, reference_number: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenPaymentDialog(false)}>
            Record Payment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={openCategoryDialog} onClose={() => setOpenCategoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent>
          <Grid container sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }} mt={1}>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <TextField
                fullWidth
                label="Name"
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
              />
            </Grid>
            <Grid sx={{ gridColumn: 'span 12' }}>
              <TextField
                fullWidth
                label="Description"
                multiline
                rows={3}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCategoryDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenCategoryDialog(false)}>
            {editingCategory ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Fees;