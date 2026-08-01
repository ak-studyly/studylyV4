"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Star, Search, SlidersHorizontal, PlusCircle,
  FileText, ArrowUpRight, FlaskConical, Atom,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import AddCollegeModal from "@/components/ui/AddCollegeModal";
import { createClient } from "@/lib/supabase/client";
import {
  cn, BRANCHES, SEMESTERS, CLASS_KEY, VOTED_KEY,
  MATERIAL_TYPE_LABELS, MATERIAL_TYPE_STYLES,
  formatPostTime, formatFileSize,
  BMSCE_CYCLES, BMSCE_SUBJECTS, BMSCE_SHARED_SUBJECTS,
  BMSCE_ELECTIVES, isElective, getSemestersForSubject,
  needsCycle, getVoterKey,
  type Cycle,
} from "@/lib/utils";
import type { College, Material, SavedClass } from "@/types";

const TYPE_OPTIONS = [
  { value: "all",  label: "all" },
  { value: "notes", label: "notes" },
  { value: "cie1", label: "CIE 1" },
  { value: "cie2", label: "CIE 2" },
  { value: "cie3", label: "CIE 3" },
  { value: "exam", label: "end sem" },
];

type Params = {
  collegeId: string;
  branch: string;
  semester: number;
  cycle: Cycle | "";
  subject: string;
  type: string;
};

type Props = {
  colleges: College[];
  initialMaterials: Material[];
  initialCollege: College | null;
  initialParams: Params;
};

