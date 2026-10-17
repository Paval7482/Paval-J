import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const baseUrl = new URL(request.url).origin;

  if (error || !code) {
    console.warn("Google OAuth error or denied:", error);
    return NextResponse.redirect(`${baseUrl}/meta-ads?channel=google&auth_error=${encodeURIComponent(error || "No authorization code")}`);
  }

  const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const redirectUri = `${baseUrl}/api/google-ads/callback`;

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId || "",
        client_secret: clientSecret || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange failed:", tokenData);
      return NextResponse.redirect(`${baseUrl}/meta-ads?channel=google&auth_error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`);
    }

    // Success: Token obtained!
    // Set a cookie so the frontend knows we are connected
    const response = NextResponse.redirect(`${baseUrl}/meta-ads?channel=google&connected=1`);
    response.cookies.set("google_ads_connected", "true", {
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${baseUrl}/meta-ads?channel=google&auth_error=${encodeURIComponent(err.message)}`);
  }
}
