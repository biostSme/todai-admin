import type { Metadata } from "next";
import { Anuphan } from "next/font/google";
import "./globals.css";

const anuphan = Anuphan({ subsets: ["thai", "latin"], variable: "--font-anuphan" });

export const metadata: Metadata = {
  title: "Admin — โตได้โตดี",
  description: "Admin Panel สำหรับจัดการเนื้อหาเว็บ โตได้โตดี",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className="h-full">
      <body className={`${anuphan.variable} font-sans min-h-full antialiased`}>{children}</body>
    </html>
  );
}
