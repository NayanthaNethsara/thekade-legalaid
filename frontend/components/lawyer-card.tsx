"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink } from "lucide-react";
import type { Lawyer } from "@/hooks/use-chat";

interface LawyerCardProps {
  lawyer: Lawyer;
  index: number;
}

export function LawyerCard({ lawyer, index }: LawyerCardProps) {
  const handleVisitProfile = () => {
    window.open(lawyer.link, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.2,
        delay: index * 0.05,
        ease: "easeOut",
      }}
      className="flex items-center justify-between p-3 bg-white rounded-md border border-slate-200 hover:border-slate-300 transition-colors"
    >
      <div className="flex-1">
        <h4 className="font-medium text-slate-900 text-sm">{lawyer.name}</h4>
        <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
          <MapPin className="w-3 h-3" />
          <span>{lawyer.place}</span>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        onClick={handleVisitProfile}
        className="h-8 px-3 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100"
      >
        <ExternalLink className="w-3 h-3 mr-1" />
        View
      </Button>
    </motion.div>
  );
}
