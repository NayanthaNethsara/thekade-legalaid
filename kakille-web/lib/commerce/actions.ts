"use server";

import { auth } from "@/lib/auth/config";
import { apiFetch } from "@/lib/api";
import { getGuestToken } from "@/lib/guest/session";
import type { ProductCard } from "@/types/chat";

/** One line item as stored by the backend cart. */
export type BackendCartItem = {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string | null;
};

/** The backend cart envelope returned by every cart endpoint. */
export type BackendCart = {
  items: BackendCartItem[];
  total_price: number;
};

export type CartResult =
  | { ok: true; cart: BackendCart }
  | { ok: false; error: string };

const EMPTY_CART: BackendCart = { items: [], total_price: 0 };

async function getBearer(): Promise<string | null> {
  const session = await auth();
  return session?.accessToken ?? (await getGuestToken());
}

/** Parse a "Rs. 3,200" style price string into a number; 0 when unknown. */
function parsePrice(price?: string | null): number {
  if (!price) return 0;
  const clean = price.replace(/^(Rs\.|LKR\.|Rs|LKR)\s*/i, "");
  const noCommas = clean.replace(/,/g, "");
  const digits = noCommas.replace(/[^\d.]/g, "");
  return digits ? Number(digits) : 0;
}

/**
 * Load the cart for one conversation. Every conversation owns exactly one cart,
 * keyed server-side to the same thread the chat agent reads and writes, so the
 * UI and the agent always see the same cart.
 */
export async function getCart(conversationId: string): Promise<CartResult> {
  const bearer = await getBearer();
  if (!bearer)
    return { ok: false, error: "Your session expired. Please reload." };

  const query = `?conversation_id=${encodeURIComponent(conversationId)}`;
  const result = await apiFetch<BackendCart>(`/cart${query}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok
    ? { ok: true, cart: result.data }
    : { ok: false, error: result.detail };
}

/** Add one unit of a product to the conversation's cart. */
export async function addToCart(
  conversationId: string,
  product: ProductCard
): Promise<CartResult> {
  const bearer = await getBearer();
  if (!bearer)
    return { ok: false, error: "Your session expired. Please reload." };

  const result = await apiFetch<BackendCart>("/cart/items", {
    method: "POST",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      conversation_id: conversationId,
      item: {
        product_id: product.code,
        name: product.name,
        price: parsePrice(product.price),
        quantity: 1,
        image_url: product.image_url ?? null,
      },
    }),
  });
  return result.ok
    ? { ok: true, cart: result.data }
    : { ok: false, error: result.detail };
}

/**
 * Set the quantity of a line item. A quantity of 0 removes it, matching the
 * backend, so callers do not need a separate remove call.
 */
export async function setCartItemQuantity(
  conversationId: string,
  productId: string,
  quantity: number
): Promise<CartResult> {
  const bearer = await getBearer();
  if (!bearer)
    return { ok: false, error: "Your session expired. Please reload." };

  const result = await apiFetch<BackendCart>("/cart/items", {
    method: "PUT",
    headers: { Authorization: `Bearer ${bearer}` },
    body: JSON.stringify({
      conversation_id: conversationId,
      product_id: productId,
      quantity,
    }),
  });
  return result.ok
    ? { ok: true, cart: result.data }
    : { ok: false, error: result.detail };
}

/** Empty the conversation's cart. Returns the now-empty cart on success. */
export async function clearCart(conversationId: string): Promise<CartResult> {
  const bearer = await getBearer();
  if (!bearer)
    return { ok: false, error: "Your session expired. Please reload." };

  const query = `?conversation_id=${encodeURIComponent(conversationId)}`;
  const result = await apiFetch<BackendCart>(`/cart${query}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${bearer}` },
  });
  return result.ok
    ? { ok: true, cart: result.data ?? EMPTY_CART }
    : { ok: false, error: result.detail };
}
