"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MapPin, ExternalLink, Search, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

// Sample lawyer data - in a real app this would come from an API
const sampleLawyers = [
  {
    name: "Sarah Johnson",
    place: "New York, NY",
    link: "https://example.com/sarah-johnson",
    specialties: ["Corporate Law", "Mergers & Acquisitions"],
    rating: 4.9,
    experience: "15+ years",
  },
  {
    name: "Michael Chen",
    place: "Los Angeles, CA",
    link: "https://example.com/michael-chen",
    specialties: ["Criminal Defense", "DUI"],
    rating: 4.8,
    experience: "12+ years",
  },
  {
    name: "Emily Rodriguez",
    place: "Chicago, IL",
    link: "https://example.com/emily-rodriguez",
    specialties: ["Family Law", "Divorce"],
    rating: 4.7,
    experience: "10+ years",
  },
  {
    name: "David Thompson",
    place: "Houston, TX",
    link: "https://example.com/david-thompson",
    specialties: ["Personal Injury", "Medical Malpractice"],
    rating: 4.9,
    experience: "18+ years",
  },
  {
    name: "Lisa Wang",
    place: "San Francisco, CA",
    link: "https://example.com/lisa-wang",
    specialties: ["Intellectual Property", "Patent Law"],
    rating: 4.8,
    experience: "14+ years",
  },
  {
    name: "Robert Miller",
    place: "Miami, FL",
    link: "https://example.com/robert-miller",
    specialties: ["Real Estate", "Commercial Law"],
    rating: 4.6,
    experience: "20+ years",
  },
];

export default function LawyersPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredLawyers = sampleLawyers.filter(
    (lawyer) =>
      lawyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lawyer.place.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lawyer.specialties.some((specialty) =>
        specialty.toLowerCase().includes(searchTerm.toLowerCase())
      )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 dark:from-purple-950/20 dark:via-blue-950/20 dark:to-indigo-950/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Find a Lawyer
              </h1>
              <p className="text-muted-foreground mt-1">
                Connect with experienced legal professionals
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, location, or specialty..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </motion.div>

        {/* Results count */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <p className="text-sm text-muted-foreground">
            Showing {filteredLawyers.length} of {sampleLawyers.length} lawyers
          </p>
        </motion.div>

        {/* Lawyers Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
        >
          {filteredLawyers.map((lawyer, index) => (
            <motion.div
              key={lawyer.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
            >
              <Card className="h-full bg-background/80 backdrop-blur-sm border-border/50 hover:bg-background/90 transition-all duration-200 hover:shadow-lg">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {lawyer.name}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                        <MapPin className="w-4 h-4" />
                        <span>{lawyer.place}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        ★ {lawyer.rating}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {lawyer.experience}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Specialties</h4>
                    <div className="flex flex-wrap gap-1">
                      {lawyer.specialties.map((specialty) => (
                        <Badge
                          key={specialty}
                          variant="secondary"
                          className="text-xs"
                        >
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() =>
                      window.open(lawyer.link, "_blank", "noopener,noreferrer")
                    }
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        {/* No results */}
        {filteredLawyers.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <p className="text-muted-foreground">
              No lawyers found matching your search criteria.
            </p>
            <Button
              variant="outline"
              onClick={() => setSearchTerm("")}
              className="mt-4"
            >
              Clear Search
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
