'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  FileText, Search, Calendar, Plus, User, LogOut, 
  Clock, CheckCircle, MoreHorizontal, Bell, Settings, 
  ChevronRight, ArrowUpRight, Scale, Sparkles, MessageSquare, ArrowRight 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// --- Mock Data ---

const requestedDocs = [
  { id: 1, title: 'Lease Agreement – Colombo Apartment', status: 'Ready', date: '2 mins ago', type: 'Agreement' },
  { id: 2, title: 'Bail Application – Case No. B/1234/2026', status: 'Drafting', date: '1 hour ago', type: 'Application' },
  { id: 3, title: 'Power of Attorney – Perera Family', status: 'Pending Review', date: 'Yesterday', type: 'POA' },
]

const recentResearch = [
  { id: 1, query: 'Precedents for prescription under Sri Lankan law', date: '4 hours ago', hits: 12 },
  { id: 2, query: 'Section 420 Penal Code – Cheating cases 2025', date: 'Yesterday', hits: 8 },
  { id: 3, query: 'Liability of company directors under Companies Act No. 7 of 2007', date: '2 days ago', hits: 24 },
]

const appointments = [
  { id: 1, client: 'Nimal Perera', type: 'Land Dispute Consultation', time: '10:00 AM', date: 'Today' },
  { id: 2, client: 'Ceylon Tea Exports Ltd', type: 'Agreement Review', time: '2:30 PM', date: 'Today' },
  { id: 3, client: 'Samanthi Fernando', type: 'District Court Hearing', time: '09:00 AM', date: 'Tomorrow' },
]

// --- Components ---

const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    'Ready': 'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Drafting': 'bg-blue-50 text-blue-700 border-blue-100',
    'Pending Review': 'bg-amber-50 text-amber-700 border-amber-100',
  }
  const defaultStyle = 'bg-slate-50 text-slate-700 border-slate-100'
  
  return (
    <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", styles[status as keyof typeof styles] || defaultStyle)}>
      {status}
    </span>
  )
}

