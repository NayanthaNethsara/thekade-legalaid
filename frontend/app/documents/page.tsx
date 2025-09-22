"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FileText, Download, PenTool, Clock, CheckCircle } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <FileText className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-slate-900 mb-6">
            Document Generator
          </h1>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Create professional legal documents with AI assistance. Generate letters, affidavits, 
            complaints, and more through our guided questionnaire system.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16"
        >
          {[
            {
              title: "Legal Letters",
              description: "Demand letters, notice letters, formal correspondence",
              icon: <PenTool className="w-6 h-6" />,
              documents: 15
            },
            {
              title: "Affidavits",
              description: "Sworn statements for various legal proceedings",
              icon: <CheckCircle className="w-6 h-6" />,
              documents: 8
            },
            {
              title: "Complaints",
              description: "Formal complaints for courts and authorities",
              icon: <FileText className="w-6 h-6" />,
              documents: 12
            }
          ].map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1, duration: 0.6 }}
              className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-lg transition-all duration-300 border border-slate-200/50 group cursor-pointer"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6 group-hover:scale-110 transition-transform duration-300">
                {category.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-3">{category.title}</h3>
              <p className="text-slate-600 mb-4">{category.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">{category.documents} templates</span>
                <Button size="sm" variant="outline" className="group-hover:bg-purple-50 group-hover:border-purple-200">
                  Generate
                </Button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="bg-white rounded-2xl p-8 lg:p-12 shadow-sm border border-slate-200/50"
        >
          <div className="text-center">
            <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">
              How Document Generation Works
            </h2>
            <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto">
              Our AI-powered system guides you through a simple process to create professional legal documents.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "1",
                  title: "Choose Template",
                  description: "Select from our library of legal document templates"
                },
                {
                  step: "2", 
                  title: "Answer Questions",
                  description: "Fill out our guided questionnaire with your details"
                },
                {
                  step: "3",
                  title: "Download Document",
                  description: "Get your professionally formatted legal document"
                }
              ].map((step, index) => (
                <div key={step.step} className="text-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
                  <p className="text-slate-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}