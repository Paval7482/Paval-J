import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: "GOOGLE_ADS_CLIENT_ID is not configured in .env.local" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(request.url);
  const redirectUri =
    searchParams.get("redirect_uri") ||
    `${new URL(request.url).origin}/api/google-ads/callback`;

  // Standard Google OAuth 2.0 Auth URL
  const scope = encodeURIComponent(
    [
      "https://www.googleapis.com/auth/adwords",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ].join(" ")
  );

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;

  return NextResponse.redirect(googleAuthUrl);
}
