import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
          {title}
        </h2>
        <p className="text-base sm:text-lg text-gray-600">
          {description}
        </p>
      </div>

      <GlassCard className="text-center py-12">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Coming Soon</h3>
            <p className="text-gray-600 mb-4">
              This feature is currently under development and will be available soon.
            </p>
            <Button 
              variant="outline" 
              className="bg-white/60 hover:bg-white/80 border-gray-200"
            >
              Get Notified
            </Button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}