'use client'

import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation / Back Button */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="-ml-4 text-muted-foreground hover:text-foreground">
            <Link href="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </Button>
        </div>

        {/* Policy Content */}
        <main className="animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          {/* Header */}
          <div className="pb-8 mb-8">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl mb-2">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: January 4, 2026
            </p>
          </div>

          {/* Content */}
          <div className="space-y-8 text-base leading-7 text-muted-foreground">
            <section>
              <p>
                <strong className="text-foreground">Legal Aid</strong> is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website and services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">
                Information We Collect
              </h2>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li>Personal identification information (Name, email address, phone number, etc.)</li>
                <li>Usage data, analytics, and cookies used to improve user experience.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">
                How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 marker:text-primary">
                <li>To provide, maintain, and monitor our services.</li>
                <li>To communicate with you regarding updates or support.</li>
                <li>To improve our website functionality and legal tools.</li>
                <li>To comply with legal obligations and regulatory requirements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">
                Sharing Your Information
              </h2>
              <p>
                We do not sell or rent your personal information. We may share information with trusted third-party service providers (such as hosting partners) or as required by law to comply with a subpoena or similar legal process.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-3">
                Your Rights
              </h2>
              <p>
                You have the right to access, update, or delete your personal information at any time. If you wish to exercise these rights, please contact us using the information below.
              </p>
            </section>

            <section className="p-0">
              <h2 className="text-xl font-semibold tracking-tight text-foreground mb-2">
                Contact Us
              </h2>
              <p className="mb-0">
                If you have any questions about this Privacy Policy, please contact us at{' '}
                <a 
                  href="mailto:privacy@legalaid.com" 
                  className="text-primary font-medium hover:underline decoration-primary underline-offset-4 transition-all"
                >
                  privacy@legalaid.com
                </a>.
              </p>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}