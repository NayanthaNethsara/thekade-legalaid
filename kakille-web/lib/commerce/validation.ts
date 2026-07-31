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

// Validation Schema
export const checkoutSchema = z
  .object({
    isGift: z.boolean(),
    buyerName: z.string(),
    buyerPhone: z.string(),
    recipientName: z.string(),
    recipientPhone: z.string(),
    addressLine1: z
      .string()
      .min(1, "Address Line 1 is required.")
      .min(5, "Address must be at least 5 characters.")
      .max(100, "Address cannot exceed 100 characters."),
    addressLine2: z
      .string()
      .max(100, "Address Line 2 cannot exceed 100 characters.")
      .optional()
      .or(z.literal("")),
    deliveryCity: z
      .string()
      .min(1, "Delivery city is required.")
      .min(2, "City must be at least 2 characters.")
      .max(50, "City cannot exceed 50 characters."),
    deliveryDate: z.string().min(1, "Delivery date is required."),
    locationType: z.string(),
    isAnonymous: z.boolean(),
    giftMessage: z
      .string()
      .max(300, "Gift message cannot exceed 300 characters.")
      .optional()
      .or(z.literal("")),
    instructions: z
      .string()
      .max(200, "Instructions cannot exceed 200 characters.")
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    // Validate delivery date (must be today or in the future)
    if (data.deliveryDate) {
      const selected = new Date(data.deliveryDate);
      const today = new Date();
      selected.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      if (selected < today) {
        ctx.addIssue({
          code: "custom",
          message: "Delivery date must be today or in the future.",
          path: ["deliveryDate"],
        });
      }
    }

    // Validate personal/recipient names and phones based on order type (personal vs gift)
    if (data.isGift) {
      // Recipient validation
      const recipientNameTrimmed = data.recipientName.trim();
      if (!recipientNameTrimmed) {
        ctx.addIssue({
          code: "custom",
          message: "Recipient name is required.",
          path: ["recipientName"],
        });
      } else if (
        recipientNameTrimmed.length < 2 ||
        recipientNameTrimmed.length > 50
      ) {
        ctx.addIssue({
          code: "custom",
          message: "Recipient name must be between 2 and 50 characters.",
          path: ["recipientName"],
        });
      }

      if (!data.recipientPhone.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Recipient phone is required.",
          path: ["recipientPhone"],
        });
      } else {
        const phoneCheck = validateAndFormatSriLankanPhone(data.recipientPhone);
        if (!phoneCheck.isValid) {
          ctx.addIssue({
            code: "custom",
            message: "Please enter a valid Sri Lankan phone number.",
            path: ["recipientPhone"],
          });
        }
      }

      // Sender (buyer) validation
      if (!data.isAnonymous) {
        const buyerNameTrimmed = data.buyerName.trim();
        if (!buyerNameTrimmed) {
          ctx.addIssue({
            code: "custom",
            message: "Your name is required.",
            path: ["buyerName"],
          });
        } else if (
          buyerNameTrimmed.length < 2 ||
          buyerNameTrimmed.length > 50
        ) {
          ctx.addIssue({
            code: "custom",
            message: "Your name must be between 2 and 50 characters.",
            path: ["buyerName"],
          });
        }

        if (!data.buyerPhone.trim()) {
          ctx.addIssue({
            code: "custom",
            message: "Your phone number is required.",
            path: ["buyerPhone"],
          });
        } else {
          const phoneCheck = validateAndFormatSriLankanPhone(data.buyerPhone);
          if (!phoneCheck.isValid) {
            ctx.addIssue({
              code: "custom",
              message: "Please enter a valid Sri Lankan phone number.",
              path: ["buyerPhone"],
            });
          }
        }
      }
    } else {
      // Personal order details validation
      const buyerNameTrimmed = data.buyerName.trim();
      if (!buyerNameTrimmed) {
        ctx.addIssue({
          code: "custom",
          message: "Name is required.",
          path: ["buyerName"],
        });
      } else if (buyerNameTrimmed.length < 2 || buyerNameTrimmed.length > 50) {
        ctx.addIssue({
          code: "custom",
          message: "Name must be between 2 and 50 characters.",
          path: ["buyerName"],
        });
      }

      if (!data.buyerPhone.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "Phone number is required.",
          path: ["buyerPhone"],
        });
      } else {
        const phoneCheck = validateAndFormatSriLankanPhone(data.buyerPhone);
        if (!phoneCheck.isValid) {
          ctx.addIssue({
            code: "custom",
            message: "Please enter a valid Sri Lankan phone number.",
            path: ["buyerPhone"],
          });
        }
      }
    }
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Validates checkout form data using the Zod schema.
 * Returns a dictionary of field path key to error message if invalid.
 * If successful, formats phone numbers.
 */
export function validateCheckout(data: unknown) {
  const result = checkoutSchema.safeParse(data);
  if (result.success) {
    const validatedData = { ...result.data };

    if (validatedData.buyerPhone) {
      const check = validateAndFormatSriLankanPhone(validatedData.buyerPhone);
      if (check.isValid) {
        validatedData.buyerPhone = check.formatted;
      }
    }

    if (validatedData.recipientPhone) {
      const check = validateAndFormatSriLankanPhone(
        validatedData.recipientPhone
      );
      if (check.isValid) {
        validatedData.recipientPhone = check.formatted;
      }
    }

    return { ok: true, data: validatedData, errors: null } as const;
  }

  const errors: Record<string, string> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path[0];
    if (path && typeof path === "string") {
      errors[path] = issue.message;
    }
  });

  return { ok: false, data: null, errors } as const;
}

// Profile validation schema
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
