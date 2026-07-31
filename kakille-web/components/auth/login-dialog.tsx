"use client";

import { useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import Link from "next/link";

import { loginWithGoogle } from "@/lib/auth/actions";
import { signInWithGoogle } from "@/lib/firebase/client";

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
}

/** Sign-in modal featuring Kakille and responsive solid/semi-solid background. */
export function LoginDialog({ open, onClose }: LoginDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleGoogle() {
    setError(null);
    startTransition(async () => {
      const idToken = await signInWithGoogle();
      if (!idToken) return;
      const result = await loginWithGoogle(idToken);
      if (result.error) {
        setError(result.error);
      } else if (result.success) {
        onClose();
        window.location.href = "/";
      }
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="login-backdrop"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm dark:bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="login-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Kakille AI Login"
              onClick={(e) => e.stopPropagation()}
              className="border-foreground/6 bg-background/98 relative flex w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border shadow-2xl backdrop-blur-md md:max-w-4xl md:flex-row dark:bg-zinc-950/98"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={onClose}
                className="text-foreground/45 hover:text-foreground/90 absolute top-4 right-4 z-10 rounded-lg p-1.5 transition-colors"
              >
                <X className="h-4 w-4 md:h-5 md:w-5" />
              </button>

              {/* Left Panel: Kakille Intro */}
              <div className="flex flex-col items-center justify-center bg-violet-600/[0.03] p-6 pb-2 text-center md:w-[42%] md:p-12 dark:bg-violet-500/[0.03]">
                <div className="relative flex items-center justify-center md:mb-4">
                  <motion.img
                    src="/kakille-mascot.png"
                    alt="Kakille"
                    initial={{ y: 5, rotate: -1 }}
                    animate={{ y: -5, rotate: 1 }}
                    transition={{
                      repeat: Infinity,
                      repeatType: "reverse",
                      duration: 3,
                      ease: "easeInOut",
                    }}
                    className="h-48 w-48 object-contain drop-shadow-md filter md:h-56 md:w-56"
                  />
                </div>
                <h3 className="text-foreground/90 hidden text-sm font-semibold tracking-tight md:block md:text-lg">
                  Hi, I am Kakille
                </h3>
                <p className="text-foreground/60 mt-1.5 hidden max-w-[200px] text-[11px] leading-relaxed md:block md:max-w-[260px] md:text-sm">
                  always here to lend a hand whenever you need.
                </p>
              </div>

              {/* Right Panel: Login Buttons & Privacy Info */}
              <div className="flex flex-col justify-center bg-violet-600/[0.03] px-6 py-6 pt-2 md:w-[58%] md:p-12 dark:bg-violet-500/[0.03]">
                <h2 className="text-foreground/90 text-center text-base font-bold tracking-tight md:text-left md:text-2xl">
                  Kakille AI Login
                </h2>
                <p className="text-foreground/50 mt-1 text-center text-xs md:text-left md:text-sm">
                  Your personal AI shopping assistant
                </p>

                <div className="mt-5 flex flex-col gap-3 md:mt-8 md:gap-4">
                  {error && <p className="text-destructive text-xs">{error}</p>}

                  <div className="flex flex-col gap-2 md:gap-3">
                    <button
                      type="button"
                      onClick={handleGoogle}
                      disabled={isPending}
                      className="border-foreground/6 hover:bg-foreground/5 bg-foreground/3 text-foreground/80 flex w-full items-center justify-center gap-2.5 rounded-lg border px-3 py-2.5 text-xs font-medium transition-colors duration-200 disabled:opacity-60 md:gap-3 md:py-3.5 md:text-sm"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 md:h-5 md:w-5"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <button
                      type="button"
                      disabled
                      className="border-foreground/6 text-foreground/30 flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-lg border bg-transparent px-3 py-2.5 text-xs font-medium opacity-60 md:gap-3 md:py-3.5 md:text-sm"
                    >
                      <svg
                        className="h-4 w-4 shrink-0 opacity-40 md:h-5 md:w-5"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.51 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.93.948 1.62-.027 2.67-1.48 3.65-2.923 1.15-1.673 1.625-3.29 1.65-3.37-.035-.012-3.172-1.22-3.207-4.82-.026-3.003 2.45-4.446 2.56-4.517-1.41-2.073-3.57-2.316-4.32-2.368-1.97-.168-3.858 1.218-4.85 1.218zm2.329-3.793c.828-1.002 1.385-2.4 1.23-3.793-1.2.048-2.65.8-3.512 1.802-.76.877-1.43 2.293-1.25 3.669 1.34.104 2.71-.676 3.532-1.678z" />
                      </svg>
                      <span>Continue with Apple (Soon)</span>
                    </button>
                  </div>
                </div>

                {/* Privacy & Trust Panel */}
                <div className="bg-foreground/[0.02] border-foreground/6 mt-5 hidden rounded-xl border p-3 md:mt-8 md:block md:p-4">
                  <div className="text-foreground/80 flex items-center gap-1.5 text-[11px] font-semibold md:text-sm">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 md:h-4.5 md:w-4.5" />
                    Privacy & Trust Commitment
                  </div>
                  <ul className="text-foreground/60 mt-2 space-y-1.5 text-[10px] leading-relaxed md:space-y-2 md:text-xs">
                    <li className="flex items-start gap-1">
                      <span className="mt-0.5 text-emerald-500">•</span>
                      <span>
                        <strong>What we store:</strong> Saved addresses, contact
                        details, and active orders for checkout convenience.
                      </span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="mt-0.5 text-emerald-500">•</span>
                      <span>
                        <strong>What we don&apos;t store:</strong> Credit card
                        or payment credentials. We do not keep transcripts on
                        third-party servers.
                      </span>
                    </li>
                    <li className="flex items-start gap-1">
                      <span className="mt-0.5 text-emerald-500">•</span>
                      <span>
                        <strong>No sharing:</strong> Your personal information
                        is never shared or sold to anyone.
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Footer links */}
                <div className="border-foreground/6 text-foreground/45 mt-5 flex items-center justify-between border-t pt-3.5 text-[10px] md:mt-8 md:pt-5 md:text-xs">
                  <Link
                    href="/privacy"
                    className="hover:text-foreground/75 underline transition-colors"
                  >
                    Privacy & Support Policies
                  </Link>
                  <a
                    href="https://nayantha.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground/75 transition-colors"
                  >
                    by nayantha.me
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
