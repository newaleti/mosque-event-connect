import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createEvent, searchEvents, getEventAttendance,
  getMosques, createMosque, assignMosqueAdmin, unassignMosqueAdmin,
  Event, Booking, Mosque,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import {
  CalendarDays, MapPin, Plus, Users, ChevronDown, ChevronUp,
  Building2, UserCog, Shield,
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";

  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<Booking[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "", description: "", date: "", location: "", category: "", capacity: "",
  });

  // Mosque state
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [showMosqueForm, setShowMosqueForm] = useState(false);
  const [mosqueLoading, setMosqueLoading] = useState(false);
  const [mosqueForm, setMosqueForm] = useState({ name: "", address: "", description: "" });

  // Assign admin state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({ userId: "", mosqueId: "" });

  useEffect(() => {
    if (user && isAdmin) {
      searchEvents().then((res) => setEvents(res.data.events || [])).catch(() => toast.error("Failed to load events"));
      if (isSuperAdmin) {
        getMosques().then((res) => setMosques(res.data || [])).catch(() => {});
      }
    }
  }, [user, isAdmin, isSuperAdmin]);

  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;

  // --- Events ---
  const fetchEvents = async () => {
    try {
      const res = await searchEvents();
      setEvents(res.data.events || []);
    } catch {
      toast.error("Failed to load events");
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createEvent({
        ...eventForm,
        capacity: eventForm.capacity ? Number(eventForm.capacity) : undefined,
      } as any);
      toast.success("Event created!");
      setEventForm({ title: "", description: "", date: "", location: "", category: "", capacity: "" });
      setShowEventForm(false);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create event");
    } finally {
      setLoading(false);
    }
  };

  const toggleAttendance = async (eventId: string) => {
    if (expandedEvent === eventId) { setExpandedEvent(null); return; }
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

  // --- Mosques ---
  const fetchMosques = async () => {
    try {
      const res = await getMosques();
      setMosques(res.data || []);
    } catch {
      toast.error("Failed to load mosques");
    }
  };

  const handleCreateMosque = async (e: React.FormEvent) => {
    e.preventDefault();
    setMosqueLoading(true);
    try {
      await createMosque(mosqueForm);
      toast.success("Mosque created!");
      setMosqueForm({ name: "", address: "", description: "" });
      setShowMosqueForm(false);
      fetchMosques();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create mosque");
    } finally {
      setMosqueLoading(false);
    }
  };

  // --- Assign Admin ---
  const handleAssignAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignLoading(true);
    try {
      await assignMosqueAdmin(assignForm.userId, assignForm.mosqueId);
      toast.success("Mosque admin assigned successfully!");
      setAssignForm({ userId: "", mosqueId: "" });
      setShowAssignForm(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to assign admin");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUnassignAdmin = async (userId: string) => {
    try {
      await unassignMosqueAdmin(userId);
      toast.success("Admin unassigned successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unassign admin");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-6 w-6 text-accent" />
            <h1 className="font-display text-3xl font-bold text-foreground">
              {isSuperAdmin ? "Super Admin Dashboard" : "Admin Dashboard"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? "Manage mosques, admins, and events" : "Manage events and attendance"}
          </p>
        </div>

        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="events" className="gap-1.5">
              <CalendarDays className="h-4 w-4" /> Events
            </TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="mosques" className="gap-1.5">
                  <Building2 className="h-4 w-4" /> Mosques
                </TabsTrigger>
                <TabsTrigger value="admins" className="gap-1.5">
                  <UserCog className="h-4 w-4" /> Manage Admins
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* ===== EVENTS TAB ===== */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowEventForm(!showEventForm)}>
                <Plus className="mr-1.5 h-4 w-4" /> New Event
              </Button>
            </div>

            {showEventForm && (
              <form onSubmit={handleCreateEvent} className="space-y-4 rounded-lg border bg-card p-6 shadow-card">
                <h2 className="font-display text-xl font-semibold text-card-foreground">Create Event</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Category</Label>
                    <Input value={eventForm.category} onChange={(e) => setEventForm({ ...eventForm, category: e.target.value })} placeholder="e.g. Lecture, Prayer" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Date & Time</Label>
                    <Input type="datetime-local" required value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Location</Label>
                    <Input required value={eventForm.location} onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Capacity</Label>
                    <Input type="number" value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea required value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Event"}</Button>
                  <Button type="button" variant="outline" onClick={() => setShowEventForm(false)}>Cancel</Button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {events.length === 0 && (
                <div className="rounded-lg border bg-card p-12 text-center">
                  <p className="text-muted-foreground">No events yet.</p>
                </div>
              )}
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
                      <Users className="mr-1.5 h-4 w-4" /> Attendance
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
          </TabsContent>

          {/* ===== MOSQUES TAB (Super Admin Only) ===== */}
          {isSuperAdmin && (
            <TabsContent value="mosques" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowMosqueForm(!showMosqueForm)}>
                  <Plus className="mr-1.5 h-4 w-4" /> Add Mosque
                </Button>
              </div>

              {showMosqueForm && (
                <form onSubmit={handleCreateMosque} className="space-y-4 rounded-lg border bg-card p-6 shadow-card">
                  <h2 className="font-display text-xl font-semibold text-card-foreground">Add Mosque</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Mosque Name</Label>
                      <Input required value={mosqueForm.name} onChange={(e) => setMosqueForm({ ...mosqueForm, name: e.target.value })} placeholder="e.g. Al-Aqsa Mosque" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Address</Label>
                      <Input required value={mosqueForm.address} onChange={(e) => setMosqueForm({ ...mosqueForm, address: e.target.value })} placeholder="Full address" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Description</Label>
                    <Textarea value={mosqueForm.description} onChange={(e) => setMosqueForm({ ...mosqueForm, description: e.target.value })} placeholder="Optional description" />
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={mosqueLoading}>{mosqueLoading ? "Creating..." : "Add Mosque"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowMosqueForm(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {mosques.length === 0 && (
                  <div className="rounded-lg border bg-card p-12 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No mosques added yet.</p>
                  </div>
                )}
                {mosques.map((mosque) => (
                  <div key={mosque._id} className="rounded-lg border bg-card p-5 shadow-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display text-lg font-semibold text-card-foreground flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-accent" />
                          {mosque.name}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {mosque.address}
                        </p>
                        {mosque.description && (
                          <p className="mt-2 text-sm text-muted-foreground">{mosque.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {/* ===== MANAGE ADMINS TAB (Super Admin Only) ===== */}
          {isSuperAdmin && (
            <TabsContent value="admins" className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowAssignForm(!showAssignForm)}>
                  <UserCog className="mr-1.5 h-4 w-4" /> Assign Mosque Admin
                </Button>
              </div>

              {showAssignForm && (
                <form onSubmit={handleAssignAdmin} className="space-y-4 rounded-lg border bg-card p-6 shadow-card">
                  <h2 className="font-display text-xl font-semibold text-card-foreground">Assign Mosque Admin</h2>
                  <p className="text-sm text-muted-foreground">
                    Enter the User ID and select a mosque to assign them as admin.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>User ID</Label>
                      <Input required value={assignForm.userId} onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })} placeholder="Paste the user's ID" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mosque</Label>
                      <select
                        required
                        value={assignForm.mosqueId}
                        onChange={(e) => setAssignForm({ ...assignForm, mosqueId: e.target.value })}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">Select a mosque</option>
                        {mosques.map((m) => (
                          <option key={m._id} value={m._id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={assignLoading}>{assignLoading ? "Assigning..." : "Assign Admin"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAssignForm(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              <div className="rounded-lg border bg-card p-6 shadow-card">
                <h3 className="font-display text-lg font-semibold text-card-foreground mb-3">Quick Actions</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  To unassign a mosque admin, enter their User ID below.
                </p>
                <div className="flex gap-3 max-w-md">
                  <Input
                    id="unassign-user-id"
                    placeholder="User ID to unassign"
                    className="flex-1"
                  />
                  <Button
                    variant="destructive"
                    onClick={() => {
                      const input = document.getElementById("unassign-user-id") as HTMLInputElement;
                      if (input?.value) {
                        handleUnassignAdmin(input.value);
                        input.value = "";
                      } else {
                        toast.error("Please enter a User ID");
                      }
                    }}
                  >
                    Unassign
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
