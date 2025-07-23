import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials: { username: string; password: string }) =>
    api.post('/auth/login/', credentials),
  refresh: (refreshToken: string) =>
    api.post('/auth/token/refresh/', { refresh: refreshToken }),
  logout: () => api.post('/auth/logout/'),
  getProfile: () => api.get('/auth/users/profile/'),
};

// Dashboard API
export const dashboardAPI = {
  getDashboardData: () => api.get('/auth/dashboard/'),
};

// Schools API
export const schoolsAPI = {
  getSchools: (params?: any) => api.get('/schools/schools/', { params }),
  getSchool: (id: number) => api.get(`/schools/schools/${id}/`),
  createSchool: (data: any) => api.post('/schools/schools/', data),
  updateSchool: (id: number, data: any) => api.put(`/schools/schools/${id}/`, data),
  deleteSchool: (id: number) => api.delete(`/schools/schools/${id}/`),
  getSchoolStats: () => api.get('/schools/schools/stats/'),
  getSchoolSubscriptions: (id: number) => api.get(`/schools/schools/${id}/subscriptions/`),
  getCurrentSubscription: (id: number) => api.get(`/schools/schools/${id}/current_subscription/`),
  searchSchools: (query: string) => api.get('/schools/schools/', { params: { search: query } }),
};

// Subscriptions API
export const subscriptionsAPI = {
  getSubscriptions: (params?: any) => api.get('/schools/subscriptions/', { params }),
  getSubscription: (id: number) => api.get(`/schools/subscriptions/${id}/`),
  createSubscription: (data: any) => api.post('/schools/subscriptions/', data),
  updateSubscription: (id: number, data: any) => api.put(`/schools/subscriptions/${id}/`, data),
  deleteSubscription: (id: number) => api.delete(`/schools/subscriptions/${id}/`),
  getActiveSubscriptions: () => api.get('/schools/subscriptions/active/'),
  getExpiringSoon: () => api.get('/schools/subscriptions/expiring_soon/'),
  getExpiredSubscriptions: () => api.get('/schools/subscriptions/expired/'),
  renewSubscription: (id: number) => api.post(`/schools/subscriptions/${id}/renew/`),
  cancelSubscription: (id: number) => api.post(`/schools/subscriptions/${id}/cancel/`),
};

// Users API
export const usersAPI = {
  getUsers: (params?: any) => api.get('/auth/users/', { params }),
  getUser: (id: number) => api.get(`/auth/users/${id}/`),
  createUser: (data: any) => api.post('/auth/users/', data),
  updateUser: (id: number, data: any) => api.put(`/auth/users/${id}/`, data),
  deleteUser: (id: number) => api.delete(`/auth/users/${id}/`),
  getProfile: () => api.get('/auth/users/profile/'),
  updateProfile: (data: any) => api.put('/auth/users/update_profile/', data),
  searchUsers: (query: string, role?: string) => api.get('/auth/users/search/', { params: { q: query, ...(role ? { role } : {}) } }),
};

// Teachers API
export const teachersAPI = {
  getTeachers: (params?: any) => api.get('/auth/teachers/', { params }),
  getTeacher: (id: number) => api.get(`/auth/teachers/${id}/`),
  createTeacher: (data: any) => api.post('/auth/teachers/', data),
  updateTeacher: (id: number, data: any) => api.put(`/auth/teachers/${id}/`, data),
  deleteTeacher: (id: number) => api.delete(`/auth/teachers/${id}/`),
  getTeacherStudents: (id: number) => api.get(`/auth/teachers/${id}/students/`),
  getTeacherClasses: (id: number) => api.get(`/auth/teachers/${id}/classes/`),
  getDepartments: () => api.get('/auth/teachers/departments/'),
  getQualifications: () => api.get('/auth/teachers/qualifications/'),
};

// Students API
export const studentsAPI = {
  getStudents: (params?: any) => api.get('/students/', { params }),
  getStudent: (id: number) => api.get(`/students/${id}/`),
  createStudent: (data: any) => api.post('/students/', data),
  updateStudent: (id: number, data: any) => api.put(`/students/${id}/`, data),
  deleteStudent: (id: number) => api.delete(`/students/${id}/`),
  getMyProfile: () => api.get('/students/my_profile/'),
  searchStudents: (query: string) => api.get('/students/search/', { params: { q: query } }),
  getStudentsByClass: (classId: number) => api.get('/students/by_class/', { params: { class_id: classId } }),
  getActiveStudents: () => api.get('/students/active/'),
  getAcademicYears: () => api.get('/students/academic_years/'),
  createStudentWithCredentials: (data: any) => api.post('/students/create_with_credentials/', data),
  changeStudentPassword: (id: number, password: string) => api.post(`/students/${id}/change_password/`, { password }),
};

// Classes API
export const classesAPI = {
  getClasses: (params?: any) => api.get('/classes/', { params }),
  getClass: (id: number) => api.get(`/classes/${id}/`),
  createClass: (data: any) => api.post('/classes/', data),
  updateClass: (id: number, data: any) => api.put(`/classes/${id}/`, data),
  deleteClass: (id: number) => api.delete(`/classes/${id}/`),
  getClassStudents: (id: number) => api.get(`/classes/${id}/students/`),
  getClassSchedule: (id: number) => api.get(`/classes/${id}/schedule/`),
  autoGenerateClasses: (targetYear: string) => api.post('/classes/auto_generate/', { target_year: targetYear }),
  getAcademicYears: () => api.get('/classes/academic_years/'),
};

