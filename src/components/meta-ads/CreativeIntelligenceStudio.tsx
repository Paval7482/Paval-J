"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Film,
  Play,
  TrendingUp,
  TrendingDown,
  Sparkles,
  MapPin,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Save,
  X,
  ExternalLink,
  MessageCircle,
  Eye,
  ChevronDown,
  Globe,
  BarChart2,
  Calendar,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreativeAd {
  id: string;
  name: string;
  status: string;
  campaign_id?: string;
  campaign_name: string;
  campaign_status?: string;
  adset_name?: string;
  thumbnail_url: string;
  video_id?: string | null;
  video_url?: string | null;
  embed_html?: string | null;
  permalink_url?: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  cpc_trend: "up" | "down";
  ctr_trend: "up" | "down";
  health_status: "fresh" | "active" | "fatigued";
  is_whatsapp: boolean;
  tags?: {
    hook?: string;
    tone?: string;
    promise?: string;
    proof?: string;
    production_style?: string;
  };
}

interface GeographyItem {
  region: string;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
}

const AI_HOOK_OPTIONS = [
  { label: "Attention interrupt", desc: "High-speed dough extrusion sound / visual shock" },
  { label: "Outcome promise", desc: "100–250 kg/hr output with 1 single operator" },
  { label: "Social proof anchor", desc: "4,000+ happy bakery startups & factory owners" },
  { label: "Pain mirror", desc: "No more painful hand-pressing or high labor costs" },
  { label: "Curiosity gap", desc: "How one automatic machine runs continuous production" },
  { label: "Belief challenge", desc: "Commercial SS 304 machinery at affordable direct factory prices" },
  { label: "Open question", desc: "Starting a namkeen & chakli business this festival season?" },
];

