import type { Personnel } from "../types";

export const PERSONNEL_STORAGE_KEY = "corporate_personnel_matrix";

export function loadStoredPersonnel(fallback: Personnel[] = []): Personnel[] {
  try {
    const raw = localStorage.getItem(PERSONNEL_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed as Personnel[] : fallback;
  } catch {
    return fallback;
  }
}

export function saveStoredPersonnel(personnel: Personnel[]) {
  localStorage.setItem(PERSONNEL_STORAGE_KEY, JSON.stringify(personnel));
}
