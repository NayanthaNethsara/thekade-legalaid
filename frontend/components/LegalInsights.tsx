import { TrendingUp, ArrowRight } from "lucide-react";
import { GlassCard } from "./GlassCard";

export function LegalInsights() {
  return (
    <GlassCard className="h-fit">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-700">AI Insights</h3>
        <ArrowRight className="w-3 h-3 text-gray-400 ml-auto" />
      </div>
      
      <div className="space-y-4">
        <div className="text-center">
          <div className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1">15</div>
          <div className="text-xs text-gray-600">Cases analyzed this week</div>
          <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-3/4 bg-gradient-to-r from-gray-600 to-amber-500 rounded-full"></div>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="text-lg font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1">3 <span className="text-sm font-normal">hrs</span></div>
          <div className="text-xs text-gray-600">Time saved this week</div>
          <div className="text-xs text-amber-600 mt-1 font-medium">+20% from last week</div>
        </div>
      </div>
    </GlassCard>
  );
}