import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FaWhatsapp } from "react-icons/fa"; 
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LegalAid - Legal Access for All",
  description: "AI-powered legal assistance platform providing chatbot support.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}>
        <main className="min-h-screen">
          {children}
        </main>

        {/* Floating WhatsApp Button */}
        <div className="fixed right-6 bottom-12 z-50 pointer-events-auto">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-emerald-600/30 animate-ping blur-lg" aria-hidden />

            <a
              href="https://wa.me/706358060"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="relative inline-flex items-center gap-3 rounded-full bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400 p-3 shadow-xl transition-all"
            >
              <FaWhatsapp className="w-6 h-6 text-white" />
              <span className="hidden md:inline-block text-sm font-medium text-white pr-1">
                WhatsApp
              </span>
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}