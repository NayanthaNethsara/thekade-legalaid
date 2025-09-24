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
  X
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Mock lawyer data with comprehensive details for Uber-style interface
const mockLawyers = [
  {
    id: 1,
    name: "Sarah Johnson",
    specializations: ["Corporate Law", "M&A", "Securities"],
    rating: 4.9,
    reviewCount: 127,
    experience: "15+ years",
    hourlyRate: 450,
    consultationFee: 150,
    location: "Manhattan, NY",
    distance: "0.8 mi",
    coordinates: { lat: 40.7831, lng: -73.9712 },
    availability: "Available today",
    isProBono: false,
    profileImage: "/api/placeholder/64/64",
    description: "Experienced corporate lawyer specializing in mergers and acquisitions.",
    languages: ["English", "Spanish"],
    barAdmissions: ["New York", "New Jersey"],
    responseTime: "< 2 hours"
  },
  {
    id: 2,
    name: "Michael Chen",
    specializations: ["Criminal Defense", "DUI", "Drug Crimes"],
    rating: 4.8,
    reviewCount: 89,
    experience: "12+ years",
    hourlyRate: 325,
    consultationFee: 100,
    location: "Downtown LA",
    distance: "1.2 mi",
    coordinates: { lat: 34.0522, lng: -118.2437 },
    availability: "Available tomorrow",
    isProBono: true,
    profileImage: "/api/placeholder/64/64",
    description: "Criminal defense attorney with 98% success rate in DUI cases.",
    languages: ["English", "Mandarin"],
    barAdmissions: ["California"],
    responseTime: "< 1 hour"
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    specializations: ["Family Law", "Divorce", "Child Custody"],
    rating: 4.7,
    reviewCount: 156,
    experience: "10+ years",
    hourlyRate: 275,
    consultationFee: 75,
    location: "Lincoln Park, Chicago",
    distance: "2.1 mi",
    coordinates: { lat: 41.8781, lng: -87.6298 },
    availability: "Available now",
    isProBono: true,
    profileImage: "/api/placeholder/64/64",
    description: "Compassionate family lawyer focused on protecting children's interests.",
    languages: ["English", "Spanish"],
    barAdmissions: ["Illinois"],
    responseTime: "< 30 min"
  },
  {
    id: 4,
    name: "David Thompson",
    specializations: ["Personal Injury", "Medical Malpractice", "Workers' Comp"],
    rating: 4.9,
    reviewCount: 203,
    experience: "18+ years",
    hourlyRate: 400,
    consultationFee: 0,
    location: "The Heights, Houston",
    distance: "3.5 mi",
    coordinates: { lat: 29.7604, lng: -95.3698 },
    availability: "Available in 2 hours",
    isProBono: false,
    profileImage: "/api/placeholder/64/64",
    description: "Top-rated personal injury attorney with $50M+ in settlements.",
    languages: ["English"],
    barAdmissions: ["Texas", "Louisiana"],
    responseTime: "< 3 hours"
  },
  {
    id: 5,
    name: "Lisa Wang",
    specializations: ["IP Law", "Patent Law", "Tech Startups"],
    rating: 4.8,
    reviewCount: 94,
    experience: "14+ years",
    hourlyRate: 525,
    consultationFee: 200,
    location: "SOMA, San Francisco",
    distance: "1.7 mi",
    coordinates: { lat: 37.7749, lng: -122.4194 },
    availability: "Available today",
    isProBono: false,
    profileImage: "/api/placeholder/64/64",
    description: "IP specialist helping tech companies protect their innovations.",
    languages: ["English", "Mandarin"],
    barAdmissions: ["California", "New York"],
    responseTime: "< 4 hours"
  },
  {
    id: 6,
    name: "Robert Miller",
    specializations: ["Real Estate", "Commercial Law", "Contracts"],
    rating: 4.6,
    reviewCount: 78,
    experience: "20+ years",
    hourlyRate: 350,
    consultationFee: 125,
    location: "Brickell, Miami",
    distance: "4.2 mi",
    coordinates: { lat: 25.7617, lng: -80.1918 },
    availability: "Available tomorrow",
    isProBono: true,
    profileImage: "/api/placeholder/64/64",
    description: "Commercial real estate attorney with extensive transaction experience.",
    languages: ["English", "Portuguese"],
    barAdmissions: ["Florida"],
    responseTime: "< 2 hours"
  },
  {
    id: 7,
    name: "Jennifer Kim",
    specializations: ["Immigration", "Asylum", "Citizenship"],
    rating: 4.9,
    reviewCount: 167,
    experience: "11+ years",
    hourlyRate: 250,
    consultationFee: 50,
    location: "Koreatown, LA",
    distance: "2.8 mi",
    coordinates: { lat: 34.0581, lng: -118.3089 },
    availability: "Available now",
    isProBono: true,
    profileImage: "/api/placeholder/64/64",
    description: "Immigration attorney helping families navigate complex cases.",
    languages: ["English", "Korean", "Spanish"],
    barAdmissions: ["California"],
    responseTime: "< 1 hour"
  },
  {
    id: 8,
    name: "James Wilson",
    specializations: ["Employment Law", "Discrimination", "Wrongful Termination"],
    rating: 4.7,
    reviewCount: 112,
    experience: "13+ years",
    hourlyRate: 375,
    consultationFee: 100,
    location: "Financial District, NYC",
    distance: "1.1 mi",
    coordinates: { lat: 40.7074, lng: -74.0113 },
    availability: "Available in 3 hours",
    isProBono: false,
    profileImage: "/api/placeholder/64/64",
    description: "Employment attorney protecting workers' rights and fighting discrimination.",
    languages: ["English"],
    barAdmissions: ["New York", "Connecticut"],
    responseTime: "< 2 hours"
  }
];