const DashboardHeader = () => (
  <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
    <div className="flex h-16 items-center justify-between px-4 sm:px-8 lg:px-12 max-w-7xl mx-auto">
      <div className="flex items-center">
        <img
          src="/logo/legalaid.png"
          alt="Legal Aid Logo"
          className="h-25 w-auto"
          style={{ display: 'block' }}
        />
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-3 pl-1">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-sm font-medium text-slate-900">AAL. Gunasekara</span>
            <span className="text-xs text-slate-500">Sri Lanka Bar Member</span>
          </div>
          <div className="h-9 w-9 bg-slate-100 rounded-full flex items-center justify-center border border-slate-200">
            <User className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </div>
    </div>
  </header>
)

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'research'>('overview')

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-slate-200 relative">
      {/* Subtle grid background for modern look */}
      <div className="absolute inset-0 z-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"></div>
      <DashboardHeader />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-12">
        
        {/* Welcome Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Welcome!</h1>
            <p className="text-lg text-slate-500 mt-2">You have <span className="font-semibold text-slate-900">2 pending drafts</span> and <span className="font-semibold text-slate-900">3 meetings</span> today.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="bg-white border-slate-200 text-slate-700 hover:bg-slate-100 gap-2 rounded-full px-6 py-3 text-base">
              <Calendar className="w-4 h-4" /> Schedule
            </Button>
            <Button className="bg-slate-900 text-white hover:bg-slate-800 gap-2 shadow-md rounded-full px-6 py-3 text-base">
              <Plus className="w-4 h-4" /> New Matter
            </Button>
          </div>
        </div>

        {/* --- AI Command Center (Link to Chat) - Light Theme --- */}
        <div className="mb-12">
          <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-8 md:p-10 shadow-lg">
            {/* Decorative accent dots */}
            <div className="absolute top-4 right-8 w-16 h-16 bg-indigo-100 rounded-full blur-2xl opacity-40"></div>
            <div className="absolute bottom-4 left-8 w-20 h-20 bg-blue-100 rounded-full blur-2xl opacity-30"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-medium text-indigo-600 mb-4">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>AI Assistant Ready</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">What do you need to handle today?</h2>
                <p className="text-slate-500">Instantly draft contracts, research Sri Lankan case law, or summarize legal documents with our AI.</p>
              </div>
              <div className="w-full md:w-auto min-w-[300px]">
                <Link href="/ai-chat" className="group block w-full">
                  <div className="relative flex items-center w-full rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-300 p-2 pr-2">
                    <div className="pl-4 text-slate-500 text-sm group-hover:text-indigo-700 transition-colors truncate">
                      Ask anything...
                    </div>
                    <div className="ml-auto bg-indigo-600 group-hover:bg-indigo-500 text-white p-2.5 rounded-lg transition-colors shadow-lg">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid (Now Linked to Chat) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Link href="/ai-chat" className="flex flex-col items-start p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-indigo-100 transition-colors">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">Draft Document</h3>
            <p className="text-base text-slate-500 text-left">Generate contracts, notices, or petitions using AI templates.</p>
          </Link>
          
          <Link href="/ai-chat" className="flex flex-col items-start p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
            <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-emerald-100 transition-colors">
              <Search className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-emerald-600 transition-colors">Legal Research</h3>
            <p className="text-base text-slate-500 text-left">Search case laws, statutes, and find relevant precedents.</p>
          </Link>

          <Link href="/ai-chat" className="flex flex-col items-start p-8 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-200 transition-all group">
            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-100 transition-colors">
              <User className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">Client Intake</h3>
            <p className="text-base text-slate-500 text-left">Log new client details and schedule initial consultations.</p>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Recent Work (Spans 2 columns) */}
          <div className="lg:col-span-2 space-y-12">
            
            {/* Requested Documents Section */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-slate-400" />
                  <h2 className="font-semibold text-slate-900">Requested Documents</h2>
                </div>
                <Link href="#" className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {requestedDocs.map((doc) => (
                  <div key={doc.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 text-xs font-bold uppercase">
                        {doc.type.substring(0,2)}
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">{doc.title}</h4>
                        <p className="text-xs text-slate-500 mt-1">Requested {doc.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <StatusBadge status={doc.status} />
                      <button className="text-slate-400 hover:text-slate-600">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                  <button className="text-xs text-slate-500 hover:text-slate-800 font-medium transition-colors">
                    Load more documents
                  </button>
                </div>
            </div>

            {/* Requested Research Section */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                  <Search className="w-5 h-5 text-slate-400" />
                  <h2 className="font-semibold text-slate-900">Recent Research</h2>
                </div>
                <Link href="#" className="text-sm text-indigo-600 font-medium hover:underline flex items-center gap-1">
                  History <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y divide-slate-50">
                {recentResearch.map((item) => (
                  <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-slate-900">{item.query}</h4>
                      <p className="text-xs text-slate-500 mt-1">{item.date} • {item.hits} citations found</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-indigo-600">
                      <ArrowUpRight className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Column: Schedule & Client Management (Spans 1 column) */}
          <div className="space-y-12">
            
            {/* Appointments Card */}
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden h-fit">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-slate-400" />
                  <h2 className="font-semibold text-slate-900">Upcoming</h2>
                </div>
                <button className="p-1 hover:bg-slate-100 rounded">
                   <Settings className="w-4 h-4 text-slate-400" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                 {appointments.map((appt) => (
                   <div key={appt.id} className="flex gap-4 items-start pb-6 border-b border-slate-50 last:border-0 last:pb-0">
                     <div className="flex flex-col items-center min-w-[3rem] bg-slate-50 rounded-xl p-3 text-center">
                       <span className="text-sm font-bold text-slate-900">{appt.time}</span>
                     </div>
                     <div>
                      <h4 className="text-base font-semibold text-slate-900">{appt.client}</h4>
                      <p className="text-xs text-slate-500">{appt.type}</p>
                      <div className="mt-2 flex gap-1">
                        <span className="text-[11px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded">{appt.date}</span>
                      </div>
                     </div>
                   </div>
                 ))}
              </div>
              <div className="p-4 border-t border-slate-100">
                <Button variant="outline" className="w-full text-xs h-9 rounded-full">Sync Calendar</Button>
              </div>
            </div>

            {/* Quick Stats / Info */}
            <div className="bg-slate-900 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h3 className="font-bold text-lg mb-1">Pro Plan</h3>
                    <p className="text-slate-300 text-sm mb-4">Your usage this month</p>
                    
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">AI Tokens</span>
                                <span className="font-medium">85%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 w-[85%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-300">Storage</span>
                                <span className="font-medium">42%</span>
                            </div>
                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 w-[42%]"></div>
                            </div>
                        </div>
                    </div>

                    <Button variant="secondary" className="w-full mt-6 text-xs h-8 bg-white/10 text-white hover:bg-white/20 border-0">
                        Upgrade Plan
                    </Button>
                </div>
                
                {/* Decorative background circle */}
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}