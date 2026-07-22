"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { assignLabOrder } from "../services/lab";

export function AssignLabOrderForm({
  hospitalId,
  branchId,
  patients,
  labTests,
}: {
  hospitalId: string;
  branchId: string;
  patients: { id: string; name: string }[];
  labTests: { id: string; name: string; price: number }[];
}) {
  const router = useRouter();
  const [patientId, setPatientId] = useState("");
  const [testId, setTestId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await assignLabOrder({ hospitalId, branchId, patientId, testId });
      toast.success("Lab test assigned — sent to Office for payment.");
      setPatientId("");
      setTestId("");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to assign lab test.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Assign Lab Test</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-2">
          <Select value={patientId} onValueChange={(v) => setPatientId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Patient" />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={testId} onValueChange={(v) => setTestId(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="Lab test" />
            </SelectTrigger>
            <SelectContent>
              {labTests.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} ({t.price})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={submitting || !patientId || !testId}>
            {submitting ? "Assigning…" : "Assign"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
