import "./globals.css";
import type { Metadata } from "next";
import { Outfit, Oxanium } from "next/font/google";
import { cn } from "@/lib/utils";

const oxaniumHeading = Oxanium({subsets:['latin'],variable:'--font-heading'});

const outfit = Outfit({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Kakille Legal Aid - Admin Portal",
  description: "RAG Pipeline Training, Ingestion, and Document Verification Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", outfit.variable, oxaniumHeading.variable)}>
      <body>{children}</body>
    </html>
  );
}