export function CreativeIntelligenceStudio() {
  const [datePreset, setDatePreset] = useState<string>("last_7d");
  const [viewMode, setViewMode] = useState<"cards" | "geography">("cards");
  const [loading, setLoading] = useState(false);
  const [ads, setAds] = useState<CreativeAd[]>([]);
  const [geography, setGeography] = useState<GeographyItem[]>([]);
  const [selectedAd, setSelectedAd] = useState<CreativeAd | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [dailyTimeline, setDailyTimeline] = useState<any[]>([]);
  const [adStatus, setAdStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE");
  const [selectedHook, setSelectedHook] = useState("Attention interrupt");
  const [savingTags, setSavingTags] = useState(false);
  const [inlinePlayingId, setInlinePlayingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [datePreset]);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/meta-ads/creative-intelligence?date_preset=${datePreset}`);
      const data = await res.json();
      if (data.ok) {
        setAds(data.ads || []);
        setGeography(data.geography || []);
      }
    } catch (e) {
      console.error("Failed to load creative intelligence:", e);
    } finally {
      setLoading(false);
    }
  }

  async function openAdCopilot(ad: CreativeAd) {
    setSelectedAd(ad);
    setAdStatus(ad.status as "ACTIVE" | "PAUSED");
    setSelectedHook(ad.tags?.hook || "Attention interrupt");
    setModalOpen(true);
    setCopilotLoading(true);

    try {
      const res = await fetch(`/api/meta-ads/creative-intelligence?ad_id=${ad.id}`);
      const data = await res.json();
      if (data.ok) {
        setDailyTimeline(data.daily_trend || []);
        if (data.ad) {
          setSelectedAd((prev) => (prev ? { ...prev, ...data.ad } : data.ad));
        }
        if (data.saved_tags?.hook) {
          setSelectedHook(data.saved_tags.hook);
        }
      }
    } catch (e) {
      console.error("Failed to load ad timeline:", e);
    } finally {
      setCopilotLoading(false);
    }
  }

  async function handleSaveCopilot() {
    if (!selectedAd) return;
    try {
      setSavingTags(true);
      const res = await fetch("/api/meta-ads/creative-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adId: selectedAd.id,
          status: adStatus,
          tags: {
            hook: selectedHook,
            tone: selectedAd.is_whatsapp ? "Conversational WhatsApp" : "Commercial Machinery B2B",
            promise: "Patented SS 304 High Speed Murukku Machinery",
            proof: "4,000+ Happy Customers & 20+ Yrs Trust",
          },
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Ad Copilot tags & status saved successfully!");
        setAds((prev) =>
          prev.map((a) =>
            a.id === selectedAd.id
              ? { ...a, status: adStatus, tags: { ...a.tags, hook: selectedHook } }
              : a
          )
        );
        setModalOpen(false);
      } else {
        toast.error(data.error || "Failed to update ad");
      }
    } catch {
      toast.error("Network error saving copilot");
    } finally {
      setSavingTags(false);
    }
  }

  // Calculate SVG timeline path for the daily trend
  const svgChart = useMemo(() => {
    if (!dailyTimeline || dailyTimeline.length < 2) return null;
    const spends = dailyTimeline.map((d) => d.spend);
    const maxSpend = Math.max(...spends, 100);
    const minSpend = Math.min(...spends, 0);
    const range = maxSpend - minSpend || 1;

    const width = 600;
    const height = 150;
    const padding = 20;

    const points = dailyTimeline.map((d, i) => {
      const x = padding + (i / (dailyTimeline.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.spend - minSpend) / range) * (height - 2 * padding);
      return { x, y, date: d.date, spend: d.spend };
    });

    const pathString = points.reduce((acc, p, i) => {
      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, "");

    return { points, pathString, width, height, maxSpend };
  }, [dailyTimeline]);

  return (
    <div className="space-y-5">
      {/* Top Bar: Title, Subtitle, Metric Filter Pills, Preset Buttons (Image 2 style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl border border-border/80 bg-card/90 shadow-sm backdrop-blur">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
                <span>Creative Intelligence &amp; Ad Copilot</span>
                <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 font-mono">
                  Madgicx AI Architecture
                </Badge>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visual thumbnail analysis, thumbstop hooks, and regional buyer breakdown for Sri Lakshmi Murukku Machines.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle: Cards vs Geography */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              className={cn(
                "px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "cards"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Film className="h-3.5 w-3.5" />
              <span>Ad Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("geography")}
              className={cn(
                "px-3 py-1 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                viewMode === "geography"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Globe className="h-3.5 w-3.5 text-blue-500" />
              <span>Geography Map</span>
            </button>
          </div>

          {/* Date Presets */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 text-xs">
            {[
              { id: "today", label: "Today" },
              { id: "last_7d", label: "7d" },
              { id: "last_14d", label: "14d" },
              { id: "last_30d", label: "30d" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDatePreset(p.id)}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer",
                  datePreset === p.id
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="h-8 w-8 p-0 rounded-xl"
            title="Refresh"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Content 1: Visual Ad Cards (Image 2 Replica) */}
      {viewMode === "cards" && (
        <div className="space-y-4">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs font-semibold">Loading visual video creative cards...</p>
            </div>
          ) : ads.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground border rounded-3xl bg-card/60">
              <Film className="h-10 w-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm font-semibold text-foreground">No ads active for this date range</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {ads.map((ad) => {
                return (
                  <div
                    key={ad.id}
                    onClick={() => openAdCopilot(ad)}
                    className="group relative rounded-3xl border border-border/80 bg-card/90 overflow-hidden shadow-sm hover:shadow-xl hover:border-primary/50 transition-all duration-300 flex flex-col justify-between cursor-pointer"
                  >
                    {/* Top Aspect Ratio Video Container (Image 2 Replica) */}
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-950">
                      {inlinePlayingId === ad.id && ad.video_url ? (
                        <video
                          src={ad.video_url}
                          poster={ad.thumbnail_url}
                          autoPlay
                          controls
                          playsInline
                          className="h-full w-full object-contain bg-black"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <>
                          <img
                            src={ad.thumbnail_url}
                            alt={ad.name}
                            className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              (e.target as any).src =
                                "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80";
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

                          {/* Play Icon in center */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAdCopilot(ad);
                              }}
                              className="h-12 w-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center group-hover:scale-110 group-hover:bg-primary transition-all shadow-lg hover:scale-125 cursor-pointer z-10"
                              title="Play Video in Ad Copilot"
                            >
                              <Play className="h-5 w-5 fill-white ml-0.5" />
                            </button>
                          </div>
                        </>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 inset-x-3 flex items-center justify-between pointer-events-none">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md border",
                            ad.is_whatsapp
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : "bg-black/50 text-white border-white/20"
                          )}
                        >
                          {ad.is_whatsapp ? "WhatsApp Ad" : "Quality Leads"}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-md",
                            ad.health_status === "fresh"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                              : ad.health_status === "fatigued"
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                              : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                          )}
                        >
                          {ad.health_status === "fresh"
                            ? "🟢 Fresh Hook"
                            : ad.health_status === "fatigued"
                            ? "🔴 Creative Fatigue"
                            : "🟡 Active"}
                        </Badge>
                      </div>

                      {/* Bottom Overlay Title */}
                      <div className="absolute bottom-3 inset-x-3">
                        <p className="text-xs font-bold text-white drop-shadow-md truncate">
                          {ad.campaign_name}
                        </p>
                        <p className="text-[11px] text-slate-300 truncate">
                          {ad.tags?.hook || "Attention interrupt"}
                        </p>
                      </div>
                    </div>

                    {/* Bottom Metadata & 4 Metrics (Image 2 Replica) */}
                    <div className="p-4 space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {ad.name}
                          </h4>
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full shrink-0",
                              ad.status === "ACTIVE" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/50"
                            )}
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">{ad.adset_name}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                        {/* Amount Spent */}
                        <div className="p-2.5 rounded-xl border border-border/60 bg-muted/30">
                          <p className="text-[10px] text-muted-foreground font-semibold">Amount Spent</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            ₹{ad.spend.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                          </p>
                        </div>

                        {/* Cost Per Click */}
                        <div className="p-2.5 rounded-xl border border-border/60 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-semibold">Cost per Click</span>
                            {ad.cpc_trend === "up" ? (
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            ₹{ad.cpc ? ad.cpc.toFixed(2) : "0.00"}
                          </p>
                        </div>

                        {/* Impressions */}
                        <div className="p-2.5 rounded-xl border border-border/60 bg-muted/30">
                          <p className="text-[10px] text-muted-foreground font-semibold">Impressions</p>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {ad.impressions.toLocaleString("en-IN")}
                          </p>
                        </div>

                        {/* Click-Through Rate */}
                        <div className="p-2.5 rounded-xl border border-border/60 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground font-semibold">CTR</span>
                            {ad.ctr_trend === "up" ? (
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-rose-500" />
                            )}
                          </div>
                          <p className="text-sm font-bold text-foreground mt-0.5">
                            {ad.ctr.toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      {/* Hover Action Bar */}
                      <div className="pt-2 flex items-center justify-between border-t border-border/50 text-[11px] text-primary font-semibold">
                        <span>Click to Open Ad Copilot</span>
                        <Sliders className="h-3.5 w-3.5 group-hover:rotate-45 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content 2: Geography Regional Heatmap & State Table (Image 3 Replica) */}
      {viewMode === "geography" && (
        <div className="space-y-4">
          <div className="p-5 rounded-3xl border border-border/80 bg-card/90 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-500" />
                  <span>India Regional Buyer Breakdown (Machinery Orders by State)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  State-wise ad spend allocation and buyer inquiry performance across Indian states.
                </p>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {geography.length} States Active
              </Badge>
            </div>

            {geography.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">
                No state-level data available for selected date preset.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {geography.map((geo, idx) => {
                  const totalGeoSpend = geography.reduce((a, b) => a + b.spend, 0) || 1;
                  const pct = Math.round((geo.spend / totalGeoSpend) * 100);

                  return (
                    <div
                      key={geo.region}
                      className="p-3.5 rounded-2xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground">{geo.region}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {geo.clicks} Clicks • CTR {geo.ctr.toFixed(1)}% • CPC ₹{geo.cpc.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-foreground">
                          ₹{Math.round(geo.spend).toLocaleString("en-IN")}
                        </p>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-muted-foreground">{pct}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* AD COPILOT MODAL (Image 4 Replica) */}
      {/* ==================================================================== */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
          {/* Header */}
          <DialogHeader className="p-4 px-6 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                <Sliders className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <span>Ad Copilot Studio</span>
                  <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Live Meta API Sync
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-muted-foreground truncate max-w-md">
                  {selectedAd?.campaign_name}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Toggle */}
              <div className="flex items-center gap-2 pr-2 border-r border-border/60">
                <Label className="text-xs font-semibold cursor-pointer">Status</Label>
                <Switch
                  checked={adStatus === "ACTIVE"}
                  onCheckedChange={(c) => setAdStatus(c ? "ACTIVE" : "PAUSED")}
                />
                <span
                  className={cn(
                    "text-xs font-bold font-mono",
                    adStatus === "ACTIVE" ? "text-emerald-500" : "text-muted-foreground"
                  )}
                >
                  {adStatus}
                </span>
              </div>

              <Button
                size="sm"
                onClick={handleSaveCopilot}
                disabled={savingTags}
                className="gap-1.5 text-xs font-semibold"
              >
                {savingTags ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                <span>Save</span>
              </Button>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Visual Video Card Preview with Play overlay */}
              <div className="space-y-4">
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden bg-black border border-border/70 shadow-md flex items-center justify-center">
                  {selectedAd?.video_url ? (
                    <video
                      key={selectedAd.video_url}
                      src={selectedAd.video_url}
                      poster={selectedAd.thumbnail_url}
                      controls
                      autoPlay
                      playsInline
                      className="h-full w-full object-contain bg-black"
                    />
                  ) : selectedAd?.embed_html ? (
                    <div
                      className="w-full h-full flex items-center justify-center overflow-hidden bg-black"
                      dangerouslySetInnerHTML={{ __html: selectedAd.embed_html }}
                    />
                  ) : (
                    <div className="relative h-full w-full bg-slate-950 flex flex-col items-center justify-center">
                      <img
                        src={selectedAd?.thumbnail_url}
                        alt={selectedAd?.name}
                        className="h-full w-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                        <Film className="h-10 w-10 text-white/50 animate-pulse" />
                        <p className="text-xs font-semibold">Live Video Stream Loading...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Video Stream Info & Direct Facebook Link */}
                <div className="flex items-center justify-between text-xs px-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        selectedAd?.video_url ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground"
                      )}
                    />
                    <span className="font-medium text-[11px]">
                      {selectedAd?.video_url
                        ? "Direct Facebook Progressive MP4 (720p HD)"
                        : "Static Creative Asset"}
                    </span>
                  </div>
                  {selectedAd?.permalink_url && (
                    <a
                      href={selectedAd.permalink_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      <span>Open on Facebook</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Left Column Metrics (Image 4 Left Box) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30">
                    <p className="text-[10px] text-muted-foreground font-semibold">Amount Spent</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      ₹{selectedAd ? selectedAd.spend.toLocaleString("en-IN") : "0"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30">
                    <p className="text-[10px] text-muted-foreground font-semibold">Cost per Click</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      ₹{selectedAd ? selectedAd.cpc.toFixed(2) : "0.00"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30">
                    <p className="text-[10px] text-muted-foreground font-semibold">Impressions</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {selectedAd ? selectedAd.impressions.toLocaleString("en-IN") : "0"}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30">
                    <p className="text-[10px] text-muted-foreground font-semibold">Click-Through Rate</p>
                    <p className="text-base font-bold text-foreground mt-0.5">
                      {selectedAd ? selectedAd.ctr.toFixed(1) : "0.0"}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: AI Tags & Psychological Hooks Selector (Image 4 Right Box) */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl border border-border/70 bg-muted/20 space-y-3">
                  <div>
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>AI Psychological Hook Tag</span>
                    </Label>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Categorize the 0–3 second attention trigger used in this Murukku machine ad.
                    </p>
                  </div>

                  {/* Dropdown Menu for Hooks (Image 4 Dropdown Replica) */}
                  <DropdownMenu>
                    <DropdownMenuTrigger className="w-full h-10 px-3 rounded-xl border border-border/80 bg-background flex items-center justify-between text-xs font-semibold hover:border-primary/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2 truncate">
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          Hook
                        </Badge>
                        <span className="truncate">{selectedHook}</span>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-72 max-h-64 overflow-y-auto">
                      {AI_HOOK_OPTIONS.map((opt) => (
                        <DropdownMenuItem
                          key={opt.label}
                          onClick={() => setSelectedHook(opt.label)}
                          className="flex flex-col items-start gap-0.5 py-2 cursor-pointer"
                        >
                          <span className="font-bold text-xs">{opt.label}</span>
                          <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Additional Machinery Positioning Tags */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Production Tone:</span>
                    <strong className="text-foreground">Authoritative Industrial B2B</strong>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Machine Standard:</span>
                    <strong className="text-emerald-500">Patented Food-Grade SS 304</strong>
                  </div>
                  <div className="p-3 rounded-xl border border-border/60 bg-muted/30 flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Production Style:</span>
                    <strong className="text-foreground">Live Factory Extrusion Demo</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Daily Spend Trajectory Line Graph (Image 4 Bottom Box) */}
            <div className="p-5 rounded-2xl border border-border/70 bg-card/60 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-rose-500" />
                    <span>Daily Spend Trajectory Timeline</span>
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Day-by-day ad spend velocity over time (Sep 17 – Oct 16).
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  ₹{selectedAd ? selectedAd.spend.toLocaleString("en-IN") : "0"} Total
                </Badge>
              </div>

              {copilotLoading ? (
                <div className="py-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                  <span>Loading daily trend timeline...</span>
                </div>
              ) : svgChart ? (
                <div className="w-full overflow-x-auto pt-2">
                  <svg
                    viewBox={`0 0 ${svgChart.width} ${svgChart.height}`}
                    className="w-full h-36 overflow-visible"
                  >
                    {/* Grid lines */}
                    <line
                      x1="0"
                      y1={svgChart.height - 20}
                      x2={svgChart.width}
                      y2={svgChart.height - 20}
                      stroke="currentColor"
                      className="text-border"
                      strokeWidth="1"
                    />
                    <line
                      x1="0"
                      y1="20"
                      x2={svgChart.width}
                      y2="20"
                      stroke="currentColor"
                      className="text-border/50"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />

                    {/* Spend Line */}
                    <path
                      d={svgChart.pathString}
                      fill="none"
                      stroke="#f43f5e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data Points */}
                    {svgChart.points.map((p, i) => (
                      <g key={i} className="group/pt">
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="3.5"
                          fill="#f43f5e"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          className="hover:r-5 transition-all cursor-pointer"
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Dates Axis */}
                  <div className="flex justify-between text-[10px] font-mono text-muted-foreground pt-1 px-2">
                    <span>{dailyTimeline[0]?.date || "Sep 17"}</span>
                    <span>{dailyTimeline[Math.floor(dailyTimeline.length / 2)]?.date || "Oct 01"}</span>
                    <span>{dailyTimeline[dailyTimeline.length - 1]?.date || "Oct 16"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  Daily spend breakdown recorded for this active ad.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
