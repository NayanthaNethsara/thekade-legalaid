"use client";

import { useEffect, useState } from "react";
import { Eye, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ADMIN_API_ENDPOINTS, getAdminHeaders } from "@/config/api";
import { VERIFICATION_STATUS_BADGES } from "@/config/constants";

export default function VerificationHubPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = async () => {
    try {
      const res = await fetch(ADMIN_API_ENDPOINTS.VERIFICATION_DOCUMENTS, {
        headers: getAdminHeaders(),
      });
      if (res.ok) {
        setDocuments(await res.json());
      }
    } catch (err) {
      console.error("Failed to load verification queue:", err);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleUpdateStatus = async (status: "approved" | "rejected" | "flagged") => {
    if (!selectedDoc) return;
    setActionLoading(true);

    try {
      const res = await fetch(ADMIN_API_ENDPOINTS.VERIFICATION_VERIFY(selectedDoc.id), {
        method: "POST",
        headers: {
          ...getAdminHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, notes: reviewNote }),
      });

      if (res.ok) {
        setSelectedDoc(null);
        setReviewNote("");
        await fetchQueue();
      }
    } catch (err) {
      console.error("Status update error:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getBadgeStyle = (status: string) => {
    return (
      VERIFICATION_STATUS_BADGES[status]?.style ??
      "bg-muted text-muted-foreground"
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Document Verification Hub</h1>
        <p className="text-muted-foreground mt-1">
          Inspect legal aid applicant document scans, review vision AI field extractions, and record verification decisions.
        </p>
      </div>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Verification Queue</CardTitle>
            <CardDescription>Review applicant identity and income document submissions</CardDescription>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">
            {documents.filter((d) => d.status === "pending").length} Pending Review
          </Badge>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant Name</TableHead>
                <TableHead>Document Type</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>OCR Confidence</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-semibold">
                    <div>{doc.applicant_name}</div>
                    <div className="text-xs text-muted-foreground font-normal">{doc.id}</div>
                  </TableCell>
                  <TableCell>{doc.document_type}</TableCell>
                  <TableCell>{new Date(doc.submission_date).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <span className={doc.ocr_confidence > 0.9 ? "text-emerald-500 font-semibold" : "text-amber-500 font-semibold"}>
                      {(doc.ocr_confidence * 100).toFixed(0)}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getBadgeStyle(doc.status)}>
                      {VERIFICATION_STATUS_BADGES[doc.status]?.label ?? doc.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDoc(doc);
                        setReviewNote(doc.notes || "");
                      }}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" /> Inspect Document
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Inspection Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Verification Inspection: {selectedDoc?.applicant_name}</DialogTitle>
            <DialogDescription>
              {selectedDoc?.document_type} &bull; Submission {selectedDoc?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
            {/* Visual Scan Placeholder */}
            <div className="p-6 rounded-lg bg-muted/40 border border-dashed border-border flex flex-col items-center justify-center text-center min-h-[200px]">
              <ShieldCheck className="h-12 w-12 text-cyan-500 mb-3" />
              <div className="font-semibold text-sm">{selectedDoc?.document_type} Scan</div>
              <div className="text-xs text-muted-foreground mt-1">
                Vision Confidence: {selectedDoc ? (selectedDoc.ocr_confidence * 100).toFixed(0) : 0}%
              </div>
            </div>

            {/* Extracted Fields */}
            <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
              <h4 className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                Extracted Fields
              </h4>
              <div className="space-y-2 text-sm">
                {Object.entries(selectedDoc?.extracted_fields || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between border-b border-border/40 pb-1.5">
                    <span className="text-muted-foreground capitalize">{key.replace(/_/g, " ")}:</span>
                    <span className="font-semibold">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase">
              Admin Review Notes / Audit Comment
            </label>
            <Textarea
              rows={3}
              placeholder="Add audit notes or reason for rejection/flagging..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              variant="destructive"
              disabled={actionLoading}
              onClick={() => handleUpdateStatus("rejected")}
            >
              Reject Document
            </Button>
            <Button
              variant="outline"
              disabled={actionLoading}
              onClick={() => handleUpdateStatus("flagged")}
            >
              Flag for Re-upload
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={actionLoading}
              onClick={() => handleUpdateStatus("approved")}
            >
              Approve Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
