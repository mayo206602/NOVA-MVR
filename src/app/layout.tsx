import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NOVA MVR",
  description: "Full-stack workspace with admin keys, work/family spaces, and Supabase backend.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
