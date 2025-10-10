import { FileText, Download, Eye } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";

const documents = [
  {
    name: "Employment Contract - Tech Corp.pdf",
    type: "Contract",
    date: "2 hours ago",
    status: "reviewed",
  },
  {
    name: "Motion for Summary Judgment.docx",
    type: "Legal Motion",
    date: "5 hours ago",
    status: "draft",
  },
  {
    name: "Intellectual Property Agreement.pdf",
    type: "Agreement",
    date: "Yesterday",
    status: "pending",
  },
  {
    name: "Case Brief - Smith vs. Jones.pdf",
    type: "Brief",
    date: "2 days ago",
    status: "final",
  },
];

export function RecentDocuments() {
  return (
    <GlassCard className="lg:col-span-2">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">Recent Documents</h3>
        <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-800 text-xs sm:text-sm">
          View All
        </Button>
      </div>
      
      <div className="space-y-3">
        {documents.map((doc, index) => (
          <div key={index} className="flex items-center gap-3 p-2 sm:p-3 rounded-xl hover:bg-white/40 transition-colors">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">{doc.name}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-gray-600">{doc.type}</span>
                <span className="text-xs text-gray-400 hidden sm:inline">•</span>
                <span className="text-xs text-gray-600">{doc.date}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  doc.status === 'reviewed' ? 'bg-green-100 text-green-700' :
                  doc.status === 'draft' ? 'bg-amber-100 text-amber-700' :
                  doc.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {doc.status}
                </span>
              </div>
            </div>
            
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" className="w-6 h-6 sm:w-8 sm:h-8 p-0 hover:bg-gray-100/60">
                <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="w-6 h-6 sm:w-8 sm:h-8 p-0 hover:bg-gray-100/60">
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}