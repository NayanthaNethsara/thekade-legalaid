"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { LawyerCard } from "./lawyer-card";
import type { Lawyer } from "@/hooks/use-chat";
import Link from "next/link";
import { Users, Sparkles, ChevronRight } from "lucide-react";

interface LawyerSuggestionsProps {
  lawyers: Lawyer[];
}

export function LawyerSuggestions({ lawyers }: LawyerSuggestionsProps) {
  if (!lawyers || lawyers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ 
        duration: 0.5, 
        delay: 0.2,
        ease: [0.16, 1, 0.3, 1]
      }}
      className="mt-6 p-6 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/60 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-300"
    >
      {/* Header with enhanced styling */}
      <motion.div 
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex items-center justify-between mb-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900 leading-tight">
              Recommended Lawyers
            </h3>
            <p className="text-sm text-slate-600">
              Top-rated legal professionals for your case
            </p>
          </div>
        </div>
        
        <Link href="/lawyers">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 px-4 text-sm text-slate-600 hover:text-slate-900 hover:bg-white/80 transition-all duration-200 rounded-lg"
          >
            <Users className="w-4 h-4 mr-2" />
            View All
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </motion.div>

      {/* Cards grid with improved layout */}
      <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
        {lawyers.slice(0, 3).map((lawyer, index) => (
          <LawyerCard
            key={`${lawyer.name}-${index}`}
            lawyer={lawyer}
            index={index}
          />
        ))}
      </div>

      {/* Footer action for more lawyers */}
      {lawyers.length > 3 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          className="mt-6 pt-4 border-t border-slate-200/80"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">{lawyers.length - 3} more lawyers</span> available
            </div>
            <Link href="/lawyers">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-6 border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 hover:bg-white/80 bg-white/60 transition-all duration-200 rounded-lg shadow-sm hover:shadow-md"
              >
                <Users className="w-4 h-4 mr-2" />
                Explore All Lawyers
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
