import { NextRequest, NextResponse } from "next/server";
import { lintAdCopy } from "@/lib/meta-ads/policy-linter";

export async function POST(req: NextRequest) {
  try {
    const { headline, primary_text } = await req.json();
    const result = lintAdCopy(headline || "", primary_text || "");
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to lint ad copy" },
      { status: 500 }
    );
  }
}
