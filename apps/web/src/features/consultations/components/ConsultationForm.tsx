"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { branchCollection } from "@hms/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { submitConsultation } from "../services/consultations";

interface PrescriptionItemForm {
  medicineName: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  instructions: string;
}

const EMPTY_ITEM: PrescriptionItemForm = {
  medicineName: "",
  dosage: "",
  frequency: "",
  durationDays: "",
  instructions: "",
};

export interface ConsultDraftInitial {
  diagnosis?: string;
  clinicalNotes?: string;
  prescription?: PrescriptionItemForm[];
  labTestIds?: string[];
  admissionRequested?: boolean;
}

export function ConsultationForm({
  hospitalId,
  branchId,
  appointmentId,
  labTests,
  departments,
  doctors,
  initialDraft,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId: string;
  labTests: { id: string; name: string; price: number }[];
  departments: { id: string; name: string }[];
  doctors: { id: string; name: string }[];
  initialDraft?: ConsultDraftInitial | null;
}) {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState(initialDraft?.diagnosis ?? "");
  const [clinicalNotes, setClinicalNotes] = useState(initialDraft?.clinicalNotes ?? "");
  const [items, setItems] = useState<PrescriptionItemForm[]>(initialDraft?.prescription ?? []);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>(initialDraft?.labTestIds ?? []);

  const [admitEnabled, setAdmitEnabled] = useState(initialDraft?.admissionRequested ?? false);

  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");

  const [certEnabled, setCertEnabled] = useState(false);
  const [certReason, setCertReason] = useState("");
  const [certFrom, setCertFrom] = useState("");
  const [certTo, setCertTo] = useState("");

  const [referralEnabled, setReferralEnabled] = useState(false);
  const [referralDept, setReferralDept] = useState("");
  const [referralDoctor, setReferralDoctor] = useState("");
  const [referralReason, setReferralReason] = useState("");

  const [submitting, setSubmitting] = useState(false);

  // Autosave the draft (debounced) so a refresh/crash mid-consultation
  // doesn't lose it — skips the very first render (that's just the initial
  // value we already loaded, not a real edit) and while submitting (the
  // server clears consultDraft on success; racing it would resurrect it).
  // hasSubmitted is checked *inside* the timer callback, not just when
  // scheduling it — a timer already in flight when handleSubmit fires must
  // still no-op, since the client-side page transition after a successful
  // submit can keep this component mounted (and its pending timer alive)
  // for a moment after the server has already cleared consultDraft.
  const isFirstRender = useRef(true);
  const hasSubmitted = useRef(false);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (submitting || hasSubmitted.current) return;
    const handle = setTimeout(() => {
      if (hasSubmitted.current) return;
      const appointmentsCollection = branchCollection(hospitalId, branchId, "appointments");
      updateDoc(doc(db, appointmentsCollection, appointmentId), {
        consultDraft: {
          diagnosis,
          clinicalNotes,
          prescription: items,
          labTestIds: selectedTestIds,
          admissionRequested: admitEnabled,
          savedAt: serverTimestamp(),
        },
        updatedAt: serverTimestamp(),
      }).catch(() => {
        // Best-effort — a failed autosave must never interrupt the doctor's typing.
      });
    }, 1500);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnosis, clinicalNotes, items, selectedTestIds, admitEnabled, submitting]);

  function toggleTest(testId: string) {
    setSelectedTestIds((prev) => (prev.includes(testId) ? prev.filter((t) => t !== testId) : [...prev, testId]));
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }]);
  }
  function updateItem(index: number, patch: Partial<PrescriptionItemForm>) {
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  }
  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    hasSubmitted.current = true;
    setSubmitting(true);
    try {
      await submitConsultation({
        hospitalId,
        branchId,
        appointmentId,
        diagnosis,
        clinicalNotes,
        prescription: items.length
          ? items.map((it) => ({ ...it, durationDays: Number(it.durationDays) }))
          : undefined,
        labTestIds: selectedTestIds.length ? selectedTestIds : undefined,
        admissionRequested: admitEnabled || undefined,
        followUp: followUpEnabled && followUpDate ? { scheduledDate: followUpDate } : undefined,
        certificate:
          certEnabled && certReason && certFrom && certTo
            ? { reason: certReason, restFromDate: certFrom, restToDate: certTo }
            : undefined,
        referral:
          referralEnabled && referralDept && referralReason
            ? { toDepartmentId: referralDept, toDoctorId: referralDoctor || undefined, reason: referralReason }
            : undefined,
      });
      toast.success("Consultation completed.");
      router.push("/doctor");
      router.refresh();
    } catch (err) {
      hasSubmitted.current = false; // submit failed — doctor is still editing, autosave should resume
      toast.error(err instanceof Error ? err.message : "Failed to submit consultation.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diagnosis &amp; Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="c-diagnosis">Diagnosis</Label>
            <Input id="c-diagnosis" required value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="c-notes">Clinical notes</Label>
            <Input id="c-notes" value={clinicalNotes} onChange={(e) => setClinicalNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base">Prescription</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addItem}>
            Add Medicine
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicines added.</p>
          ) : (
            items.map((item, i) => (
              <div key={i} className="grid grid-cols-5 gap-2 rounded-md border border-border p-3">
                <Input
                  placeholder="Medicine"
                  required
                  value={item.medicineName}
                  onChange={(e) => updateItem(i, { medicineName: e.target.value })}
                />
                <Input
                  placeholder="Dosage"
                  required
                  value={item.dosage}
                  onChange={(e) => updateItem(i, { dosage: e.target.value })}
                />
                <Input
                  placeholder="Frequency"
                  required
                  value={item.frequency}
                  onChange={(e) => updateItem(i, { frequency: e.target.value })}
                />
                <Input
                  type="number"
                  min="1"
                  placeholder="Days"
                  required
                  value={item.durationDays}
                  onChange={(e) => updateItem(i, { durationDays: e.target.value })}
                />
                <div className="flex gap-1">
                  <Input
                    placeholder="Instructions"
                    value={item.instructions}
                    onChange={(e) => updateItem(i, { instructions: e.target.value })}
                  />
                  <Button type="button" size="sm" variant="destructive" onClick={() => removeItem(i)}>
                    ×
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Lab Tests</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {labTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No lab tests in the catalog for this branch.</p>
          ) : (
            labTests.map((test) => (
              <label
                key={test.id}
                className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={selectedTestIds.includes(test.id)}
                  onChange={() => toggleTest(test.id)}
                  className="size-4"
                />
                {test.name} ({test.price})
              </label>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Additional Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <section className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={admitEnabled}
                onChange={(e) => setAdmitEnabled(e.target.checked)}
                className="size-4"
              />
              Recommend admission
            </label>
            {admitEnabled ? (
              <p className="text-xs text-muted-foreground">
                Office will check bed availability and assign a room once you complete this consultation.
              </p>
            ) : null}
          </section>

          <Separator />

          <section className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={followUpEnabled}
                onChange={(e) => setFollowUpEnabled(e.target.checked)}
                className="size-4"
              />
              Schedule follow-up
            </label>
            {followUpEnabled ? (
              <Input
                type="date"
                className="w-64"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            ) : null}
          </section>

          <Separator />

          <section className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={certEnabled}
                onChange={(e) => setCertEnabled(e.target.checked)}
                className="size-4"
              />
              Issue medical certificate
            </label>
            {certEnabled ? (
              <div className="grid grid-cols-3 gap-2">
                <Input placeholder="Reason" value={certReason} onChange={(e) => setCertReason(e.target.value)} />
                <Input type="date" value={certFrom} onChange={(e) => setCertFrom(e.target.value)} />
                <Input type="date" value={certTo} onChange={(e) => setCertTo(e.target.value)} />
              </div>
            ) : null}
          </section>

          <Separator />

          <section className="grid gap-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={referralEnabled}
                onChange={(e) => setReferralEnabled(e.target.checked)}
                className="size-4"
              />
              Refer patient
            </label>
            {referralEnabled ? (
              <div className="grid grid-cols-3 gap-2">
                <Select
                  items={Object.fromEntries(departments.map((d) => [d.id, d.name]))}
                  value={referralDept}
                  onValueChange={(v) => setReferralDept(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  items={Object.fromEntries(doctors.map((d) => [d.id, d.name]))}
                  value={referralDoctor}
                  onValueChange={(v) => setReferralDoctor(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Doctor (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {doctors.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Reason"
                  value={referralReason}
                  onChange={(e) => setReferralReason(e.target.value)}
                />
              </div>
            ) : null}
          </section>
        </CardContent>
      </Card>

      <Button type="submit" disabled={submitting || !diagnosis}>
        {submitting ? "Submitting…" : "Complete Consultation"}
      </Button>
    </form>
  );
}
