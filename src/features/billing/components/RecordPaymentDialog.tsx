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
import { recordPayment } from "../services/billing";

export function RecordPaymentDialog({
  hospitalId,
  branchId,
  invoiceId,
  outstanding,
}: {
  hospitalId: string;
  branchId: string;
  invoiceId: string;
  outstanding: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(outstanding));
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { status } = await recordPayment({
        hospitalId,
        branchId,
        invoiceId,
        amount: Number(amount),
        paymentMethod,
      });
      toast.success(`Payment recorded — invoice ${status}.`);
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Record Payment</DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>FR-15.2 — manual entry, no payment gateway in Phase 1.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="pay-amount">Amount (outstanding: {outstanding})</Label>
              <Input
                id="pay-amount"
                type="number"
                min="0.01"
                step="0.01"
                max={outstanding}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pay-method">Method</Label>
              <Select
                items={{ cash: "Cash", card: "Card", upi: "UPI" }}
                value={paymentMethod}
                onValueChange={(v) => v && setPaymentMethod(v as typeof paymentMethod)}
              >
                <SelectTrigger id="pay-method" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
