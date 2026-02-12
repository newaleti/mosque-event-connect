import { Event, createBooking } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Tag, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface EventCardProps {
  event: Event;
}

const EventCard = ({ event }: EventCardProps) => {
  const { user } = useAuth();

  const handleBook = async () => {
    if (!user) {
      toast.error("Please sign in to book an event");
      return;
    }
    try {
      await createBooking(event._id);
      toast.success("Booking confirmed!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Booking failed");
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
        <Button
          onClick={handleBook}
          className="mt-3 w-full bg-primary text-primary-foreground hover:bg-primary/90"
          size="sm"
        >
          Book Now
        </Button>
      </div>
    </div>
  );
};

export default EventCard;
