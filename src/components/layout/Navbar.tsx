"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn, THEME_KEY } from "@/lib/utils";

export default function Navbar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  return (
    <nav className="sticky top-0 z-30 bg-white dark:bg-neutral-900 border-b border-black/10 dark:border-white/8 flex items-center justify-between px-6 h-14">
      <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
        <span className="text-brand dark:text-brand-mid">Study</span>
        <span className="text-accent italic">ly</span>
      </Link>

      <div className="flex items-center gap-1">
        {[
          { label: "browse", href: "/materials" },
          { label: "upload", href: "/upload" },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "text-sm px-4 py-1.5 rounded-full transition-colors",
              pathname.startsWith(t.href)
                ? "bg-brand-light dark:bg-green-950 text-brand dark:text-brand-mid font-medium"
                : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-gray-100"
            )}
          >
            {t.label}
          </Link>
        ))}

        <button
          onClick={toggleTheme}
          className="ml-2 w-8 h-8 flex items-center justify-center rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
          title="toggle dark mode"
        >
          {isDark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </nav>
  );
}
