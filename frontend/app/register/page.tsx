"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { User, Mail, Lock, ArrowRight, Scale, Shield, UserCheck, Building } from "lucide-react";
import { useState } from "react";

export default function RegisterPage() {
  const [userType, setUserType] = useState<"citizen" | "lawyer">("citizen");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex items-center justify-center py-12">
      <div className="max-w-md w-full mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white rounded-2xl shadow-lg border border-slate-200/50 p-8"
        >
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                <Scale className="w-6 h-6 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Create Account</h1>
            <p className="text-slate-600">Join our legal assistance platform</p>
          </div>

          {/* User Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType("citizen")}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  userType === "citizen"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <UserCheck className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Citizen</div>
              </button>
              <button
                type="button"
                onClick={() => setUserType("lawyer")}
                className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                  userType === "lawyer"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-200 hover:border-slate-300 text-slate-700"
                }`}
              >
                <Building className="w-6 h-6 mx-auto mb-2" />
                <div className="text-sm font-medium">Lawyer</div>
              </button>
            </div>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="email"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="john.doe@example.com"
                />
              </div>
            </div>

            {userType === "lawyer" && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Bar Council Number
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Enter your bar council number"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Create a strong password"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="password"
                  className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <div className="flex items-start">
              <input 
                type="checkbox" 
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 mt-1" 
              />
              <span className="ml-2 text-sm text-slate-600">
                I agree to the{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700">Privacy Policy</a>
              </span>
            </div>

            <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3">
              Create Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-600">
              Already have an account?{" "}
              <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in here
              </a>
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <div className="flex items-center justify-center space-x-2 text-sm text-slate-500">
              <Shield className="w-4 h-4" />
              <span>Your data is protected with industry-standard security</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}