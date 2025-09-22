"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Star, Award, Phone } from "lucide-react";
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
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1,
        ease: [0.16, 1, 0.3, 1],
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      whileHover={{ 
        scale: 1.02,
        y: -2,
        transition: { duration: 0.2, ease: "easeOut" }
      }}
      className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white to-slate-50/80 border border-slate-200/80 hover:border-slate-300/80 hover:shadow-lg hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer"
      onClick={handleVisitProfile}
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-slate-50/30 to-slate-100/20" />
      
      {/* Content */}
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Lawyer name with enhanced typography */}
            <h4 className="font-semibold text-slate-900 text-base leading-tight mb-2 group-hover:text-slate-700 transition-colors duration-200">
              {lawyer.name}
            </h4>
            
            {/* Location with better styling */}
            <div className="flex items-center gap-2 text-sm text-slate-600 mb-3">
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 group-hover:bg-slate-200 transition-colors duration-200">
                <MapPin className="w-3 h-3 text-slate-500" />
              </div>
              <span className="font-medium">{lawyer.place}</span>
            </div>

            {/* Rating and expertise indicators */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <span className="text-sm font-medium text-slate-700">4.8</span>
                <span className="text-xs text-slate-500">(120+ reviews)</span>
              </div>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4 text-blue-500" />
                <span className="text-xs text-slate-600 font-medium">Verified</span>
              </div>
            </div>

            {/* Practice areas */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                Criminal Law
              </span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                Civil Rights
              </span>
            </div>
          </div>

          {/* Avatar placeholder with elegant design */}
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white font-semibold text-sm shadow-md">
              {lawyer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleVisitProfile();
            }}
            className="flex-1 h-9 bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white shadow-sm hover:shadow-md transition-all duration-200"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View Profile
          </Button>
          
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              // Add contact functionality here
            }}
            className="h-9 px-3 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
          >
            <Phone className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hover effect overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </motion.div>
  );
}
