"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCommerce } from "@/components/commerce/commerce-store";
import { cn } from "@/lib/utils";
import type { ProductCard as ProductCardType } from "@/types/chat";

export function ProductCard({ product }: { product: ProductCardType }) {
  const { cart, addToCart, setQuantity } = useCommerce();

  const isOutOfStock = product.stock
    ? product.stock.toLowerCase().includes("out") ||
      product.stock.trim() === "0"
    : false;

  const handleAdd = () => {
    if (isOutOfStock) return;
    addToCart(product);
  };

  const cartItem = cart.find((item) => item.product.code === product.code);
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  return (
    <div className="group border-foreground/6 hover:border-primary/40 bg-background/90 relative flex w-full flex-col overflow-hidden rounded-[22px] border shadow-xs backdrop-blur-md transition-all duration-300 hover:shadow-md dark:bg-zinc-950/90">
      <div className="p-2.5 pb-0">
        <a
          href={product.url ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "bg-foreground/5 relative block aspect-square w-full overflow-hidden rounded-[16px]",
            !product.url && "pointer-events-none"
          )}
        >
          {product.image_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover filter transition-all duration-500 group-hover:scale-108 group-hover:brightness-[1.03] group-hover:drop-shadow-[0_8px_16px_rgba(0,0,0,0.08)]"
            />
          ) : (
            <div className="text-foreground/20 flex h-full w-full items-center justify-center text-xs font-medium">
              No image
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {product.stock && (
            <span
              className={cn(
                "absolute top-2.5 left-2.5 flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold tracking-wide shadow-xs backdrop-blur-md",
                isOutOfStock
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              )}
            >
              <span
                className={cn(
                  "h-1 w-1 rounded-full",
                  isOutOfStock ? "bg-rose-500" : "animate-pulse bg-emerald-500"
                )}
              />
              {product.stock}
            </span>
          )}

          {product.url && (
            <span className="absolute top-2.5 right-2.5 flex scale-90 items-center justify-center rounded-full bg-black/45 p-1.5 text-white/90 opacity-0 backdrop-blur-md transition-all duration-300 group-hover:scale-100 group-hover:opacity-100 hover:bg-black/60 hover:text-white">
              <ExternalLink className="h-3 w-3" />
            </span>
          )}
        </a>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-foreground/90 group-hover:text-primary line-clamp-2 min-h-[2.4rem] text-xs leading-relaxed font-semibold transition-colors duration-200">
          {product.name}
        </p>
        <div className="mt-auto flex items-center justify-between pt-1">
          {product.price ? (
            <span className="text-foreground/90 text-base font-bold tracking-tight">
              {product.price}
            </span>
          ) : (
            <span />
          )}
          <AnimatePresence mode="wait">
            {quantityInCart > 0 ? (
              <motion.div
                key="qty-ctrl"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5 rounded-full border border-violet-500/20 bg-violet-500/10 p-0.5 shadow-xs"
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setQuantity(product.code, quantityInCart - 1)}
                  aria-label={
                    quantityInCart === 1
                      ? "Remove from cart"
                      : "Decrease quantity"
                  }
                  className="flex h-7.5 w-7.5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-violet-600 shadow-xs transition-colors hover:bg-violet-50/50 dark:bg-zinc-800 dark:text-violet-400 dark:hover:bg-zinc-700/50"
                >
                  {quantityInCart === 1 ? (
                    <Trash2 className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                </motion.button>

                <span className="w-5 text-center text-xs font-bold text-violet-800 select-none dark:text-violet-400">
                  {quantityInCart}
                </span>

                <motion.button
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => setQuantity(product.code, quantityInCart + 1)}
                  aria-label="Increase quantity"
                  className="flex h-7.5 w-7.5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-violet-600 text-white shadow-xs transition-colors hover:bg-violet-500 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500"
                >
                  <Plus className="h-3.5 w-3.5" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
                whileHover={isOutOfStock ? {} : { scale: 1.04, y: -0.5 }}
                whileTap={isOutOfStock ? {} : { scale: 0.96 }}
                type="button"
                onClick={handleAdd}
                disabled={isOutOfStock}
                aria-label={isOutOfStock ? "Sold out" : "Add to cart"}
                title={isOutOfStock ? "Sold out" : "Add to cart"}
                className={cn(
                  "flex h-8.5 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 text-[11px] font-semibold tracking-tight shadow-xs transition-colors duration-200 disabled:cursor-not-allowed",
                  isOutOfStock
                    ? "border border-zinc-200 bg-zinc-100 text-zinc-400 shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-500"
                    : "bg-violet-600 text-white hover:bg-violet-500 dark:bg-violet-600 dark:text-white dark:hover:bg-violet-500"
                )}
              >
                {isOutOfStock ? (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5 opacity-35" />
                    <span>Out</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-3.5 w-3.5 stroke-[2px]" />
                    <span>Add</span>
                  </>
                )}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
