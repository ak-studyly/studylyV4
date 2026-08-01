"use client";

import { useState, useEffect } from "react";
import { Trash2, CheckCircle, XCircle, FileText, Lock } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import { cn, MATERIAL_TYPE_LABELS, MATERIAL_TYPE_STYLES, formatPostTime, formatFileSize } from "@/lib/utils";
import type { Material } from "@/types";

const SECRET_SESSION_KEY = "studyly_admin_secret";

export default function AdminPage() {
  const [secret, setSecret] = useState("");
  const [authed, setAuthed] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(SECRET_SESSION_KEY);
    if (stored) {
      setSecret(stored);
      fetchList(stored);
    }
  }, []);

  async function fetchList(s: string) {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/list", {
      method: "POST",
      body: JSON.stringify({ secret: s }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to load");
      setAuthed(false);
      return;
    }
    setAuthed(true);
    setMaterials(data.materials);
    sessionStorage.setItem(SECRET_SESSION_KEY, s);
  }

  async function handleApprove(id: string, approved: boolean) {
    setBusyId(id);
    const res = await fetch("/api/admin/approve", {
      method: "POST",
      body: JSON.stringify({ id, approved, secret }),
    });
    setBusyId(null);
    if (res.ok) {
      setMaterials((prev) => prev.map((m) => m.id === id ? { ...m, approved } : m));
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This removes the PDF and the listing permanently.`)) return;
    setBusyId(id);
    const res = await fetch("/api/admin/delete", {
      method: "POST",
      body: JSON.stringify({ id, secret }),
    });
    setBusyId(null);
    if (res.ok) {
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } else {
      const data = await res.json();
      alert(data.error ?? "Delete failed");
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
        <Navbar />
        <div className="max-w-sm mx-auto pt-24 px-6 text-center">
          <Lock size={32} className="text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h1 className="font-serif text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">admin access</h1>
          <input
            type="password"
            className="input mb-3"
            placeholder="admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") fetchList(secret); }}
          />
          <button onClick={() => fetchList(secret)} disabled={loading || !secret} className="btn-primary w-full">
            {loading ? "checking…" : "enter"}
          </button>
          {error && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{error}</p>}
        </div>
      </div>
    );
  }

  const pending = materials.filter((m) => !m.approved);
  const approved = materials.filter((m) => m.approved);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-950">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="font-serif text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">admin</h1>

        {pending.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-3">
              pending review ({pending.length})
            </p>
            <div className="flex flex-col gap-2">
              {pending.map((m) => (
                <AdminRow key={m.id} material={m} busy={busyId === m.id} onApprove={handleApprove} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-gray-400 dark:text-gray-600 uppercase tracking-wider mb-3">
            live ({approved.length})
          </p>
          <div className="flex flex-col gap-2">
            {approved.map((m) => (
              <AdminRow key={m.id} material={m} busy={busyId === m.id} onApprove={handleApprove} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminRow({
  material: m, busy, onApprove, onDelete,
}: {
  material: Material;
  busy: boolean;
  onApprove: (id: string, approved: boolean) => void;
  onDelete: (id: string, title: string) => void;
}) {
  return (
    <div className="card p-3 flex items-center gap-3">
      <FileText size={16} className="text-gray-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className={cn("tag", MATERIAL_TYPE_STYLES[m.type])}>{MATERIAL_TYPE_LABELS[m.type]}</span>
          {m.subject && <span className="text-xs text-gray-400 dark:text-gray-600">{m.subject}</span>}
          <span className="text-xs text-gray-300 dark:text-gray-700">
            {m.branch} · Sem {m.semester}{m.cycle ? ` · ${m.cycle}` : ""}
          </span>
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{m.title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-600">
          {m.uploader_name} · {formatPostTime(m.created_at)}
          {m.file_size ? ` · ${formatFileSize(m.file_size)}` : ""} · {m.upvotes} upvotes
        </p>
      </div>
      <a href={m.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-brand dark:text-brand-mid hover:underline flex-shrink-0">
        view
      </a>
      <button
        onClick={() => onApprove(m.id, !m.approved)}
        disabled={busy}
        className={cn(
          "flex items-center gap-1 text-xs px-2 py-1 rounded-lg border flex-shrink-0 transition-colors",
          m.approved
            ? "border-black/10 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800"
            : "border-brand bg-brand text-white hover:opacity-90"
        )}
      >
        {m.approved ? <XCircle size={12} /> : <CheckCircle size={12} />}
        {m.approved ? "unapprove" : "approve"}
      </button>
      <button
        onClick={() => onDelete(m.id, m.title)}
        disabled={busy}
        className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
        title="delete permanently"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
