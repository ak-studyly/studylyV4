"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentUrl = useRef(`${pathname}?${searchParams.toString()}`);

  // Start the bar the moment any same-origin link is clicked —
  // this is what makes it feel instant, since App Router client
  // navigation doesn't fire any browser-level loading event.
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#")) return;
      if (anchor.target === "_blank") return;

      // Only start if this actually navigates somewhere new
      if (href === window.location.pathname + window.location.search) return;

      start();
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  // Finish the bar once the route has actually changed
  useEffect(() => {
    const nextUrl = `${pathname}?${searchParams.toString()}`;
    if (nextUrl !== currentUrl.current) {
      currentUrl.current = nextUrl;
      finish();
    }
  }, [pathname, searchParams]);

  function start() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setVisible(true);
    setWidth(15);
    intervalRef.current = setInterval(() => {
      setWidth((w) => (w < 80 ? w + (80 - w) * 0.1 : w));
    }, 150);
  }

  function finish() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setWidth(100);
    setTimeout(() => {
      setVisible(false);
      setTimeout(() => setWidth(0), 200);
    }, 200);
  }

  return (
    <div
      className="fixed top-0 left-0 h-0.5 bg-brand dark:bg-brand-mid z-[9999] transition-all ease-out"
      style={{
        width: `${width}%`,
        opacity: visible ? 1 : 0,
        transitionDuration: visible ? "200ms" : "300ms",
      }}
    />
  );
}
