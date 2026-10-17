import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { getMetaAdsConfig } from "@/lib/meta-ads/config";

const GRAPH_BASE = "https://graph.facebook.com/v20.0";

export async function GET(req: NextRequest) {
  try {
    await getCurrentAccount();
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const config = getMetaAdsConfig();
    if (!config.access_token) {
      return NextResponse.json({ error: "Meta Access Token not configured" }, { status: 400 });
    }

    const token = config.access_token;
    const res = await fetch(
      `${GRAPH_BASE}/search?type=adgeolocation&q=${encodeURIComponent(query)}&country_code=IN&limit=15&access_token=${token}`
    );
    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 });
    }

    const formatted = (data.data || []).map((item: any) => ({
      key: String(item.key),
      name: item.name,
      type: item.type, // 'region' | 'city' | 'neighborhood' | 'country'
      region: item.region || item.country_name || "India",
      region_id: item.region_id ? String(item.region_id) : null,
      country_code: item.country_code || "IN",
      display_label:
        item.type === "region"
          ? `${item.name}, India (State / Region)`
          : item.region
          ? `${item.name}, ${item.region} (${item.type === "city" ? "City" : "District / Area"})`
          : `${item.name}, India`,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
