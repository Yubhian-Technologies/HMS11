"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { submitFeedback } from "../services/feedback";

export function SubmitFeedbackDialog({ appointmentId }: { appointmentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [isComplaint, setIsComplaint] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitFeedback({ appointmentId, rating: Number(rating), comment, isComplaint });
      toast.success("Thanks for your feedback.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Leave Feedback</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Visit Feedback</DialogTitle>
            <DialogDescription>FR-17.1 — rate your visit and let us know how it went.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fb-rating">Rating</Label>
              <Select value={rating} onValueChange={(v) => v && setRating(v)}>
                <SelectTrigger id="fb-rating" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["1", "2", "3", "4", "5"].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n} / 5
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fb-comment">Comments</Label>
              <textarea
                id="fb-comment"
                className="min-h-24 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={2000}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={isComplaint}
                onChange={(e) => setIsComplaint(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              This is a complaint that needs follow-up
            </label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
