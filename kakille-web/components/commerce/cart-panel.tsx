"use client";

import { useMemo } from "react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { SlideOver } from "./slide-over";
import { useCommerce } from "./commerce-store";

export function CartList() {
  const { cart, setQuantity, removeFromCart } = useCommerce();

  if (cart.length === 0) {
    return <EmptyState />;
  }

  return (
    <ul className="space-y-2.5">
      {cart.map((item) => (
        <li
          key={item.product.code}
          className="border-foreground/6 bg-foreground/3 flex gap-3 rounded-2xl border p-2.5"
        >
          {item.product.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="h-16 w-16 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="bg-foreground/5 h-16 w-16 shrink-0 rounded-xl" />
          )}
          <div className="flex min-w-0 flex-1 flex-col">
            <p className="text-foreground/90 line-clamp-2 text-sm font-medium">
              {item.product.name}
            </p>
            {item.product.price && (
              <p className="text-foreground/60 mt-0.5 text-xs">
                {item.product.price}
              </p>
            )}
            <div className="mt-auto flex items-center gap-2 pt-2">
              <QtyButton
                label="Decrease quantity"
                onClick={() =>
                  setQuantity(item.product.code, item.quantity - 1)
                }
              >
                <Minus className="h-3 w-3" />
              </QtyButton>
              <span className="text-foreground/80 w-5 text-center text-sm">
                {item.quantity}
              </span>
              <QtyButton
                label="Increase quantity"
                onClick={() =>
                  setQuantity(item.product.code, item.quantity + 1)
                }
              >
                <Plus className="h-3 w-3" />
              </QtyButton>
              <button
                type="button"
                onClick={() => removeFromCart(item.product.code)}
                aria-label="Remove item"
                className="text-foreground/30 hover:text-destructive ml-auto rounded-lg p-1.5 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Cart slide-over: line items with quantity controls.
 */
export function CartPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { cart, setCheckoutOpen } = useCommerce();

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

  return (
    <SlideOver
      open={open}
      onClose={onClose}
      title="Your cart"
      icon={<ShoppingBag className="h-4 w-4 text-violet-500" />}
      footer={
        cart.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground/65 text-sm font-medium">
                Subtotal
              </span>
              <span className="text-foreground text-base font-bold">
                Rs. {totalPrice.toLocaleString("en-LK")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full cursor-pointer rounded-xl bg-violet-600 py-3 text-center text-sm font-semibold text-white shadow-lg transition-all hover:bg-violet-500 active:scale-[0.99] dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500"
            >
              Checkout
            </button>
          </div>
        )
      }
    >
      <CartList />
    </SlideOver>
  );
}

function QtyButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="border-foreground/10 bg-background/30 text-foreground/60 hover:text-foreground/90 inline-flex h-6 w-6 items-center justify-center rounded-lg border transition-colors"
    >
      {children}
    </button>
  );
}

function EmptyState() {
  return (
    <div className="text-foreground/30 flex flex-col items-center gap-3 px-4 py-16 text-center">
      <ShoppingBag className="h-7 w-7" />
      <p className="text-sm">Your cart is empty.</p>
      <p className="text-xs leading-relaxed">
        Ask Kakille to find something, then add it from the results.
      </p>
    </div>
  );
}
