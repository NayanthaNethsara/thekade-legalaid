"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { LawyerCard } from "./lawyer-card"
import type { Lawyer } from "@/hooks/use-chat"
import Link from "next/link"
import { Users } from "lucide-react"

interface LawyerSuggestionsProps {
  lawyers: Lawyer[]
}

export function LawyerSuggestions({ lawyers }: LawyerSuggestionsProps) {
  if (!lawyers || lawyers.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="mt-3 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Suggested Lawyers</h3>
        <Link href="/lawyers">
          <Button variant="ghost" size="sm" className="h-7 text-xs">
            <Users className="w-3 h-3 mr-1" />
            View All
          </Button>
        </Link>
      </div>

      <div className="grid gap-2">
        {lawyers.slice(0, 3).map((lawyer, index) => (
          <LawyerCard key={`${lawyer.name}-${index}`} lawyer={lawyer} index={index} />
        ))}
      </div>

      {lawyers.length > 3 && (
        <div className="text-center">
          <Link href="/lawyers">
            <Button variant="outline" size="sm" className="h-8 text-xs bg-transparent">
              View {lawyers.length - 3} More Lawyers
            </Button>
          </Link>
        </div>
      )}
    </motion.div>
  )
}
