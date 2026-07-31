"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import type { ProductCard } from "@/types/chat";
import type { CartItem } from "@/types/commerce";
import {
  addToCart as addToCartAction,
  clearCart as clearCartAction,
  getCart as getCartAction,
  setCartItemQuantity as setQuantityAction,
  type BackendCart,
  type BackendCartItem,
} from "@/lib/commerce/actions";

interface CommerceState {
  cart: CartItem[];
  cartCount: number;
  addToCart: (product: ProductCard) => void;
  setQuantity: (code: string, quantity: number) => void;
  removeFromCart: (code: string) => void;
  clearCart: () => void;
  /** Reload the cart from the backend, e.g. after the agent changed it in chat. */
  refreshCart: () => void;
  isCheckoutOpen: boolean;
  setCheckoutOpen: (open: boolean) => void;
}

const CommerceContext = createContext<CommerceState | null>(null);

/** Adapt a backend line item to the `{ product, quantity }` shape the UI renders. */
function toCartItem(item: BackendCartItem): CartItem {
  return {
    product: {
      code: item.product_id,
      name: item.name,
      price: item.price ? `Rs. ${item.price.toLocaleString("en-LK")}` : null,
      image_url: item.image_url,
    },
    quantity: item.quantity,
  };
}

function toCartItems(cart: BackendCart): CartItem[] {
  return cart.items.map(toCartItem);
}

/**
 * Conversation-scoped commerce store. The cart is owned by the backend and keyed
 * to the active conversation, so it is the same cart the chat agent reads and
 * writes. Mutations call server actions and reconcile against the returned cart;
 * switching conversations reloads the matching cart.
 */
export function CommerceProvider({ children }: { children: React.ReactNode }) {
  const conversationId = useSelectedLayoutSegment() ?? "";
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckoutOpen, setCheckoutOpen] = useState(false);

  const refreshCart = useCallback(() => {
    if (!conversationId) {
      setCart([]);
      return;
    }
    getCartAction(conversationId).then((result) => {
      if (result.ok) setCart(toCartItems(result.cart));
    });
  }, [conversationId]);

  // Load the cart whenever the active conversation changes. A new chat has no
  // id yet and therefore no cart until its first turn creates one, so an empty
  // id resolves to an empty cart without hitting the backend.
  useEffect(() => {
    let active = true;
    const load = conversationId
      ? getCartAction(conversationId).then((result) =>
          result.ok ? toCartItems(result.cart) : null
        )
      : Promise.resolve<CartItem[]>([]);
    load.then((items) => {
      if (active && items) setCart(items);
    });
    return () => {
      active = false;
    };
  }, [conversationId]);

  const addToCart = useCallback(
    (product: ProductCard) => {
      if (!conversationId) return;
      addToCartAction(conversationId, product).then((result) => {
        if (result.ok) setCart(toCartItems(result.cart));
      });
    },
    [conversationId]
  );

  const setQuantity = useCallback(
    (code: string, quantity: number) => {
      if (!conversationId) return;
      setQuantityAction(conversationId, code, Math.max(0, quantity)).then(
        (result) => {
          if (result.ok) setCart(toCartItems(result.cart));
        }
      );
    },
    [conversationId]
  );

  const removeFromCart = useCallback(
    (code: string) => {
      if (!conversationId) return;
      setQuantityAction(conversationId, code, 0).then((result) => {
        if (result.ok) setCart(toCartItems(result.cart));
      });
    },
    [conversationId]
  );

  const clearCart = useCallback(() => {
    if (!conversationId) return;
    clearCartAction(conversationId).then((result) => {
      if (result.ok) setCart(toCartItems(result.cart));
    });
  }, [conversationId]);

  const value = useMemo<CommerceState>(
    () => ({
      cart,
      cartCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
      isCheckoutOpen,
      setCheckoutOpen,
    }),
    [
      cart,
      addToCart,
      setQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
      isCheckoutOpen,
    ]
  );

  return (
    <CommerceContext.Provider value={value}>
      {children}
    </CommerceContext.Provider>
  );
}

export function useCommerce(): CommerceState {
  const context = useContext(CommerceContext);
  if (!context) {
    throw new Error("useCommerce must be used within a CommerceProvider");
  }
  return context;
}
