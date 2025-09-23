"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, MapPin, FileText, Heart, Shield, Globe, Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
                Legal Access for{" "}
                <span className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 bg-clip-text text-transparent">
                  Everyone
                </span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                Get instant legal guidance through our AI assistant, find qualified lawyers, generate documents, 
                and access pro-bono services — all in your preferred language.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-4 text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                asChild
              >
                <Link href="/chatbot" className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Start Free Consultation</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>
              
              <Button 
                variant="outline" 
                size="lg"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 px-8 py-4 text-lg"
                asChild
              >
                <Link href="/lawyers" className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Find Lawyers</span>
                </Link>
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Comprehensive Legal Solutions
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Everything you need for legal assistance, from AI guidance to professional services.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <MessageSquare className="w-8 h-8" />,
                title: "AI Legal Assistant",
                description: "24/7 multilingual AI chatbot for instant legal guidance",
                href: "/chatbot",
                color: "blue"
              },
              {
                icon: <MapPin className="w-8 h-8" />,
                title: "Lawyer Finder",
                description: "Connect with qualified lawyers in your area",
                href: "/lawyers",
                color: "emerald"
              },
              {
                icon: <FileText className="w-8 h-8" />,
                title: "Document Generator",
                description: "AI-powered legal document creation",
                href: "/documents",
                color: "purple"
              },
              {
                icon: <Heart className="w-8 h-8" />,
                title: "Pro-Bono Access",
                description: "Connect with free legal aid services",
                href: "/pro-bono",
                color: "rose"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
              >
                <Link href={feature.href} className="group block">
                  <div className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200/50 hover:border-slate-300/50 group-hover:scale-105">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br from-${feature.color}-500 to-${feature.color}-600 flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                    <p className="text-slate-600 leading-relaxed">{feature.description}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Language Support */}
      <section className="py-16 bg-gradient-to-r from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-center"
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Globe className="w-8 h-8 text-blue-600" />
              <h3 className="text-2xl font-bold text-slate-900">Multilingual Support</h3>
            </div>
            <p className="text-lg text-slate-600 mb-8">
              Available in Sinhala, Tamil, and English to serve all communities
            </p>
            <div className="flex items-center justify-center space-x-8 text-sm text-slate-500">
              <span className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>සිංහල</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span>தமிழ்</span>
              </span>
              <span className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                <span>English</span>
              </span>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
