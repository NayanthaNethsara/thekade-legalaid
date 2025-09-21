"use client"

import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, ExternalLink } from "lucide-react"
import type { Lawyer } from "@/hooks/use-chat"

interface LawyerCardProps {
  lawyer: Lawyer
  index: number
}

export function LawyerCard({ lawyer, index }: LawyerCardProps) {
  const handleVisitProfile = () => {
    window.open(lawyer.link, "_blank", "noopener,noreferrer")
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.3,
        delay: index * 0.1,
        ease: "easeOut",
      }}
    >
      <Card className="bg-background/50 border-border/50 hover:bg-background/80 transition-colors">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-foreground text-sm">{lawyer.name}</h4>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="w-3 h-3" />
                <span>{lawyer.place}</span>
              </div>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleVisitProfile}
              className="w-full h-8 text-xs bg-transparent"
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              View Profile
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
