"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { submitHealthUpdate } from "../services/recovery";

export function SubmitHealthUpdateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [condition, setCondition] = useState<"better" | "same" | "worse">("same");
  const [painLevel, setPainLevel] = useState("0");
  const [sugarMgDl, setSugarMgDl] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [temperatureC, setTemperatureC] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitHealthUpdate({
        condition,
        painLevel: Number(painLevel),
        sugarMgDl: sugarMgDl ? Number(sugarMgDl) : undefined,
        bloodPressure: bloodPressure || undefined,
        temperatureC: temperatureC ? Number(temperatureC) : undefined,
        weightKg: weightKg ? Number(weightKg) : undefined,
      });
      toast.success("Health update logged.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit update.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>Log Today&apos;s Update</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Daily Health Update</DialogTitle>
            <DialogDescription>FR-14.2 — helps your doctor track your recovery.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="hu-condition">How are you feeling?</Label>
              <Select value={condition} onValueChange={(v) => v && setCondition(v as typeof condition)}>
                <SelectTrigger id="hu-condition" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="better">Better</SelectItem>
                  <SelectItem value="same">Same</SelectItem>
                  <SelectItem value="worse">Worse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hu-pain">Pain level (0-10)</Label>
              <Input
                id="hu-pain"
                type="number"
                min="0"
                max="10"
                required
                value={painLevel}
                onChange={(e) => setPainLevel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="hu-sugar">Sugar (optional)</Label>
                <Input id="hu-sugar" type="number" value={sugarMgDl} onChange={(e) => setSugarMgDl(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hu-bp">BP (optional)</Label>
                <Input id="hu-bp" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="hu-temp">Temp (optional)</Label>
                <Input
                  id="hu-temp"
                  type="number"
                  value={temperatureC}
                  onChange={(e) => setTemperatureC(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hu-weight">Weight (optional)</Label>
              <Input id="hu-weight" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Update"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
