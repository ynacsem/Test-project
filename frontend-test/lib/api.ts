export const API_BASE = "http://localhost:4000/api";

export type Diagnosis = {
  id: string;
  client_id: string;
  diagnosis_name: string;
  predicted_date: string;
  justification: string;
  challenged_diagnosis?: string | null;
  challenged_justification?: string | null;
  updated_at?: string | null;
};

export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function getAllDiagnoses(): Promise<Diagnosis[]> {
  const res = await fetch(`${API_BASE}/diagnoses`);
  if (!res.ok) throw new Error("Failed to fetch diagnoses");
  return res.json();
}

export async function getDiagnosisByClient(clientId: string): Promise<Diagnosis> {
  const res = await fetch(`${API_BASE}/diagnoses/${clientId}`);
  if (!res.ok) throw new Error("Failed to fetch client diagnosis");
  return res.json();
}

export async function createDiagnosis(
  clientId: string,
  payload: Omit<Diagnosis, "id" | "predicted_date" | "updated_at">
): Promise<Diagnosis> {
  const res = await fetch(`${API_BASE}/diagnoses/${clientId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create diagnosis");
  return res.json();
}

export async function updateDiagnosis(
  id: string,
  payload: Partial<Omit<Diagnosis, "id" | "client_id">>
): Promise<Diagnosis> {
  const res = await fetch(`${API_BASE}/diagnoses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update diagnosis");
  return res.json();
}