export default function MaterialsClient({
  colleges, initialMaterials, initialParams,
}: Props) {
  const router = useRouter();

  const [collegeId, setCollegeId]   = useState(initialParams.collegeId);
  const [branch, setBranch]         = useState(initialParams.branch);
  const [semester, setSemester]     = useState(initialParams.semester ? String(initialParams.semester) : "");
  // `cycle` is always the raw, directly-picked value for THIS semester.
  // It is never flipped or transformed — the same value is used for
  // the subject list, the DB query, and (in upload) the DB write.
  const [cycle, setCycle]           = useState<Cycle | "">(initialParams.cycle);
  const [subject, setSubject]       = useState(initialParams.subject);
  const [typeFilter, setTypeFilter] = useState(initialParams.type || "all");
  const [materials, setMaterials]   = useState<Material[]>(initialMaterials);
  const [loading, setLoading]       = useState(false);
  const [searched, setSearched]     = useState(initialMaterials.length > 0);
  const [votedIds, setVotedIds]     = useState<Set<string>>(new Set());
  const [votingId, setVotingId]     = useState<string | null>(null);
  const [addCollegeOpen, setAddCollegeOpen] = useState(false);

  const selectedCollege = colleges.find((c) => c.id === collegeId);
  const showCycle = selectedCollege ? needsCycle(selectedCollege.name, parseInt(semester || "0")) : false;
  const availableSubjects = (showCycle && cycle) ? BMSCE_SUBJECTS[cycle] : null;

  const step1Done = !!collegeId;
  const step2Done = step1Done && !!branch;
  const step3Done = step2Done && !!semester;
  const canSearch = step3Done && (!showCycle || !!cycle || (!!subject && isElective(subject)));

  useEffect(() => {
    try {
      const stored = localStorage.getItem(VOTED_KEY);
      if (stored) setVotedIds(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  useEffect(() => {
    if (collegeId && branch && semester && selectedCollege) {
      const saved: SavedClass = {
        collegeId,
        collegeName: selectedCollege.name,
        branch,
        semester: parseInt(semester),
        cycle: (showCycle && cycle) ? cycle : undefined,
      };
      localStorage.setItem(CLASS_KEY, JSON.stringify(saved));
    }
  }, [collegeId, branch, semester, cycle, selectedCollege, showCycle]);

  const fetchMaterials = useCallback(async (overrideType?: string) => {
    if (!collegeId || !branch || !semester) return;
    if (showCycle && !cycle) return;
    setLoading(true);
    setSearched(true);

    const supabase = createClient();
    const activeType = overrideType ?? typeFilter;

    let q = supabase
      .from("materials")
      .select("*")
      .eq("college_id", collegeId)
      .eq("branch", branch)
      .in("semester", getSemestersForSubject(subject, parseInt(semester)))
      .eq("approved", true)
      .order("upvotes", { ascending: false });

    if (subject && isElective(subject)) {
      // Electives ignore cycle entirely — same notes for everyone,
      // sem 1 and sem 2 alike. Subject match is enough.
      q = q.eq("subject", subject);
    } else if (showCycle && cycle) {
      if (subject && BMSCE_SHARED_SUBJECTS.includes(subject)) {
        // shared subject (e.g. Maths) is stored with cycle = null
        q = q.eq("subject", subject);
      } else if (subject) {
        q = q.eq("subject", subject).or(`cycle.eq.${cycle},cycle.is.null`);
      } else {
        q = q.or(`cycle.eq.${cycle},cycle.is.null`);
      }
    } else if (subject.trim()) {
      q = q.ilike("subject", `%${subject.trim()}%`);
    }

    if (activeType !== "all") q = q.eq("type", activeType);

    const { data } = await q;
    setMaterials((data as Material[]) ?? []);
    setLoading(false);
  }, [collegeId, branch, semester, cycle, subject, typeFilter, showCycle]);

  async function handleToggleUpvote(material: Material) {
    if (votingId) return; // prevent double-click races
    setVotingId(material.id);
    const voterKey = getVoterKey();
    const supabase = createClient();

    const { data, error } = await supabase.rpc("toggle_upvote", {
      p_material_id: material.id,
      p_voter_key: voterKey,
    });

    setVotingId(null);
    if (error || !data || !data[0]) return;

    const { voted, upvotes } = data[0] as { voted: boolean; upvotes: number };

    setMaterials((prev) => prev.map((m) => m.id === material.id ? { ...m, upvotes } : m));

    setVotedIds((prev) => {
      const next = new Set(prev);
      if (voted) next.add(material.id); else next.delete(material.id);
      localStorage.setItem(VOTED_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="font-serif text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">browse materials</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">PDF notes, CIE papers and end-sem material — shared by students.</p>
        </div>

        <div className="card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {[
              { done: step1Done, label: "college" },
              { done: step2Done, label: "branch" },
              { done: step3Done, label: "semester" },
              ...(showCycle ? [{ done: canSearch, label: "cycle" }] : []),
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-1.5">
                <div className={cn("w-2 h-2 rounded-full transition-colors", s.done ? "bg-brand dark:bg-brand-mid" : "bg-gray-200 dark:bg-neutral-700")} />
                <span className={cn("text-xs", s.done ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400 dark:text-gray-600")}>{s.label}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <select className="select" value={collegeId} onChange={(e) => { setCollegeId(e.target.value); setBranch(""); setSemester(""); setCycle(""); setSubject(""); setMaterials([]); setSearched(false); }}>
              <option value="">select your college…</option>
              {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
            </select>

            <div className={cn("transition-all duration-300 overflow-hidden", step1Done ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
              <select className="select" value={branch} onChange={(e) => { setBranch(e.target.value); setSemester(""); setCycle(""); setSubject(""); setMaterials([]); setSearched(false); }}>
                <option value="">select branch…</option>
                {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className={cn("transition-all duration-300 overflow-hidden", step2Done ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
              <select className="select" value={semester} onChange={(e) => { setSemester(e.target.value); setCycle(""); setSubject(""); setMaterials([]); setSearched(false); }}>
                <option value="">select semester…</option>
                {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>

            <div className={cn("transition-all duration-300 overflow-hidden", (step3Done && showCycle) ? "max-h-32 opacity-100" : "max-h-0 opacity-0")}>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">which cycle are you covering this semester?</p>
              <div className="grid grid-cols-2 gap-2">
                {BMSCE_CYCLES.map((c) => (
                  <button key={c.value} type="button" onClick={() => { setCycle(c.value); setSubject(""); }}
                    className={cn("flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all",
                      cycle === c.value ? "bg-brand border-brand text-white font-medium" : "border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-brand dark:hover:border-brand-mid")}>
                    {c.value === "chemistry" ? <FlaskConical size={15} /> : <Atom size={15} />}
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={cn("transition-all duration-300 overflow-hidden", canSearch ? "max-h-40 opacity-100" : "max-h-0 opacity-0")}>
              {availableSubjects ? (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">subject (optional)</p>
                  <div className="flex gap-1.5 flex-wrap">
                    <button type="button" onClick={() => setSubject("")}
                      className={cn("text-xs px-3 py-1.5 rounded-full border transition-all",
                        subject === "" ? "bg-brand border-brand text-white font-medium" : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800")}>
                      all
                    </button>
                    {availableSubjects.map((s) => (
                      <button key={s} type="button" onClick={() => setSubject(s)}
                        className={cn("text-xs px-3 py-1.5 rounded-full border transition-all",
                          subject === s ? "bg-brand border-brand text-white font-medium" : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800",
                          BMSCE_SHARED_SUBJECTS.includes(s) && subject !== s && "border-dashed")}
                        title={BMSCE_SHARED_SUBJECTS.includes(s) ? "shared across both cycles" : undefined}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <input className="input" placeholder="subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") fetchMaterials(); }} />
              )}
            </div>

            {/* Electives — same notes for sem 1 & 2, no cycle involved */}
            {(semester === "1" || semester === "2") && BMSCE_ELECTIVES.length > 0 && (
              <div className={cn("transition-all duration-300 overflow-hidden", step3Done ? "max-h-32 opacity-100" : "max-h-0 opacity-0")}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">or pick an elective (same notes for sem 1 &amp; 2)</p>
                <div className="flex gap-1.5 flex-wrap">
                  {BMSCE_ELECTIVES.map((s) => (
                    <button key={s} type="button" onClick={() => setSubject(subject === s ? "" : s)}
                      className={cn("text-xs px-3 py-1.5 rounded-full border transition-all",
                        subject === s ? "bg-brand border-brand text-white font-medium" : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800")}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className={cn("transition-all duration-300 overflow-hidden", canSearch ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
              <button onClick={() => fetchMaterials()} disabled={!canSearch || loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-1">
                <Search size={14} />
                {loading ? "searching…" : "search"}
              </button>
            </div>
          </div>

          <button onClick={() => setAddCollegeOpen(true)} className="flex items-center gap-1.5 text-xs text-brand dark:text-brand-mid hover:underline mt-3">
            <PlusCircle size={12} />
            don't see your college? add it
          </button>
        </div>

        {searched && (
          <>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <SlidersHorizontal size={13} className="text-gray-400 dark:text-gray-600" />
              {TYPE_OPTIONS.map((t) => (
                <button key={t.value} onClick={() => { setTypeFilter(t.value); fetchMaterials(t.value); }}
                  className={cn("text-xs px-3 py-1.5 rounded-full border transition-all",
                    typeFilter === t.value ? "bg-brand border-brand text-white font-medium" : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800")}>
                  {t.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex flex-col gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card p-4 animate-pulse">
                    <div className="h-4 bg-gray-100 dark:bg-neutral-800 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 dark:bg-neutral-800 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : materials.length === 0 ? (
              <div className="card p-10 text-center">
                <FileText size={32} className="text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">No materials found.</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mb-4">Be the first to upload!</p>
                <button onClick={() => router.push("/upload")} className="btn-primary inline-flex items-center gap-2">upload a PDF</button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-gray-400 dark:text-gray-600">{materials.length} result{materials.length !== 1 ? "s" : ""} — sorted by upvotes</p>
                {materials.map((m) => (
                  <MaterialCard
                    key={m.id}
                    material={m}
                    hasVoted={votedIds.has(m.id)}
                    voting={votingId === m.id}
                    onToggleUpvote={() => handleToggleUpvote(m)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {!searched && (
          <div className="border border-dashed border-black/10 dark:border-white/10 rounded-xl p-6 flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-neutral-900">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Have good notes?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Share your PDFs and help your peers.</p>
            </div>
            <button onClick={() => router.push("/upload")} className="btn-primary">upload a PDF</button>
          </div>
        )}
      </div>
      <AddCollegeModal open={addCollegeOpen} onClose={() => setAddCollegeOpen(false)} />
    </div>
  );
}

function MaterialCard({
  material: m, hasVoted, voting, onToggleUpvote,
}: {
  material: Material;
  hasVoted: boolean;
  voting: boolean;
  onToggleUpvote: () => void;
}) {
  return (
    <div className="card p-4 flex items-center gap-4 hover:border-brand-mid dark:hover:border-brand-mid transition-colors">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        m.type === "notes" ? "bg-green-100 dark:bg-green-950" :
        m.type === "cie1"  ? "bg-blue-100 dark:bg-blue-950" :
        m.type === "cie2"  ? "bg-violet-100 dark:bg-violet-950" :
        m.type === "cie3"  ? "bg-orange-100 dark:bg-orange-950" :
                             "bg-red-100 dark:bg-red-950")}>
        <FileText size={18} className={cn(
          m.type === "notes" ? "text-green-700 dark:text-green-300" :
          m.type === "cie1"  ? "text-blue-700 dark:text-blue-300" :
          m.type === "cie2"  ? "text-violet-700 dark:text-violet-300" :
          m.type === "cie3"  ? "text-orange-700 dark:text-orange-300" :
                               "text-red-700 dark:text-red-300")} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className={cn("tag", MATERIAL_TYPE_STYLES[m.type])}>{MATERIAL_TYPE_LABELS[m.type]}</span>
          {m.subject && <span className="text-xs text-gray-400 dark:text-gray-600">{m.subject}</span>}
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-600 mt-0.5">
          by {m.uploader_name} · {formatPostTime(m.created_at)}
          {m.file_size ? ` · ${formatFileSize(m.file_size)}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onToggleUpvote}
          disabled={voting}
          title={hasVoted ? "click to remove your upvote" : "upvote"}
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all",
            hasVoted
              ? "bg-brand-light dark:bg-green-950 border-brand-mid text-brand dark:text-brand-mid"
              : "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-brand dark:hover:border-brand-mid hover:text-brand dark:hover:text-brand-mid",
            voting && "opacity-50"
          )}
        >
          <Star size={12} fill={hasVoted ? "currentColor" : "none"} />
          {m.upvotes}
        </button>
        <a href={m.file_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-brand dark:hover:border-brand-mid hover:text-brand dark:hover:text-brand-mid transition-all">
          <ArrowUpRight size={13} />
          open
        </a>
      </div>
    </div>
  );
}
