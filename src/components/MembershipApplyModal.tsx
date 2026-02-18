import { useState } from "react";
import { applyForMembership } from "@/lib/api";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface MembershipApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mosqueId: string;
  onApplied: () => void;
}

const MembershipApplyModal = ({ open, onOpenChange, mosqueId, onApplied }: MembershipApplyModalProps) => {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await applyForMembership(mosqueId, message);
      toast.success("Membership application submitted!");
      setMessage("");
      onOpenChange(false);
      onApplied();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to apply");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Membership</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Message to the Imam/Admin</Label>
          <Textarea
            placeholder="Tell us why you'd like to join..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MembershipApplyModal;
