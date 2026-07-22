"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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

export function ConsultationForm({
  hospitalId,
  branchId,
  appointmentId,
  labTests,
  departments,
  doctors,
}: {
  hospitalId: string;
  branchId: string;
  appointmentId: string;
  labTests: { id: string; name: string; price: number }[];
  departments: { id: string; name: string }[];
  doctors: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalNotes, setClinicalNotes] = useState("");
  const [items, setItems] = useState<PrescriptionItemForm[]>([]);
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([]);

  const [admitEnabled, setAdmitEnabled] = useState(false);

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
                <Select value={referralDept} onValueChange={(v) => setReferralDept(v ?? "")}>
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
                <Select value={referralDoctor} onValueChange={(v) => setReferralDoctor(v ?? "")}>
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
