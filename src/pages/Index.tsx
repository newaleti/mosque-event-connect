import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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
import {
  Search,
  CalendarDays,
  GraduationCap,
  Users,
  Clock,
  MapPin,
  Loader2,
  BookOpen,
  ClipboardList,
  Shield,
} from "lucide-react";
import heroImage from "@/assets/hero-mosque.jpg";

const fallbackPrayers = [
  { name: "Fajr", time: "5:15 AM" },
  { name: "Dhuhr", time: "12:30 PM" },
  { name: "Asr", time: "3:45 PM" },
  { name: "Maghrib", time: "6:20 PM" },
  { name: "Isha", time: "8:00 PM" },
];

const to12Hour = (t: string) => {
  const [h, m] = t.split(":");
  let hour = parseInt(h, 10);
  const minute = m?.replace(/\s*\(.*\)/, "") ?? "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
};

const usePrayerTimes = () => {
  const [prayers, setPrayers] = useState(fallbackPrayers);
  const [prayerLoading, setPrayerLoading] = useState(true);
  const [prayerLocation, setPrayerLocation] = useState("Detecting...");
  const [prayerDate, setPrayerDate] = useState("");

  useEffect(() => {
    const fetchPT = async (lat: number, lng: number) => {
      try {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        setPrayerDate(`${dd}-${mm}-${yyyy}`);
        const res = await fetch(
          `https://api.aladhan.com/v1/timings/${dd}-${mm}-${yyyy}?latitude=${lat}&longitude=${lng}&method=2`,
        );
        const data = await res.json();
        if (data.code === 200 && data.data?.timings) {
          const t = data.data.timings;
          setPrayers([
            { name: "Fajr", time: to12Hour(t.Fajr) },
            { name: "Dhuhr", time: to12Hour(t.Dhuhr) },
            { name: "Asr", time: to12Hour(t.Asr) },
            { name: "Maghrib", time: to12Hour(t.Maghrib) },
            { name: "Isha", time: to12Hour(t.Isha) },
          ]);
          const tz = data.data.meta?.timezone;
          if (tz)
            setPrayerLocation(
              tz.replace(/_/g, " ").split("/").pop() || "Your Location",
            );
        }
      } catch {
      } finally {
        setPrayerLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => fetchPT(p.coords.latitude, p.coords.longitude),
        () => {
          setPrayerLocation("Mecca (default)");
          fetchPT(21.4225, 39.8262);
        },
        { timeout: 5000 },
      );
    } else {
      setPrayerLocation("Mecca (default)");
      fetchPT(21.4225, 39.8262);
    }
  }, []);

  return { prayers, prayerLoading, prayerLocation, prayerDate };
};

const features = [
  {
    icon: CalendarDays,
    title: "Events & Muhaderas",
    description:
      "Stay updated with spiritual lectures and community gatherings. Never miss an important event.",
  },
  {
    icon: GraduationCap,
    title: "Madrasa Excellence",
    description:
      "Integrated attendance and marklist system for students and teachers. Streamlined Ders management.",
  },
  {
    icon: Users,
    title: "Membership & Support",
    description:
      "Easy mosque registration and booking for restricted events. Join and support your community.",
  },
];

const roles = [
  {
    icon: BookOpen,
    title: "For Students",
    description: "Track your progress and check your grades.",
    color: "bg-primary/10 text-primary",
  },
  {
    icon: ClipboardList,
    title: "For Teachers",
    description: "Manage your classes and take attendance.",
    color: "bg-accent/20 text-accent-foreground",
  },
  {
    icon: Shield,
    title: "For Admins",
    description: "Full control over mosque operations.",
    color: "bg-teal-light text-foreground",
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.5, ease: "easeOut" as const },
  }),
};

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
  const { prayers, prayerLoading, prayerLocation, prayerDate } =
    usePrayerTimes();

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
    } catch {}
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
    } catch {}
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

      <section className="relative min-h-[85vh] flex items-center justify-center overflow-hidden">
        <img
          src={heroImage}
          alt="Beautiful mosque interior"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="gradient-hero-overlay absolute inset-0" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="font-display text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl mx-auto max-w-3xl">
              Empowering Your Mosque, Connecting the Ummah
            </h1>
            <p className="mt-6 text-lg text-primary-foreground/80 sm:text-xl max-w-2xl mx-auto">
              Manage prayers, community events, Madrasa education, and
              memberships—all in one place.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button
                size="lg"
                className="h-12 rounded-xl bg-accent px-8 text-base font-semibold text-accent-foreground hover:bg-accent/90"
                onClick={() =>
                  document
                    .getElementById("prayer-times")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                View Prayer Times
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 rounded-xl border border-primary-foreground/50 bg-primary-foreground/15 px-8 text-base font-semibold text-primary-foreground backdrop-blur-md hover:bg-primary-foreground/25"
                onClick={() =>
                  document
                    .getElementById("events")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Browse Events
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              What We Do
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Everything your mosque needs, beautifully organized
            </p>
          </motion.div>
          <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={cardVariants}
                className="feature-card"
              >
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                  <f.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {f.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="prayer-times" className="py-20 bg-secondary/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Prayer Times
            </h2>
            <div className="mt-3 flex items-center justify-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{prayerLocation}</span>
              {prayerDate && <span className="text-sm">• {prayerDate}</span>}
            </div>
          </motion.div>
          {prayerLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 max-w-3xl mx-auto">
              {prayers.map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
                  className="prayer-card"
                >
                  <Clock className="mx-auto mb-2 h-5 w-5 text-primary" />
                  <p className="font-display text-sm font-semibold text-foreground">
                    {p.name}
                  </p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {p.time}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="events" className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Upcoming Events
            </h2>
          </motion.div>
          <form
            onSubmit={handleSearch}
            className="mx-auto flex max-w-2xl flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm sm:flex-row mb-10"
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
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-lg bg-muted"
                />
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
                <motion.div
                  key={event._id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.4 }}
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
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="py-24 bg-secondary/50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Your Path Starts Here
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Choose your role and get started
            </p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-3 max-w-4xl mx-auto">
            {roles.map((r, i) => (
              <motion.div
                key={r.title}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12, duration: 0.5 }}
                className="role-card text-center"
              >
                <div
                  className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full ${r.color}`}
                >
                  <r.icon className="h-7 w-7" />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                  {r.title}
                </h3>
                <p className="text-muted-foreground text-sm">{r.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t bg-card py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 MosqueHub. Built with love for the Ummah.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
