import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import fs from "fs";
import path from "path";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await getCurrentAccount();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No media file provided" }, { status: 400 });
    }

    const mime = file.type || "";
    const isVideo = mime.startsWith("video/") || /\.(mp4|mov|webm|avi|m4v)$/i.test(file.name);
    const isImage = mime.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);

    if (!isVideo && !isImage) {
      return NextResponse.json(
        { error: "Unsupported file format. Please upload MP4/MOV video or JPG/PNG image." },
        { status: 400 }
      );
    }

    // Limit size: 100MB for video, 15MB for image
    const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum allowed size is ${isVideo ? "100MB" : "15MB"}.` },
        { status: 400 }
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "meta-ads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeCleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${Date.now()}_${safeCleanName}`;
    const filePath = path.join(uploadDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/meta-ads/${filename}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size_mb: +(file.size / (1024 * 1024)).toFixed(2),
      media_type: isVideo ? "video" : "image",
    });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
