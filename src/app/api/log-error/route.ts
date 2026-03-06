import { NextRequest, NextResponse } from "next/server";

/**
 * Error Logging API
 * Captures client-side errors and logs them for debugging
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { errorId, error, stack, componentStack, timestamp, url, userAgent } = body;

    // Log to console with structured format
    console.error("[CLIENT ERROR]", {
      errorId: errorId || `err_${Date.now()}`,
      message: error,
      stack: stack?.substring(0, 1000), // Truncate long stacks
      componentStack: componentStack?.substring(0, 500),
      timestamp: timestamp || new Date().toISOString(),
      url,
      userAgent,
      referer: request.headers.get("referer"),
      ip: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
    });

    // In production, you could send this to a logging service like:
    // - Sentry
    // - LogRocket
    // - Datadog
    // - Custom logging endpoint

    return NextResponse.json({ 
      success: true, 
      errorId: errorId || `err_${Date.now()}` 
    });
  } catch (e) {
    console.error("Failed to log error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
