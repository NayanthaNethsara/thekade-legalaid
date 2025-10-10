import { useState } from "react";
import { Search, BookOpen, Scale, FileText, ExternalLink, BookmarkPlus, Filter } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "framer-motion";

interface ResearchItem {
  id: string;
  title: string;
  citation: string;
  court: string;
  year: string;
  snippet: string;
  relevance: "high" | "medium" | "low";
  type: string;
}

const researchResults: ResearchItem[] = [
  {
    id: "1",
    title: "Miranda v. Arizona",
    citation: "384 U.S. 436",
    court: "Supreme Court",
    year: "1966",
    snippet: "The person in custody must, prior to interrogation, be clearly informed that he has the right to remain silent...",
    relevance: "high",
    type: "Case Law",
  },
  {
    id: "2",
    title: "Brown v. Board of Education",
    citation: "347 U.S. 483",
    court: "Supreme Court",
    year: "1954",
    snippet: "Separate educational facilities are inherently unequal. Therefore, we hold that the plaintiffs...",
    relevance: "high",
    type: "Case Law",
  },
  {
    id: "3",
    title: "Marbury v. Madison",
    citation: "5 U.S. 137",
    court: "Supreme Court",
    year: "1803",
    snippet: "It is emphatically the province and duty of the judicial department to say what the law is...",
    relevance: "medium",
    type: "Case Law",
  },
  {
    id: "4",
    title: "Gideon v. Wainwright",
    citation: "372 U.S. 335",
    court: "Supreme Court",
    year: "1963",
    snippet: "The right of one charged with crime to counsel may not be deemed fundamental and essential...",
    relevance: "high",
    type: "Case Law",
  },
  {
    id: "5",
    title: "Roe v. Wade",
    citation: "410 U.S. 113",
    court: "Supreme Court",
    year: "1973",
    snippet: "The Constitution does not explicitly mention any right of privacy. However, the Court has recognized...",
    relevance: "medium",
    type: "Case Law",
  },
];

export function ResearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("All");

  const types = ["All", "Case Law", "Statutes", "Regulations", "Articles"];

  const filteredResults = researchResults.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.citation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.snippet.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "All" || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getRelevanceBadge = (relevance: string) => {
    const colors = {
      high: "bg-green-100 text-green-700 border-green-200",
      medium: "bg-amber-100 text-amber-700 border-amber-200",
      low: "bg-gray-100 text-gray-700 border-gray-200",
    };
    return colors[relevance as keyof typeof colors] || colors.low;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Legal Research
          </h2>
          <p className="text-sm text-gray-600 mt-1">Search case law, statutes, and legal precedents</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <Filter className="w-4 h-4" />
            Advanced
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <Input
              placeholder="Search case law, statutes, regulations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-12"
            />
          </div>
          <Button className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg h-12">
            <Search className="w-4 h-4 mr-2" />
            Search
          </Button>
        </div>

        {/* Type Filters */}
        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 sm:pb-0">
          {types.map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type)}
              className={
                selectedType === type
                  ? "bg-gradient-to-r from-gray-800 to-gray-700 text-white"
                  : ""
              }
            >
              {type}
            </Button>
          ))}
        </div>
      </GlassCard>

      {/* Quick Access */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Scale, title: "Case Law", count: "2.4M+" },
          { icon: BookOpen, title: "Statutes", count: "180K+" },
          { icon: FileText, title: "Regulations", count: "95K+" },
        ].map((item, index) => (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <GlassCard className="hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{item.title}</h3>
                  <p className="text-xs text-gray-600">{item.count} documents</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Research Results */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            {filteredResults.length} Results
          </h3>
        </div>

        {filteredResults.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <GlassCard className="hover:shadow-xl transition-shadow">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border ${getRelevanceBadge(
                        item.relevance
                      )}`}
                    >
                      {item.relevance}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{item.citation}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-600 mb-3">
                    <span>{item.court}</span>
                    <span>•</span>
                    <span>{item.year}</span>
                    <span>•</span>
                    <span>{item.type}</span>
                  </div>
                  <p className="text-sm text-gray-600 italic">{item.snippet}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-white/30">
                <Button variant="ghost" size="sm" className="text-xs hover:bg-white/60">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Full Text
                </Button>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-white/60">
                  <BookmarkPlus className="w-3 h-3 mr-1" />
                  Save
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <GlassCard>
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">No results found</h3>
            <p className="text-sm text-gray-600">Try different search terms or filters</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
