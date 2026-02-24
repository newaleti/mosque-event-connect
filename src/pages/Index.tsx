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
import { Search, Moon } from "lucide-react";

const Index = () => {
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

  useEffect(() => {
    fetchEvents();
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="gradient-hero relative overflow-hidden px-4 py-20 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(43_80%_55%/0.15),transparent_60%)]" />
        <div className="relative mx-auto max-w-2xl">
          <Moon className="mx-auto mb-4 h-12 w-12 text-accent opacity-80" />
          <h1 className="font-display text-4xl font-bold tracking-tight text-primary-foreground md:text-5xl">
            Discover Mosque Events
          </h1>
          <p className="mt-3 text-lg text-primary-foreground/80">
            Join prayers, lectures, and community gatherings near you
          </p>
        </div>
      </section>

      {/* Search */}
      <section className="container mx-auto -mt-6 px-[17px]">
        <form
          onSubmit={handleSearch}
          className="mx-auto flex max-w-2xl flex-col gap-3 rounded-lg border bg-card p-4 shadow-elevated sm:flex-row my-[30px]"
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

          <Button
            type="submit"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Search
          </Button>
        </form>
      </section>

      {/* Events Grid */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="mb-6 font-display text-2xl font-semibold text-foreground">
          Upcoming Events
        </h2>
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-lg border bg-card p-12 text-center">
            <p className="text-muted-foreground">
              No events found. Try a different search.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event, i) => (
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
    </div>
  );
};

export default Index;
