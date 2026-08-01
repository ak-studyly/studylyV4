import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import type { MaterialType } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPostTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return "today";
  if (isYesterday(date)) return "yesterday";
  if (Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000)
    return formatDistanceToNow(date, { addSuffix: true });
  return format(date, "MMM d, yyyy");
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  notes: "notes",
  cie1:  "CIE 1",
  cie2:  "CIE 2",
  cie3:  "CIE 3",
  exam:  "end sem",
};

export const MATERIAL_TYPE_STYLES: Record<MaterialType, string> = {
  notes: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
  cie1:  "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
  cie2:  "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  cie3:  "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
  exam:  "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
};

export const BRANCHES = [
  "Computer Science", "Information Science", "Electronics & Communication",
  "Electrical Engineering", "Mechanical Engineering", "Civil Engineering",
  "Chemical Engineering", "Data Science", "Economics", "Business Administration",
  "Physics", "Mathematics", "Biotechnology",
];

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

export const CLASS_KEY = "studyly_class";
export const THEME_KEY = "studyly_theme";
export const VOTER_KEY = "studyly_voter";
export const VOTED_KEY = "studyly_voted";

// ── BMSCE cycle logic ─────────────────────────────────────
// NOTE: the cycle picker always asks "which cycle applies to
// you THIS semester" — there is no automatic sem-2 swap. The
// raw value picked is used, unmodified, everywhere: subject
// list, browse query, and DB storage. This avoids the
// double-flip bug where an already-resolved value was flipped
// a second time after being round-tripped through localStorage
// or the URL.

export type Cycle = "chemistry" | "physics";

export const BMSCE_CYCLES: { value: Cycle; label: string }[] = [
  { value: "chemistry", label: "Chemistry Cycle" },
  { value: "physics",   label: "Physics Cycle" },
];

export const BMSCE_CYCLE_SEMESTERS = [1, 2];

export const BMSCE_SUBJECTS: Record<Cycle, string[]> = {
  chemistry: ["Chemistry", "Maths", "AI", "Python", "English"],
  physics:   ["Physics", "Maths", "CAED", "C", "Kannada", "Soft Skills"],
};

export const BMSCE_SHARED_SUBJECTS = BMSCE_SUBJECTS.chemistry.filter((s) =>
  BMSCE_SUBJECTS.physics.includes(s)
);

// ── Electives shared across Sem 1 & Sem 2 ──────────────────
// These subjects are identical regardless of cycle AND regardless
// of whether the student is in sem 1 or sem 2 — one set of notes
// covers both. Fill in the actual subject names here.
export const BMSCE_ELECTIVES: string[] = [
  // e.g. "Environmental Science", "Constitution of India"
];

export function isElective(subject: string): boolean {
  return BMSCE_ELECTIVES.includes(subject);
}

// For electives, query/store across both sem 1 and sem 2.
// For everything else, just the exact semester selected.
export function getSemestersForSubject(subject: string, semester: number): number[] {
  return isElective(subject) ? [1, 2] : [semester];
}

export function needsCycle(collegeName: string, semester: number): boolean {
  return (
    collegeName.toLowerCase().includes("bms college") &&
    BMSCE_CYCLE_SEMESTERS.includes(semester)
  );
}

// Given a subject, which cycle should be stored in the DB?
// Shared subjects (Maths) and electives are stored with cycle = null
// so a single upload is visible regardless of cycle (and, for
// electives, regardless of sem 1 vs sem 2 too — see isElective()).
export function resolveCycleForStorage(cycle: Cycle | "", subject: string): Cycle | null {
  if (!cycle) return null;
  if (BMSCE_SHARED_SUBJECTS.includes(subject)) return null;
  if (isElective(subject)) return null;
  return cycle;
}

export function getVoterKey(): string {
  if (typeof window === "undefined") return "";
  let key = localStorage.getItem(VOTER_KEY);
  if (!key) { key = crypto.randomUUID(); localStorage.setItem(VOTER_KEY, key); }
  return key;
}
