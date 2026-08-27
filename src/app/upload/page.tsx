"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle, FileText, X, AlertCircle, FlaskConical, Atom } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { createClient } from "@/lib/supabase/client";
import {
  cn, BRANCHES, SEMESTERS, CLASS_KEY, getMaterialYears,
  BMSCE_CYCLES, BMSCE_SUBJECTS, BMSCE_SHARED_SUBJECTS,
  BMSCE_ELECTIVES, isElective,
  needsCycle, resolveCycleForStorage,
  type Cycle,
} from "@/lib/utils";
import type { College, MaterialType, SavedClass } from "@/types";

const MATERIAL_TYPES: { value: MaterialType; label: string; desc: string }[] = [
  { value: "notes", label: "notes",   desc: "general notes" },
  { value: "cie1",  label: "CIE 1",   desc: "1st internal" },
  { value: "cie2",  label: "CIE 2",   desc: "2nd internal" },
  { value: "cie3",  label: "CIE 3",   desc: "3rd internal" },
  { value: "exam",  label: "end sem", desc: "semester exam" },
];

const MAX_SIZE_MB = 10;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const MATERIAL_YEARS = getMaterialYears();

export default function UploadPage() {
  const router = useRouter();
  const [colleges, setColleges]           = useState<College[]>([]);
  const [collegeId, setCollegeId]         = useState("");
  const [branch, setBranch]               = useState("");
  const [semester, setSemester]           = useState("");
  const [cycle, setCycle]                 = useState<Cycle | "">("");
  const [subject, setSubject]             = useState("");
  const [customSubject, setCustomSubject] = useState("");
  const [materialYear, setMaterialYear]   = useState(String(MATERIAL_YEARS[0]));
  const [title, setTitle]                 = useState("");
  const [type, setType]                   = useState<MaterialType>("notes");
  const [uploaderName, setUploaderName]   = useState("");
  const [anonymous, setAnonymous]         = useState(false);
  const [file, setFile]                   = useState<File | null>(null);
  const [fileError, setFileError]         = useState<string | null>(null);
  const [loading, setLoading]             = useState(false);
  const [submitted, setSubmitted]         = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const selectedCollege = colleges.find((c) => c.id === collegeId);
  const showCycle = selectedCollege ? needsCycle(selectedCollege.name, parseInt(semester || "0")) : false;
  const availableSubjects = (showCycle && cycle) ? BMSCE_SUBJECTS[cycle] : null;
  const finalSubject = isElective(subject)
  ? subject
  : (availableSubjects ? subject : customSubject);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("colleges").select("*").eq("approved", true).order("name")
      .then(({ data }) => setColleges((data as College[]) ?? []));
    try {
      const stored = localStorage.getItem(CLASS_KEY);
      if (stored) {
        const saved: SavedClass = JSON.parse(stored);
        setCollegeId(saved.collegeId);
        setBranch(saved.branch);
        setSemester(String(saved.semester));
        // Cycle is deliberately NOT restored — re-picked each time
        // to avoid stale carry-over across semesters.
      }
    } catch {}
  }, []);

  function handleFileChange(f: File | null) {
    setFileError(null);
    if (!f) { setFile(null); return; }
    if (f.type !== "application/pdf") {
      setFileError("Only PDF files are accepted."); setFile(null); return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setFileError(`File too large. Maximum ${MAX_SIZE_MB}MB.`); setFile(null); return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !collegeId || !branch || !semester || !title || !materialYear) return;
    if (showCycle && !cycle && !isElective(finalSubject)) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    try {
      const safeName = file.name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
      const path = `${collegeId}/${branch}/${semester}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("materials")
        .upload(path, file, { contentType: "application/pdf", cacheControl: "3600" });
      if (uploadError) throw new Error(uploadError.message);

      const { data: { publicUrl } } = supabase.storage.from("materials").getPublicUrl(path);

      const cycleForStorage = resolveCycleForStorage(cycle, finalSubject);

      const { error: insertError } = await supabase.from("materials").insert({
        college_id:    collegeId,
        branch,
        semester:      parseInt(semester),
        cycle:         cycleForStorage,
        subject:       finalSubject || null,
        material_year: parseInt(materialYear),
        title:         title.trim(),
        type,
        file_url:      publicUrl,
        file_path:     path,
        file_name:     file.name,
        file_size:     file.size,
        uploader_name: anonymous ? "anonymous" : (uploaderName.trim() || "anonymous"),
        approved:      false,
      });
      if (insertError) throw new Error(insertError.message);
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
        <Navbar />
        <div className="max-w-md mx-auto pt-24 px-6 text-center">
          <CheckCircle size={48} className="text-brand dark:text-brand-mid mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Upload submitted!</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
            Your PDF is under review and will go live once approved — usually within a few hours.
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push("/materials")} className="btn-secondary">browse materials</button>
            <button onClick={() => { setSubmitted(false); setFile(null); setTitle(""); setSubject(""); setCustomSubject(""); setCycle(""); }} className="btn-primary">upload another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="font-serif text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">upload material</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Share your notes with students at your college. PDFs only, max {MAX_SIZE_MB}MB.</p>

        <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">college</label>
            <select className="select" value={collegeId} onChange={(e) => { setCollegeId(e.target.value); setCycle(""); setSubject(""); }} required>
              <option value="">select college…</option>
              {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">branch</label>
              <select className="select" value={branch} onChange={(e) => setBranch(e.target.value)} required>
                <option value="">branch…</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">semester</label>
              <select className="select" value={semester} onChange={(e) => { setSemester(e.target.value); setCycle(""); setSubject(""); }} required>
                <option value="">semester…</option>
                {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>

          {/* Year of material — separate from semester */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              which year is this material from?
            </label>
            <select className="select" value={materialYear} onChange={(e) => setMaterialYear(e.target.value)} required>
              {MATERIAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <p className="text-xs text-gray-400 dark:text-gray-600 mt-1.5">
              e.g. for a CIE paper, the year that exam was conducted — not the semester.
            </p>
          </div>

          {showCycle && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                which cycle are you covering this semester?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {BMSCE_CYCLES.map((c) => (
                  <button key={c.value} type="button" onClick={() => { setCycle(c.value); setSubject(""); }}
                    className={cn("flex items-center justify-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                      cycle === c.value ? "bg-brand border-brand text-white" : "border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-brand dark:hover:border-brand-mid")}>
                    {c.value === "chemistry" ? <FlaskConical size={16} /> : <Atom size={16} />}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              subject <span className="text-gray-300 dark:text-gray-700">(optional)</span>
            </label>
            {availableSubjects ? (
              <div className="flex gap-2 flex-wrap">
                {availableSubjects.map((s) => (
                  <button key={s} type="button" onClick={() => setSubject(s === subject ? "" : s)}
                    className={cn("text-xs px-3 py-1.5 rounded-full border transition-all",
                      subject === s ? "bg-brand border-brand text-white font-medium"
                        : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800",
                      BMSCE_SHARED_SUBJECTS.includes(s) && subject !== s && "border-dashed")}
                    title={BMSCE_SHARED_SUBJECTS.includes(s) ? "shared across both cycles" : undefined}>
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              <input className="input" placeholder="e.g. Operating Systems" value={customSubject} onChange={(e) => setCustomSubject(e.target.value)} />
            )}
          </div>

          {(semester === "1" || semester === "2") && BMSCE_ELECTIVES.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                or is this an elective? <span className="text-gray-300 dark:text-gray-700">(same notes for sem 1 &amp; 2)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {BMSCE_ELECTIVES.map((s) => (
                  <button key={s} type="button" onClick={() => { setSubject(s === subject ? "" : s); setCycle(""); }}
                    className={cn("text-xs px-3 py-1.5 rounded-full border transition-all",
                      subject === s ? "bg-brand border-brand text-white font-medium" : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800")}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">title</label>
            <input className="input" placeholder="e.g. Chemistry Unit 2 — Thermodynamics notes" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">type</label>
            <div className="grid grid-cols-5 gap-2">
              {MATERIAL_TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setType(t.value)}
                  className={cn("flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-xs font-medium transition-all",
                    type === t.value ? "bg-brand border-brand text-white" : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800")}>
                  <span className="font-semibold">{t.label}</span>
                  <span className={cn("text-xs", type === t.value ? "text-white/70" : "text-gray-400 dark:text-gray-600")}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              PDF file <span className="text-gray-300 dark:text-gray-700">(max {MAX_SIZE_MB}MB)</span>
            </label>
            {file ? (
              <div className="flex items-center gap-3 p-3 bg-brand-light dark:bg-green-950 border border-brand-mid rounded-xl">
                <FileText size={18} className="text-brand dark:text-brand-mid flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand dark:text-brand-mid truncate">{file.name}</p>
                  <p className="text-xs text-brand/60 dark:text-brand-mid/60">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                </div>
                <button type="button" onClick={() => setFile(null)} className="text-brand/60 hover:text-brand dark:text-brand-mid/60 dark:hover:text-brand-mid"><X size={16} /></button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl p-6 cursor-pointer hover:border-brand dark:hover:border-brand-mid transition-colors">
                <Upload size={20} className="text-gray-400" />
                <span className="text-sm text-gray-500 dark:text-gray-400">click to upload a PDF</span>
                <span className="text-xs text-gray-300 dark:text-gray-700">PDF only · max {MAX_SIZE_MB}MB</span>
                <input type="file" className="hidden" accept="application/pdf,.pdf" onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)} />
              </label>
            )}
            {fileError && (
              <div className="flex items-center gap-2 mt-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={13} />{fileError}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">
              your name <span className="text-gray-300 dark:text-gray-700">(optional)</span>
            </label>
            <input className="input" placeholder="how you want to appear" value={uploaderName} onChange={(e) => setUploaderName(e.target.value)} disabled={anonymous} />
            <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
              <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="rounded border-black/20 dark:border-white/20 text-brand focus:ring-brand" />
              <span className="text-xs text-gray-500 dark:text-gray-400">upload anonymously</span>
            </label>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950 px-3 py-2 rounded-lg">
              <AlertCircle size={13} />{error}
            </div>
          )}

          <button type="submit" disabled={loading || !file || (showCycle && !cycle && !isElective(finalSubject))} className="btn-primary mt-1">
            {loading ? "uploading…" : "submit for review"}
          </button>

          <p className="text-xs text-gray-400 dark:text-gray-600 text-center -mt-2">
            All uploads are reviewed before going live to keep quality high.
          </p>
        </form>
      </div>
    </div>
  );
}
