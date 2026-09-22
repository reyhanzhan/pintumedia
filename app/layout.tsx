import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PintuMedia — Streaming Drama Pendek",
  description: "Tonton drama pendek pilihan dengan lima episode pertama gratis di PintuMedia.",
  icons: {
    icon: [{ url: "/brand/pintumedia-logo.jpg", type: "image/jpeg" }],
    shortcut: "/brand/pintumedia-logo.jpg",
    apple: "/brand/pintumedia-logo.jpg",
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
