import type { CartItem } from "@/types/commerce";

/**
 * Parses currency string (e.g. "Rs. 1,500.00" or "LKR 500") into a clean number.
 */
export function parsePrice(priceStr: string | null | undefined): number {
  if (!priceStr) return 0;
  const clean = priceStr.replace(/^(Rs\.|LKR\.|Rs|LKR)\s*/i, "");
  const noCommas = clean.replace(/,/g, "");
  const digits = noCommas.replace(/[^\d.]/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Calculates the total amount for items currently in the cart.
 */
export function calculateCartTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => {
    const priceNum = parsePrice(item.product.price);
    return sum + priceNum * item.quantity;
  }, 0);
}

export interface GenerateCheckoutMessageParams {
  isGift: boolean;
  buyerName: string;
  buyerPhone: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string;
  deliveryCity: string;
  deliveryDate: string;
  locationType: string;
  isAnonymous: boolean;
  giftMessage?: string;
  instructions?: string;
}

/**
 * Generates the text message to be submitted to the AI agent upon completing the checkout form.
 */
export function generateCheckoutMessage(
  params: GenerateCheckoutMessageParams
): string {
  const {
    isGift,
    buyerName,
    buyerPhone,
    recipientName,
    recipientPhone,
    addressLine1,
    addressLine2,
    deliveryCity,
    deliveryDate,
    locationType,
    isAnonymous,
    giftMessage,
    instructions,
  } = params;

  const fullAddress =
    addressLine2 && addressLine2.trim()
      ? `${addressLine1.trim()}, ${addressLine2.trim()}`
      : addressLine1.trim();

  if (isGift) {
    const senderLabel = isAnonymous
      ? "Anonymous"
      : buyerName.trim() || "Not specified";
    const lines = [
      "Order details submitted via checkout form. This is a gift.",
      `Sender: ${senderLabel}`,
      `Recipient name: ${recipientName.trim()}`,
      `Recipient phone: ${recipientPhone.trim()}`,
      `Delivery address: ${fullAddress}, ${deliveryCity.trim()} (${locationType})`,
      `Delivery date: ${deliveryDate}`,
    ];
    if (giftMessage && giftMessage.trim()) {
      lines.push(`Gift message: ${giftMessage.trim()}`);
    }
    if (instructions && instructions.trim()) {
      lines.push(`Instructions: ${instructions.trim()}`);
    }
    return lines.join("\n");
  } else {
    const lines = [
      "Order details submitted via checkout form. This is a personal order (buying for myself).",
      `My name: ${buyerName.trim()}`,
      `My phone: ${buyerPhone.trim()}`,
      `My delivery address: ${fullAddress}, ${deliveryCity.trim()} (${locationType})`,
      `Delivery date: ${deliveryDate}`,
    ];
    if (instructions && instructions.trim()) {
      lines.push(`Instructions: ${instructions.trim()}`);
    }
    return lines.join("\n");
  }
}
