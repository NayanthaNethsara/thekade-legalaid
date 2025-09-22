"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Menu, 
  X, 
  Home, 
  MessageSquare, 
  MapPin, 
  FileText, 
  Heart, 
  User, 
  CreditCard,
  Scale,
  ChevronDown,
  Globe,
  Gavel,
  PenTool
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  description?: string;
  isNew?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: <Home className="w-4 h-4" />,
    description: "Platform overview & getting started"
  },
  {
    label: "AI Legal Assistant",
    href: "/chatbot",
    icon: <MessageSquare className="w-4 h-4" />,
    description: "Multilingual AI chatbot for legal guidance",
    badge: "AI",
    isNew: true
  },
  {
    label: "Lawyer Finder",
    href: "/lawyers",
    icon: <MapPin className="w-4 h-4" />,
    description: "Find lawyers by location & specialization"
  },
  {
    label: "Document Generator",
    href: "/documents",
    icon: <FileText className="w-4 h-4" />,
    description: "Generate legal documents with AI assistance",
    badge: "New"
  },
  {
    label: "Pro-Bono Access",
    href: "/pro-bono",
    icon: <Heart className="w-4 h-4" />,
    description: "Connect with free legal aid services"
  },
  {
    label: "Pricing",
    href: "/pricing",
    icon: <CreditCard className="w-4 h-4" />,
    description: "Plans for citizens & legal professionals"
  }
];

export function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeItem, setActiveItem] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // Close mobile menu when route changes
    const handleRouteChange = () => {
      setIsMobileMenuOpen(false);
    };

    // Set active item based on current path
    setActiveItem(window.location.pathname);

    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-xl shadow-lg border-b border-slate-200/50"
            : "bg-white/80 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo & Brand */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center space-x-3"
            >
              <Link href="/" className="flex items-center space-x-3 group">
                <div className="relative">
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 flex items-center justify-center">
                    <Scale className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                    LegalAid
                  </h1>
                  <p className="text-xs text-slate-500 -mt-1 hidden lg:block">
                    Legal Access for All
                  </p>
                </div>
              </Link>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    delay: index * 0.1 + 0.2, 
                    duration: 0.4,
                    ease: [0.16, 1, 0.3, 1]
                  }}
                >
                  <Link
                    href={item.href}
                    className={`group relative px-4 py-2 rounded-xl transition-all duration-300 flex items-center space-x-2 ${
                      activeItem === item.href
                        ? "bg-blue-50 text-blue-700 shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`}
                    onClick={() => setActiveItem(item.href)}
                  >
                    <span className={`transition-colors duration-300 ${
                      activeItem === item.href ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
                    }`}>
                      {item.icon}
                    </span>
                    <span className="font-medium text-sm">{item.label}</span>
                    {item.badge && (
                      <Badge 
                        variant={item.isNew ? "default" : "secondary"}
                        className={`text-xs px-2 py-0.5 ${
                          item.isNew 
                            ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {activeItem === item.href && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute inset-0 bg-blue-100/50 rounded-xl border border-blue-200/50"
                        transition={{ type: "spring", duration: 0.6, bounce: 0.2 }}
                      />
                    )}
                  </Link>
                </motion.div>
              ))}
            </div>

            {/* Desktop Auth Buttons */}
            <div className="hidden lg:flex items-center space-x-3">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, duration: 0.4 }}
              >
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
                  asChild
                >
                  <Link href="/login" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span>Login</span>
                  </Link>
                </Button>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9, duration: 0.4 }}
              >
                <Button 
                  size="sm"
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  asChild
                >
                  <Link href="/register" className="flex items-center space-x-2">
                    <Gavel className="w-4 h-4" />
                    <span>Get Started</span>
                  </Link>
                </Button>
              </motion.div>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMobileMenu}
              className="lg:hidden relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors duration-200"
              aria-label="Toggle mobile menu"
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-6 h-6 text-slate-700" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-6 h-6 text-slate-700" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
                onClick={closeMobileMenu}
              />
              
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-full left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-200/50 shadow-2xl z-50 lg:hidden"
              >
                <div className="max-w-7xl mx-auto px-4 py-6">
                  {/* Mobile Navigation Items */}
                  <div className="space-y-2 mb-6">
                    {navItems.map((item, index) => (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                      >
                        <Link
                          href={item.href}
                          onClick={closeMobileMenu}
                          className={`group flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 ${
                            activeItem === item.href
                              ? "bg-blue-50 text-blue-700 shadow-sm"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <div className={`p-2 rounded-lg transition-colors duration-300 ${
                            activeItem === item.href
                              ? "bg-blue-100 text-blue-600"
                              : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                          }`}>
                            {item.icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">{item.label}</span>
                              {item.badge && (
                                <Badge 
                                  variant={item.isNew ? "default" : "secondary"}
                                  className={`text-xs ${
                                    item.isNew 
                                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white"
                                      : "bg-blue-100 text-blue-700"
                                  }`}
                                >
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-slate-500 mt-1">{item.description}</p>
                            )}
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>

                  {/* Mobile Auth Buttons */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="flex flex-col space-y-3 pt-6 border-t border-slate-200"
                  >
                    <Button 
                      variant="outline" 
                      className="w-full justify-center border-slate-200 text-slate-700 hover:bg-slate-50"
                      asChild
                    >
                      <Link href="/login" onClick={closeMobileMenu} className="flex items-center space-x-2">
                        <User className="w-4 h-4" />
                        <span>Login to Account</span>
                      </Link>
                    </Button>
                    
                    <Button 
                      className="w-full justify-center bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
                      asChild
                    >
                      <Link href="/register" onClick={closeMobileMenu} className="flex items-center space-x-2">
                        <Gavel className="w-4 h-4" />
                        <span>Get Started Free</span>
                      </Link>
                    </Button>
                  </motion.div>

                  {/* Mobile Footer */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className="flex items-center justify-center pt-6 mt-6 border-t border-slate-200"
                  >
                    <div className="flex items-center space-x-2 text-sm text-slate-500">
                      <Globe className="w-4 h-4" />
                      <span>Available in Sinhala, Tamil & English</span>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Spacer to prevent content from hiding behind fixed navbar */}
      <div className="h-16 lg:h-20" />
    </>
  );
}