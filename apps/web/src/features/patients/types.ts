export interface PatientIntakeFormState {
  name: string;
  age: string;
  gender: "male" | "female" | "other";
  dob: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  bloodGroup: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  emergencyContactPhone: string;
  medicalHistory: string;
  currentMedications: string;
  allergies: string;
  insuranceProvider: string;
  insurancePolicyNumber: string;
}

export const EMPTY_PATIENT_INTAKE: PatientIntakeFormState = {
  name: "",
  age: "",
  gender: "male",
  dob: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
  bloodGroup: "",
  emergencyContactName: "",
  emergencyContactRelation: "",
  emergencyContactPhone: "",
  medicalHistory: "",
  currentMedications: "",
  allergies: "",
  insuranceProvider: "",
  insurancePolicyNumber: "",
};

/** Shapes the flat form state into the nested payload every intake callable expects. */
export function patientIntakePayload(form: PatientIntakeFormState) {
  return {
    name: form.name,
    age: Number(form.age),
    gender: form.gender,
    dob: form.dob,
    phone: form.phone,
    address: {
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      country: form.country,
    },
    bloodGroup: form.bloodGroup,
    emergencyContact: {
      name: form.emergencyContactName,
      relation: form.emergencyContactRelation,
      phone: form.emergencyContactPhone,
    },
    medicalHistory: form.medicalHistory,
    currentMedications: form.currentMedications,
    allergies: form.allergies,
    insurance:
      form.insuranceProvider && form.insurancePolicyNumber
        ? { provider: form.insuranceProvider, policyNumber: form.insurancePolicyNumber }
        : undefined,
  };
}
