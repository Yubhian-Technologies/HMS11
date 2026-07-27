import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/require-role";
import { getAppointment } from "@/features/appointments/services/read";
import { getPatientHistory } from "@/features/consultations/services/read";
import { listMedicineInventory } from "@/features/medicine-inventory/services/read";
import { listMedicineOrdersForPatient } from "@/features/doctor-medicine-orders/services/read";
import { AssignMedicineOrderForm } from "@/features/doctor-medicine-orders/components/AssignMedicineOrderForm";

export default async function DoctorPrescriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ appointmentId?: string }>;
}) {
  const session = await getSession();
  if (!session?.hospitalId || !session.branchId) redirect("/login");
  const { hospitalId, branchId } = session;

  const { appointmentId } = await searchParams;
  if (!appointmentId) redirect("/doctor");

  const appointment = await getAppointment(hospitalId, branchId, appointmentId);
  if (!appointment || appointment.doctorId !== session.uid) {
    return <p className="text-sm text-muted-foreground">Appointment not found.</p>;
  }

  const [history, inventory, medicineOrders] = await Promise.all([
    getPatientHistory(appointment.patientId, hospitalId),
    listMedicineInventory(hospitalId, branchId),
    // Isolated: a missing/pending composite index on this newer collection
    // must degrade this one section, not crash the whole page.
    listMedicineOrdersForPatient(appointment.patientId).catch(() => []),
  ]);
  const activeInventory = inventory.filter((item) => item.status === "active");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-foreground">Prescriptions — {appointment.patientName}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pharmacy Inventory</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {activeInventory.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No active inventory for this branch.</p>
          ) : (
            activeInventory.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-md border border-border p-2 text-sm">
                <span className="text-foreground">{item.name}</span>
                <span className="text-muted-foreground">{item.quantityInStock} in stock</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <AssignMedicineOrderForm
        hospitalId={hospitalId}
        branchId={branchId}
        patientId={appointment.patientId}
        inventory={activeInventory.map((item) => ({ id: item.id, name: item.name }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned by You</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {medicineOrders.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No medicine assigned yet.</p>
          ) : (
            medicineOrders.map((order) => (
              <div key={order.id} className="rounded-md border border-border p-3 text-sm">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-foreground">{item.medicineName}</span>
                    <span className="text-muted-foreground">{item.durationDays} days</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Previous Prescriptions (Consultations)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {history.prescriptions.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No prior prescriptions on file.</p>
          ) : (
            history.prescriptions.map((p) => (
              <div key={p.id} className="rounded-md border border-border p-3 text-sm">
                {p.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-foreground">{item.medicineName}</span>
                    <span className="text-muted-foreground">
                      {item.dosage} · {item.frequency} · {item.durationDays} days
                    </span>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
