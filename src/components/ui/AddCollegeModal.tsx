"use client";

import { useState } from "react";
import { X, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = { open: boolean; onClose: () => void };

export default function AddCollegeModal({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("colleges")
      .insert({ name, city, state, approved: false });
    setLoading(false);
    if (error) { setError("Something went wrong. Please try again."); return; }
    setSubmitted(true);
  }

  function handleClose() {
    setName(""); setCity(""); setState("");
    setSubmitted(false); setError(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="card w-full max-w-sm p-6 relative">
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
          <X size={18} />
        </button>
        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle size={36} className="text-brand dark:text-brand-mid" />
            <h2 className="font-serif text-lg font-semibold text-gray-900 dark:text-gray-100">Request submitted!</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              We'll review <strong className="text-gray-700 dark:text-gray-300">{name}</strong> and add it within 24 hours.
            </p>
            <button onClick={handleClose} className="btn-primary mt-2 px-6">done</button>
          </div>
        ) : (
          <>
            <h2 className="font-serif text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Add your college</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">We'll review and add it within 24 hours.</p>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">college name</label>
                <input className="input" placeholder="e.g. BMS College of Engineering" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">city</label>
                  <input className="input" placeholder="e.g. Bengaluru" value={city} onChange={(e) => setCity(e.target.value)} required />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1.5">state</label>
                  <input className="input" placeholder="e.g. Karnataka" value={state} onChange={(e) => setState(e.target.value)} required />
                </div>
              </div>
              {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
              <div className="flex gap-2 mt-1">
                <button type="button" onClick={handleClose} className="btn-secondary flex-1">cancel</button>
                <button type="submit" disabled={loading} className="btn-primary flex-1">
                  {loading ? "submitting…" : "submit"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
