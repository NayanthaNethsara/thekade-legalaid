import { UpcomingTasks } from "./UpcomingTasks";
import { CaseProgress } from "./CaseProgress";
import { QuickActions } from "./QuickActions";
import { RecentDocuments } from "./RecentDocuments";
import { StickyNotes } from "./StickyNotes";

interface DashboardProps {
  userName: string;
  greeting: string;
}

export function Dashboard({ userName, greeting }: Readonly<DashboardProps>) {
  return (
    <div className="space-y-6">
      {/* Main Greeting */}
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
          {greeting}, {userName}!
        </h2>
        <p className="text-base sm:text-lg text-gray-600">
          What can I help you with today?
        </p>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Left Column */}
        <div className="lg:order-1 space-y-4 sm:space-y-6">
          <UpcomingTasks />
        </div>
        
        {/* Middle Columns */}
        <div className="lg:order-2 lg:col-span-2 space-y-4 sm:space-y-6">
          <QuickActions />
          <RecentDocuments />
        </div>
        
        {/* Right Column */}
        <div className="lg:order-3 space-y-4 sm:space-y-6">
          <StickyNotes />
          <CaseProgress />
        </div>
      </div>
    </div>
  );
}