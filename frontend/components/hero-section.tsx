'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X, Search, MessageCircle, Users, Briefcase, Handshake, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedGroup } from '@/components/ui/animated-group'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { motion, useInView } from 'framer-motion'

import { Footer } from './footer';


const Counter = ({ target, suffix = '' }: { target: number; suffix?: string }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 3000; 
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
};

const transitionVariants = {
    item: {
        hidden: {
            opacity: 0,
            filter: 'blur(12px)',
            y: 12,
        },
        visible: {
            opacity: 1,
            filter: 'blur(0px)',
            y: 0,
            transition: {
                type: "spring" as const,
                bounce: 0.3,
                duration: 1.5,
            },
        },
    },
};

const menuItems = [
    { name: 'Features', href: '#link' },
    { name: 'Solution', href: '#link' },
    { name: 'Pricing', href: '#link' },
    { name: 'About', href: '#link' },
];

export const Logo = ({ className }: { className?: string }) => {
    return (
        <Image
            src="/logo/legalaid.png"
            alt="Legal Aid Logo"
            width={600}
            height={240}
            className={cn('h-24 w-auto', className)}
            priority
        />
    )
}

const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);
    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed z-20 w-full px-2 group">
                <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-2 lg:gap-0 lg:py-0">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <Logo />
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState === true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 group-data-[state=active]:scale-0 group-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="group-data-[state=active]:rotate-0 group-data-[state=active]:scale-100 group-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                            <ul className="flex gap-8 text-sm">
                                {menuItems.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-background group-data-[state=active]:block lg:group-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item) => (
                                        <li key={item.name}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    className={cn(isScrolled && 'lg:hidden')}>
                                    <Link href="#">
                                        <span>Login</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className={cn(isScrolled && 'lg:hidden')}>
                                    <Link href="#">
                                        <span>Sign Up</span>
                                    </Link>
                                </Button>
                                <Button
                                    asChild
                                    size="sm"
                                    className={cn(isScrolled ? 'lg:inline-flex' : 'hidden')}>
                                    <Link href="#">
                                        <span>Get Started</span>
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export function HeroSection() {
    return (
        <div className="bg-background min-h-screen">
            <HeroHeader />
            <main className="overflow-hidden">
                <div
                    aria-hidden
                    className="z-[2] absolute inset-0 pointer-events-none isolate opacity-50 contain-strict hidden lg:block">
                    <div className="w-[35rem] h-[80rem] -translate-y-[350px] absolute left-0 top-0 -rotate-45 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,hsla(0,0%,85%,.08)_0,hsla(0,0%,55%,.02)_50%,hsla(0,0%,45%,0)_80%)]" />
                    <div className="h-[80rem] absolute left-0 top-0 w-56 -rotate-45 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.06)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)] [translate:5%_-50%]" />
                    <div className="h-[80rem] -translate-y-[350px] absolute left-0 top-0 w-56 -rotate-45 bg-[radial-gradient(50%_50%_at_50%_50%,hsla(0,0%,85%,.04)_0,hsla(0,0%,45%,.02)_80%,transparent_100%)]" />
                </div>
                <section>
                    <div className="relative pt-24 md:pt-36">
                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            delayChildren: 1,
                                        },
                                    },
                                },
                                item: {
                                    hidden: {
                                        opacity: 0,
                                        y: 20,
                                    },
                                    visible: {
                                        opacity: 1,
                                        y: 0,
                                        transition: {
                                            type: "spring" as const,
                                            bounce: 0.3,
                                            duration: 2,
                                        },
                                    },
                                },
                            }}
                            className="absolute inset-0 -z-20"
                        >
                                            {/* Background image optimized with next/image for better LCP */}
                                            <Image
                                                src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop"
                                                alt="Abstract tech background"
                                                fill
                                                priority
                                                className="absolute inset-x-0 top-56 -z-20 hidden lg:top-32 dark:block opacity-40 mask-image-gradient object-cover"
                                                style={{ objectPosition: '50% 10%', maskImage: 'linear-gradient(to bottom, black, transparent)' }}
                                            />
                        </AnimatedGroup>
                        <div aria-hidden className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center sm:mx-auto lg:mr-auto lg:mt-0">
                                <AnimatedGroup variants={{ item: transitionVariants.item }}>
                                    <Link
                                        href="#link"
                                        className="hover:bg-background dark:hover:border-t-border bg-muted group mx-auto flex w-fit items-center gap-4 rounded-full border p-1 pl-4 shadow-md shadow-black/5 transition-all duration-300 dark:border-t-white/5 dark:shadow-zinc-950">
                                        <span className="text-foreground text-sm">Free Legal Assistance Available Now</span>
                                        <span className="dark:border-background block h-4 w-0.5 border-l bg-white dark:bg-zinc-700"></span>

                                        <div className="bg-background group-hover:bg-muted size-6 overflow-hidden rounded-full duration-500">
                                            <div className="flex w-12 -translate-x-1/2 duration-500 ease-in-out group-hover:translate-x-0">
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                                <span className="flex size-6">
                                                    <ArrowRight className="m-auto size-3" />
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                        
                                    <h1
                                        className="mt-8 max-w-4xl mx-auto text-balance text-6xl md:text-7xl lg:mt-16 xl:text-[5.25rem] font-bold tracking-tight">
                                        Access to Justice for Everyone
                                    </h1>
                                    <p
                                        className="mx-auto mt-8 max-w-2xl text-balance text-lg text-muted-foreground">
                                        Get expert legal guidance, resources, and support for your case. Our platform connects you with experienced legal professionals to protect your rights.
                                    </p>
                                </AnimatedGroup>

                                <AnimatedGroup
                                    variants={{
                                        container: {
                                            visible: {
                                                transition: {
                                                    staggerChildren: 0.05,
                                                    delayChildren: 0.75,
                                                },
                                            },
                                        },
                                        item: transitionVariants.item,
                                    }}
                                    className="mt-12 flex flex-row items-center justify-center gap-2"
                                >
                                    <>
                                    <div
                                        key={1}
                                        className="bg-foreground/10 rounded-[14px] border p-0.5">
                                        <Button
                                            asChild
                                            size="lg"
                                            className="rounded-xl px-5 text-base">
                                            <Link href="#link">
                                                <span className="text-nowrap">Get Legal Help</span>
                                            </Link>
                                        </Button>
                                    </div>
                                    <Button
                                        key={2}
                                        asChild
                                        size="lg"
                                        variant="ghost"
                                        className="h-10.5 rounded-xl px-5">
                                        <Link href="#link">
                                            <span className="text-nowrap">Learn More</span>
                                        </Link>
                                    </Button>
                                    {/* WhatsApp moved to floating FAB for better visibility */}
                                    </>
                                </AnimatedGroup>
                            </div>
                        </div>

                        <AnimatedGroup
                            variants={{
                                container: {
                                    visible: {
                                        transition: {
                                            staggerChildren: 0.05,
                                            delayChildren: 0.75,
                                        },
                                    },
                                },
                                item: transitionVariants.item,
                            }}
                        >
                            {/* Features grid */}
                            <section className="mt-12 mb-12 w-full">
                                <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                                        {[
                                            {
                                                icon: <Search className="w-14 h-7 text-primary" />,
                                                title: 'CaseFinder™',
                                                desc: 'AI search that finds relevant precedents and extracts concise summaries.'
                                            },
                                            {
                                                icon: <MessageCircle className="w-14 h-7 text-primary" />,
                                                title: 'DraftMate',
                                                desc: 'Assistive drafting: generate and polish legal text with context-aware suggestions.'
                                            },
                                            {
                                                icon: <Users className="w-14 h-7 text-primary" />,
                                                title: 'MatchRight',
                                                desc: 'Smart matching to connect you with the best-suited lawyers.'
                                            }
                                        ].map((f) => (
                                            <div key={f.title} className="flex items-start gap-4 p-4 rounded-lg hover:bg-muted/50 hover:shadow-md hover:scale-105 transition-all duration-300 overflow-hidden">
                                                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/10 hover:scale-110 transition-transform">
                                                    {f.icon}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors">{f.title}</h3>
                                                    <p className="mt-2 text-sm text-muted-foreground max-w-prose">{f.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        </AnimatedGroup>
                    </div>
                </section>

                {/* Statistics Section */}
                <AnimatedGroup
                    variants={{
                        container: {
                            visible: {
                                transition: {
                                    staggerChildren: 0.1,
                                    delayChildren: 0.8,
                                },
                            },
                        },
                        item: transitionVariants.item,
                    }}
                >
                    <section className="py-16 w-full">
                        <div className="mx-auto max-w-7xl px-6">
                            <div className="text-center mb-12">
                                <h2 className="text-3xl font-bold text-foreground mb-4">Trusted by Thousands</h2>
                                <p className="text-lg text-muted-foreground">Join the growing community accessing quality legal aid</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="text-center border rounded-lg p-6 shadow-sm hover:scale-105 hover:shadow-xl transition-all duration-500 group">
                                    <motion.div 
                                        className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 group-hover:rotate-3 transition-transform"
                                        animate={{ y: [0, -5, 0] }} 
                                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <Briefcase className="w-10 h-10 text-primary" />
                                    </motion.div>
                                    <div className="text-4xl font-bold text-primary mb-2"><Counter target={10000} suffix="+" /></div>
                                    <div className="text-muted-foreground">Cases Assisted</div>
                                </div>
                                <div className="text-center border rounded-lg p-6 shadow-sm hover:scale-105 hover:shadow-xl transition-all duration-500 group">
                                    <motion.div 
                                        className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 group-hover:rotate-3 transition-transform"
                                        animate={{ y: [0, -5, 0] }} 
                                        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <Handshake className="w-10 h-10 text-primary" />
                                    </motion.div>
                                    <div className="text-4xl font-bold text-primary mb-2"><Counter target={500} suffix="+" /></div>
                                    <div className="text-muted-foreground">Lawyers Connected</div>
                                </div>
                                <div className="text-center border rounded-lg p-6 shadow-sm hover:scale-105 hover:shadow-xl transition-all duration-500 group relative">
                                    <motion.div 
                                        className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 group-hover:rotate-3 transition-transform"
                                        animate={{ y: [0, -5, 0] }} 
                                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                                    >
                                        <Star className="w-10 h-10 text-primary" />
                                    </motion.div>
                                    <div className="text-4xl font-bold text-primary mb-2"><Counter target={95} suffix="%" /></div>
                                    <div className="text-muted-foreground mb-3">Satisfaction Rate</div>
                                    <div className="flex justify-center space-x-1">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < 4 ? 'text-yellow-400 fill-current' : i === 4 ? 'text-yellow-400 fill-current opacity-50' : 'text-gray-300'}`} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </AnimatedGroup>

                {/* Final CTA Banner */}
                <AnimatedGroup variants={{ item: transitionVariants.item }}>
                    <section className="py-16 w-full bg-primary/5">
                        <div className="mx-auto max-w-4xl px-6 text-center">
                            <h2 className="text-3xl font-bold text-foreground mb-4">Ready to Get Legal Help?</h2>
                            <p className="text-lg text-muted-foreground mb-8">Start your free consultation today and connect with experienced legal professionals.</p>
                            <Button
                                asChild
                                size="lg"
                                className="px-8 py-3 text-lg">
                                <Link href="/register">
                                    Start Your Free Consultation
                                </Link>
                            </Button>
                        </div>
                    </section>
                </AnimatedGroup>
            </main>

            <Footer />
            
        </div>
    );
}