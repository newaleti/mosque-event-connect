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
}

// Map backend user shape to our User interface
const mapUser = (backendUser: any): User => ({
  _id: backendUser.id || backendUser._id,
  name: backendUser.username || backendUser.name,
  email: backendUser.email || "",
  role: backendUser.role || "user",
  assignedMosque: backendUser.assignedMosque,
});

export interface Event {
  _id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  category: string;
  capacity?: number;
  createdBy?: string;
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

export const registerUser = (name: string, email: string, password: string) =>
  api.post("/auth/register", { name, email, password });

// Events
export const searchEvents = (params?: { keyword?: string; location?: string; category?: string }) =>
  api.get<{ events: Event[] }>("/events/search", { params });

export const createEvent = (data: Omit<Event, "_id">) =>
  api.post<Event>("/events", data);

// Bookings
export const createBooking = (eventId: string) =>
  api.post<Booking>("/bookings", { eventId });

export const cancelBooking = (id: string) =>
  api.delete(`/bookings/${id}`);

export const getUserBookings = () =>
  api.get<Booking[]>("/bookings");

export const getEventAttendance = (eventId: string) =>
  api.get<Booking[]>(`/bookings/event/${eventId}`);

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

export default api;
