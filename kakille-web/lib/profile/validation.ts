import { z } from "zod";
import type { ProfileInput } from "@/types/profile";

/**
 * Validates and formats a Sri Lankan phone number to +(94) format.
 */
export function validateAndFormatSriLankanPhone(phone: string): {
  isValid: boolean;
  formatted: string;
} {
  let clean = phone.trim().replace(/[\s\-()]/g, "");

  const hasPlus = clean.startsWith("+");
  if (hasPlus) {
    clean = clean.slice(1);
  }

  if (/^94\d{9}$/.test(clean)) {
    return { isValid: true, formatted: `+${clean}` };
  }
  if (/^0\d{9}$/.test(clean)) {
    return { isValid: true, formatted: `+94${clean.slice(1)}` };
  }
  if (/^\d{9}$/.test(clean)) {
    return { isValid: true, formatted: `+94${clean}` };
  }

  return { isValid: false, formatted: phone };
}

export const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(50, "Name cannot exceed 50 characters.")
    .optional()
    .or(z.literal(""))
    .nullable(),
  phone: z
    .string()
    .optional()
    .or(z.literal(""))
    .nullable()
    .refine(
      (val) => {
        if (!val) return true;
        return validateAndFormatSriLankanPhone(val).isValid;
      },
      {
        message: "Please enter a valid Sri Lankan phone number.",
      }
    ),
  addresses: z.array(
    z.object({
      label: z
        .string()
        .min(2, "Label must be at least 2 characters.")
        .max(50, "Label cannot exceed 50 characters."),
      value: z
        .string()
        .min(5, "Address must be at least 5 characters.")
        .max(100, "Address cannot exceed 100 characters."),
      is_default: z.boolean(),
    })
  ),
});

export type ProfileSchemaInput = z.infer<typeof profileSchema>;

export function validateProfile(
  data: unknown
):
  | { ok: true; data: ProfileInput; errors: null }
  | { ok: false; data: null; errors: Record<string, string> } {
  const result = profileSchema.safeParse(data);
  if (result.success) {
    const validatedData = { ...result.data };
    if (validatedData.phone) {
      const check = validateAndFormatSriLankanPhone(validatedData.phone);
      if (check.isValid) {
        validatedData.phone = check.formatted;
      }
    }
    return {
      ok: true,
      data: {
        name: validatedData.name ?? null,
        phone: validatedData.phone ?? null,
        addresses: validatedData.addresses,
      },
      errors: null,
    };
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const pathKey = issue.path.join(".");
    errors[pathKey] = issue.message;
  });

  return { ok: false, data: null, errors };
}
