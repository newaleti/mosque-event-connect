import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  searchEvents,
  Event,
  getUserBookings,
  Booking,
  getMyMembershipRequests,
  MembershipRequest,
} from "@/lib/api";
import EventCard from "@/components/EventCard";
import Navbar from "@/components/Navbar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CalendarDays, Clock } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [bookedEventIds, setBookedEventIds] = useState<Set<string>>(new Set());
  const [pendingMosqueIds, setPendingMosqueIds] = useState<Set<string>>(
    new Set(),
  );

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await searchEvents({
        keyword: keyword || undefined,
        location: location || undefined,
      });
      setEvents(res.data.events || []);
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchBookings = async () => {
    if (!user) {
      setBookedEventIds(new Set());
      return;
    }
    try {
      const res = await getUserBookings();
      const ids = new Set<string>(
        res.data.map((b: Booking) =>
          typeof b.eventId === "string" ? b.eventId : b.eventId._id,
        ),
      );
      setBookedEventIds(ids);
    } catch {
      // ignore
    }
  };

  const fetchPendingMemberships = async () => {
    if (!user) {
      setPendingMosqueIds(new Set());
      return;
    }
    try {
      const res = await getMyMembershipRequests();
      const pending = (res.data || []).filter(
        (r: MembershipRequest) => r.status === "pending",
      );
      setPendingMosqueIds(new Set(pending.map((r) => r.mosque)));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchBookings();
    fetchPendingMemberships();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleBooked = (eventId: string) => {
    setBookedEventIds((prev) => new Set(prev).add(eventId));
    setEvents((prev) =>
      prev.map((event) =>
        event._id === eventId
          ? { ...event, bookedCount: (event.bookedCount ?? 0) + 1 }
          : event,
      ),
    );
  };

  const handleMembershipApplied = (mosqueId: string) => {
    setPendingMosqueIds((prev) => new Set(prev).add(mosqueId));
  };

  const getEventMosqueId = (event: Event) =>
    typeof event.mosque === "object" && event.mosque
      ? event.mosque._id
      : (event.mosque as string) || "";

  // Separate upcoming vs recent (past) events
  const now = new Date();
  const upcomingEvents = events.filter((e) => new Date(e.date) >= now);
  const recentEvents = events.filter((e) => new Date(e.date) < now);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Search */}
      <section className="container mx-auto px-4 pt-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-6">
          Your Event Hub
        </h1>
        <form
          onSubmit={handleSearch}
          className="mx-auto flex max-w-2xl flex-col gap-3 rounded-lg border bg-card p-4 shadow-card sm:flex-row mb-8"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search events..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
          <Input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="sm:w-40"
          />
          <Button type="submit">Search</Button>
        </form>
      </section>

      {/* Upcoming Events */}
      <section className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 mb-6">
          <CalendarDays className="h-5 w-5 text-accent" />
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Upcoming Events
          </h2>
        </div>
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-muted-foreground">No upcoming events found.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {upcomingEvents.map((event, i) => (
              <div
                key={event._id}
                className="animate-fade-in"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <EventCard
                  event={event}
                  isBooked={bookedEventIds.has(event._id)}
                  onBooked={handleBooked}
                  isMembershipPending={pendingMosqueIds.has(
                    getEventMosqueId(event),
                  )}
                  onMembershipApplied={handleMembershipApplied}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Events */}
      {!loading && recentEvents.length > 0 && (
        <section className="container mx-auto px-4 py-6 pb-16">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="h-5 w-5 text-accent" />
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Recent Events
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentEvents.map((event, i) => (
              <div
                key={event._id}
                className="animate-fade-in opacity-75"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <EventCard
                  event={event}
                  isBooked={bookedEventIds.has(event._id)}
                  onBooked={handleBooked}
                  isPast
                  isMembershipPending={pendingMosqueIds.has(
                    getEventMosqueId(event),
                  )}
                  onMembershipApplied={handleMembershipApplied}
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default Dashboard;
