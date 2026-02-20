import axios from "axios";

const API_BASE = "https://event-management-m1jg.onrender.com/api";

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  assignedMosque?: string;
  membershipStatus?: string;
}

// Map backend user shape to our User interface
const mapUser = (backendUser: any): User => ({
  _id: backendUser.id || backendUser._id,
  name: backendUser.username || backendUser.name,
  email: backendUser.email || "",
  role: backendUser.role || "user",
  assignedMosque: backendUser.assignedMosque,
  membershipStatus: backendUser.membershipStatus || "none",
});

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category?: string;
  eventType?: string;
  capacity?: number;
  createdBy?: string;
  accessType?: string;
  mosque?: { _id: string; name: string } | string;
  teacher?: string | { _id: string };
}

export interface Booking {
  _id: string;
  eventId: string | Event;
  userId: string | User;
  createdAt: string;
}

// Auth
export const loginUser = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password });
  return {
    ...res,
    data: {
      token: res.data.token,
      user: mapUser(res.data.user),
    },
  };
};

export const registerUser = (name: string, email: string, password: string, phone?: string, gender?: string) =>
  api.post("/auth/register", { name, email, password, phone, gender });

// Events
export const searchEvents = (params?: { keyword?: string; location?: string; category?: string; mosque?: string }) =>
  api.get<{ events: Event[] }>("/events/search", { params });

export const createEvent = (data: Record<string, any>) =>
  api.post<Event>("/events", data);

export const updateEvent = (id: string, data: Record<string, any>) =>
  api.put<Event>(`/events/${id}`, data);

export const deleteEvent = (id: string) =>
  api.delete(`/events/${id}`);

// Bookings
export const createBooking = (eventId: string) =>
  api.post<Booking>("/bookings", { eventId });

export const cancelBooking = (id: string) =>
  api.delete(`/bookings/${id}`);

export const getUserBookings = () =>
  api.get<Booking[]>("/bookings/my-bookings");

export interface AttendanceResponse {
  eventName: string;
  totalAttendees: number;
  attendees: Array<{
    _id: string;
    user: { _id: string; firstName?: string; lastName?: string; username?: string; email: string; phoneNumber?: string; phone?: string; gender?: string };
    bookingDate: string;
  }>;
}

export const getEventAttendance = (eventId: string) =>
  api.get<AttendanceResponse>(`/bookings/event/${eventId}`);

// Mosques
export interface Mosque {
  _id: string;
  name: string;
  address: string;
  description?: string;
  location?: { type: string; coordinates: number[] };
}

export const getMosques = () =>
  api.get<Mosque[]>("/mosques");

export const createMosque = (data: { name: string; address: string; description?: string }) =>
  api.post<Mosque>("/mosques", data);

// Admin management
export const assignMosqueAdmin = (userId: string, mosqueId: string) =>
  api.patch(`/auth/assign-mosque/${userId}`, { mosqueId });

export const unassignMosqueAdmin = (userId: string) =>
  api.patch(`/auth/unassign-mosque/${userId}`);

// Teacher management
export const promoteToTeacher = (userId: string) =>
  api.patch(`/auth/assign-teacher/${userId}`);

export const assignTeacherToEvent = (eventId: string, teacherId: string) =>
  api.patch(`/auth/assign-teacher-to-event/${eventId}`, { teacherId });

export const getTeacherEvents = (teacherId: string) =>
  api.get<{ events: Event[] }>("/events/search", { params: { teacher: teacherId } });

// Attendance
export interface AttendanceRecord {
  student: string;
  status: "present" | "absent" | "late";
  note?: string;
}

export interface AttendanceEntry {
  _id: string;
  event: string;
  teacher: string;
  date: string;
  records: Array<{
    student: { _id: string; firstName?: string; lastName?: string } | string;
    status: string;
    note?: string;
  }>;
}

export const submitAttendance = (eventId: string, records: AttendanceRecord[], date?: string) =>
  api.post("/attendance/submit", { eventId, records, date });

export const getEventAttendanceRecords = (eventId: string) =>
  api.get<AttendanceEntry[]>(`/attendance/${eventId}`);

// Marklist
export interface MarklistEntry {
  _id: string;
  event: string;
  student: { _id: string; firstName?: string; lastName?: string } | string;
  teacher: string;
  attendanceScore: number;
  testScore: number;
  midExam: number;
  finalExam: number;
  totalScore: number;
  grade?: string;
  teacherNote?: string;
}

export const upsertMarklist = (data: {
  eventId: string;
  studentId: string;
  attendanceScore?: number;
  quizScore?: number;
  midExam?: number;
  finalExam?: number;
  teacherNote?: string;
}) => api.post("/marklist/upsert", data);

export const getEventMarklist = (eventId: string) =>
  api.get<MarklistEntry[]>(`/marklist/event/${eventId}`);

// Membership
export interface MembershipRequest {
  _id: string;
  user: { _id: string; firstName?: string; lastName?: string; username?: string; email: string; phoneNumber?: string; phone?: string; gender?: string; age?: number };
  mosque: string;
  message: string;
  status: string;
  createdAt: string;
}

export const applyForMembership = (mosqueId: string, message: string) =>
  api.post("/membership/apply", { mosqueId, message });

export const getMosqueMembershipRequests = (params?: { name?: string; gender?: string }) =>
  api.get<MembershipRequest[]>("/membership/mosque-requests", { params });

export const decideMembershipRequest = (id: string, status: string) =>
  api.put(`/membership/${id}/decide`, { status });

export default api;
