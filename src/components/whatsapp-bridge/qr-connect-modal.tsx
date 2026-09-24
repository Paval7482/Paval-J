"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  QrCode,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  Unlink,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { BridgeSession } from "@/lib/whatsapp-bridge/engine";

interface QRConnectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: string;
  onSessionUpdated?: () => void;
}

export function QRConnectModal({
  open,
  onOpenChange,
  userId,
  onSessionUpdated,
}: QRConnectModalProps) {
  const [session, setSession] = useState<BridgeSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  // Fetch live session
  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/whatsapp-bridge/session${userId ? `?userId=${userId}` : ""}`);
      const data = await res.json();
      if (data.ok && data.session) {
        setSession(data.session);
      }
    } catch {
      toast.error("Failed to load WhatsApp device status");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      fetchSession();
    }
  }, [open, fetchSession]);

  // Request new QR code
  const handleGenerateQR = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/whatsapp-bridge/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GENERATE_QR", userId }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        setSession(data.session);
        setTimeLeft(60);
        toast.success("New QR code generated");
      }
    } catch {
      toast.error("Failed to generate QR code");
    } finally {
      setRefreshing(false);
    }
  };

  // Complete pairing (simulate / confirm phone link)
  const handleConfirmPairing = async (phoneToLink: string) => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/whatsapp-bridge/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "CONFIRM_PAIRING", userId, phone: phoneToLink }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        setSession(data.session);
        toast.success(`WhatsApp successfully linked to +${data.session.linkedPhone}`);
        onSessionUpdated?.();
      }
    } catch {
      toast.error("Failed to complete pairing");
    } finally {
      setRefreshing(false);
    }
  };

  // Disconnect session
  const handleDisconnect = async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/whatsapp-bridge/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "DISCONNECT", userId }),
      });
      const data = await res.json();
      if (data.ok && data.session) {
        setSession(data.session);
        toast.info("WhatsApp device unlinked");
        onSessionUpdated?.();
      }
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setRefreshing(false);
    }
  };

  // Timer countdown for QR
  useEffect(() => {
    if (session?.state === "QR_READY" && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [session?.state, timeLeft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white border border-slate-200 shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="bg-emerald-600 text-white p-6 relative overflow-hidden">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
                Executive WhatsApp Direct Connect
              </DialogTitle>
              <DialogDescription className="text-emerald-100 text-xs mt-0.5">
                Link sales executive WhatsApp directly to SLI CRM for real-time sync
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 mx-auto text-emerald-600 animate-spin" />
              <p className="text-sm text-slate-500">Checking device connection status...</p>
            </div>
          ) : session?.state === "CONNECTED" ? (
            /* 🟢 CONNECTED STATE */
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  🟢 Linked & Connected
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-2">
                  +{session.linkedPhone || session.executivePhone}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Assigned Executive: <strong className="text-slate-800">{session.executiveName}</strong>
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-left text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span>Automated Live Sync:</span>
                  <span className="font-semibold text-emerald-600">Active (Real-Time)</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Synced Messages:</span>
                  <span className="font-semibold text-slate-900">{session.syncedCount} msgs</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Customer Firewall:</span>
                  <span className="font-semibold text-emerald-600">5-Layer Protection ON</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={refreshing}
                  className="w-full text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                >
                  <Unlink className="w-3.5 h-3.5 mr-1.5" />
                  Unlink WhatsApp Device
                </Button>
                <Button
                  onClick={() => onOpenChange(false)}
                  className="w-full text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          ) : session?.state === "QR_READY" && session.qrCodeDataUrl ? (
            /* 📷 QR READY STATE */
            <div className="space-y-4 text-center">
              <div className="relative p-3 bg-slate-50 border border-slate-200 rounded-2xl inline-block shadow-xs">
                <Image
                  src={session.qrCodeDataUrl}
                  alt="WhatsApp Pairing QR Code"
                  width={220}
                  height={220}
                  className="rounded-lg mx-auto"
                  unoptimized
                />
                {timeLeft === 0 && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-2xs flex flex-col items-center justify-center rounded-2xl p-4">
                    <p className="text-xs font-semibold text-slate-700 mb-2">QR Code Expired</p>
                    <Button
                      size="sm"
                      onClick={handleGenerateQR}
                      className="bg-emerald-600 text-white text-xs gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Generate New QR
                    </Button>
                  </div>
                )}
              </div>

              <div className="text-xs text-slate-500 flex items-center justify-center gap-1.5 font-mono">
                <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
                <span>Expires in {timeLeft}s</span>
              </div>

              {/* Step by step instructions */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left text-xs space-y-1.5 text-slate-600">
                <p className="font-bold text-slate-800 uppercase tracking-wide text-[10px]">
                  How to link on your phone:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed">
                  <li>Open <strong>WhatsApp</strong> on your mobile device.</li>
                  <li>Tap <strong>Menu (⋮)</strong> or <strong>Settings</strong> &gt; <strong>Linked Devices</strong>.</li>
                  <li>Tap <strong>Link a Device</strong> and point your camera at this QR code.</li>
                </ol>
              </div>

              {/* Quick 1-Click Verification / Confirmation button */}
              <div className="pt-1">
                <Button
                  onClick={() => handleConfirmPairing(session.executivePhone)}
                  disabled={refreshing}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                  Confirm & Activate Direct Link (+{session.executivePhone})
                </Button>
              </div>
            </div>
          ) : (
            /* ⚪ DISCONNECTED STATE */
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-slate-200">
                <QrCode className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Link Executive WhatsApp (+{session?.executivePhone || "919786390479"})
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Scan QR code with executive phone to enable automated background customer sync and 1-click CRM chat control.
                </p>
              </div>

              {/* Safety Badges */}
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-emerald-800 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Meta Cloud API Untouched</span>
                </div>
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-sky-800 font-medium">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                  <span>Zero Chrome Extension Needed</span>
                </div>
              </div>

              <Button
                onClick={handleGenerateQR}
                disabled={refreshing}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2.5 shadow-sm"
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <QrCode className="w-4 h-4 mr-2" />
                )}
                Generate WhatsApp Pairing QR Code
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
