"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Upload, Star, ArrowRight, FileText, FlaskConical, Atom, PlusCircle } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import AddCollegeModal from "@/components/ui/AddCollegeModal";
import { createClient } from "@/lib/supabase/client";
import { cn, BRANCHES, SEMESTERS, BMSCE_CYCLES, needsCycle, CLASS_KEY, type Cycle } from "@/lib/utils";
import type { College, SavedClass } from "@/types";

export default function HomePage() {
  const router = useRouter();
  const [colleges, setColleges] = useState<College[]>([]);
  const [savedClass, setSavedClass] = useState<SavedClass | null>(null);
  const [collegeId, setCollegeId] = useState("");
  const [branch, setBranch] = useState("");
  const [semester, setSemester] = useState("");
  const [cycle, setCycle] = useState<Cycle | "">("");
  const [addCollegeOpen, setAddCollegeOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("colleges").select("*").eq("approved", true).order("name")
      .then(({ data }) => setColleges((data as College[]) ?? []));
    try {
      const stored = localStorage.getItem(CLASS_KEY);
      if (stored) setSavedClass(JSON.parse(stored));
    } catch {}
  }, []);

  const selectedCollege = colleges.find((c) => c.id === collegeId);
  const showCycle = selectedCollege ? needsCycle(selectedCollege.name, parseInt(semester || "0")) : false;

  const step1Done = !!collegeId;
  const step2Done = step1Done && !!branch;
  const step3Done = step2Done && !!semester;
  const canGo = step3Done && (!showCycle || !!cycle);

  function buildUrl(sc: SavedClass) {
    let url = `/materials?collegeId=${sc.collegeId}&branch=${encodeURIComponent(sc.branch)}&semester=${sc.semester}`;
    if (sc.cycle) url += `&cycle=${sc.cycle}`;
    return url;
  }

  function handleGo() {
    if (!canGo || !selectedCollege) return;
    // The raw cycle picked is used directly — no derived/flipped
    // value. The picker itself always represents "this semester".
    const saved: SavedClass = {
      collegeId,
      collegeName: selectedCollege.name,
      branch,
      semester: parseInt(semester),
      cycle: (showCycle && cycle) ? cycle : undefined,
    };
    localStorage.setItem(CLASS_KEY, JSON.stringify(saved));
    router.push(buildUrl(saved));
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950 flex flex-col">
      <Navbar />

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <span className="inline-block text-xs font-medium bg-brand-light dark:bg-green-950 text-brand dark:text-brand-mid px-4 py-1.5 rounded-full mb-6">
          study smarter, together
        </span>

        <h1 className="font-serif text-4xl md:text-5xl font-semibold text-gray-900 dark:text-gray-100 leading-tight max-w-2xl mb-4">
          Study materials,{" "}
          <em className="text-brand dark:text-brand-mid not-italic">shared by students</em>
        </h1>

        <p className="text-base text-gray-500 dark:text-gray-400 max-w-md leading-relaxed mb-10">
          Notes, CIE prep and end-sem material — uploaded by your seniors and peers. PDF only.
        </p>

        {savedClass ? (
          <div className="card p-5 w-full max-w-sm mb-6 text-left">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-3">your class</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{savedClass.collegeName}</p>
            <div className="flex items-center gap-2 mt-0.5 mb-4">
              {savedClass.cycle && (
                savedClass.cycle === "chemistry"
                  ? <FlaskConical size={13} className="text-brand dark:text-brand-mid" />
                  : <Atom size={13} className="text-brand dark:text-brand-mid" />
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {savedClass.branch} · Sem {savedClass.semester}
                {savedClass.cycle && ` · ${savedClass.cycle === "chemistry" ? "Chemistry" : "Physics"} Cycle`}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push(buildUrl(savedClass))} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <BookOpen size={15} />
                browse materials
                <ArrowRight size={14} />
              </button>
              <button onClick={() => { localStorage.removeItem(CLASS_KEY); setSavedClass(null); }} className="btn-secondary px-4 text-xs">
                change
              </button>
            </div>
          </div>
        ) : (
          <div className="card p-5 w-full max-w-sm mb-6 text-left">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-600 mb-4">find materials for your class</p>

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {[
                { done: step1Done, label: "college" },
                { done: step2Done, label: "branch" },
                { done: step3Done, label: "semester" },
                ...(showCycle ? [{ done: canGo, label: "cycle" }] : []),
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className={cn("w-2 h-2 rounded-full transition-colors", s.done ? "bg-brand dark:bg-brand-mid" : "bg-gray-200 dark:bg-neutral-700")} />
                  <span className={cn("text-xs", s.done ? "text-gray-700 dark:text-gray-300 font-medium" : "text-gray-400 dark:text-gray-600")}>{s.label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <select className="select" value={collegeId} onChange={(e) => { setCollegeId(e.target.value); setBranch(""); setSemester(""); setCycle(""); }}>
                <option value="">select your college…</option>
                {colleges.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
              </select>

              <div className={cn("flex flex-col gap-2 transition-all duration-300 overflow-hidden", step1Done ? "max-h-40 opacity-100" : "max-h-0 opacity-0")}>
                <select className="select" value={branch} onChange={(e) => { setBranch(e.target.value); setSemester(""); setCycle(""); }}>
                  <option value="">select branch…</option>
                  {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className={cn("transition-all duration-300 overflow-hidden", step2Done ? "max-h-20 opacity-100" : "max-h-0 opacity-0")}>
                <select className="select" value={semester} onChange={(e) => { setSemester(e.target.value); setCycle(""); }}>
                  <option value="">select semester…</option>
                  {SEMESTERS.map((s) => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </div>

              {/* Cycle — asked fresh for every semester it applies to, no auto-derived swap */}
              <div className={cn("transition-all duration-300 overflow-hidden", (step3Done && showCycle) ? "max-h-32 opacity-100" : "max-h-0 opacity-0")}>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">which cycle are you covering this semester?</p>
                <div className="grid grid-cols-2 gap-2">
                  {BMSCE_CYCLES.map((c) => (
                    <button key={c.value} type="button" onClick={() => setCycle(c.value)}
                      className={cn("flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all",
                        cycle === c.value ? "bg-brand border-brand text-white font-medium" : "border-black/10 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:border-brand dark:hover:border-brand-mid")}>
                      {c.value === "chemistry" ? <FlaskConical size={15} /> : <Atom size={15} />}
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={handleGo} disabled={!canGo} className="btn-primary flex items-center justify-center gap-2 mt-1">
                <BookOpen size={15} />
                browse materials
                <ArrowRight size={14} />
              </button>
            </div>

            <button onClick={() => setAddCollegeOpen(true)} className="flex items-center gap-1.5 text-xs text-brand dark:text-brand-mid hover:underline mt-3">
              <PlusCircle size={12} />
              don't see your college? add it
            </button>
          </div>
        )}

        <button onClick={() => router.push("/upload")} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors">
          <Upload size={15} />
          upload your notes
        </button>
      </section>

      <section className="bg-gray-50 dark:bg-neutral-900 border-t border-black/8 dark:border-white/8 px-6 py-12">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: <FileText size={18} className="text-brand dark:text-brand-mid" />, title: "PDF only", desc: "Clean, consistent and safe. Notes, CIE papers and end-sem material." },
            { icon: <Star size={18} className="text-brand dark:text-brand-mid" />, title: "community upvotes", desc: "The most helpful materials rise to the top." },
            { icon: <Upload size={18} className="text-brand dark:text-brand-mid" />, title: "easy to contribute", desc: "Upload in under a minute. No account needed." },
          ].map((f) => (
            <div key={f.title} className="flex flex-col gap-2">
              <div className="w-9 h-9 bg-brand-light dark:bg-green-950 rounded-xl flex items-center justify-center mb-1">
                {f.icon}
              </div>
              <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm">{f.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-black/8 dark:border-white/8 px-6 py-5 text-center">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          <span className="font-serif text-sm text-brand dark:text-brand-mid font-semibold">Study<em>ly</em></span>
          {" "}· built by students, for students
        </p>
      </footer>

      <AddCollegeModal open={addCollegeOpen} onClose={() => setAddCollegeOpen(false)} />
    </div>
  );
}
