export type College = {
  id: string;
  name: string;
  city: string;
  state: string;
  approved: boolean;
  created_at: string;
};

// notes = general notes
// cie1/cie2/cie3 = internal assessment papers/notes
// exam = end semester
export type MaterialType = "notes" | "cie1" | "cie2" | "cie3" | "exam";

export type Cycle = "chemistry" | "physics";

export type Material = {
  id: string;
  college_id: string;
  branch: string;
  semester: number;
  cycle: Cycle | null;
  subject: string | null;
  title: string;
  type: MaterialType;
  file_url: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploader_name: string;
  upvotes: number;
  approved: boolean;
  created_at: string;
};

export type SavedClass = {
  collegeId: string;
  collegeName: string;
  branch: string;
  semester: number;
  cycle?: Cycle;
};
