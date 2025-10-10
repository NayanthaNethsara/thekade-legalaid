import { useState } from "react";
import { FileText, Search, Upload, Filter, FolderOpen, Download, Trash2, Eye } from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { motion } from "framer-motion";

interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  date: string;
  category: string;
}

const documents: Document[] = [
  {
    id: "1",
    name: "Smith_Contract_2024.pdf",
    type: "Contract",
    size: "2.4 MB",
    date: "Oct 8, 2025",
    category: "Contracts",
  },
  {
    id: "2",
    name: "Johnson_Deposition.docx",
    type: "Deposition",
    size: "1.8 MB",
    date: "Oct 7, 2025",
    category: "Depositions",
  },
  {
    id: "3",
    name: "Case_Brief_Anderson.pdf",
    type: "Brief",
    size: "3.2 MB",
    date: "Oct 5, 2025",
    category: "Briefs",
  },
  {
    id: "4",
    name: "Evidence_Photos.zip",
    type: "Evidence",
    size: "12.5 MB",
    date: "Oct 3, 2025",
    category: "Evidence",
  },
  {
    id: "5",
    name: "Legal_Research_Notes.pdf",
    type: "Research",
    size: "890 KB",
    date: "Oct 1, 2025",
    category: "Research",
  },
  {
    id: "6",
    name: "Court_Filing_Williams.pdf",
    type: "Filing",
    size: "1.2 MB",
    date: "Sep 28, 2025",
    category: "Filings",
  },
];

export function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Contracts", "Depositions", "Briefs", "Evidence", "Research", "Filings"];

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
            Documents
          </h2>
          <p className="text-sm text-gray-600 mt-1">Manage and organize your legal documents</p>
        </div>
        <Button className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg">
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Search and Filter */}
      <GlassCard>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className={
                  selectedCategory === category
                    ? "bg-gradient-to-r from-gray-800 to-gray-700 text-white"
                    : ""
                }
              >
                {category}
              </Button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((doc, index) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <GlassCard className="hover:shadow-xl transition-shadow duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">{doc.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                    <span>{doc.type}</span>
                    <span>•</span>
                    <span>{doc.size}</span>
                  </div>
                  <p className="text-xs text-gray-500">{doc.date}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t border-white/30">
                <Button variant="ghost" size="sm" className="flex-1 text-xs hover:bg-white/60">
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-xs hover:bg-white/60">
                  <Download className="w-3 h-3 mr-1" />
                  Download
                </Button>
                <Button variant="ghost" size="sm" className="text-xs hover:bg-white/60 hover:text-red-600">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {filteredDocuments.length === 0 && (
        <GlassCard>
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">No documents found</h3>
            <p className="text-sm text-gray-600">Try adjusting your search or filters</p>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
