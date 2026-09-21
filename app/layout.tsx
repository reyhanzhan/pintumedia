import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NunoDrama — Drama Pilihan, Cerita Tanpa Jeda",
  description: "Nikmati lima episode gratis, buka serial lengkap, dan dapatkan komisi dari program affiliate NunoDrama.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
