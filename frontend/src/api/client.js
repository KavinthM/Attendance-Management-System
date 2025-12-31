import axios from "axios";

const baseURL = process.env.REACT_APP_API_BASE_URL || "http://localhost:5001";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" }
});

// Request interceptor to add role headers
api.interceptors.request.use((config) => {
  const role = localStorage.getItem("userRole");
  const userClass = localStorage.getItem("userClass");

  if (role) {
    config.headers["x-user-role"] = role;
  }
  if (userClass) {
    config.headers["x-user-class"] = userClass;
  }
  return config;
});

// Students
export const getStudents = (params) => api.get("/students", { params });
export const getNextStudentIndex = () => api.get("/students/next-index");
export const addStudent = (payload) => api.post("/students", payload);
export const updateStudent = (id, payload) => api.put(`/students/${id}`, payload);
export const deleteStudent = (idOrIndex) => api.delete(`/students/${idOrIndex}`);

// Attendance
export const getAllAttendance = (params) => api.get("/attendance", { params });
export const markAttendance = (payload) => api.post("/attendance", payload);
export const updateAttendance = (id, payload) => api.put(`/attendance/${id}`, payload);
export const deleteAttendance = (id) => api.delete(`/attendance/${id}`);
export const getAttendanceByStudent = (idOrIndex) => api.get(`/attendance/${idOrIndex}`);

// Notify parents for Absent/Late (WhatsApp)
export const notifyParentsForAbsents = (items) => api.post("/attendance/notify-parents", { items });

// Parent View - Get attendance by student index
export const getAttendanceByStudentIndex = (studentIndex) => api.post("/attendance/parent-view", { studentIndex });

// Leave Requests
export const submitLeaveRequest = (payload) => api.post("/leave-requests", payload);
export const getAllLeaveRequests = (status) => api.get("/leave-requests", { params: { status } });
export const getPendingLeaveCount = () => api.get("/leave-requests/pending-count");
export const getAcceptedLeave = (studentIndex, date) => api.get("/leave-requests/accepted-leave", { params: { studentIndex, date } });
export const getAcceptedLeavesForDate = (date) => api.get("/leave-requests/accepted-for-date", { params: { date } });
export const acceptLeaveRequest = (id, reviewedBy) => api.put(`/leave-requests/${id}/accept`, { reviewedBy });
export const rejectLeaveRequest = (id, reviewedBy, rejectionReason) => api.put(`/leave-requests/${id}/reject`, { reviewedBy, rejectionReason });
export const deleteAllPendingRequests = () => api.delete("/leave-requests/pending/all");

// Notifications
export const getNotificationsByStudentIndex = (studentIndex) => api.get("/notifications/student", { params: { studentIndex } });
export const getUnreadNotificationCount = (studentIndex) => api.get("/notifications/unread-count", { params: { studentIndex } });
export const markNotificationAsRead = (id) => api.put(`/notifications/${id}/read`);
export const markAllNotificationsAsRead = (studentIndex) => api.put("/notifications/mark-all-read", { studentIndex });

// Reports
export const generateAttendanceReport = (params) => api.get("/reports/attendance", { params, responseType: 'blob' });
export const generateMonthlyReport = (params) => api.get("/reports/monthly", { params, responseType: 'blob' });
export const generateStudentReport = (params) => api.get("/reports/student", { params, responseType: 'blob' });
export const generateFilteredReport = (payload) => api.post("/reports/generate", payload, { responseType: 'blob' });
export const getAvailableSections = () => api.get("/reports/sections");
