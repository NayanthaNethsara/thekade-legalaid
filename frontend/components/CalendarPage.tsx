import { useState } from "react";
import { Calendar as CalendarIcon, Clock, MapPin, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

interface Event {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  type: "court" | "meeting" | "deadline" | "consultation";
  color: string;
}

const events: Event[] = [
  {
    id: "1",
    title: "Smith vs. Anderson Court Hearing",
    date: "Oct 12, 2025",
    time: "10:00 AM",
    location: "Courtroom 4B",
    type: "court",
    color: "from-red-100/80 to-red-200/60",
  },
  {
    id: "2",
    title: "Client Consultation - Johnson",
    date: "Oct 13, 2025",
    time: "2:00 PM",
    location: "Office",
    type: "consultation",
    color: "from-blue-100/80 to-blue-200/60",
  },
  {
    id: "3",
    title: "Filing Deadline - Williams Case",
    date: "Oct 15, 2025",
    time: "5:00 PM",
    location: "Online",
    type: "deadline",
    color: "from-amber-100/80 to-amber-200/60",
  },
  {
    id: "4",
    title: "Team Meeting - Case Review",
    date: "Oct 16, 2025",
    time: "11:00 AM",
    location: "Conference Room",
    type: "meeting",
    color: "from-green-100/80 to-green-200/60",
  },
  {
    id: "5",
    title: "Deposition - Martinez Case",
    date: "Oct 18, 2025",
    time: "9:30 AM",
    location: "Law Office Downtown",
    type: "court",
    color: "from-red-100/80 to-red-200/60",
  },
];

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const upcomingEvents = events.sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Calendar
          </h2>
          <p className="text-sm text-gray-600 mt-1">Manage your schedule and deadlines</p>
        </div>
        <Button className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar View */}
        <div className="lg:col-span-2">
          <GlassCard>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">{monthYear}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() - 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newDate = new Date(currentDate);
                    newDate.setMonth(newDate.getMonth() + 1);
                    setCurrentDate(newDate);
                  }}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-600 py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }, (_, i) => {
                const day = i - 2; // Offset for starting day
                const isCurrentMonth = day > 0 && day <= 31;
                const isToday = day === new Date().getDate() && 
                  currentDate.getMonth() === new Date().getMonth();

                return (
                  <motion.div
                    key={i}
                    whileHover={isCurrentMonth ? { scale: 1.05 } : {}}
                    className={`
                      aspect-square flex items-center justify-center rounded-lg text-sm
                      ${isCurrentMonth ? "bg-white/40 hover:bg-white/60 cursor-pointer" : "bg-transparent"}
                      ${isToday ? "bg-gradient-to-br from-gray-800 to-gray-700 text-white font-semibold" : "text-gray-700"}
                      transition-all duration-200
                    `}
                  >
                    {isCurrentMonth ? day : ""}
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Upcoming Events */}
        <div>
          <GlassCard>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Events</h3>
            <div className="space-y-3">
              {upcomingEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className={`p-3 rounded-lg bg-gradient-to-br ${event.color} border border-white/30`}
                >
                  <h4 className="font-semibold text-gray-900 text-sm mb-2">{event.title}</h4>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <CalendarIcon className="w-3 h-3" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <Clock className="w-3 h-3" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-700">
                      <MapPin className="w-3 h-3" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
