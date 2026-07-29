import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studyly — study smarter, together",
  description: "Browse and share PDF study materials with your college peers.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Prevent dark mode flash on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('studyly_theme');
                if (theme === 'dark') document.documentElement.classList.add('dark');
              } catch {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