// Subjects API
export const subjectsAPI = {
  getSubjects: (params?: any) => api.get('/classes/subjects/', { params }),
  getSubject: (id: number) => api.get(`/classes/subjects/${id}/`),
  createSubject: (data: any) => api.post('/classes/subjects/', data),
  updateSubject: (id: number, data: any) => api.put(`/classes/subjects/${id}/`, data),
  deleteSubject: (id: number) => api.delete(`/classes/subjects/${id}/`),
};

// Class Subjects API
export const classSubjectsAPI = {
  getClassSubjects: (params?: any) => api.get('/classes/class-subjects/', { params }),
  getClassSubject: (id: number) => api.get(`/classes/class-subjects/${id}/`),
  createClassSubject: (data: any) => api.post('/classes/class-subjects/', data),
  updateClassSubject: (id: number, data: any) => api.put(`/classes/class-subjects/${id}/`, data),
  deleteClassSubject: (id: number) => api.delete(`/classes/class-subjects/${id}/`),
  getByClass: (classId: number) => api.get('/classes/class-subjects/by_class/', { params: { class_id: classId } }),
  getByTeacher: (teacherId: number) => api.get('/classes/class-subjects/by_teacher/', { params: { teacher_id: teacherId } }),
};

// Fees API
export const feesAPI = {
  // Fee Structures
  getFeeStructures: (params?: any) => api.get('/fees/structures/', { params }),
  getFeeStructure: (id: number) => api.get(`/fees/structures/${id}/`),
  createFeeStructure: (data: any) => api.post('/fees/structures/', data),
  updateFeeStructure: (id: number, data: any) => api.put(`/fees/structures/${id}/`, data),
  deleteFeeStructure: (id: number) => api.delete(`/fees/structures/${id}/`),

  // Student Fees
  getStudentFees: (params?: any) => api.get('/fees/student-fees/', { params }),
  getStudentFee: (id: number) => api.get(`/fees/student-fees/${id}/`),
  createStudentFee: (data: any) => api.post('/fees/student-fees/', data),
  updateStudentFee: (id: number, data: any) => api.patch(`/fees/student-fees/${id}/`, data),
  deleteStudentFee: (id: number) => api.delete(`/fees/student-fees/${id}/`),

  // Payments
  getPayments: (params?: any) => api.get('/fees/payments/', { params }),
  getPayment: (id: number) => api.get(`/fees/payments/${id}/`),
  createPayment: (data: any) => api.post('/fees/payments/', data),
  updatePayment: (id: number, data: any) => api.put(`/fees/payments/${id}/`, data),
  deletePayment: (id: number) => api.delete(`/fees/payments/${id}/`),

  // Categories
  getCategories: (params?: any) => api.get('/fees/categories/', { params }),
  getCategory: (id: number) => api.get(`/fees/categories/${id}/`),
  createCategory: (data: any) => api.post('/fees/categories/', data),
  updateCategory: (id: number, data: any) => api.put(`/fees/categories/${id}/`, data),
  deleteCategory: (id: number) => api.delete(`/fees/categories/${id}/`),
};

// Exams API
export const examsAPI = {
  getExams: (params?: any) => api.get('/exams/', { params }),
  getExam: (id: number) => api.get(`/exams/${id}/`),
  createExam: (data: any) => api.post('/exams/', data),
  updateExam: (id: number, data: any) => api.put(`/exams/${id}/`, data),
  deleteExam: (id: number) => api.delete(`/exams/${id}/`),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (params?: any) => api.get('/notifications/notifications/', { params }),
  getNotification: (id: number) => api.get(`/notifications/notifications/${id}/`),
  createNotification: (data: any) => api.post('/notifications/notifications/', data),
  updateNotification: (id: number, data: any) => api.put(`/notifications/notifications/${id}/`, data),
  deleteNotification: (id: number) => api.delete(`/notifications/notifications/${id}/`),
  markAsRead: (id: number) => api.post(`/notifications/notifications/${id}/mark_as_read/`),
  markAllAsRead: () => api.post('/notifications/notifications/mark_all_as_read/'),
  getUnreadCount: () => api.get('/notifications/notifications/unread_count/'),
  getRecent: () => api.get('/notifications/notifications/recent/'),
};

// Chat API
export const chatAPI = {
  getMessages: (params?: any) => api.get('/chat/messages/', { params }),
  sendMessage: (data: any) => api.post('/chat/messages/', data),
  getChatRooms: () => api.get('/chat/rooms/'),
  createChatRoom: (data: any) => api.post('/chat/rooms/', data),
};

// System Settings API
export const systemSettingsAPI = {
  get: () => api.get('/core/system-settings/'),
  update: (data: any) => api.patch('/core/system-settings/', data),
};

// Subscription Plans API
export const subscriptionPlansAPI = {
  getPlans: () => api.get('/schools/plans/'),
  getPlan: (id: number) => api.get(`/schools/plans/${id}/`),
  updatePlan: (id: number, data: any) => api.put(`/schools/plans/${id}/`, data),
  createPlan: (data: any) => api.post('/schools/plans/', data),
  deletePlan: (id: number) => api.delete(`/schools/plans/${id}/`),
};

export default api; 