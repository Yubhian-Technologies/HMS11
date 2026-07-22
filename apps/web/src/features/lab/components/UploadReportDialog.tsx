"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { storage } from "@/lib/firebase/client";
import { uploadLabReport } from "../services/lab";

export function UploadReportDialog({
  hospitalId,
  patientId,
  labOrderId,
}: {
  hospitalId: string;
  patientId: string;
  labOrderId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [summaryNotes, setSummaryNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setSubmitting(true);
    try {
      const path = `labReports/${hospitalId}/${patientId}/${Date.now()}-${file.name}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const fileUrl = await getDownloadURL(storageRef);

      await uploadLabReport({ hospitalId, labOrderId, fileUrl, summaryNotes: summaryNotes || undefined });
      toast.success("Report uploaded.");
      setFile(null);
      setSummaryNotes("");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Upload Report</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Lab Report</DialogTitle>
            <DialogDescription>FR-10.3 — visible to the doctor and patient immediately.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="report-file">Report file (PDF or image)</Label>
              <Input
                id="report-file"
                type="file"
                accept="application/pdf,image/*"
                required
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="report-notes">Summary notes (optional)</Label>
              <Input id="report-notes" value={summaryNotes} onChange={(e) => setSummaryNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting || !file}>
              {submitting ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
