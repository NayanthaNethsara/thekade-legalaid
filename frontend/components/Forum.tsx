import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  MessageCircle, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  User, 
  CheckCircle, 
  ArrowUp, 
  ArrowDown, 
  Reply,
  Eye,
  MessageSquare,
  Badge as BadgeIcon,
  Star
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { GlassCard } from "./GlassCard";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface ForumThread {
  id: string;
  title: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
    isProfessional: boolean;
    verified: boolean;
    specialization?: string;
  };
  category: string;
  tags: string[];
  votes: number;
  replies: number;
  views: number;
  createdAt: Date;
  lastActivity: Date;
  isResolved: boolean;
  isPinned: boolean;
}

const mockThreads: ForumThread[] = [
  {
    id: "1",
    title: "Contract Dispute - Breach of Service Agreement",
    content: "I have a client who entered into a service agreement that was breached by the service provider. The damages are significant and I'm looking for similar case precedents...",
    author: {
      name: "Sarah Mitchell",
      avatar: "",
      isProfessional: true,
      verified: true,
      specialization: "Contract Law"
    },
    category: "Contract Law",
    tags: ["breach", "damages", "precedent"],
    votes: 24,
    replies: 12,
    views: 156,
    createdAt: new Date("2024-01-15"),
    lastActivity: new Date("2024-01-16"),
    isResolved: false,
    isPinned: true
  },
  {
    id: "2",
    title: "Intellectual Property Rights in Software Development",
    content: "Question about IP ownership when multiple parties contribute to software development under different contracts...",
    author: {
      name: "Michael Chen",
      avatar: "",
      isProfessional: true,
      verified: true,
      specialization: "IP Law"
    },
    category: "Intellectual Property",
    tags: ["software", "ownership", "contracts"],
    votes: 18,
    replies: 8,
    views: 94,
    createdAt: new Date("2024-01-14"),
    lastActivity: new Date("2024-01-15"),
    isResolved: true,
    isPinned: false
  },
  {
    id: "3",
    title: "Employment Law - Wrongful Termination Claim",
    content: "My client was terminated without proper cause after whistleblowing. Looking for advice on building a strong case...",
    author: {
      name: "Jennifer Lopez",
      avatar: "",
      isProfessional: true,
      verified: true,
      specialization: "Employment Law"
    },
    category: "Employment Law",
    tags: ["termination", "whistleblowing", "retaliation"],
    votes: 31,
    replies: 15,
    views: 203,
    createdAt: new Date("2024-01-13"),
    lastActivity: new Date("2024-01-16"),
    isResolved: false,
    isPinned: false
  },
  {
    id: "4",
    title: "Small Claims Court - Maximum Damages Question",
    content: "I'm representing myself in small claims court and want to understand the maximum damages I can claim in my state...",
    author: {
      name: "Robert Smith",
      avatar: "",
      isProfessional: false,
      verified: false
    },
    category: "General Legal",
    tags: ["small-claims", "damages", "self-representation"],
    votes: 7,
    replies: 4,
    views: 42,
    createdAt: new Date("2024-01-16"),
    lastActivity: new Date("2024-01-16"),
    isResolved: false,
    isPinned: false
  }
];

const categories = [
  "All Categories",
  "Contract Law", 
  "Intellectual Property", 
  "Employment Law", 
  "Criminal Law",
  "Family Law",
  "Real Estate Law",
  "Corporate Law",
  "General Legal"
];

export function Forum() {
  const [activeTab, setActiveTab] = useState("professionals");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showNewThread, setShowNewThread] = useState(false);

  const filteredThreads = mockThreads.filter(thread => {
    const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === "All Categories" || thread.category === selectedCategory;
    
    const matchesTab = activeTab === "professionals" ? thread.author.isProfessional : !thread.author.isProfessional;
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-gray-700" />
            Legal Forum
          </h1>
          <p className="text-gray-600 mt-1">Connect with legal professionals and get expert advice</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button 
            onClick={() => setShowNewThread(true)}
            className="bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Thread
          </Button>
        </motion.div>
      </div>

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <GlassCard>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search threads, topics, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white/60 text-gray-700 text-sm"
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              
              <Button variant="outline" size="sm" className="bg-white/60">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 bg-white/60 backdrop-blur-sm">
            <TabsTrigger value="professionals" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              <BadgeIcon className="w-4 h-4 mr-2" />
              Legal Professionals
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-gray-800 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              General Community
            </TabsTrigger>
          </TabsList>

          <TabsContent value="professionals" className="mt-6">
            <ThreadList threads={filteredThreads} formatDate={formatDate} />
          </TabsContent>

          <TabsContent value="general" className="mt-6">
            <ThreadList threads={filteredThreads} formatDate={formatDate} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}

interface ThreadListProps {
  threads: ForumThread[];
  formatDate: (date: Date) => string;
}

function ThreadList({ threads, formatDate }: ThreadListProps) {
  return (
    <div className="space-y-4">
      <AnimatePresence>
        {threads.map((thread, index) => (
          <motion.div
            key={thread.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.01 }}
          >
            <GlassCard className="hover:shadow-lg transition-all duration-200">
              <div className="flex gap-4">
                {/* Vote Section */}
                <div className="flex flex-col items-center gap-1 text-center min-w-[60px]">
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-green-100">
                    <ArrowUp className="w-4 h-4 text-gray-600" />
                  </Button>
                  <span className="font-semibold text-gray-800">{thread.votes}</span>
                  <Button variant="ghost" size="sm" className="w-8 h-8 p-0 hover:bg-red-100">
                    <ArrowDown className="w-4 h-4 text-gray-600" />
                  </Button>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {thread.isPinned && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            <Star className="w-3 h-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        {thread.isResolved && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Resolved
                          </Badge>
                        )}
                        <Badge variant="outline">{thread.category}</Badge>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2 hover:text-gray-700 cursor-pointer">
                        {thread.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {thread.content}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-3">
                        {thread.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-gray-100 text-gray-600">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Avatar className="w-5 h-5">
                            <AvatarFallback className="text-xs bg-gray-200">
                              {thread.author.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span>{thread.author.name}</span>
                          {thread.author.verified && (
                            <CheckCircle className="w-3 h-3 text-blue-500" />
                          )}
                        </div>

                        {thread.author.specialization && (
                          <Badge variant="outline" className="text-xs">
                            {thread.author.specialization}
                          </Badge>
                        )}

                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(thread.lastActivity)}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-col items-center gap-2 text-sm text-gray-500 min-w-[80px]">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{thread.replies}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{thread.views}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200/50">
                    <Button variant="ghost" size="sm" className="hover:bg-blue-50">
                      <Reply className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-gray-50">
                      <Star className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </AnimatePresence>

      {threads.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-500 mb-2">No threads found</h3>
          <p className="text-gray-400">Try adjusting your search criteria or create a new thread</p>
        </motion.div>
      )}
    </div>
  );
}