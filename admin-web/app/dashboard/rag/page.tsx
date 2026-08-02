"use client";

import { useEffect, useState } from "react";
import { Upload, Search, RefreshCw } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ADMIN_API_ENDPOINTS, getAdminHeaders } from "@/config/api";
import { LEGAL_CATEGORIES, RAG_CONFIG } from "@/config/constants";

export default function RagManagementPage() {
  const [documents, setDocuments] = useState<any[]>([]);

  // Form State
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(LEGAL_CATEGORIES[0]);

  // Ingestion Config State
  const [chunkSize, setChunkSize] = useState<number>(RAG_CONFIG.DEFAULT_CHUNK_SIZE);
  const [chunkOverlap, setChunkOverlap] = useState<number>(RAG_CONFIG.DEFAULT_CHUNK_OVERLAP);
  const [ingestingId, setIngestingId] = useState<string | null>(null);

  // Playground Test State
  const [testQuery, setTestQuery] = useState("");
  const [retrievalResults, setRetrievalResults] = useState<any[]>([]);
  const [testing, setTesting] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await fetch(ADMIN_API_ENDPOINTS.RAG_DOCUMENTS, {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (err) {
      console.error("Failed to load RAG documents:", err);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleIngest = async (docId: string) => {
    setIngestingId(docId);
    try {
      const res = await fetch(ADMIN_API_ENDPOINTS.RAG_INGEST(docId), {
        method: "POST",
        headers: {
          ...getAdminHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ chunk_size: chunkSize, chunk_overlap: chunkOverlap }),
      });
      if (res.ok) {
        await fetchDocuments();
      }
    } catch (err) {
      console.error("Ingestion failed:", err);
    } finally {
      setIngestingId(null);
    }
  };

  const handleTestRetrieval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setTesting(true);
    try {
      const res = await fetch(ADMIN_API_ENDPOINTS.RAG_TEST_RETRIEVAL, {
        method: "POST",
        headers: {
          ...getAdminHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: testQuery,
          top_k: RAG_CONFIG.DEFAULT_TOP_K,
          similarity_threshold: RAG_CONFIG.DEFAULT_SIMILARITY_THRESHOLD,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRetrievalResults(data.results || []);
      }
    } catch (err) {
      console.error("Retrieval test error:", err);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">RAG Pipeline & Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Ingest legal documents with Vertex AI, tune chunking parameters, and evaluate vector retrieval performance.
        </p>
      </div>

      <Tabs defaultValue="documents" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="ingest">Upload & Settings</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
        </TabsList>

        {/* Tab 1: Documents List */}
        <TabsContent value="documents" className="mt-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Knowledge Base Documents ({documents.length})</CardTitle>
              <CardDescription>
                Authoritative legal legislation and court guidelines indexed in PostgreSQL pgvector.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Chunks</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-semibold">
                        <div>{doc.title}</div>
                        <div className="text-xs text-muted-foreground font-normal">{doc.file_name}</div>
                      </TableCell>
                      <TableCell>{doc.category}</TableCell>
                      <TableCell>{doc.chunk_count} chunks</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            doc.status === "indexed"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/30"
                          }
                        >
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleIngest(doc.id)}
                          disabled={ingestingId === doc.id}
                        >
                          {ingestingId === doc.id ? "Ingesting..." : "Re-index Vectors"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Upload & Settings */}
        <TabsContent value="ingest" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Upload className="h-5 w-5 text-primary" /> Upload Knowledge Document
                </CardTitle>
                <CardDescription>
                  Upload legal document text for chunking and Vertex AI vector embedding.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Document Title</label>
                  <Input
                    type="text"
                    placeholder="e.g. Legal Aid Act No. 27 of 1978"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                  <select
                    className="w-full h-10 px-3 rounded-md bg-background border border-input text-sm outline-none"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {LEGAL_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    if (!title) return;
                    fetchDocuments();
                    setTitle("");
                  }}
                >
                  Simulate Ingest & Index Document
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RefreshCw className="h-5 w-5 text-cyan-500" /> Pipeline Settings
                </CardTitle>
                <CardDescription>
                  Configure token chunk sizes and overlap for embedding generation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Chunk Size</label>
                    <span className="font-semibold">{chunkSize} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1500"
                    step="50"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Chunk Overlap</label>
                    <span className="font-semibold">{chunkOverlap} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="300"
                    step="10"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div className="p-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground leading-relaxed">
                  Vectors generated using <strong>{RAG_CONFIG.EMBEDDING_PROVIDER} ({RAG_CONFIG.EMBEDDING_MODEL})</strong> and stored in <strong>{RAG_CONFIG.VECTOR_STORE}</strong>.
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 3: RAG Retrieval Playground */}
        <TabsContent value="playground" className="mt-6">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5 text-emerald-500" /> RAG Retrieval Playground
              </CardTitle>
              <CardDescription>
                Test similarity search performance and inspect top-K retrieved context chunks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleTestRetrieval} className="flex gap-3">
                <Input
                  type="text"
                  placeholder="Type a legal question to inspect vector retrieval (e.g. legal aid qualification criteria)"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={testing}>
                  {testing ? "Retrieving..." : "Run Vector Search"}
                </Button>
              </form>

              {retrievalResults.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Top-K Retrieved Chunks:
                  </h3>
                  {retrievalResults.map((chunk, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-lg bg-muted/40 border border-border space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-cyan-400">
                          {chunk.document_title} ({chunk.chunk_id})
                        </span>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                          Similarity: {(chunk.similarity_score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{chunk.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
