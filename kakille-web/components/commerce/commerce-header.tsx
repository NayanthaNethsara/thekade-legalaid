"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ShoppingCart, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCommerce } from "./commerce-store";
import { CartPanel, CartList } from "./cart-panel";

/**
 * Commerce container:
 * - On large screens (desktop), the cart is a floating popover anchored top-right.
 *   It opens from the cart button and closes via the close button or an outside click.
 * - On mobile/tablet, the same button opens a full slide-over sheet.
 */
export function CommerceHeader({
  isGuest = false,
  onSignIn,
}: {
  isGuest?: boolean;
  onSignIn?: () => void;
}) {
  const { cartCount } = useCommerce();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const handleOpenCart = () => {
    if (window.innerWidth >= 1024) {
      setDesktopOpen(true);
    } else {
      setMobileOpen(true);
    }
  };

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent<string | null>;
      if (customEvent.detail === "cart") {
        handleOpenCart();
      }
    };
    window.addEventListener("open-commerce-panel", handleOpen);
    return () => window.removeEventListener("open-commerce-panel", handleOpen);
  }, []);

  return (
    <>
      {/* Floating cart button, anchored top-right of the chat area */}
      <div className="pointer-events-none absolute top-0 right-4 z-30 flex h-24 items-center gap-3 md:top-3 md:right-3 md:h-auto">
        {isGuest && onSignIn && (
          <button
            type="button"
            onClick={onSignIn}
            className="text-foreground/60 hover:text-foreground/90 pointer-events-auto text-xs font-medium underline-offset-4 transition-colors hover:underline md:hidden"
          >
            Sign in
          </button>
        )}
        <div className="border-foreground/6 bg-background/25 supports-[backdrop-filter]:bg-background/15 pointer-events-auto flex items-center gap-0.5 rounded-full border p-1 backdrop-blur-lg">
          <HeaderButton label="Cart" badge={cartCount} onClick={handleOpenCart}>
            <ShoppingCart className="h-[18px] w-[18px]" />
          </HeaderButton>
        </div>
      </div>

      {/* Mobile/tablet slide-over sheet */}
      <div className="lg:hidden">
        <CartPanel open={mobileOpen} onClose={closeMobile} />
      </div>

      {/* Desktop floating popover */}
      <CartPopover open={desktopOpen} onClose={() => setDesktopOpen(false)} />
    </>
  );
}

/**
 * Desktop-only floating cart panel. Dismisses on an outside click so navigating
 * to the chat (or anywhere else) closes it automatically.
 */
function CartPopover({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { cart, cartCount, setCheckoutOpen } = useCommerce();
  const panelRef = useRef<HTMLDivElement>(null);

  const totalPrice = useMemo(() => {
    return cart.reduce((sum, item) => {
      const priceStr = item.product.price;
      const clean = priceStr
        ? priceStr.replace(/^(Rs\.|LKR\.|Rs|LKR)\s*/i, "")
        : "";
      const noCommas = clean.replace(/,/g, "");
      const digits = noCommas.replace(/[^\d.]/g, "");
      const priceNum = digits ? Number(digits) : 0;
      return sum + priceNum * item.quantity;
    }, 0);
  }, [cart]);

  const handleCheckout = () => {
    setCheckoutOpen(true);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    // Defer so the click that opened the popover doesn't immediately close it.
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", handlePointerDown);
      window.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Cart"
      className="border-foreground/6 bg-background/95 supports-[backdrop-filter]:bg-background/85 animate-in fade-in slide-in-from-top-2 absolute top-3 right-3 z-40 hidden max-h-[70vh] w-96 flex-col overflow-hidden rounded-[1.75rem] border shadow-2xl backdrop-blur-xl duration-200 lg:flex"
    >
      {/* Cart header */}
      <div className="border-foreground/6 dark:border-foreground/10 flex shrink-0 items-center gap-2 border-b bg-transparent px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="text-foreground/45 hover:text-foreground/80 hover:bg-foreground/5 shrink-0 rounded-lg p-1.5 transition-colors"
          title="Close cart"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="text-foreground/80 flex flex-1 items-center gap-1.5 text-xs font-semibold">
          <ShoppingCart className="h-4 w-4" />
          <span>Cart</span>
          {cartCount > 0 && (
            <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white dark:bg-violet-900 dark:text-zinc-100">
              {cartCount}
            </span>
          )}
        </div>
      </div>

      {/* Cart content */}
      <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto p-4">
        <CartList />
      </div>

      {/* Cart footer */}
      {cart.length > 0 && (
        <div className="border-foreground/6 dark:border-foreground/10 shrink-0 border-t bg-transparent p-4">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-foreground/65 text-xs font-medium">
              Subtotal
            </span>
            <span className="text-foreground text-sm font-bold">
              Rs. {totalPrice.toLocaleString("en-LK")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCheckout}
            className="w-full cursor-pointer rounded-xl bg-violet-600 py-2.5 text-center text-xs font-semibold text-white shadow-md transition-all hover:bg-violet-500 active:scale-[0.99] dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500"
          >
            Checkout
          </button>
        </div>
      )}
    </div>
  );
}

function HeaderButton({
  label,
  badge,
  onClick,
  children,
}: {
  label: string;
  badge?: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "text-foreground/60 hover:bg-foreground/8 hover:text-foreground/90 relative inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold transition-colors"
      )}
    >
      {children}
      <span className="leading-none">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold text-white dark:bg-violet-900 dark:text-zinc-100">
          {badge}
        </span>
      )}
    </button>
  );
}
