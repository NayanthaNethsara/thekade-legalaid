"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Users, Sparkles, ArrowRight, Star } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center">
              <CreditCard className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Choose Your Plan
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Flexible pricing for citizens and legal professionals. 
            Start free and upgrade as your needs grow.
          </p>
        </motion.div>

        {/* Citizen Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Users className="w-6 h-6 text-indigo-600" />
              <h2 className="text-3xl font-bold text-slate-900">For Citizens</h2>
            </div>
            <p className="text-lg text-slate-600">Legal assistance plans for individuals and families</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {[
              {
                name: "Free",
                price: "₹0",
                period: "forever",
                description: "Basic legal guidance and document access",
                features: [
                  "AI Legal Assistant (10 questions/month)",
                  "Basic document templates",
                  "Community forums access",
                  "Pro-bono service directory"
                ],
                cta: "Get Started",
                popular: false,
                color: "slate"
              },
              {
                name: "Premium",
                price: "₹299",
                period: "per month",
                description: "Enhanced features for comprehensive legal support",
                features: [
                  "Unlimited AI consultations",
                  "Premium document generation",
                  "Priority lawyer matching",
                  "Document review service",
                  "Legal consultation scheduling",
                  "24/7 emergency support"
                ],
                cta: "Start Premium",
                popular: true,
                color: "indigo"
              },
              {
                name: "Family",
                price: "₹499",
                period: "per month",
                description: "Complete legal protection for your family",
                features: [
                  "Everything in Premium",
                  "Family legal coverage (up to 4 members)",
                  "Estate planning documents",
                  "Family law consultation",
                  "Will and trust creation",
                  "Legal insurance included"
                ],
                cta: "Choose Family",
                popular: false,
                color: "emerald"
              }
            ].map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
                className={`relative bg-white rounded-2xl p-8 shadow-sm border transition-all duration-300 hover:shadow-lg ${
                  plan.popular 
                    ? "border-indigo-200 ring-2 ring-indigo-100 scale-105" 
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white px-4 py-1">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500 ml-2">/{plan.period}</span>
                  </div>
                  <p className="text-slate-600">{plan.description}</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={`w-full py-3 ${
                    plan.popular
                      ? "bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Lawyer Plans */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="text-center mb-12">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Sparkles className="w-6 h-6 text-purple-600" />
              <h2 className="text-3xl font-bold text-slate-900">For Legal Professionals</h2>
            </div>
            <p className="text-lg text-slate-600">Professional plans for lawyers and law firms</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {[
              {
                name: "Solo Lawyer",
                price: "₹999",
                period: "per month",
                description: "Perfect for individual legal practitioners",
                features: [
                  "Professional profile listing",
                  "Client lead generation",
                  "Case management tools",
                  "Document automation",
                  "Client communication platform",
                  "Analytics and reporting"
                ],
                cta: "Start Solo Plan"
              },
              {
                name: "Law Firm",
                price: "₹2,999",
                period: "per month",
                description: "Comprehensive solution for law firms",
                features: [
                  "Everything in Solo plan",
                  "Multi-lawyer management",
                  "Team collaboration tools",
                  "Advanced case tracking",
                  "Custom branding",
                  "Priority support",
                  "API access",
                  "White-label options"
                ],
                cta: "Contact Sales"
              }
            ].map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1, duration: 0.6 }}
                className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-8 border border-purple-200"
              >
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                  <div className="flex items-baseline justify-center mb-2">
                    <span className="text-4xl font-bold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500 ml-2">/{plan.period}</span>
                  </div>
                  <p className="text-slate-600">{plan.description}</p>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start space-x-3">
                      <Check className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      <span className="text-slate-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white py-3">
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}