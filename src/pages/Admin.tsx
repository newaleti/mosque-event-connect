import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createEvent, searchEvents, getEventAttendance, Event, Booking } from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import { CalendarDays, MapPin, Plus, Users, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Booking[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    location: "",
    category: "",
    capacity: "",
  });

  useEffect(() => {
    if (user && isAdmin) {
      searchEvents().then((res) => setEvents(res.data.events || [])).catch(() => toast.error("Failed to load events"));
    }
  }, [user, isAdmin]);

  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;

  const fetchEvents = async () => {
    try {
      const res = await searchEvents();
      setEvents(res.data.events || []);
    } catch {
      toast.error("Failed to load events");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createEvent({
        ...form,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      } as any);
      toast.success("Event created!");
      setForm({ title: "", description: "", date: "", location: "", category: "", capacity: "" });
      setShowForm(false);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null);
      return;
    }
    setExpandedEvent(eventId);
    setAttendanceLoading(true);
    try {
      const res = await getEventAttendance(eventId);
      setAttendance(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load attendance");
      setAttendance([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage events and attendance</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="mr-1.5 h-4 w-4" />
            New Event
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="mb-8 space-y-4 rounded-lg border bg-card p-6 shadow-card">
            <h2 className="font-display text-xl font-semibold text-card-foreground">Create Event</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Lecture, Prayer" />
              </div>
              <div className="space-y-1.5">
                <Label>Date & Time</Label>
                <Input type="datetime-local" required value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input required value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Capacity</Label>
                <Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? "Creating..." : "Create Event"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        )}

        <div className="space-y-4">
          {events.map((event) => (
            <div key={event._id} className="rounded-lg border bg-card shadow-card">
              <div className="flex items-center justify-between p-5">
                <div>
                  <h3 className="font-display text-lg font-semibold text-card-foreground">{event.title}</h3>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-accent" />{(() => { try { return format(new Date(event.date), "MMM d, yyyy"); } catch { return event.date; } })()}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-accent" />{event.location}</span>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggleAttendance(event._id)}>
                  <Users className="mr-1.5 h-4 w-4" />
                  Attendance
                  {expandedEvent === event._id ? <ChevronUp className="ml-1 h-3.5 w-3.5" /> : <ChevronDown className="ml-1 h-3.5 w-3.5" />}
                </Button>
              </div>
              {expandedEvent === event._id && (
                <div className="border-t p-5">
                  {attendanceLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                  ) : attendance.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No bookings yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {attendance.map((b) => (
                        <div key={b._id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
                          <span>{typeof b.userId === "object" ? (b.userId as any).name || (b.userId as any).email : b.userId}</span>
                          <span className="text-xs text-muted-foreground">{(() => { try { return format(new Date(b.createdAt), "MMM d, yyyy"); } catch { return ""; } })()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Admin;
