import { Clock } from "lucide-react";
import { GlassCard } from "./GlassCard";

export function CaseProgress() {
  return (
    <GlassCard className="h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-700">Active Cases</h3>
      </div>
      
      <div className="text-center">
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="rgb(229 231 235)"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="url(#gradient)"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - 0.75)}`}
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgb(107 114 128)" />
                <stop offset="100%" stopColor="rgb(217 119 6)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">8</span>
          </div>
        </div>
        
        <div className="text-xs text-gray-600 mb-1">Cases in progress</div>
        <div className="text-xs text-amber-600 font-medium">2 due this week</div>
      </div>
    </GlassCard>
  );
}