import { useState } from "react";
import { applyForMembership } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface MembershipApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mosqueId: string;
  onApplied: () => void;
}

const MembershipApplyModal = ({
  open,
  onOpenChange,
  mosqueId,
  onApplied,
}: MembershipApplyModalProps) => {
  const [role, setRole] = useState<"student" | "teacher">("student");
  const [knowledgeLevel, setKnowledgeLevel] = useState<
    "Beginner" | "Nezer Quran" | "Quran Hifz" | "Kitabs"
  >("Beginner");
  const [experienceYears, setExperienceYears] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [previousExperience, setPreviousExperience] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await applyForMembership({
        mosqueId,
        role,
        message,
        knowledgeLevel: role === "student" ? knowledgeLevel : undefined,
        experienceYears:
          role === "teacher" && experienceYears
            ? Number(experienceYears)
            : undefined,
        specialization: role === "teacher" ? specialization : undefined,
        previousExperience: role === "teacher" ? previousExperience : undefined,
      });
      toast.success("Membership application submitted!");
      setRole("student");
      setKnowledgeLevel("Beginner");
      setExperienceYears("");
      setSpecialization("");
      setPreviousExperience("");
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
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as "student" | "teacher")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "student" && (
            <div className="space-y-2">
              <Label>Islamic Knowledge Level</Label>
              <Select
                value={knowledgeLevel}
                onValueChange={(v) =>
                  setKnowledgeLevel(
                    v as "Beginner" | "Nezer Quran" | "Quran Hifz" | "Kitabs",
                  )
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Beginner">Beginner</SelectItem>
                  <SelectItem value="Nezer Quran">Nezer Quran</SelectItem>
                  <SelectItem value="Quran Hifz">Quran Hifz</SelectItem>
                  <SelectItem value="Kitabs">Kitabs</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {role === "teacher" && (
            <>
              <div className="space-y-2">
                <Label>Years of Experience</Label>
                <Input
                  type="number"
                  min={0}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(e.target.value)}
                  placeholder="e.g. 5"
                />
              </div>
              <div className="space-y-2">
                <Label>Specialization</Label>
                <Input
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                  placeholder="e.g. Quran, Kitab"
                />
              </div>
              <div className="space-y-2">
                <Label>Previous Teaching Locations</Label>
                <Textarea
                  value={previousExperience}
                  onChange={(e) => setPreviousExperience(e.target.value)}
                  placeholder="Share where you have taught before"
                  rows={3}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Note</Label>
            <Textarea
              placeholder="Tell us why you'd like to join..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Application"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MembershipApplyModal;
