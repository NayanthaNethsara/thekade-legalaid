'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { 
  ArrowRight, Menu, X, Search, MessageCircle, Users, Briefcase, 
  Handshake, Star, FileText, ShieldCheck, Scale 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { cn } from '@/lib/utils'
import { motion, useInView } from 'framer-motion'

// Assuming Footer is in the same directory
import { Footer } from './footer';

// --- Helper Components ---

const Counter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = target / steps;
      let current = 0;

      timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          if (timer) clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const transitionVariants = {
    item: {
        hidden: { opacity: 0, filter: 'blur(12px)', y: 12 },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: { type: "spring", bounce: 0.3, duration: 1.5 },
        },
    },
};

const menuItems = [
    { name: 'Features', href: '#features' },
    { name: 'Solution', href: '#solution' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'About', href: '#about' },
];

export const Logo = ({ className }: { className?: string }) => {
    return (
        <img
            src="/logo/legalaid.png"
            alt="Legal Aid Logo"
            className={cn("h-30 w-auto", className)}
            style={{ display: 'block' }}
        />
    );
}

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed z-50 w-full px-2 group top-0 left-0 pt-0 flex justify-center">
                <div className={cn(
                    'w-full max-w-6xl px-4 transition-all duration-300 lg:px-6 py-1 rounded-full border border-transparent mx-auto', 
                    isScrolled ? 'bg-white/80 backdrop-blur-md border-slate-200 shadow-sm' : ''
                )}>
                    <div className="relative flex flex-wrap items-center justify-between gap-4 py-0 lg:gap-0 lg:py-0 min-h-[48px]">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link href="/" aria-label="home" className="flex items-center space-x-2">
                                <Logo />
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="group-data-[state=active]:hidden m-auto size-6 text-slate-900" />
                                <X className="group-data-[state=active]:block hidden m-auto size-6 text-slate-900" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                            <ul className="flex gap-8 text-sm font-medium">
                                {menuItems.map((item) => (
                                    <li key={item.name}>
                                        <Link href={item.href} className="text-slate-500 hover:text-slate-900 block duration-150 transition-colors">
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-white group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border border-slate-200 p-6 shadow-2xl md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-4 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none absolute top-full left-0 right-0 mt-2 lg:static">
                            <div className="lg:hidden">
                                <ul className="space-y-4 text-base">
                                    {menuItems.map((item) => (
                                        <li key={item.name}>
                                            <Link href={item.href} className="text-slate-600 hover:text-slate-900 block font-medium">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button asChild variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                                    <Link href="/login">Login</Link>
                                </Button>
                                <Button asChild size="sm" className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6">
                                    <Link href="/register">Get Started</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
};

// --- Main Page Component ---

export function HeroSection() {
    return (
        <div className="bg-slate-50 min-h-screen flex flex-col font-sans selection:bg-slate-200">
            <HeroHeader />

            <main className="flex-1 w-full flex flex-col items-center">
                
                {/* Hero Banner Section (Minimalist Professional) */}
                <section className="relative w-full min-h-[90vh] flex flex-col items-center justify-center px-4 py-32 overflow-hidden bg-white">
                    
                    {/* Minimal Grid Background */}
                    <div className="absolute inset-0 z-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>

                    <AnimatedGroup variants={transitionVariants}>
                        {/* Added mx-auto to ensure centering */}
                        <div className="relative z-10 max-w-4xl w-full mx-auto text-center space-y-8 flex flex-col items-center">
                            
                            <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm mb-4">
                                <span className="flex h-2 w-2 rounded-full bg-slate-900 mr-2 animate-pulse"></span>
                                Now available for Beta Access
                            </div>

                            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 tracking-tight leading-[1.1] text-center">
                                Legal Intelligence <br className="hidden md:block" />
                                <span className="text-slate-400">for Professionals.</span>
                            </h1>
                            
                            <p className="text-xl text-slate-600 font-normal max-w-2xl mx-auto leading-relaxed text-center">
                                The AI-powered platform for modern legal teams. Research case law, draft documents, and collaborate with confidence.
                            </p>
                            
                            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4 w-full">
                                <Link
                                    href="/register"
                                    className="px-8 py-4 bg-slate-900 text-white font-medium rounded-full shadow-lg shadow-slate-200 hover:bg-slate-800 hover:shadow-xl transition-all transform hover:-translate-y-0.5 text-lg flex items-center gap-2"
                                >
                                    Start Free Trial <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>

                        {/* Feature Highlights Grid (Clean Cards) */}
                        <div className="relative z-10 mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4 mx-auto">
                            {[
                                {
                                    icon: FileText,
                                    title: "Smart Documents",
                                    desc: "Automated drafting and document organization."
                                },
                                {
                                    icon: ShieldCheck,
                                    title: "Verified Research",
                                    desc: "Citations grounded in real case law, not hallucinations."
                                },
                                {
                                    icon: Users,
                                    title: "Team Collaboration",
                                    desc: "Secure workspace for firms and legal teams."
                                }
                            ].map((feature, i) => (
                                <div key={i} className="group bg-white border border-slate-100 rounded-2xl p-8 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300">
                                    <div className="h-12 w-12 bg-slate-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-slate-100 transition-colors">
                                        <feature.icon className="w-6 h-6 text-slate-900" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h2>
                                    <p className="text-slate-500 leading-relaxed">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </AnimatedGroup>
                </section>

                {/* Why LegalAid Section */}
                <section id="features" className="py-24 px-4 bg-slate-50 w-full flex justify-center">
                    <div className="max-w-6xl w-full mx-auto flex flex-col items-center">
                        <h2 className="text-3xl font-bold mb-16 text-slate-900 text-center tracking-tight">Why LegalAid.ai?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12 w-full">
                            <div className="space-y-12">
                                <div className="flex gap-5">
                                    <div className="mt-1 bg-white border border-slate-200 p-2.5 rounded-lg h-fit shadow-sm">
                                        <ShieldCheck className="w-5 h-5 text-slate-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-slate-900">Verified Law, Not Chatbot Law</h3>
                                        <p className="text-slate-500 leading-relaxed">All responses are grounded in verified legal sources, with citations for transparency. We prioritize accuracy over generative creativity.</p>
                                    </div>
                                </div>
                                <div className="flex gap-5">
                                    <div className="mt-1 bg-white border border-slate-200 p-2.5 rounded-lg h-fit shadow-sm">
                                        <FileText className="w-5 h-5 text-slate-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-slate-900">Drafting Support</h3>
                                        <p className="text-slate-500 leading-relaxed">Generate structured outlines and briefs for petitions, judgments, and notices in seconds.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-12">
                                <div className="flex gap-5">
                                    <div className="mt-1 bg-white border border-slate-200 p-2.5 rounded-lg h-fit shadow-sm">
                                        <Briefcase className="w-5 h-5 text-slate-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-slate-900">Built for Professionals</h3>
                                        <p className="text-slate-500 leading-relaxed">Designed for legal professionals, NGOs, and legal aid providers. Secure by design to protect client confidentiality.</p>
                                    </div>
                                </div>
                                <div className="flex gap-5">
                                    <div className="mt-1 bg-white border border-slate-200 p-2.5 rounded-lg h-fit shadow-sm">
                                        <Search className="w-5 h-5 text-slate-900" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold mb-2 text-slate-900">Risk Mitigation</h3>
                                        <p className="text-slate-500 leading-relaxed">Uncertain cases are flagged immediately. We employ human-in-the-loop review systems for edge scenarios.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Workflow Demo Section */}
                <section id="solution" className="py-24 px-4 bg-white border-y border-slate-100 w-full flex justify-center">
                    <div className="max-w-6xl w-full mx-auto">
                        <div className="text-center mb-16 space-y-4">
                            <h2 className="text-3xl font-bold text-slate-900">Workflow Optimized</h2>
                            <p className="text-slate-500 max-w-2xl mx-auto text-center">From query to finished document, see how LegalAid streamlines your daily tasks.</p>
                        </div>
                        
                        {/* Diagram Trigger: Helpful for visualizing the flow described in the cards below */}
                        <div className="w-full mb-12 flex justify-center">
                            
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { title: "1. Land Dispute", desc: "Get relevant Supreme Court & High Court precedents instantly." },
                                { title: "2. Judgment Briefs", desc: "Upload lengthy judgments and generate concise briefs with holdings." },
                                { title: "3. Draft Petitions", desc: "Receive structured outlines with statutory references." },
                                { title: "4. Consultation", desc: "Access instant, cited legal answers during client meetings." }
                            ].map((item, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 hover:border-slate-300 transition-colors">
                                    <h3 className="font-semibold text-base mb-2 text-slate-900">{item.title}</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Statistics Section */}
                <section className="py-24 bg-slate-50 w-full flex justify-center">
                    <div className="mx-auto max-w-7xl w-full px-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                            <div className="text-center p-6 flex flex-col items-center">
                                <div className="text-5xl font-bold text-slate-900 mb-2 tracking-tight">
                                    <Counter target={10000} suffix="+" />
                                </div>
                                <div className="text-slate-500 font-medium text-sm uppercase tracking-wide">Cases Assisted</div>
                            </div>
                            <div className="text-center p-6 flex flex-col items-center">
                                <div className="text-5xl font-bold text-slate-900 mb-2 tracking-tight">
                                    <Counter target={500} suffix="+" />
                                </div>
                                <div className="text-slate-500 font-medium text-sm uppercase tracking-wide">Lawyers Connected</div>
                            </div>
                            <div className="text-center p-6 flex flex-col items-center">
                                <div className="text-5xl font-bold text-slate-900 mb-2 tracking-tight">
                                    <Counter target={98} suffix="%" />
                                </div>
                                <div className="text-slate-500 font-medium text-sm uppercase tracking-wide">Accuracy Rate</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Final CTA Banner */}
                <section className="py-24 w-full bg-white flex justify-center">
                    <div className="mx-auto max-w-3xl w-full px-6 text-center space-y-8 flex flex-col items-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight text-center">
                            Ready to transform your practice?
                        </h2>
                        <p className="text-xl text-slate-500 font-light max-w-2xl mx-auto text-center">
                            Join the platform that is redefining how legal professionals research, draft, and collaborate.
                        </p>
                        <div className="flex justify-center pt-4">
                            <Button
                                asChild
                                size="lg"
                                className="px-10 py-6 text-lg rounded-full bg-slate-900 text-white hover:bg-slate-800 shadow-xl transition-all">
                                <Link href="/register">
                                    Start Your Free Consultation
                                </Link>
                            </Button>
                        </div>
                        <p className="text-xs text-slate-400 mt-8 text-center">No credit card required for 14-day trial.</p>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    )
}