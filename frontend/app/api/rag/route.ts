import { type NextRequest, NextResponse } from "next/server";

/**
 * RAG Query API endpoint - sends legal questions to the RAG service
 * 
 * POST /api/rag
 * Body: { question: string, top_k?: number, chat_history?: Array<{role: string, content: string}> }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, top_k = 5, chat_history = [] } = body;

    console.log("RAG query request:", { question, top_k });

    // Validate required fields
    if (!question || question.trim().length === 0) {
      return NextResponse.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    // Make request to RAG API
    const ragUrl = process.env.RAG_API_URL || "http://localhost:8000";
    const response = await fetch(`${ragUrl}/api/v1/rag/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question: question.trim(),
        top_k,
        chat_history,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("RAG API error:", response.status, errorData);
      throw new Error(
        `RAG API error: ${response.status} - ${errorData.detail || "Unknown error"}`
      );
    }

    const data = await response.json();

    console.log("RAG response:", {
      answerLength: data.answer?.length,
      citationsCount: data.citations?.length,
      chunksRetrieved: data.metadata?.chunks_retrieved,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("RAG API route error:", error);
    return NextResponse.json(
      {
        error: "Failed to process RAG query",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 * 
 * GET /api/rag
 */
export async function GET() {
  try {
    const ragUrl = process.env.RAG_API_URL || "http://localhost:8000";
    const response = await fetch(`${ragUrl}/api/v1/rag/health`);
    
    if (!response.ok) {
      throw new Error(`RAG API health check failed: ${response.status}`);
    }

    const health = await response.json();
    
    return NextResponse.json({
      status: "ok",
      rag_service: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("RAG health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
