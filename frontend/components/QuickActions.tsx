import { FileText, Search, Users, MessageSquare, Calendar, Briefcase } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";

const actions = [
  {
    title: "Document Review",
    description: "AI-powered contract analysis",
    icon: FileText,
    color: "bg-gradient-to-br from-gray-600 to-gray-800",
  },
  {
    title: "Legal Research",
    description: "Search case law & precedents",
    icon: Search,
    color: "bg-gradient-to-br from-gray-700 to-gray-900",
  },
  {
    title: "Client Portal",
    description: "Manage client communications",
    icon: Users,
    color: "bg-gradient-to-br from-amber-500 to-amber-700",
  },
  {
    title: "Case Notes",
    description: "AI-assisted case summaries",
    icon: MessageSquare,
    color: "bg-gradient-to-br from-gray-500 to-gray-700",
  },
  {
    title: "Schedule",
    description: "Court dates & appointments",
    icon: Calendar,
    color: "bg-gradient-to-br from-yellow-500 to-amber-600",
  },
  {
    title: "Billing",
    description: "Time tracking & invoicing",
    icon: Briefcase,
    color: "bg-gradient-to-br from-gray-600 to-gray-800",
  },
];

export function QuickActions() {
  return (
    <GlassCard className="lg:col-span-2">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Quick Actions</h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {actions.map((action, index) => {
          const IconComponent = action.icon;
          return (
            <Button
              key={index}
              variant="ghost"
              className="h-auto p-3 sm:p-4 flex flex-col items-center text-center hover:bg-white/60 transition-all duration-200"
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 ${action.color} rounded-xl flex items-center justify-center mb-2 sm:mb-3 shadow-lg`}>
                <IconComponent className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <div className="text-xs sm:text-sm font-medium text-gray-900 mb-1">{action.title}</div>
              <div className="text-xs text-gray-600 hidden sm:block">{action.description}</div>
            </Button>
          );
        })}
      </div>
    </GlassCard>
  );
}