"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LawyerCard } from "./lawyer-card";
import type { Lawyer } from "@/hooks/use-chat";
import Link from "next/link";
import { Users } from "lucide-react";

interface LawyerSuggestionsProps {
  lawyers: Lawyer[];
}

export function LawyerSuggestions({ lawyers }: LawyerSuggestionsProps) {
  if (!lawyers || lawyers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-900">
          Recommended Lawyers
        </h3>
        <Link href="/lawyers">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-slate-600 hover:text-slate-900"
          >
            <Users className="w-3 h-3 mr-1" />
            View All
          </Button>
        </Link>
      </div>

      <div className="space-y-2">
        {lawyers.slice(0, 3).map((lawyer, index) => (
          <LawyerCard
            key={`${lawyer.name}-${index}`}
            lawyer={lawyer}
            index={index}
          />
        ))}
      </div>

      {lawyers.length > 3 && (
        <div className="mt-3 text-center">
          <Link href="/lawyers">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 bg-transparent"
            >
              View {lawyers.length - 3} More Lawyers
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  );
}
