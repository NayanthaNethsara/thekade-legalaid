import { Clock, Calendar, FileText } from "lucide-react";
import { GlassCard } from "./GlassCard";

const tasks = [
  {
    time: "10AM",
    title: "Client Consultation",
    subtitle: "Johnson vs. Miller Case",
    icon: Calendar,
  },
  {
    time: "11:30AM",
    title: "Contract Review",
    subtitle: "Property Purchase Agreement",
    icon: FileText,
  },
  {
    time: "2:45 PM",
    title: "Court Filing Deadline",
    subtitle: "Motion for Summary Judgment",
    icon: Clock,
  },
];

export function UpcomingTasks() {
  return (
    <GlassCard className="h-fit">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-4 h-4 text-gray-600" />
        <h3 className="text-sm font-medium text-gray-700">Upcoming</h3>
      </div>
      
      <div className="space-y-4">
        {tasks.map((task, index) => {
          const IconComponent = task.icon;
          return (
            <div key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                  <IconComponent className="w-4 h-4 text-gray-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  <span className="text-xs text-amber-600 font-medium">{task.time}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{task.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}