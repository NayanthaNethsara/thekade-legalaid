import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { chat_id, query } = body;

    console.log("Received chat request:", body);

    // Validate required fields
    if (!chat_id || !query) {
      return NextResponse.json(
        { error: "chat_id and query are required" },
        { status: 400 }
      );
    }

    // Make request to backend API
    const backendUrl = process.env.BACKEND_URL as string;
    const response = await fetch(`${backendUrl}/api/v1/chatbot/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id,
        query,
      }),
    });

    if (!response.ok) {
      throw new Error(`Backend API error: ${response.status}`);
    }

    const data = await response.json();

    console.log("Backend response:", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
