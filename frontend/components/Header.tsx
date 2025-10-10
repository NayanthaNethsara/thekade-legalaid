import { Moon, Sun, Settings } from "lucide-react";
import { Button } from "./ui/button";

export function Header() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center shadow-lg">
          <span className="text-white text-sm font-semibold">K</span>
        </div>
        <h1 className="text-xl font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Kakille AI</h1>
      </div>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm text-gray-500">
        <span className="hidden sm:inline">{currentDate} • {currentTime}</span>
        <span className="sm:hidden">{currentTime}</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-gray-100/60">
            <Moon className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-gray-100/60">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}