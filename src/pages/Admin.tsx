import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createEvent, updateEvent, deleteEvent, searchEvents, getEventAttendance,
  getMosques, createMosque, assignMosqueAdmin, unassignMosqueAdmin,
  Event, Mosque, AttendanceResponse,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import {
  CalendarDays, MapPin, Plus, Users, ChevronDown, ChevronUp,
  Building2, UserCog, Shield, Pencil, Trash2, BarChart3, X,
} from "lucide-react";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/** Format a Date to local "YYYY-MM-DDTHH:mm" for datetime-local inputs */
const formatLocalDatetime = (d: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const EVENT_TYPES = [
  { value: "Muhadera", label: "Muhadera" },
  { value: "Ders", label: "Ders" },
  { value: "community_event", label: "Community Event" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Other" },
];

const emptyEventForm = {
  title: "", description: "", date: "", location: "", eventType: "Muhadera", capacity: "", image: "",
};

const Admin = () => {
  const { user, isAdmin } = useAuth();
  const isSuperAdmin = user?.role === "super_admin";
  const isMosqueAdmin = user?.role === "mosque_admin";

  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [showEventForm, setShowEventForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [eventForm, setEventForm] = useState({ ...emptyEventForm });
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Attendance state
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceData, setAttendanceData] = useState<AttendanceResponse | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Delete confirm
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Mosque state (super admin)
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [showMosqueForm, setShowMosqueForm] = useState(false);
  const [mosqueLoading, setMosqueLoading] = useState(false);
  const [mosqueForm, setMosqueForm] = useState({ name: "", address: "", description: "" });

  // Assign admin state (super admin)
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignForm, setAssignForm] = useState({ userId: "", mosqueId: "" });

  // Stats
  const totalEvents = events.length;
  const totalBookings = useMemo(
    () => events.reduce((sum, e) => sum + ((e as any).bookedCount || 0), 0),
    [events]
  );

  const fetchEvents = async () => {
    try {
      const params: Record<string, string> = {};
      if (isMosqueAdmin && user?.assignedMosque) {
        params.mosque = user.assignedMosque;
      }
      const res = await searchEvents(params);
      setEvents(res.data.events || []);
    } catch {
      toast.error("Failed to load events");
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchEvents();
      if (isSuperAdmin) {
        getMosques().then((res) => setMosques(res.data || [])).catch(() => {});
      }
    }
  }, [user, isAdmin, isSuperAdmin]);

  if (!user) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/" />;

  // --- Event CRUD ---
  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(eventForm.date) < new Date()) {
      toast.error("Cannot save an event with a past date.");
      return;
    }
    setLoading(true);
    try {
      const payload: Record<string, any> = {
        title: eventForm.title,
        description: eventForm.description,
        date: eventForm.date,
        location: eventForm.location,
        eventType: eventForm.eventType,
        capacity: eventForm.capacity ? Number(eventForm.capacity) : 0,
        image: eventForm.image || "https://placehold.co/600x400",
        mosque: user?.assignedMosque || "",
      };

      if (editingEventId) {
        await updateEvent(editingEventId, payload);
        toast.success("Event updated!");
      } else {
        await createEvent(payload);
        toast.success("Event created!");
      }
      setEventForm({ ...emptyEventForm });
      setShowEventForm(false);
      setEditingEventId(null);
      fetchEvents();
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to save event";
      if (msg.toLowerCase().includes("not authorized") || err.response?.status === 403) {
        toast.error("Authorization error: Please log out and log back in to refresh your permissions.");
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (event: Event) => {
    setEditingEventId(event._id);
    setEventForm({
      title: event.title,
      description: event.description,
      date: event.date ? formatLocalDatetime(new Date(event.date)) : "",
      location: event.location,
      eventType: event.category || "Muhadera",
      capacity: String((event as any).capacity || ""),
      image: (event as any).image || "",
    });
    setShowEventForm(true);
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await deleteEvent(id);
      toast.success("Event deleted");
      setDeleteConfirmId(null);
      fetchEvents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete event");
    }
  };

  // --- Attendance ---
  const viewAttendees = async (eventId: string) => {
    setAttendanceDialogOpen(true);
    setAttendanceLoading(true);
    setAttendanceData(null);
    try {
      const res = await getEventAttendance(eventId);
      setAttendanceData(res.data);
    } catch {
      toast.error("Failed to load attendance");
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
      toast.success("Mosque admin assigned!");
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
      toast.success("Admin unassigned");
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
              {isSuperAdmin ? "Super Admin Dashboard" : "Mosque Admin Dashboard"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? "Manage mosques, admins, and events" : "Manage your mosque's events and track attendance"}
          </p>
        </div>

        {/* Dashboard Stats */}
        {isMosqueAdmin && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Events</CardTitle>
                <CalendarDays className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalEvents}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Bookings</CardTitle>
                <Users className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{totalBookings}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. per Event</CardTitle>
                <BarChart3 className="h-4 w-4 text-accent" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">
                  {totalEvents > 0 ? Math.round(totalBookings / totalEvents) : 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
            <div className="flex justify-between items-center">
              <h2 className="font-display text-xl font-semibold text-foreground">
                {isMosqueAdmin ? "Your Mosque's Events" : "All Events"}
              </h2>
              <Button onClick={() => { setShowEventForm(!showEventForm); setEditingEventId(null); setEventForm({ ...emptyEventForm }); }}>
                <Plus className="mr-1.5 h-4 w-4" /> New Event
              </Button>
            </div>

            {showEventForm && (
              <form onSubmit={handleSubmitEvent} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl font-semibold text-card-foreground">
                    {editingEventId ? "Edit Event" : "Create Event"}
                  </h2>
                  <Button type="button" variant="ghost" size="icon" onClick={() => { setShowEventForm(false); setEditingEventId(null); }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Title</Label>
                    <Input required value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Event Type</Label>
                    <Select value={eventForm.eventType} onValueChange={(v) => setEventForm({ ...eventForm, eventType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <Label>Capacity (0 = unlimited)</Label>
                    <Input type="number" value={eventForm.capacity} onChange={(e) => setEventForm({ ...eventForm, capacity: e.target.value })} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Image URL</Label>
                    <Input value={eventForm.image} onChange={(e) => setEventForm({ ...eventForm, image: e.target.value })} placeholder="https://example.com/image.jpg" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea required value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" disabled={loading}>{loading ? "Saving..." : editingEventId ? "Update Event" : "Create Event"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowEventForm(false); setEditingEventId(null); }}>Cancel</Button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {events.length === 0 && (
                <div className="rounded-lg border bg-card p-12 text-center">
                  <CalendarDays className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No events yet. Create your first event!</p>
                </div>
              )}
              {events.map((event) => (
                <div key={event._id} className="rounded-lg border bg-card shadow-sm">
                  <div className="flex items-center justify-between p-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-lg font-semibold text-card-foreground">{event.title}</h3>
                        <Badge variant="secondary" className="text-xs">{event.category || (event as any).eventType || "Event"}</Badge>
                        {(event as any).bookedCount > 0 && (
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" /> {(event as any).bookedCount} booked
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CalendarDays className="h-3.5 w-3.5 text-accent" />
                          {(() => { try { return format(new Date(event.date), "MMM d, yyyy · h:mm a"); } catch { return event.date; } })()}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-accent" />{event.location}
                        </span>
                        {(event as any).capacity > 0 && (
                          <span className="text-muted-foreground">
                            Capacity: {(event as any).bookedCount || 0}/{(event as any).capacity}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => viewAttendees(event._id)}>
                        <Users className="h-4 w-4 mr-1" /> Attendees
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => startEdit(event)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {deleteConfirmId === event._id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteEvent(event._id)}>
                            Confirm
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmId(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(event._id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
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
                <form onSubmit={handleCreateMosque} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
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
                  <div key={mosque._id} className="rounded-lg border bg-card p-5 shadow-sm">
                    <h3 className="font-display text-lg font-semibold text-card-foreground flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-accent" /> {mosque.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {mosque.address}
                    </p>
                    {mosque.description && <p className="mt-2 text-sm text-muted-foreground">{mosque.description}</p>}
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
                <form onSubmit={handleAssignAdmin} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
                  <h2 className="font-display text-xl font-semibold text-card-foreground">Assign Mosque Admin</h2>
                  <p className="text-sm text-muted-foreground">Enter the User ID and select a mosque to assign them as admin.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>User ID</Label>
                      <Input required value={assignForm.userId} onChange={(e) => setAssignForm({ ...assignForm, userId: e.target.value })} placeholder="Paste the user's ID" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Mosque</Label>
                      <Select value={assignForm.mosqueId} onValueChange={(v) => setAssignForm({ ...assignForm, mosqueId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select a mosque" /></SelectTrigger>
                        <SelectContent>
                          {mosques.map((m) => (
                            <SelectItem key={m._id} value={m._id}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={assignLoading}>{assignLoading ? "Assigning..." : "Assign Admin"}</Button>
                    <Button type="button" variant="outline" onClick={() => setShowAssignForm(false)}>Cancel</Button>
                  </div>
                </form>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">To unassign a mosque admin, enter their User ID below.</p>
                  <div className="flex gap-3 max-w-md">
                    <Input id="unassign-user-id" placeholder="User ID to unassign" className="flex-1" />
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
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onOpenChange={setAttendanceDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              {attendanceData?.eventName || "Attendees"}
            </DialogTitle>
          </DialogHeader>
          {attendanceLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading attendance...</p>
          ) : !attendanceData || attendanceData.attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No attendees yet.</p>
          ) : (
            <div className="space-y-4">
              <Badge className="text-sm">{attendanceData.totalAttendees} Total Attendees</Badge>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Booking Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceData.attendees.map((a, i) => (
                      <TableRow key={a._id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{a.user?.username || "N/A"}</TableCell>
                        <TableCell>{a.user?.email || "N/A"}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {(() => { try { return format(new Date(a.bookingDate), "MMM d, yyyy"); } catch { return "N/A"; } })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAttendanceDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