export default function LawyersPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("rating"); // rating, price, distance, availability
  const [filterProBono, setFilterProBono] = useState(false);
  const [selectedLawyer, setSelectedLawyer] = useState<typeof mockLawyers[0] | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showMap, setShowMap] = useState(true);

  // Filter and sort lawyers
  const filteredAndSortedLawyers = mockLawyers
    .filter(lawyer => {
      const matchesSearch = 
        lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lawyer.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lawyer.specializations.some(spec => 
          spec.toLowerCase().includes(searchTerm.toLowerCase())
        );
      
      const matchesProBono = !filterProBono || lawyer.isProBono;
      
      return matchesSearch && matchesProBono;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return a.hourlyRate - b.hourlyRate;
        case "rating":
          return b.rating - a.rating;
        case "distance":
          return parseFloat(a.distance) - parseFloat(b.distance);
        default:
          return b.rating - a.rating;
      }
    });

  const handleBookConsultation = (lawyer: typeof mockLawyers[0]) => {
    setSelectedLawyer(lawyer);
    setShowBookingModal(true);
  };

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
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            {/* Placeholder for map - would integrate with Google Maps, Mapbox, etc. */}
            <div className="text-center">
              <MapPin className="w-16 h-16 mx-auto mb-4 text-blue-600" />
              <h3 className="text-lg font-medium mb-2">Interactive Map</h3>
              <p className="text-sm">Lawyer pins would appear here</p>
              <div className="mt-4 space-y-2 text-xs text-left max-w-xs">
                {filteredAndSortedLawyers.slice(0, 3).map(lawyer => (
                  <div key={lawyer.id} className="bg-white p-2 rounded shadow text-center">
                    📍 {lawyer.name} - {lawyer.distance}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lawyer List Section - Desktop: Right 1/3, Mobile: Full width when map hidden */}
        <div className={`flex flex-col ${showMap ? 'hidden md:flex md:flex-1' : 'flex-1'} bg-white border-l`}>
          {/* Search and Filters */}
          <div className="p-4 border-b bg-white sticky top-0 z-10">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search lawyers or specialties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap gap-2 items-center">
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 text-sm border rounded-md bg-white"
              >
                <option value="rating">Sort by Rating</option>
                <option value="price">Sort by Price</option>
                <option value="distance">Sort by Distance</option>
              </select>

              <Button
                variant={filterProBono ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterProBono(!filterProBono)}
                className="text-xs"
              >
                Pro Bono Only
              </Button>

              <Badge variant="secondary" className="text-xs">
                {filteredAndSortedLawyers.length} lawyers
              </Badge>
            </div>
          </div>

          {/* Lawyers List */}
          <div className="flex-1 overflow-y-auto">
            {filteredAndSortedLawyers.map((lawyer) => (
              <motion.div
                key={lawyer.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="border-b p-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedLawyer(lawyer)}
              >
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-medium text-sm">
                      {lawyer.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <h3 className="font-medium text-gray-900 truncate">
                          {lawyer.name}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{lawyer.rating}</span>
                            <span className="text-gray-400">({lawyer.reviewCount})</span>
                          </div>
                          {lawyer.isProBono && (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                              Pro Bono
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium text-gray-900">
                          ${lawyer.hourlyRate}/hr
                        </div>
                        {lawyer.consultationFee === 0 ? (
                          <div className="text-sm text-green-600">Free consultation</div>
                        ) : (
                          <div className="text-sm text-gray-600">${lawyer.consultationFee} consultation</div>
                        )}
                      </div>
                    </div>

                    {/* Specializations */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {lawyer.specializations.slice(0, 2).map((spec) => (
                        <Badge key={spec} variant="outline" className="text-xs">
                          {spec}
                        </Badge>
                      ))}
                      {lawyer.specializations.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{lawyer.specializations.length - 2} more
                        </Badge>
                      )}
                    </div>

                    {/* Location and Availability */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{lawyer.distance}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{lawyer.availability}</span>
                        </div>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleBookConsultation(lawyer);
                        }}
                      >
                        Book
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && selectedLawyer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Book Consultation</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowBookingModal(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Lawyer Info */}
                <div className="flex gap-3 p-3 bg-gray-50 rounded">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {selectedLawyer.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium">{selectedLawyer.name}</div>
                    <div className="text-sm text-gray-600">{selectedLawyer.location}</div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span>{selectedLawyer.rating} ({selectedLawyer.reviewCount} reviews)</span>
                    </div>
                  </div>
                </div>

                {/* Consultation Options */}
                <div className="space-y-3">
                  <h4 className="font-medium">Consultation Type</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="consultation" defaultChecked />
                      <div className="flex-1">
                        <div className="font-medium">Phone Consultation</div>
                        <div className="text-sm text-gray-600">30 minutes • ${selectedLawyer.consultationFee || 'Free'}</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="consultation" />
                      <div className="flex-1">
                        <div className="font-medium">Video Call</div>
                        <div className="text-sm text-gray-600">30 minutes • ${selectedLawyer.consultationFee || 'Free'}</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-2 p-3 border rounded cursor-pointer hover:bg-gray-50">
                      <input type="radio" name="consultation" />
                      <div className="flex-1">
                        <div className="font-medium">In-Person Meeting</div>
                        <div className="text-sm text-gray-600">45 minutes • ${(selectedLawyer.consultationFee || 0) + 50}</div>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-3">
                  <h4 className="font-medium">Available Times</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['Today 2:00 PM', 'Today 4:30 PM', 'Tomorrow 10:00 AM', 'Tomorrow 2:00 PM'].map((time) => (
                      <Button key={time} variant="outline" size="sm" className="text-xs">
                        {time}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-2">
                  <Input placeholder="Your name" />
                  <Input placeholder="Your email" type="email" />
                  <Input placeholder="Your phone" type="tel" />
                  <textarea 
                    className="w-full p-3 border rounded-md resize-none" 
                    rows={3}
                    placeholder="Brief description of your legal issue..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4">
                  <Button 
                    className="flex-1"
                    onClick={() => {
                      // Handle booking logic here
                      alert('Booking confirmed! You will receive a confirmation email shortly.');
                      setShowBookingModal(false);
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Confirm Booking
                  </Button>
                  <Button variant="outline" onClick={() => setShowBookingModal(false)}>
                    Cancel
                  </Button>
                </div>
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
    </div>
  );
}
