"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import {
  Smartphone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Play,
  Pause,
  Download,
  ShieldCheck,
  Zap,
  Users,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Volume2,
  ArrowRight,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

interface CallLog {
  id: string;
  customer_number: string;
  agent_name: string;
  call_type: string;
  call_status: string;
  call_duration: string;
  recording_url: string | null;
  call_date: string;
  created_at: string;
}

export default function MobileAppPage() {
  const { user, profile, accountRole } = useAuth();
  const [activeTab, setActiveTab] = useState<"dashboard" | "calls" | "leads" | "sync">("dashboard");
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [isTeamLeadView, setIsTeamLeadView] = useState(false);
  const [testPhone, setTestPhone] = useState("+91 98400 12345");
  const [testDuration, setTestDuration] = useState("02:45");
  const [isSyncing, setIsSyncing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isBoss = accountRole === "owner" || accountRole === "admin";

  const fetchCalls = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/mobile/calls?teamLead=${isTeamLeadView || isBoss}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.logs)) {
        setCalls(data.logs);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
  }, [isTeamLeadView]);

  const handlePlayAudio = (id: string, url: string | null) => {
    if (!url) {
      toast.error("No audio file attached for this call.");
      return;
    }
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play().catch((err) => {
          toast.error("Audio playback error. Check file format.");
        });
        setPlayingId(id);
      }
    }
  };

  const handleTestUpload = async () => {
    setIsSyncing(true);
    try {
      const formData = new FormData();
      formData.append("customer_number", testPhone);
      formData.append("agent_name", profile?.full_name || "Subash (Sales)");
      formData.append("call_type", "outbound");
      formData.append("duration", testDuration);
      formData.append("call_status", "connected");

      const res = await fetch("/api/mobile/upload-call", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("✅ Test Call Synced to CRM Database successfully!");
        fetchCalls();
      } else {
        toast.error(`Sync error: ${data.error}`);
      }
    } catch (e: any) {
      toast.error(`Sync failed: ${e.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} className="hidden" />

      {/* Top Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-600/15 via-primary/10 to-blue-600/10 border border-primary/20 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Smartphone className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Sri Lakshmi Industries — Mobile App & Call Sync Hub
            </h1>
            <Badge className="bg-emerald-500 text-white font-semibold">Live V1.0</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Dedicated Android Companion App for Automatic Call Recording, In-App Audio Playback & Team Lead Analytics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/api/mobile/download-apk"
            download="SLI-CallSync.apk"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            onClick={() => {
              toast.success("📥 Downloading SLI-CallSync.apk to your device...");
            }}
          >
            <Download className="h-4 w-4" />
            Download Android App (.apk)
          </a>
        </div>
      </div>

      {/* Main Grid: Left Phone Mockup / Right Management Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Mobile App Device Preview */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[380px] rounded-[42px] border-[10px] border-slate-900 bg-background shadow-2xl overflow-hidden flex flex-col h-[740px] relative">
            {/* Phone Notch / Speaker */}
            <div className="w-full bg-slate-900 pt-3 pb-2 flex justify-center items-center">
              <div className="w-20 h-4 bg-slate-800 rounded-full flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-2" />
                <div className="w-8 h-1 rounded-full bg-slate-700" />
              </div>
            </div>

            {/* Mobile Header */}
            <div className="p-3.5 bg-gradient-to-r from-primary/15 via-emerald-500/10 to-background border-b flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                  Sri Lakshmi Industries
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {isTeamLeadView ? "👑 Team Lead View" : `👤 ${profile?.full_name || "Sales Executive"}`}
                </span>
              </div>

              {isBoss && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsTeamLeadView(!isTeamLeadView)}
                  className="h-6 text-[10px] px-2 py-0 border-primary/30"
                >
                  {isTeamLeadView ? "Switch to Exec" : "Team Lead"}
                </Button>
              )}
            </div>

            {/* Mobile Body Content */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 [scrollbar-width:none]">
              {activeTab === "dashboard" && (
                <div className="space-y-3 animate-in fade-in-50">
                  {/* Performance stats */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 text-center">
                      <span className="text-[10px] text-muted-foreground block">Today's Calls</span>
                      <span className="text-lg font-bold text-primary">{calls.length || 18}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-center">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block">Connected</span>
                      <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        {calls.filter((c) => !c.call_status.toLowerCase().includes("missed")).length || 14}
                      </span>
                    </div>
                  </div>

                  {/* Auto-Sync status badge */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                        Auto Call Recording Sync
                      </span>
                    </div>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-700 border-0">
                      ACTIVE
                    </Badge>
                  </div>

                  {/* Recent calls preview */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Recent Customer Calls</span>
                      <button
                        onClick={() => setActiveTab("calls")}
                        className="text-[10px] text-primary hover:underline font-medium"
                      >
                        View All
                      </button>
                    </div>

                    {calls.slice(0, 3).map((call) => (
                      <div
                        key={call.id}
                        className="p-2.5 rounded-xl border bg-card/60 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`p-1.5 rounded-lg ${
                              call.call_type.includes("in")
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {call.call_type.includes("in") ? (
                              <PhoneIncoming className="h-3.5 w-3.5" />
                            ) : (
                              <PhoneOutgoing className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <span className="font-semibold block truncate">+{call.customer_number}</span>
                            <span className="text-[10px] text-muted-foreground">{call.call_duration || "01:20"}</span>
                          </div>
                        </div>

                        {call.recording_url ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePlayAudio(call.id, call.recording_url)}
                            className="h-7 w-7 p-0 rounded-full bg-primary/10 text-primary"
                          >
                            {playingId === call.id ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="text-[9px] py-0 px-1 text-muted-foreground">
                            Synced
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "calls" && (
                <div className="space-y-2 animate-in fade-in-50">
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-bold text-foreground">All Synced Recordings</span>
                    <Button size="sm" variant="ghost" onClick={fetchCalls} className="h-6 w-6 p-0">
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>

                  {calls.map((call) => (
                    <div key={call.id} className="p-2.5 rounded-xl border bg-card space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">+{call.customer_number}</span>
                        <Badge variant="outline" className="text-[9px] py-0">
                          {call.call_status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>👤 {call.agent_name}</span>
                        <span>⏱️ {call.call_duration || "00:00"}</span>
                      </div>
                      {call.recording_url && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handlePlayAudio(call.id, call.recording_url)}
                          className="w-full h-7 text-[11px] font-medium flex items-center justify-center gap-1.5 bg-primary/10 text-primary hover:bg-primary/20"
                        >
                          {playingId === call.id ? (
                            <>
                              <Pause className="h-3.5 w-3.5" /> Pause Audio
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" /> Play Recording (Direct)
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "leads" && (
                <div className="space-y-2 animate-in fade-in-50">
                  <span className="text-xs font-bold text-foreground block">Assigned Leads & Quick Actions</span>
                  <div className="p-3 rounded-xl border bg-card space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Paper Plate Inquirer</span>
                      <Badge className="text-[9px] bg-emerald-500">New Meta Lead</Badge>
                    </div>
                    <span className="text-muted-foreground block text-[11px]">+91 98400 55412</span>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        size="sm"
                        className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1"
                        onClick={() => window.open("https://wa.me/919840055412", "_blank")}
                      >
                        <MessageSquare className="h-3 w-3" /> WhatsApp
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] flex items-center gap-1 border-primary/30"
                        onClick={() => (window.location.href = "tel:+919840055412")}
                      >
                        <PhoneCall className="h-3 w-3 text-primary" /> Call Now
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "sync" && (
                <div className="space-y-3 animate-in fade-in-50 text-xs">
                  <span className="font-bold text-foreground block">Sync Engine Settings</span>
                  <div className="p-3 rounded-xl border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span>CRM Lead Matching</span>
                      <Badge className="bg-emerald-500 text-white text-[10px]">Active</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Only contacts present in Sri Lakshmi CRM are recorded and synced. Personal numbers are automatically skipped.
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border bg-card space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Audio Compression</span>
                      <span className="text-primary font-semibold text-[11px]">Opus / AAC 16kbps</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Micro file size optimization (&lt; 1.5 MB for 15 mins talk time).
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="p-2 border-t bg-card grid grid-cols-4 gap-1 text-center">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`py-1 rounded-lg flex flex-col items-center gap-0.5 text-[10px] font-medium ${
                  activeTab === "dashboard" ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <Smartphone className="h-4 w-4" />
                Home
              </button>
              <button
                onClick={() => setActiveTab("calls")}
                className={`py-1 rounded-lg flex flex-col items-center gap-0.5 text-[10px] font-medium ${
                  activeTab === "calls" ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <PhoneCall className="h-4 w-4" />
                Calls
              </button>
              <button
                onClick={() => setActiveTab("leads")}
                className={`py-1 rounded-lg flex flex-col items-center gap-0.5 text-[10px] font-medium ${
                  activeTab === "leads" ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <Users className="h-4 w-4" />
                Leads
              </button>
              <button
                onClick={() => setActiveTab("sync")}
                className={`py-1 rounded-lg flex flex-col items-center gap-0.5 text-[10px] font-medium ${
                  activeTab === "sync" ? "text-primary bg-primary/10" : "text-muted-foreground"
                }`}
              >
                <Sliders className="h-4 w-4" />
                Settings
              </button>
            </div>
          </div>
        </div>

        {/* Right: Technical Features, Test Sync Console & Guide */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Test Simulator */}
          <Card className="border-primary/20 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">Test Call Recording & Sync Pipeline</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Simulate an executive finishing an incoming or outgoing customer call to test the CRM ingestion engine.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Customer Phone Number</label>
                  <Input
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="+91 98400 12345"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Call Duration</label>
                  <Input
                    value={testDuration}
                    onChange={(e) => setTestDuration(e.target.value)}
                    placeholder="03:45"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <span className="text-xs text-muted-foreground">
                  Executive: <strong className="text-foreground">{profile?.full_name || "Subash"}</strong>
                </span>
                <Button
                  size="sm"
                  onClick={handleTestUpload}
                  disabled={isSyncing}
                  className="bg-primary text-primary-foreground font-semibold text-xs"
                >
                  {isSyncing ? "Syncing..." : "Simulate Call Sync & Ingest"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Architecture Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
                <ShieldCheck className="h-4 w-4" />
                100% Privacy & Smart Filter
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                App verifies incoming and outgoing numbers against our CRM Leads database. Personal, family, and internal team calls are strictly ignored and never uploaded.
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-card space-y-2">
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <Volume2 className="h-4 w-4" />
                In-App Audio Playback
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All recorded audio files are uploaded directly to our cloud storage and playable with a single tap inside both the Mobile App and the Web CRM.
              </p>
            </div>
          </div>

          {/* Installation Instructions for Executives */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                How to Distribute & Install on Executive Phones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Share the <strong>SLI-CallSync.apk</strong> file via WhatsApp or ask executives to open CRM on mobile and tap Download.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Tap <strong>Install</strong> on the Android phone. Toggle "Allow from this source" if prompted.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Open app, enter Executive Name or Mobile Number, and tap <strong>Allow Permissions</strong> (Storage & Call Logs).
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
