import { NextResponse } from "next/server";

// This is a public API route that doesn't require authentication
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    service: "YPK Gloria API",
    version: "1.0.0",
  });
}