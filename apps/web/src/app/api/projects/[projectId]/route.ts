import { NextResponse } from "next/server";
import { env } from "@/config/env";

const API_TIMEOUT_MS = 8000;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ projectId: string }> },
): Promise<NextResponse> {
  const { projectId } = await context.params;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const body: unknown = await request.json();
    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
    };
    const apiKey = process.env.INTERNAL_API_KEY;
    if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const res = await fetch(`${env.apiUrl}/projects/${encodeURIComponent(projectId)}`, {
      method: "PATCH",
      signal: controller.signal,
      headers,
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Project update failed",
      },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
