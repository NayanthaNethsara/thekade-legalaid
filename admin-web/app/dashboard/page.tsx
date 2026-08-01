"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Database, FileCheck, Server, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ADMIN_API_ENDPOINTS, getAdminHeaders } from "@/config/api";
import { RAG_CONFIG } from "@/config/constants";

export default function DashboardOverview() {
  const [ragStatus, setRagStatus] = useState<any>(null);
  const [verifQueue, setVerifQueue] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = getAdminHeaders();

        const [ragRes, verifRes] = await Promise.all([
          fetch(ADMIN_API_ENDPOINTS.RAG_STATUS, { headers }),
          fetch(ADMIN_API_ENDPOINTS.VERIFICATION_DOCUMENTS, { headers }),
        ]);

        if (ragRes.ok) setRagStatus(await ragRes.json());
        if (verifRes.ok) setVerifQueue(await verifRes.json());
      } catch (err) {
        console.error("Error fetching admin stats:", err);
      }
    };

    fetchData();
  }, []);

  const pendingVerifications = verifQueue.filter((d) => d.status === "pending").length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor RAG knowledge base indexing and document verification workflows
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              RAG Documents
            </CardTitle>
            <Database className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{ragStatus?.total_documents ?? 2}</div>
            <p className="text-xs text-emerald-500 font-medium mt-1">
              {ragStatus?.total_chunks ?? 70} vector chunks indexed
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Pending Verifications
            </CardTitle>
            <FileCheck className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingVerifications}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires manual admin review</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Vector Store
            </CardTitle>
            <Server className="h-5 w-5 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{ragStatus?.vector_store ?? RAG_CONFIG.VECTOR_STORE}</div>
            <p className="text-xs text-emerald-500 font-medium mt-1">
              Embedding Model: {ragStatus?.embedding_model ?? RAG_CONFIG.EMBEDDING_MODEL}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border/60 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                <Database className="h-6 w-6 text-primary" />
              </div>
              <CardTitle className="text-xl font-semibold">RAG Pipeline & Knowledge Base</CardTitle>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              Upload legal legislation, property laws, and court procedures. Configure chunk sizes, re-embed documents with Google Vertex AI, and test retrieval accuracy in the vector playground.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild className="w-full sm:w-auto gap-2">
              <Link href="/dashboard/rag">
                Manage RAG Ingestion <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        <Card className="border-border/60 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <FileCheck className="h-6 w-6 text-emerald-500" />
              </div>
              <CardTitle className="text-xl font-semibold">Document Verification Hub</CardTitle>
            </div>
            <CardDescription className="text-sm leading-relaxed">
              Review legal aid applicant document submissions (NICs, income certificates). Compare vision AI extracted OCR fields against source document scans and record verification decisions.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="secondary" className="w-full sm:w-auto gap-2">
              <Link href="/dashboard/verification">
                Open Verification Hub <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
