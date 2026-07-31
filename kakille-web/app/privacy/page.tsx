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
import { AmbientBackground } from "@/components/ambient-background";

export default function PrivacyPage() {
  return (
    <main className="bg-background relative flex min-h-screen w-full flex-col items-center justify-center p-4 py-12 md:p-8">
      <AmbientBackground />

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
        <div className="border-foreground/6 bg-background/90 rounded-[1.75rem] border p-6 shadow-2xl backdrop-blur-md md:p-12 dark:bg-zinc-950/90">
          {/* Header */}
          <div className="border-foreground/6 mb-8 flex items-center justify-between border-b pb-6">
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-bold tracking-wider text-violet-500 uppercase">
                <ShieldCheck className="h-4 w-4" />
                Information Hub
              </div>
              <h1 className="text-foreground/90 text-2xl font-bold tracking-tight md:text-3xl">
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
              <h2 className="text-foreground/90 flex items-center gap-2 font-bold md:text-base">
                <FileText className="h-4 w-4 text-violet-500" />
                1. Data Storage & Usage
              </h2>
              <p>
                We value your trust and strive to handle your information with
                care. We only collect the necessary details to facilitate
                checkout and customize your shopping journey:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Profile Information:</strong> We store your basic
                  profile details (name and phone number) to personalize
                  shipping documents.
                </li>
                <li>
                  <strong>Delivery Addresses:</strong> We cache your saved
                  delivery addresses to pre-fill the checkout form on subsequent
                  visits.
                </li>
                <li>
                  <strong>Shopping Carts:</strong> Active cart items are
                  maintained locally to compile checkout packages.
                </li>
              </ul>
            </section>

            {/* Section 2 */}
            <section className="space-y-3">
              <h2 className="text-foreground/90 flex items-center gap-2 font-bold md:text-base">
                <EyeOff className="h-4 w-4 text-violet-500" />
                2. What We Do Not Store
              </h2>
              <p>
                To protect your financial security, our AI interfaces strictly
                restrict recording sensitive details:
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  <strong>Payment Cards:</strong> Credit or debit card details
                  are never collected or stored. Transactions are processed
                  securely on bank network interfaces using temporary payment
                  links.
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
              <h2 className="text-foreground/90 flex items-center gap-2 font-bold md:text-base">
                <Lock className="h-4 w-4 text-violet-500" />
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
              <h2 className="text-foreground/90 flex items-center gap-2 font-bold md:text-base">
                <Info className="h-4 w-4 text-violet-500" />
                4. AI Disclaimer & Support
              </h2>
              <p>
                Kakille is an AI assistant. AI models are
                experimental and can produce incorrect answers or product
                suggestions. We recommend checking details before finalizing
                orders. If you run into issues, please use the main chat
                interface to get automated support, or contact customer service
                directly via the website helpline.
              </p>
            </section>
          </div>

          {/* Footer inside Card */}
          <div className="border-foreground/6 text-foreground/45 mt-8 flex items-center justify-between border-t pt-6 text-xs">
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
