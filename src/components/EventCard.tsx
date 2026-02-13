import { Event, createBooking } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Users, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useState } from "react";

interface EventCardProps {
  event: Event;
  isBooked?: boolean;
  onBooked?: (eventId: string) => void;
  isPast?: boolean;
}

const EventCard = ({ event, isBooked = false, onBooked, isPast = false }: EventCardProps) => {
  const { user } = useAuth();
  const [booking, setBooking] = useState(false);

  const handleBook = async () => {
    if (!user) {
      toast.error("Please sign in to book an event");
      return;
    }
    setBooking(true);
    try {
      await createBooking(event._id);
      toast.success("Booking confirmed!");
      onBooked?.(event._id);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  };

  const formattedDate = (() => {
    try {
      return format(new Date(event.date), "MMM d, yyyy · h:mm a");
    } catch {
      return event.date;
    }
  })();

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border bg-card shadow-card transition-all hover:shadow-elevated hover:-translate-y-1">
      <div className="gradient-hero p-4">
        <span className="inline-block rounded-full bg-background/20 px-3 py-1 text-xs font-medium text-primary-foreground backdrop-blur-sm">
          {event.category || "General"}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-display text-lg font-semibold text-card-foreground line-clamp-2">
          {event.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.description}
        </p>
        <div className="mt-auto flex flex-col gap-1.5 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-accent" />
            {formattedDate}
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-accent" />
            {event.location}
          </div>
          {event.capacity && (
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-accent" />
              {event.capacity} spots
            </div>
          )}
        </div>

        {isBooked ? (
          <div className="mt-3 flex items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/10 py-2 text-sm font-medium text-primary">
            <CheckCircle className="h-4 w-4" />
            Already Booked
          </div>
        ) : isPast ? (
          <Button disabled className="mt-3 w-full" size="sm" variant="secondary">
            Event Ended
          </Button>
        ) : (
          <Button
            onClick={handleBook}
            disabled={booking}
            className="mt-3 w-full"
            size="sm"
          >
            {booking ? "Booking..." : "Book Now"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default EventCard;
