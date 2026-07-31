"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, MapPin, Plus, Trash2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { clearMemory, getProfile, updateProfile } from "@/lib/profile/actions";
import type { Address, Profile } from "@/types/profile";
import { validateProfile } from "@/lib/profile/validation";

interface ProfilePanelProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY: Profile = { name: null, phone: null, addresses: [], memory: null };

export function ProfilePanel({ open, onClose }: ProfilePanelProps) {
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, startSaving] = useTransition();
  const [isClearing, startClearing] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getProfile();
    if (result.ok) {
      setProfile(result.profile);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch the profile from the backend each time the panel opens.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (open) load();
  }, [open, load]);

  const setField = (field: "name" | "phone", value: string) => {
    setSaved(false);
    setErrors((prev) => ({ ...prev, [field]: "" }));
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const setAddress = (index: number, patch: Partial<Address>) => {
    setSaved(false);
    // Clear errors for the modified fields
    setErrors((prev) => {
      const copy = { ...prev };
      if (patch.label !== undefined) delete copy[`addresses.${index}.label`];
      if (patch.value !== undefined) delete copy[`addresses.${index}.value`];
      return copy;
    });
    setProfile((prev) => ({
      ...prev,
      addresses: prev.addresses.map((address, i) =>
        i === index ? { ...address, ...patch } : address
      ),
    }));
  };

  const makeDefault = (index: number) => {
    setSaved(false);
    setProfile((prev) => ({
      ...prev,
      addresses: prev.addresses.map((address, i) => ({
        ...address,
        is_default: i === index,
      })),
    }));
  };

  const addAddress = () => {
    setSaved(false);
    setProfile((prev) => ({
      ...prev,
      addresses: [
        ...prev.addresses,
        { label: "home", value: "", is_default: prev.addresses.length === 0 },
      ],
    }));
  };

  const removeAddress = (index: number) => {
    setSaved(false);
    setProfile((prev) => ({
      ...prev,
      addresses: prev.addresses.filter((_, i) => i !== index),
    }));
  };

  const save = () => {
    const validation = validateProfile({
      name: profile.name?.trim() || null,
      phone: profile.phone?.trim() || null,
      addresses: profile.addresses.map((addr) => ({
        label: addr.label.trim(),
        value: addr.value.trim(),
        is_default: addr.is_default,
      })),
    });

    if (!validation.ok) {
      setErrors(validation.errors);
      setError("Please fix the validation errors before saving.");
      return;
    }

    setErrors({});
    setError(null);

    startSaving(async () => {
      setError(null);
      const result = await updateProfile(validation.data);
      if (result.ok) {
        setProfile(result.profile);
        setSaved(true);
      } else {
        setError(result.error);
      }
    });
  };

  const forget = () => {
    startClearing(async () => {
      const result = await clearMemory();
      if (result.ok) {
        setProfile((prev) => ({ ...prev, memory: null }));
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="profile-backdrop"
            className="fixed inset-0 z-40 bg-black/10 backdrop-blur-sm dark:bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              key="profile-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Your profile"
              onClick={(e) => e.stopPropagation()}
              className="border-foreground/6 bg-background/90 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[1.75rem] border bg-violet-600/[0.03] shadow-2xl backdrop-blur-md dark:bg-violet-500/[0.03] dark:bg-zinc-950/90"
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", damping: 26, stiffness: 320 }}
            >
              <header className="border-foreground/6 flex items-center justify-between border-b px-6 py-4">
                <h2 className="text-foreground/90 text-sm font-medium">
                  Your profile
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-foreground/40 hover:text-foreground/90 rounded-lg p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </header>

              <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
                {loading ? (
                  <div className="text-foreground/40 flex items-center justify-center py-12">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                ) : (
                  <>
                    <Field label="Name" error={errors["name"]}>
                      <TextInput
                        value={profile.name ?? ""}
                        onChange={(value) => setField("name", value)}
                        placeholder="Your name"
                        hasError={Boolean(errors["name"])}
                      />
                    </Field>

                    <Field label="Phone" error={errors["phone"]}>
                      <TextInput
                        value={profile.phone ?? ""}
                        onChange={(value) => setField("phone", value)}
                        placeholder="07X XXX XXXX"
                        inputMode="tel"
                        hasError={Boolean(errors["phone"])}
                      />
                    </Field>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground/50 text-xs font-medium tracking-wide uppercase">
                          Delivery addresses
                        </span>
                        <button
                          type="button"
                          onClick={addAddress}
                          className="text-foreground/60 hover:bg-foreground/5 hover:text-foreground/90 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </div>

                      {profile.addresses.length === 0 && (
                        <p className="border-foreground/10 text-foreground/30 rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                          No saved addresses yet.
                        </p>
                      )}

                      <div className="space-y-3">
                        {profile.addresses.map((address, index) => (
                          <div
                            key={index}
                            className="border-foreground/10 bg-foreground/2 space-y-2 rounded-xl border p-3"
                          >
                            <div className="flex items-center gap-2">
                              <MapPin className="text-foreground/30 h-3.5 w-3.5 shrink-0" />
                              <input
                                value={address.label}
                                onChange={(e) =>
                                  setAddress(index, { label: e.target.value })
                                }
                                placeholder="Label (home, office...)"
                                className={cn(
                                  "placeholder:text-foreground/20 flex-1 bg-transparent text-xs focus:outline-none",
                                  errors[`addresses.${index}.label`]
                                    ? "text-destructive font-medium"
                                    : "text-foreground/80"
                                )}
                              />
                              <button
                                type="button"
                                onClick={() => removeAddress(index)}
                                className="text-foreground/30 hover:text-destructive rounded p-1 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {errors[`addresses.${index}.label`] && (
                              <p className="text-destructive px-1 text-[10px] leading-none font-medium">
                                {errors[`addresses.${index}.label`]}
                              </p>
                            )}
                            <textarea
                              value={address.value}
                              onChange={(e) =>
                                setAddress(index, { value: e.target.value })
                              }
                              placeholder="Full address"
                              rows={2}
                              className={cn(
                                "bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 w-full resize-none rounded-lg px-3 py-2 text-sm transition-all focus:outline-none",
                                errors[`addresses.${index}.value`]
                                  ? "border-destructive/50 focus:border-destructive/80 border"
                                  : ""
                              )}
                            />
                            {errors[`addresses.${index}.value`] && (
                              <p className="text-destructive px-1 text-[10px] leading-none font-medium">
                                {errors[`addresses.${index}.value`]}
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => makeDefault(index)}
                              className={cn(
                                "inline-flex items-center gap-1 text-xs transition-colors",
                                address.is_default
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-foreground/40 hover:text-foreground/70"
                              )}
                            >
                              <Check className="h-3 w-3" />
                              {address.is_default
                                ? "Default"
                                : "Set as default"}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-foreground/50 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide uppercase">
                          What Kakille remembers
                        </span>
                        {profile.memory && (
                          <button
                            type="button"
                            onClick={forget}
                            disabled={isClearing}
                            className="text-foreground/50 hover:bg-destructive/10 hover:text-destructive inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors disabled:opacity-50"
                          >
                            {isClearing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Clear
                          </button>
                        )}
                      </div>
                      {profile.memory ? (
                        <p className="border-foreground/10 bg-foreground/2 text-foreground/60 rounded-xl border px-3 py-3 text-xs leading-relaxed whitespace-pre-wrap">
                          {profile.memory}
                        </p>
                      ) : (
                        <p className="border-foreground/10 text-foreground/30 rounded-lg border border-dashed px-3 py-4 text-center text-xs">
                          Nothing remembered yet — it builds up as you chat.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>

              <footer className="border-foreground/6 space-y-2 border-t px-6 py-4">
                {error && <p className="text-destructive text-xs">{error}</p>}
                <button
                  type="button"
                  onClick={save}
                  disabled={isSaving || loading}
                  className={cn(
                    "inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                    saved
                      ? "bg-emerald-500/90 text-white"
                      : "bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50"
                  )}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : saved ? (
                    <Check className="h-4 w-4" />
                  ) : null}
                  {saved ? "Saved" : "Save changes"}
                </button>
              </footer>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-foreground/50 text-xs font-medium tracking-wide uppercase">
          {label}
        </span>
        {error && (
          <span className="text-destructive text-[10px] leading-none font-medium">
            {error}
          </span>
        )}
      </div>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  inputMode,
  hasError,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  inputMode?: "tel" | "text";
  hasError?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode={inputMode}
      className={cn(
        "bg-foreground/5 text-foreground/90 placeholder:text-foreground/20 w-full rounded-lg border px-3 py-2.5 text-sm transition-colors focus:outline-none",
        hasError
          ? "border-destructive/50 focus:border-destructive/80"
          : "border-foreground/10 focus:border-foreground/20"
      )}
    />
  );
}
