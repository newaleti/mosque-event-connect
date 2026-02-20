import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getTeacherEvents, getEventAttendanceRecords, submitAttendance,
  getEventMarklist, upsertMarklist, getEventAttendance,
  Event, AttendanceEntry, MarklistEntry, AttendanceRecord,
} from "@/lib/api";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Navigate } from "react-router-dom";
import {
  BookOpen, CalendarDays, MapPin, ClipboardCheck, FileSpreadsheet,
  ChevronLeft, Users, Save,
} from "lucide-react";
import { format } from "date-fns";

interface StudentBooking {
  _id: string;
  user: { _id: string; firstName?: string; lastName?: string; username?: string; email: string };
}

const TeacherDashboard = () => {
  const { user, isTeacher, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [activeTab, setActiveTab] = useState("classes");

  // Attendance state
  const [students, setStudents] = useState<StudentBooking[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, "present" | "absent" | "late">>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceEntry[]>([]);
  const [showAttendance, setShowAttendance] = useState(false);

  // Marklist state
  const [marklistData, setMarklistData] = useState<Record<string, {
    attendanceScore: number; testScore: number; midExam: number; finalExam: number; teacherNote: string;
  }>>({});
  const [marklistLoading, setMarklistLoading] = useState(false);
  const [showMarklist, setShowMarklist] = useState(false);

  const fetchEvents = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await getTeacherEvents(user._id);
      const allEvents = res.data.events || [];
      setEvents(allEvents.filter((e: Event) =>
        (e.eventType === "Ders" || e.eventType === "Muhadera") &&
        (e.teacher === user._id || (typeof e.teacher === "object" && (e.teacher as any)?._id === user._id))
      ));
    } catch {
      toast.error("Failed to load your classes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && isTeacher) fetchEvents();
  }, [user, isTeacher]);

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (!isTeacher) return <Navigate to="/" />;

  const getStudentName = (s: any) =>
    s?.firstName && s?.lastName ? `${s.firstName} ${s.lastName}` : s?.username || "Unknown";

  // --- Attendance ---
  const openAttendance = async (event: Event) => {
    setSelectedEvent(event);
    setShowAttendance(true);
    setAttendanceLoading(true);
    setAttendanceRecords({});
    try {
      // Fetch booked students for this event
      const res = await getEventAttendance(event._id);
      const bookings = res.data.attendees || [];
      setStudents(bookings.map((b: any) => ({ _id: b._id, user: b.user })));
      const defaults: Record<string, "present" | "absent" | "late"> = {};
      bookings.forEach((b: any) => { defaults[b.user._id] = "present"; });
      setAttendanceRecords(defaults);

      // Fetch history
      const histRes = await getEventAttendanceRecords(event._id);
      setAttendanceHistory(Array.isArray(histRes.data) ? histRes.data : []);
    } catch {
      toast.error("Failed to load students");
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleSubmitAttendance = async () => {
    if (!selectedEvent) return;
    const records: AttendanceRecord[] = Object.entries(attendanceRecords).map(([studentId, status]) => ({
      student: studentId, status,
    }));
    try {
      await submitAttendance(selectedEvent._id, records);
      toast.success("Attendance recorded successfully");
      setShowAttendance(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to submit attendance");
    }
  };

  // --- Marklist ---
  const openMarklist = async (event: Event) => {
    setSelectedEvent(event);
    setShowMarklist(true);
    setMarklistLoading(true);
    try {
      // Get students
      const res = await getEventAttendance(event._id);
      const bookings = res.data.attendees || [];
      setStudents(bookings.map((b: any) => ({ _id: b._id, user: b.user })));

      // Get existing marks
      const marksRes = await getEventMarklist(event._id);
      const marks = Array.isArray(marksRes.data) ? marksRes.data : [];
      const markMap: typeof marklistData = {};
      bookings.forEach((b: any) => {
        const existing = marks.find((m: any) => {
          const sid = typeof m.student === "object" ? m.student._id : m.student;
          return sid === b.user._id;
        });
        markMap[b.user._id] = {
          attendanceScore: existing?.attendanceScore || 0,
          testScore: existing?.testScore || 0,
          midExam: existing?.midExam || 0,
          finalExam: existing?.finalExam || 0,
          teacherNote: existing?.teacherNote || "",
        };
      });
      setMarklistData(markMap);
    } catch {
      toast.error("Failed to load marklist");
    } finally {
      setMarklistLoading(false);
    }
  };

  const updateMark = (studentId: string, field: string, value: number | string) => {
    setMarklistData((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], [field]: value },
    }));
  };

  const handleSaveMarklist = async () => {
    if (!selectedEvent) return;
    setMarklistLoading(true);
    try {
      for (const [studentId, data] of Object.entries(marklistData)) {
        await upsertMarklist({
          eventId: selectedEvent._id,
          studentId,
          attendanceScore: data.attendanceScore,
          quizScore: data.testScore,
          midExam: data.midExam,
          finalExam: data.finalExam,
          teacherNote: data.teacherNote,
        });
      }
      toast.success("Grades saved successfully");
      setShowMarklist(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save grades");
    } finally {
      setMarklistLoading(false);
    }
  };

  const formatEventDate = (date: string) => {
    try { return format(new Date(date), "MMM d, yyyy · h:mm a"); } catch { return date; }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-6 w-6 text-accent" />
            <h1 className="font-display text-3xl font-bold text-foreground">Madrasa Dashboard</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage your classes, attendance, and grades</p>
        </div>

        {/* My Classes */}
        <h2 className="font-display text-xl font-semibold text-foreground mb-4">My Classes</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No classes assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <Card key={event._id} className="overflow-hidden">
                <div className="gradient-hero p-3">
                  <Badge className="bg-background/20 text-primary-foreground backdrop-blur-sm border-0">
                    {event.eventType || "Class"}
                  </Badge>
                </div>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{event.description}</p>
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-accent" />
                      {formatEventDate(event.date)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-accent" />
                      {event.location}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openAttendance(event)}>
                      <ClipboardCheck className="h-4 w-4 mr-1" /> Attendance
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openMarklist(event)}>
                      <FileSpreadsheet className="h-4 w-4 mr-1" /> Marklist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Attendance Dialog */}
      <Dialog open={showAttendance} onOpenChange={setShowAttendance}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-accent" />
              Take Attendance — {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {attendanceLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No students registered for this event.</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s, i) => (
                      <TableRow key={s.user._id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{getStudentName(s.user)}</TableCell>
                        <TableCell>
                          <Select
                            value={attendanceRecords[s.user._id] || "present"}
                            onValueChange={(v) => setAttendanceRecords((prev) => ({ ...prev, [s.user._id]: v as any }))}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {attendanceHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Previous Records</h4>
                  <div className="space-y-2">
                    {attendanceHistory.slice(0, 5).map((entry) => (
                      <div key={entry._id} className="rounded border bg-muted/50 p-3 text-xs">
                        <span className="font-medium">{(() => { try { return format(new Date(entry.date), "MMM d, yyyy"); } catch { return entry.date; } })()}</span>
                        <span className="ml-2 text-muted-foreground">— {entry.records.length} students recorded</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAttendance(false)}>Cancel</Button>
            <Button onClick={handleSubmitAttendance} disabled={students.length === 0}>
              <Save className="h-4 w-4 mr-1" /> Submit Attendance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Marklist Dialog */}
      <Dialog open={showMarklist} onOpenChange={setShowMarklist}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-accent" />
              Marklist — {selectedEvent?.title}
            </DialogTitle>
          </DialogHeader>
          {marklistLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No students registered for this event.</p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-center">Attendance (10)</TableHead>
                    <TableHead className="text-center">Test (20)</TableHead>
                    <TableHead className="text-center">Mid Exam (30)</TableHead>
                    <TableHead className="text-center">Final Exam (40)</TableHead>
                    <TableHead className="text-center">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((s, i) => {
                    const data = marklistData[s.user._id] || { attendanceScore: 0, testScore: 0, midExam: 0, finalExam: 0, teacherNote: "" };
                    const total = (data.attendanceScore || 0) + (data.testScore || 0) + (data.midExam || 0) + (data.finalExam || 0);
                    return (
                      <TableRow key={s.user._id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{getStudentName(s.user)}</TableCell>
                        <TableCell>
                          <Input
                            type="number" min={0} max={10}
                            className="w-16 mx-auto text-center"
                            value={data.attendanceScore}
                            onChange={(e) => updateMark(s.user._id, "attendanceScore", Math.min(10, Math.max(0, Number(e.target.value))))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min={0} max={20}
                            className="w-16 mx-auto text-center"
                            value={data.testScore}
                            onChange={(e) => updateMark(s.user._id, "testScore", Math.min(20, Math.max(0, Number(e.target.value))))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min={0} max={30}
                            className="w-16 mx-auto text-center"
                            value={data.midExam}
                            onChange={(e) => updateMark(s.user._id, "midExam", Math.min(30, Math.max(0, Number(e.target.value))))}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min={0} max={40}
                            className="w-16 mx-auto text-center"
                            value={data.finalExam}
                            onChange={(e) => updateMark(s.user._id, "finalExam", Math.min(40, Math.max(0, Number(e.target.value))))}
                          />
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">{total}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarklist(false)}>Cancel</Button>
            <Button onClick={handleSaveMarklist} disabled={marklistLoading || students.length === 0}>
              <Save className="h-4 w-4 mr-1" /> {marklistLoading ? "Saving..." : "Save Grades"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeacherDashboard;
