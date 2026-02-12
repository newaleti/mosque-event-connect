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
}

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
export const loginUser = (email: string, password: string) =>
  api.post<{ token: string; user: User }>("/auth/login", { email, password });

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

export const getEventAttendance = (eventId: string) =>
  api.get<Booking[]>(`/bookings/event/${eventId}`);

export default api;
