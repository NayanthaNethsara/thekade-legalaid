"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  EyeOff,
  FileText,
  Info,
} from "lucide-react";
import { motion } from "framer-motion";

export default function PrivacyPage() {
  return (
    <main className="bg-muted relative flex min-h-screen w-full flex-col items-center justify-center p-4 py-12 md:p-8">
      <div className="relative z-10 w-full max-w-3xl">
        {/* Back Link */}
        <Link
          href="/"
          className="text-foreground/65 hover:text-foreground mb-6 inline-flex items-center gap-2 text-sm transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to chat
        </Link>

        {/* Content Card */}
        <div className="border-border bg-background rounded-lg border p-6 md:p-12">
          {/* Header */}
          <div className="border-border mb-8 flex items-center justify-between border-b pb-6">
            <div>
              <div className="text-primary mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                <ShieldCheck className="h-4 w-4" />
                Information Hub
              </div>
              <h1 className="text-foreground text-2xl font-semibold tracking-tight md:text-3xl">
                Privacy & Support Policies
              </h1>
            </div>
            <motion.img
              src="/kakille-mascot.png"
              alt="Kakille"
              initial={{ y: 3 }}
              animate={{ y: -3 }}
              transition={{
                repeat: Infinity,
                repeatType: "reverse",
                duration: 2.5,
                ease: "easeInOut",
              }}
              className="h-16 w-16 object-contain drop-shadow-md filter md:h-20 md:w-20"
            />
          </div>

          {/* Policy Content */}
          <div className="text-foreground/75 space-y-8 text-sm leading-relaxed">
            {/* Section 1 */}
            <section className="space-y-3">
              <h2 className="text-foreground/90 flex items-center gap-2 font-semibold md:text-base">
                <FileText className="text-primary h-4 w-4" />
                1. Data Storage & Usage
              </h2>
              <p>
                We value your trust and strive to handle your information with
                care. We only collect the details necessary to provide legal
                aid assistance:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Profile Information:</strong> We store your basic
                  profile details (name and phone number) to personalize your
                  experience.
                </li>
                <li>
                  <strong>Conversations:</strong> Your chat history is kept so
                  you can return to earlier questions and continue where you
                  left off.
                </li>
                <li>
                  <strong>Notes & Reminders:</strong> Notes and reminders you
                  create in the workspace are stored locally in your browser.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-foreground/90 flex items-center gap-2 font-semibold md:text-base">
                <EyeOff className="text-primary h-4 w-4" />
                2. What We Do Not Store
              </h2>
              <p>
                To protect your privacy, our AI interfaces strictly restrict
                recording sensitive details:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Financial Details:</strong> Credit or debit card
                  details are never collected or stored.
                </li>
                <li>
                  <strong>Chat Records:</strong> We do not log or store
                  conversational text histories on third-party analytical
                  platforms.
                </li>
              </ul>
            </section>

            {/* Section 3 */}
            <section className="space-y-3">
              <h2 className="text-foreground/90 flex items-center gap-2 font-semibold md:text-base">
                <Lock className="text-primary h-4 w-4" />
                3. Privacy Commitment
              </h2>
              <p>
                We do not sell, rent, or distribute your personal details to
                third-party services. All data transfer is encrypted over SSL
                protocols, ensuring full secure transport layers.
              </p>
            </section>

            {/* Section 4 */}
            <section className="space-y-3">
              <h2 className="text-foreground/90 flex items-center gap-2 font-semibold md:text-base">
                <Info className="text-primary h-4 w-4" />
                4. AI Disclaimer & Support
              </h2>
              <p>
                Kakille is an AI assistant, not a lawyer. AI models are
                experimental and can produce incorrect answers. Its responses
                are general information, not legal advice; consult a qualified
                legal professional before acting on important matters. If you
                run into issues, please use the main chat interface to get
                automated support.
              </p>
            </section>
          </div>

          {/* Footer inside Card */}
          <div className="border-border text-foreground/45 mt-8 flex items-center justify-between border-t pt-6 text-xs">
            <span>Last updated: June 2026</span>
            <a
              href="https://nayantha.me"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground/75 underline transition-colors"
            >
              by nayantha.me
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
