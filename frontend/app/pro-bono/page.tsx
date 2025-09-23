"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, Users, Phone, Mail, MapPin, CheckCircle, ArrowRight } from "lucide-react";

export default function ProBonoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Pro-Bono Legal Access
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Connect with free legal aid services and pro-bono lawyers. 
            We believe everyone deserves access to justice, regardless of their financial situation.
          </p>
        </motion.div>

        {/* Eligibility Checker */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="bg-white rounded-2xl p-8 lg:p-12 shadow-sm border border-slate-200/50 mb-12"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
              Check Your Eligibility
            </h2>
            <p className="text-lg text-slate-600">
              Answer a few quick questions to see if you qualify for free legal assistance.
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <Button 
              size="lg"
              className="w-full bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white py-4 text-lg"
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Start Eligibility Assessment
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </motion.div>

        {/* Service Providers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16"
        >
          {[
            {
              title: "Legal Aid Commission",
              description: "Government-funded legal assistance for qualifying individuals",
              services: ["Family Law", "Criminal Defense", "Civil Rights", "Housing"],
              contact: {
                phone: "+94 11 2 123 456",
                email: "help@legalaid.gov.lk",
                address: "Colombo 07, Sri Lanka"
              }
            },
            {
              title: "NGO Legal Clinics",
              description: "Non-profit organizations providing free legal consultations",
              services: ["Human Rights", "Women's Rights", "Labor Law", "Immigration"],
              contact: {
                phone: "+94 11 2 654 321",
                email: "support@legalclinics.lk",
                address: "Multiple Locations"
              }
            }
          ].map((provider, index) => (
            <motion.div
              key={provider.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.1, duration: 0.6 }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/50"
            >
              <div className="flex items-start space-x-4 mb-6">
                <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-2">{provider.title}</h3>
                  <p className="text-slate-600">{provider.description}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <h4 className="font-semibold text-slate-900 mb-3">Services Offered:</h4>
                <div className="grid grid-cols-2 gap-2">
                  {provider.services.map((service) => (
                    <div key={service} className="flex items-center space-x-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{service}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3 pt-6 border-t border-slate-200">
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{provider.contact.phone}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{provider.contact.email}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{provider.contact.address}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="bg-gradient-to-r from-rose-50 to-pink-50 rounded-2xl p-8 lg:p-12"
        >
          <div className="text-center mb-12">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
              How Pro-Bono Access Works
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              We connect you with appropriate legal aid based on your specific needs and circumstances.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: "1",
                title: "Assessment",
                description: "Complete eligibility questionnaire"
              },
              {
                step: "2", 
                title: "Matching",
                description: "We match you with appropriate services"
              },
              {
                step: "3",
                title: "Connection",
                description: "Get connected with legal aid providers"
              },
              {
                step: "4",
                title: "Support",
                description: "Receive ongoing assistance and guidance"
              }
            ].map((step, index) => (
              <div key={step.step} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-slate-600 text-sm">{step.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}