"use server";

import { serverApiFetch } from "@/lib/server-api";
import { API_PATHS } from "@/config/path";
import type { PatientModel } from "@/types/patients";

export type PatientOption = { id: string; name: string; detail: string | null };

export type SearchPatientsResult = {
  patients: PatientOption[];
  total: number;
  hasMore: boolean;
  error?: string;
};

/** Patients per batch in the picker ("Show more" loads the next one). */
const PICKER_PAGE_SIZE = 20;

/**
 * Server Action: searchPatientsAction
 *
 * One page of the caller's clinic's patients, A–Z, for the appointment
 * form's patient picker. An empty query lists everyone, so nobody has to
 * remember how a name was spelled; each typed word narrows the list (name,
 * email or phone). Uses GET /api/patients, so it needs can_view on "Patients".
 */
export async function searchPatientsAction(query: string, page = 1): Promise<SearchPatientsResult> {
  const search = query.trim() || undefined;
  const response = await serverApiFetch(
    API_PATHS.patients.list({ search, sort: "name", page, limit: PICKER_PAGE_SIZE })
  );
  if (response.status === 403) {
    return { patients: [], total: 0, hasMore: false, error: "You need access to Patients to choose one." };
  }
  if (!response.ok) {
    return { patients: [], total: 0, hasMore: false, error: "Could not load patients. Please try again." };
  }

  const { patients, total }: { patients: PatientModel[]; total: number } = await response.json();
  return {
    patients: patients.map((p) => ({
      id: p.id,
      name: `${p.first_name} ${p.last_name}`,
      detail: [p.phone, p.email].filter(Boolean).join(" · ") || null,
    })),
    total,
    hasMore: page * PICKER_PAGE_SIZE < total,
  };
}
