"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  Search, 
  ArrowLeft, 
  Filter,
  Star,
  Clock,
  DollarSign,
  Phone,
  MessageSquare,
  Calendar,
  Heart,
  X,
  CheckCircle
} from "lucide-react";
import Link from "next/link";
import { useState, Suspense } from "react";
import dynamic from "next/dynamic";
import Toast from "@/components/toast";

// Dynamically import the map component to avoid SSR issues
const LawyerMap = dynamic(() => import("@/components/lawyer-map"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading map...</div>
});

// Sri Lankan lawyer data with enhanced features
const sriLankanLawyers = [
  {
    id: 1,
    name: "Priya Jayawardena",
    specializations: ["Corporate Law", "Banking Law", "Securities"],
    rating: 4.9,
    reviewCount: 127,
    experience: "15+ years",
    hourlyRate: 135000, // LKR
    consultationFee: 45000, // LKR
    location: "Fort, Colombo 01",
    distance: "0.8 km",
    coordinates: { lat: 6.9319, lng: 79.8478 },
    availability: "Available today",
    isAvailableNow: false,
    isProBono: false,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face",
    description: "Senior corporate lawyer specializing in banking regulations and securities law.",
    languages: ["English", "Sinhala", "Tamil"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 2 hours",
    reviews: [
      { name: "Sunil P.", rating: 5, comment: "Excellent guidance on my company's IPO process. Very professional." },
      { name: "Dilini S.", rating: 5, comment: "Helped me understand complex banking regulations. Highly recommended." }
    ],
    keywords: ["corporate", "company", "business", "banking", "securities", "IPO", "mergers", "acquisitions"]
  },
  {
    id: 2,
    name: "Nuwan Fernando",
    specializations: ["Criminal Defense", "Human Rights", "Constitutional Law"],
    rating: 4.8,
    reviewCount: 89,
    experience: "12+ years",
    hourlyRate: 98000, // LKR
    consultationFee: 30000, // LKR
    location: "Hulftsdorp, Colombo 12",
    distance: "1.2 km",
    coordinates: { lat: 6.9147, lng: 79.8640 },
    availability: "Available tomorrow",
    isAvailableNow: true,
    isProBono: true,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face",
    description: "Criminal defense attorney with expertise in human rights cases.",
    languages: ["English", "Sinhala"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 1 hour",
    reviews: [
      { name: "Kamal R.", rating: 5, comment: "Defended my case brilliantly. Got acquitted thanks to his expertise." },
      { name: "Nimal K.", rating: 4, comment: "Very knowledgeable about human rights law. Compassionate approach." }
    ],
    keywords: ["criminal", "defense", "human rights", "constitutional", "police", "arrest", "bail", "court"]
  },
  {
    id: 3,
    name: "Kumari Perera",
    specializations: ["Family Law", "Divorce", "Child Custody"],
    rating: 4.7,
    reviewCount: 156,
    experience: "10+ years",
    hourlyRate: 82500, // LKR
    consultationFee: 22500, // LKR
    location: "Wellawatte, Colombo 06",
    distance: "2.1 km",
    coordinates: { lat: 6.8693, lng: 79.8611 },
    availability: "Available now",
    isAvailableNow: true,
    isProBono: true,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face",
    description: "Family law specialist focused on protecting women and children's rights.",
    languages: ["English", "Sinhala", "Tamil"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 30 min",
    reviews: [
      { name: "Malini W.", rating: 5, comment: "Handled my divorce case with great sensitivity. Excellent support." },
      { name: "Pradeep L.", rating: 5, comment: "Very helpful in child custody matter. Professional and caring." }
    ],
    keywords: ["family", "divorce", "custody", "children", "marriage", "separation", "alimony", "maintenance"]
  },
  {
    id: 4,
    name: "Roshan Silva",
    specializations: ["Personal Injury", "Medical Negligence", "Insurance Claims"],
    rating: 4.9,
    reviewCount: 203,
    experience: "18+ years",
    hourlyRate: 120000, // LKR
    consultationFee: 0, // Free consultation
    location: "Bambalapitiya, Colombo 04",
    distance: "1.5 km",
    coordinates: { lat: 6.8847, lng: 79.8589 },
    availability: "Available in 2 hours",
    isAvailableNow: false,
    isProBono: false,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face",
    description: "Leading personal injury lawyer with LKR 1.5B+ in settlements.",
    languages: ["English", "Sinhala"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 3 hours",
    reviews: [
      { name: "Chamara B.", rating: 5, comment: "Won my accident case against insurance company. Excellent results!" },
      { name: "Sandya M.", rating: 5, comment: "Professional handling of medical negligence case. Very satisfied." }
    ],
    keywords: ["accident", "injury", "medical", "negligence", "insurance", "compensation", "hospital", "malpractice"]
  },
  {
    id: 5,
    name: "Dilani Wickramasinghe",
    specializations: ["IP Law", "Technology Law", "Startup Legal Services"],
    rating: 4.8,
    reviewCount: 94,
    experience: "14+ years",
    hourlyRate: 157500, // LKR
    consultationFee: 60000, // LKR
    location: "Rajagiriya",
    distance: "8.7 km",
    coordinates: { lat: 6.9062, lng: 79.9100 },
    availability: "Available today",
    isAvailableNow: true,
    isProBono: false,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1494790108755-2616c056ca83?w=400&h=400&fit=crop&crop=face",
    description: "IP specialist helping tech startups and established companies protect innovations.",
    languages: ["English", "Sinhala"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 4 hours",
    reviews: [
      { name: "Tech Startup CEO", rating: 5, comment: "Helped us patent our software. Great understanding of tech law." },
      { name: "Creative Agency", rating: 4, comment: "Excellent trademark protection services. Very knowledgeable." }
    ],
    keywords: ["intellectual property", "patent", "trademark", "copyright", "startup", "technology", "software", "innovation"]
  },
  {
    id: 6,
    name: "Mahinda Rathnayake",
    specializations: ["Real Estate", "Property Law", "Construction Law"],
    rating: 4.6,
    reviewCount: 78,
    experience: "20+ years",
    hourlyRate: 105000, // LKR
    consultationFee: 37500, // LKR
    location: "Kandy",
    distance: "115 km",
    coordinates: { lat: 7.2906, lng: 80.6337 },
    availability: "Available tomorrow",
    isAvailableNow: false,
    isProBono: true,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face",
    description: "Real estate attorney with extensive property transaction experience in Central Province.",
    languages: ["English", "Sinhala"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 2 hours",
    reviews: [
      { name: "Property Buyer", rating: 5, comment: "Smooth property purchase process. Very thorough documentation." },
      { name: "Developer", rating: 4, comment: "Great help with construction permits and legal compliance." }
    ],
    keywords: ["property", "real estate", "land", "house", "construction", "permits", "deeds", "title"]
  },
  {
    id: 7,
    name: "Fatima Nazeer",
    specializations: ["Immigration", "Refugee Law", "International Law"],
    rating: 4.9,
    reviewCount: 167,
    experience: "11+ years",
    hourlyRate: 75000, // LKR
    consultationFee: 15000, // LKR
    location: "Pettah, Colombo 11",
    distance: "1.8 km",
    coordinates: { lat: 6.9395, lng: 79.8519 },
    availability: "Available now",
    isAvailableNow: true,
    isProBono: true,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=400&fit=crop&crop=face",
    description: "Immigration lawyer helping families with visa applications and refugee cases.",
    languages: ["English", "Tamil", "Arabic"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 1 hour",
    reviews: [
      { name: "Refugee Family", rating: 5, comment: "Helped us get asylum. Very compassionate and professional service." },
      { name: "Student Visa", rating: 5, comment: "Excellent guidance for my student visa application. Successful!" }
    ],
    keywords: ["immigration", "visa", "refugee", "asylum", "passport", "citizenship", "international", "migration"]
  },
  {
    id: 8,
    name: "Chamara Gunasekara",
    specializations: ["Labor Law", "Employment Rights", "Trade Union Law"],
    rating: 4.7,
    reviewCount: 112,
    experience: "13+ years",
    hourlyRate: 112500, // LKR
    consultationFee: 30000, // LKR
    location: "Galle",
    distance: "119 km",
    coordinates: { lat: 6.0535, lng: 80.2210 },
    availability: "Available in 3 hours",
    isAvailableNow: false,
    isProBono: false,
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face",
    description: "Employment attorney protecting workers' rights across Southern Province.",
    languages: ["English", "Sinhala"],
    barAdmissions: ["Sri Lanka Bar Association"],
    responseTime: "< 2 hours",
    reviews: [
      { name: "Factory Worker", rating: 5, comment: "Won my wrongful termination case. Got full compensation!" },
      { name: "Union Leader", rating: 4, comment: "Great support for labor dispute resolution. Very knowledgeable." }
    ],
    keywords: ["labor", "employment", "worker", "job", "salary", "termination", "union", "workplace", "dispute"]
  }
];

export default function LawyersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating"); // rating, price, distance, availability
  const [filterProBono, setFilterProBono] = useState(false);
  const [filterAvailableNow, setFilterAvailableNow] = useState(false);
  const [filterSpecialization, setFilterSpecialization] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("");
  const [selectedLawyer, setSelectedLawyer] = useState<typeof sriLankanLawyers[0] | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [hoveredLawyerId, setHoveredLawyerId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info"; isVisible: boolean }>({
    message: "",
    type: "success",
    isVisible: false
  });
  const [bookingStep, setBookingStep] = useState<"details" | "calendar" | "confirmation">("details");

  // Smart search function that handles natural language queries
  const smartSearch = (lawyer: typeof sriLankanLawyers[0], query: string): boolean => {
    const lowerQuery = query.toLowerCase();
    
    // Direct matches
    if (lawyer.name.toLowerCase().includes(lowerQuery) ||
        lawyer.location.toLowerCase().includes(lowerQuery) ||
        lawyer.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    // Specialization matches
    if (lawyer.specializations.some((spec: string) => 
        spec.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    // Keyword matches for natural language
    if (lawyer.keywords.some((keyword: string) => 
        lowerQuery.includes(keyword))) {
      return true;
    }

    // Language matches
    if (lawyer.languages.some((lang: string) => 
        lang.toLowerCase().includes(lowerQuery))) {
      return true;
    }

    // Location-based queries
    if (lowerQuery.includes('colombo') && lawyer.location.toLowerCase().includes('colombo')) {
      return true;
    }
    if (lowerQuery.includes('kandy') && lawyer.location.toLowerCase().includes('kandy')) {
      return true;
    }
    if (lowerQuery.includes('galle') && lawyer.location.toLowerCase().includes('galle')) {
      return true;
    }

    return false;
  };

  // Filter and sort lawyers
  const filteredAndSortedLawyers = sriLankanLawyers
    .filter((lawyer) => {
      const matchesSearch = searchTerm === "" || smartSearch(lawyer, searchTerm);
      const matchesProBono = !filterProBono || lawyer.isProBono;
      const matchesAvailableNow = !filterAvailableNow || lawyer.isAvailableNow;
      const matchesSpecialization = !filterSpecialization || 
        lawyer.specializations.some((spec: string) => 
          spec.toLowerCase().includes(filterSpecialization.toLowerCase()));
      const matchesLanguage = !filterLanguage || 
        lawyer.languages.some((lang: string) => 
          lang.toLowerCase().includes(filterLanguage.toLowerCase()));
      
      return matchesSearch && matchesProBono && matchesAvailableNow && 
             matchesSpecialization && matchesLanguage;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return a.hourlyRate - b.hourlyRate;
        case "rating":
          return b.rating - a.rating;
        case "distance":
          return parseFloat(a.distance) - parseFloat(b.distance);
        case "availability":
          if (a.isAvailableNow && !b.isAvailableNow) return -1;
          if (!a.isAvailableNow && b.isAvailableNow) return 1;
          return 0;
        default:
          return b.rating - a.rating;
      }
    });

  const handleBookConsultation = (lawyer: typeof sriLankanLawyers[0]) => {
    setSelectedLawyer(lawyer);
    setShowBookingModal(true);
  };

  // Get unique specializations for filter dropdown
  const allSpecializations = Array.from(new Set(
    sriLankanLawyers.flatMap(lawyer => lawyer.specializations)
  ));

  // Get unique languages for filter dropdown
  const allLanguages = Array.from(new Set(
    sriLankanLawyers.flatMap(lawyer => lawyer.languages)
  ));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-semibold">Find a Lawyer</h1>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            className="md:hidden"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? "Show List" : "Show Map"}
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Map Section - Desktop: Left 2/3, Mobile: Toggle */}
        <div className={`bg-gray-200 relative ${showMap ? 'flex-1' : 'hidden'} md:flex md:flex-[2]`}>
          <LawyerMap 
            lawyers={filteredAndSortedLawyers}
            hoveredLawyerId={hoveredLawyerId}
            onMarkerClick={(lawyer) => setSelectedLawyer(lawyer)}
          />
        </div>

        {/* Lawyer List Section - Desktop: Right 1/3, Mobile: Full width when map hidden */}
        <div className={`flex flex-col ${showMap ? 'hidden md:flex md:flex-1' : 'flex-1'} bg-white border-l`}>
          {/* Search and Filters */}
          <div className="p-4 border-b bg-white sticky top-0 z-10">
            {/* Enhanced Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Try 'divorce lawyer in Colombo' or 'labor dispute'..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-20"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 px-2"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Quick Filter Buttons */}
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <Button
                variant={filterAvailableNow ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterAvailableNow(!filterAvailableNow)}
                className="text-xs"
              >
                🟢 Available Now
              </Button>

              <Button
                variant={filterProBono ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterProBono(!filterProBono)}
                className="text-xs"
              >
                💙 Pro Bono
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="text-xs"
              >
                <Filter className="w-3 h-3 mr-1" />
                Filters
              </Button>

              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md bg-white"
              >
                <option value="rating">Sort by Rating</option>
                <option value="price">Sort by Price</option>
                <option value="distance">Sort by Distance</option>
                <option value="availability">Available First</option>
              </select>

              <Badge variant="secondary" className="text-xs">
                {filteredAndSortedLawyers.length} lawyers
              </Badge>
            </div>

            {/* Advanced Filters Sidebar */}
            {showFilters && (
              <div className="border rounded-lg p-3 bg-gray-50 space-y-3 mb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Specialization
                    </label>
                    <select
                      value={filterSpecialization}
                      onChange={(e) => setFilterSpecialization(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded bg-white"
                    >
                      <option value="">All Specializations</option>
                      {allSpecializations.map((spec) => (
                        <option key={spec} value={spec}>{spec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Language
                    </label>
                    <select
                      value={filterLanguage}
                      onChange={(e) => setFilterLanguage(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded bg-white"
                    >
                      <option value="">All Languages</option>
                      {allLanguages.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterSpecialization("");
                    setFilterLanguage("");
                    setFilterProBono(false);
                    setFilterAvailableNow(false);
                    setSearchTerm("");
                  }}
                  className="text-xs"
                >
                  Clear All Filters
                </Button>
              </div>
            )}
          </div>

          {/* Lawyers List */}
          <div className="flex-1 overflow-y-auto">
            {filteredAndSortedLawyers.map((lawyer) => (
              <motion.div
                key={lawyer.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedLawyer(lawyer)}
                onMouseEnter={() => setHoveredLawyerId(lawyer.id)}
                onMouseLeave={() => setHoveredLawyerId(null)}
              >
                <div className="flex gap-3">
                  {/* Profile Picture */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={lawyer.profileImage}
                      alt={lawyer.name}
                      className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                      onError={(e) => {
                        // Fallback to initials if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.parentElement?.querySelector('.fallback-avatar');
                        if (fallback) (fallback as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <div className="fallback-avatar hidden w-16 h-16 bg-blue-100 rounded-full items-center justify-center absolute top-0 left-0">
                      <span className="text-blue-600 font-medium text-lg">
                        {lawyer.name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                    {lawyer.isVerified && (
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {lawyer.name}
                          </h3>
                          {lawyer.isAvailableNow && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 px-2">
                              🟢 Available Now
                            </Badge>
                          )}
                          {lawyer.isProBono && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 px-2">
                              💙 Pro Bono
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">{lawyer.rating}</span>
                            <span className="text-gray-400">({lawyer.reviewCount})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{lawyer.distance}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{lawyer.responseTime}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          📍 {lawyer.location}
                        </p>
                      </div>
                      
                      <div className="text-right ml-3">
                        <div className="font-semibold text-gray-900">
                          LKR {lawyer.hourlyRate.toLocaleString()}/hr
                        </div>
                        {lawyer.consultationFee === 0 ? (
                          <div className="text-sm text-green-600 font-medium">Free consultation</div>
                        ) : (
                          <div className="text-sm text-gray-600">LKR {lawyer.consultationFee.toLocaleString()} consultation</div>
                        )}
                      </div>
                    </div>

                    {/* Specializations */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {lawyer.specializations.slice(0, 3).map((spec: string) => (
                        <Badge key={spec} variant="outline" className="text-xs py-0">
                          {spec}
                        </Badge>
                      ))}
                      {lawyer.specializations.length > 3 && (
                        <Badge variant="outline" className="text-xs py-0">
                          +{lawyer.specializations.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* Recent Review */}
                    {lawyer.reviews.length > 0 && (
                      <div className="bg-gray-50 rounded p-2 mb-2">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3 h-3 ${
                                  star <= lawyer.reviews[0].rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs font-medium text-gray-700">
                            {lawyer.reviews[0].name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          "{lawyer.reviews[0].comment}"
                        </p>
                      </div>
                    )}

                    {/* Languages */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <span className="text-xs">🗣️</span>
                        <span className="text-xs">
                          {lawyer.languages.slice(0, 2).join(', ')}
                          {lawyer.languages.length > 2 && ` +${lawyer.languages.length - 2}`}
                        </span>
                      </div>
                      
                      <div className="flex gap-2">
                        {lawyer.isAvailableNow && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Mock instant consultation
                              alert(`Starting instant consultation with ${lawyer.name}...`);
                            }}
                            className="text-xs px-3 py-1 h-7"
                          >
                            💬 Chat Now
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBookConsultation(lawyer);
                          }}
                          className="text-xs px-3 py-1 h-7"
                        >
                          📅 Book
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Booking Modal */}
      {showBookingModal && selectedLawyer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold">Book Consultation</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setShowBookingModal(false);
                    setBookingStep("details");
                  }}
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-6">
                {/* Enhanced Lawyer Info */}
                <div className="flex gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                  <img
                    src={selectedLawyer.profileImage}
                    alt={selectedLawyer.name}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">{selectedLawyer.name}</h4>
                      {selectedLawyer.isVerified && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{selectedLawyer.rating}</span>
                        <span className="text-gray-500">({selectedLawyer.reviewCount} reviews)</span>
                      </div>
                      {selectedLawyer.isAvailableNow && (
                        <Badge className="bg-green-100 text-green-800 text-xs">🟢 Available Now</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">📍 {selectedLawyer.location}</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedLawyer.specializations.slice(0, 2).map((spec: string) => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fee Transparency */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-medium text-amber-800 mb-2">💰 Fee Transparency</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Hourly Rate:</span>
                      <span className="font-medium">LKR {selectedLawyer.hourlyRate.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Initial Consultation:</span>
                      <span className="font-medium text-green-600">
                        {selectedLawyer.consultationFee === 0 ? 'FREE' : `LKR ${selectedLawyer.consultationFee.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-amber-700 border-t border-amber-200 pt-2">
                      <span>Estimated 30-min consultation:</span>
                      <span className="font-medium">
                        LKR {selectedLawyer.consultationFee === 0 ? '0' : selectedLawyer.consultationFee.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {bookingStep === "details" && (
                  <>
                    {/* Consultation Options */}
                    <div className="space-y-3">
                      <h4 className="font-medium">Choose Consultation Type</h4>
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input type="radio" name="consultation" defaultChecked className="text-blue-600" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">📞 Phone Consultation</div>
                                <div className="text-sm text-gray-600">30 minutes • Most popular</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{selectedLawyer.consultationFee === 0 ? 'FREE' : `LKR ${selectedLawyer.consultationFee.toLocaleString()}`}</div>
                              </div>
                            </div>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input type="radio" name="consultation" className="text-blue-600" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">🎥 Video Call</div>
                                <div className="text-sm text-gray-600">30 minutes • Face-to-face</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{selectedLawyer.consultationFee === 0 ? 'FREE' : `LKR ${selectedLawyer.consultationFee.toLocaleString()}`}</div>
                              </div>
                            </div>
                          </div>
                        </label>
                        
                        <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                          <input type="radio" name="consultation" className="text-blue-600" />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">🏢 In-Person Meeting</div>
                                <div className="text-sm text-gray-600">45 minutes • At lawyer's office</div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">LKR {((selectedLawyer.consultationFee || 0) + 15000).toLocaleString()}</div>
                                <div className="text-xs text-gray-500">+LKR 15,000 office fee</div>
                              </div>
                            </div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-4">
                      <h4 className="font-medium">Your Information</h4>
                      <div className="space-y-3">
                        <Input placeholder="Full Name" className="bg-gray-50" />
                        <Input placeholder="Email Address" type="email" className="bg-gray-50" />
                        <Input placeholder="Phone Number" type="tel" className="bg-gray-50" />
                        <textarea 
                          className="w-full p-3 border rounded-md resize-none bg-gray-50 focus:bg-white transition-colors" 
                          rows={4}
                          placeholder="Brief description of your legal issue... (This helps the lawyer prepare for your consultation)"
                        />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => setShowBookingModal(false)}
                        className="flex-1"
                      >
                        Cancel
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => setBookingStep("calendar")}
                      >
                        Continue to Schedule
                      </Button>
                    </div>
                  </>
                )}

                {bookingStep === "calendar" && (
                  <>
                    {/* Time Selection */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Select Date & Time</h4>
                        <Button variant="ghost" size="sm" onClick={() => setBookingStep("details")}>
                          ← Back
                        </Button>
                      </div>
                      
                      {/* Mock Calendar */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <div className="text-center mb-4">
                          <h5 className="font-medium">October 2025</h5>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div className="text-center p-3 bg-white rounded border">
                            <div className="font-medium">Today</div>
                            <div className="text-sm text-gray-600">Oct 24</div>
                          </div>
                          <div className="text-center p-3 bg-white rounded border">
                            <div className="font-medium">Tomorrow</div>
                            <div className="text-sm text-gray-600">Oct 25</div>
                          </div>
                        </div>

                        <h6 className="font-medium mb-2">Available Times</h6>
                        <div className="grid grid-cols-2 gap-2">
                          {['9:00 AM', '10:30 AM', '2:00 PM', '3:30 PM', '4:30 PM', '6:00 PM'].map((time) => (
                            <Button key={time} variant="outline" size="sm" className="text-xs">
                              {time}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button 
                        variant="outline" 
                        onClick={() => setBookingStep("details")}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button 
                        className="flex-1"
                        onClick={() => setBookingStep("confirmation")}
                      >
                        Confirm Booking
                      </Button>
                    </div>
                  </>
                )}

                {bookingStep === "confirmation" && (
                  <>
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h4 className="text-xl font-semibold text-green-600 mb-2">Booking Confirmed!</h4>
                        <p className="text-gray-600">
                          Your consultation with {selectedLawyer.name} has been scheduled.
                        </p>
                      </div>
                      
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
                        <h5 className="font-medium mb-2">📅 Booking Details</h5>
                        <div className="space-y-1 text-sm">
                          <div>📞 Phone Consultation</div>
                          <div>🕐 Tomorrow, 10:30 AM</div>
                          <div>⏱️ 30 minutes</div>
                          <div>💰 {selectedLawyer.consultationFee === 0 ? 'FREE' : `LKR ${selectedLawyer.consultationFee.toLocaleString()}`}</div>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        You will receive a confirmation email with the meeting details shortly.
                        The lawyer will call you at the scheduled time.
                      </p>
                    </div>

                    <div className="flex gap-3 pt-4 border-t">
                      <Button 
                        className="flex-1"
                        onClick={() => {
                          setShowBookingModal(false);
                          setBookingStep("details");
                          setToast({
                            message: `Consultation booked with ${selectedLawyer.name}! Check your email for details.`,
                            type: "success",
                            isVisible: true
                          });
                        }}
                      >
                        Done
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* No results */}
      {filteredAndSortedLawyers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">No lawyers found matching your criteria.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchTerm("");
              setFilterProBono(false);
            }}
          >
            Clear Filters
          </Button>
        </div>
      )}
      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={() => setToast({ ...toast, isVisible: false })}
      />
    </div>
  );
}
