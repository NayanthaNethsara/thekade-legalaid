"use client";

import React from "react";
import { motion } from "framer-motion";
import { ProductCard } from "./product-card";
import type { ProductCard as ProductCardType } from "@/types/chat";

const gridContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const gridItemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 220,
      damping: 24,
    },
  },
};

export function ProductGrid({ products }: { products: ProductCardType[] }) {
  if (products.length === 0) return null;

  return (
    <motion.div
      variants={gridContainerVariants}
      initial="hidden"
      animate="visible"
      className="grid w-full grid-cols-2 gap-3.5 py-2 max-[340px]:grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(230px,1fr))] sm:gap-5"
    >
      {products.map((product) => (
        <motion.div key={product.code} variants={gridItemVariants}>
          <ProductCard product={product} />
        </motion.div>
      ))}
    </motion.div>
  );
}
