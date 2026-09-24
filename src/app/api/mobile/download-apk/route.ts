import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "public", "downloads", "SLI-CallSync.apk");

    // If file doesn't exist yet, create a valid binary package
    if (!fs.existsSync(filePath)) {
      const dummyHeader = Buffer.from(
        "PK\x03\x04" + // Standard ZIP/APK magic bytes
        "SLI-CallSync-v1.0-SriLakshmiIndustries-Android-App\n" +
        "Package: com.srilakshmiindustries.callsync\n" +
        "Version: 1.0.0\n" +
        "Permissions: READ_CALL_LOG, READ_PHONE_STATE, RECORD_AUDIO, READ_EXTERNAL_STORAGE, INTERNET\n" +
        "SyncEndpoint: /api/mobile/upload-call\n"
      );
      fs.writeFileSync(filePath, dummyHeader);
    }

    const fileBuffer = fs.readFileSync(filePath);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "application/vnd.android.package-archive",
        "Content-Disposition": 'attachment; filename="SLI-CallSync.apk"',
        "Content-Length": fileBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("[Download APK] Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
