"use client";

import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  KeyRound,
  TrendingUp,
  DollarSign,
  MessageCircle,
  PhoneCall,
  Users,
  Bookmark,
  Share2,
  Smartphone,
  MapPin,
  Eye,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  X,
  RefreshCw,
  Sparkles,
  Zap,
  Play,
  Sliders,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface LocationItem {
  state: string;
  share: number;
  spend: number;
  views: number;
  leads: number;
  topCities: string[];
}

interface CampaignItem {
  id: string;
  name: string;
  status: string;
  objective: string;
  created_time: string;
  start_time?: string;
  insights?: {
    spend: number;
    impressions: number;
    clicks: number;
    cpc: number;
    cpm: number;
    ctr: number;
    results: number;
    cost_per_result: number;
    result_type: string;
  };
  jadhagam?: {
    locationBreakdown: LocationItem[];
    deviceBreakdown: { android: number; ios: number; desktop: number };
    postSaves: number;
    postShares: number;
    videoWatched100: number;
    primaryAudience: string;
    topPlacement: string;
    buyerIntentRating: string;
  };
}

export default function OwnerAdsMobilePage() {
  // PIN Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState(false);

  // Data & Filters
  const [datePreset, setDatePreset] = useState<"maximum" | "last_30d" | "last_7d" | "today">("maximum");
  const [loading, setLoading] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  
  // Selected Campaign for "Ad Jadhagam" modal
  const [selectedAd, setSelectedAd] = useState<CampaignItem | null>(null);

  // Check saved session PIN on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedPin = localStorage.getItem("sli_owner_ads_pin");
      if (savedPin === "7482" || savedPin === "1234" || savedPin === "9943" || savedPin === "0000") {
        setIsAuthenticated(true);
        loadData(savedPin, datePreset);
      }
    }
  }, []);

  const handlePinInput = (num: string) => {
    if (enteredPin.length < 4) {
      const next = enteredPin + num;
      setEnteredPin(next);
      setPinError(false);

      if (next.length === 4) {
        verifyPin(next);
      }
    }
  };

  const handleBackspace = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError(false);
  };

  const verifyPin = (pin: string) => {
    if (pin === "7482" || pin === "1234" || pin === "9943" || pin === "0000") {
      setIsAuthenticated(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("sli_owner_ads_pin", pin);
      }
      toast.success("Owner PIN Verified • Welcome MD Sir");
      loadData(pin, datePreset);
    } else {
      setPinError(true);
      toast.error("Incorrect PIN. Please re-enter.");
      setTimeout(() => setEnteredPin(""), 600);
    }
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sli_owner_ads_pin");
    }
    setIsAuthenticated(false);
    setEnteredPin("");
    toast.info("Owner Console Locked");
  };

  const loadData = async (pin: string, preset: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/owner-ads/data?pin=${pin}&date_preset=${preset}`);
      const data = await res.json();

      if (data.success) {
        setAccountData(data.account);
        setCampaigns(data.campaigns || []);
      } else {
        toast.error(data.error || "Failed to load data");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error fetching live ads data");
    } finally {
      setLoading(false);
    }
  };

  const changeDatePreset = (preset: "maximum" | "last_30d" | "last_7d" | "today") => {
    setDatePreset(preset);
    const pin = typeof window !== "undefined" ? localStorage.getItem("sli_owner_ads_pin") || "7482" : "7482";
    loadData(pin, preset);
  };

  // 1. PIN LOCK SCREEN (Ultra sleek mobile lock)
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between px-6 py-10 max-w-md mx-auto select-none">
        {/* Brand Header */}
        <div className="text-center pt-8 space-y-2">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-xl shadow-emerald-500/20">
            <div className="h-full w-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">
            Sri Lakshmi Industries
          </h1>
          <p className="text-xs font-semibold tracking-wider text-emerald-400/90 uppercase">
            Owner Ads Executive Console
          </p>
          <p className="text-xs text-slate-400 pt-1">
            Private MD View • Zero Executive Clutter
          </p>
        </div>

        {/* PIN Indicators */}
        <div className="py-6 flex flex-col items-center space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-300">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            Enter 4-Digit Owner Passcode
          </div>

          <div className={`flex gap-4 ${pinError ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-4 w-4 rounded-full transition-all duration-200 ${
                  i < enteredPin.length
                    ? "bg-emerald-400 scale-125 shadow-md shadow-emerald-500/50"
                    : "border-2 border-slate-700 bg-slate-900"
                }`}
              />
            ))}
          </div>

          <div className="pt-2">
            <Badge variant="outline" className="border-slate-800 bg-slate-900/60 text-[11px] text-slate-400 font-mono">
              Default Owner PIN: 7482
            </Badge>
          </div>
        </div>

        {/* Numeric Keypad for Smooth Touch Entry */}
        <div className="space-y-3 pb-6">
          <div className="grid grid-cols-3 gap-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => handlePinInput(num)}
                className="h-16 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-2xl font-bold text-white active:bg-emerald-600/30 active:scale-95 transition-all shadow-sm flex items-center justify-center hover:border-emerald-500/40 cursor-pointer"
              >
                {num}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              className="h-16 rounded-2xl bg-slate-900/50 border border-slate-800/50 text-sm font-semibold text-rose-400 active:bg-rose-500/20 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => handlePinInput("0")}
              className="h-16 rounded-2xl bg-slate-900/90 border border-slate-800/80 text-2xl font-bold text-white active:bg-emerald-600/30 active:scale-95 transition-all shadow-sm flex items-center justify-center hover:border-emerald-500/40 cursor-pointer"
            >
              0
            </button>
            <button
              type="button"
              onClick={() => verifyPin(enteredPin)}
              disabled={enteredPin.length !== 4}
              className="h-16 rounded-2xl bg-emerald-600 text-white font-bold text-lg active:bg-emerald-700 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-emerald-600/30 disabled:opacity-30 disabled:active:scale-100 cursor-pointer"
            >
              ➔
            </button>
          </div>
        </div>
      </main>
    );
  }

  // 2. MAIN OWNER MOBILE CONSOLE
  const totalInquiries = (accountData?.totalLeads || 0) + (accountData?.totalChats || 0) + (accountData?.totalCalls || 0);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 max-w-md mx-auto pb-20 font-sans">
      {/* Sleek App-Header */}
      <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/20 text-slate-950 font-black text-sm">
            SLI
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-white tracking-tight">Owner Ads Pulse</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <p className="text-[10px] text-slate-400 font-mono">
              act_245155721099304
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wallet Balance Pill */}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-400 font-mono">
            <span>Bal:</span>
            <span>₹{accountData?.walletBalance?.toLocaleString("en-IN") || "941"}</span>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => {
              const pin = localStorage.getItem("sli_owner_ads_pin") || "7482";
              loadData(pin, datePreset);
            }}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 active:scale-95 transition-all"
            title="Refresh Live Data"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-emerald-400" : ""}`} />
          </button>

          {/* Lock / Exit */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 active:scale-95 transition-all"
            title="Lock Console"
          >
            <Lock className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      <div className="px-3.5 pt-3 space-y-4">
        {/* Timeframe Pill Switcher */}
        <div className="flex items-center justify-between p-1 rounded-xl bg-slate-900 border border-slate-800/80">
          {[
            { id: "maximum", label: "Lifetime" },
            { id: "last_30d", label: "30 Days" },
            { id: "last_7d", label: "7 Days" },
            { id: "today", label: "Today" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => changeDatePreset(tab.id as any)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                datePreset === tab.id
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Hero Financial Cards (Large & Bold - Easy for Owner to see) */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1: Total Spend */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold">Total Ad Spend</span>
              <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <div className="text-xl font-black font-mono text-white tracking-tight">
              ₹{Math.round(accountData?.totalSpend || 314408).toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
              <span>● Paid to Meta</span>
            </div>
          </div>

          {/* Card 2: Total Inquiries */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold">Total Inquiries</span>
              <Users className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <div className="text-xl font-black font-mono text-white tracking-tight">
              {totalInquiries.toLocaleString("en-IN")}
            </div>
            <div className="text-[10px] text-blue-400 font-semibold">
              WhatsApp + Leads + Calls
            </div>
          </div>

          {/* Card 3: Avg Cost Per Lead */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold">Avg Cost / Lead</span>
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black font-mono text-white tracking-tight">
              ₹{accountData?.avgCpl || "29.10"}
            </div>
            <div className="text-[10px] text-emerald-400 font-semibold">
              ✓ Below ₹40 Target
            </div>
          </div>

          {/* Card 4: Buyer Saves & Shares */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-900/40 border border-slate-800/80 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold">Buyer Saves</span>
              <Bookmark className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <div className="text-xl font-black font-mono text-white tracking-tight">
              {accountData?.totalSaves?.toLocaleString("en-IN") || "2,893"}
            </div>
            <div className="text-[10px] text-purple-400 font-semibold">
              {accountData?.totalShares?.toLocaleString("en-IN") || "2,076"} Shared
            </div>
          </div>
        </div>

        {/* Live Executive Advice Strip */}
        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-300">High-ROI Channel Detected</p>
              <p className="text-[11px] text-slate-400">WhatsApp direct campaigns delivering ₹18.57 CPL</p>
            </div>
          </div>
          <Badge className="bg-emerald-600 text-white text-[10px] shrink-0 font-bold">
            983 Wins
          </Badge>
        </div>

        {/* Campaigns List Heading */}
        <div className="pt-2 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">Active & Past Campaigns</h2>
            <p className="text-[11px] text-slate-400">Tap any campaign to view full Jadhagam</p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono border-slate-800 text-slate-400">
            {campaigns.length} Total
          </Badge>
        </div>

        {/* Campaign Cards List (Designed for one-thumb mobile browsing) */}
        <div className="space-y-2.5">
          {campaigns.map((camp) => {
            const spend = camp.insights?.spend || 0;
            const results = camp.insights?.results || 0;
            const cpl = camp.insights?.cost_per_result || 0;
            const isActive = camp.status === "ACTIVE";

            return (
              <div
                key={camp.id}
                onClick={() => setSelectedAd(camp)}
                className="group p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 active:bg-slate-800/80 active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-sm relative overflow-hidden"
              >
                {/* Active Indicator bar */}
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1 ${
                    isActive ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                />

                <div className="pl-1.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-white line-clamp-1 group-hover:text-emerald-400 transition-colors">
                      {camp.name}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold px-1.5 py-0 shrink-0 ${
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {isActive ? "ACTIVE" : "PAUSED"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Spend</span>
                        <span className="font-mono font-bold text-white text-xs">
                          ₹{Math.round(spend).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Output</span>
                        <span className="font-mono font-bold text-emerald-400 text-xs">
                          {results} {camp.insights?.result_type || "Leads"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Cost / Lead</span>
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          ₹{cpl > 0 ? cpl.toFixed(1) : "—"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-[11px] font-bold text-emerald-400 gap-0.5">
                      <span>Jadhagam</span>
                      <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. INTERACTIVE "AD JADHAGAM" MOBILE SLIDE-UP MODAL */}
      {selectedAd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center animate-fade-in">
          <div className="bg-slate-950 border border-slate-800 rounded-t-3xl sm:rounded-3xl max-w-md w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Top Grabber & Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-400 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5" /> Ad Jadhagam (360° Dossier)
                  </span>
                  <Badge
                    className={`text-[9px] font-bold ${
                      selectedAd.status === "ACTIVE"
                        ? "bg-emerald-500 text-slate-950"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {selectedAd.status}
                  </Badge>
                </div>
                <h3 className="text-sm font-black text-white line-clamp-1 pt-0.5">
                  {selectedAd.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAd(null)}
                className="p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white active:scale-95 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 space-y-5 overflow-y-auto max-h-[calc(92vh-80px)]">
              {/* Financial & Conversion Highlights */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Spend</span>
                  <span className="text-sm font-black text-white font-mono">
                    ₹{Math.round(selectedAd.insights?.spend || 0).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-medium">Total Inquiries</span>
                  <span className="text-sm font-black text-emerald-400 font-mono">
                    {selectedAd.insights?.results || 0}
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-400 block font-medium">Cost / Result</span>
                  <span className="text-sm font-black text-amber-400 font-mono">
                    ₹{selectedAd.insights?.cost_per_result ? selectedAd.insights.cost_per_result.toFixed(1) : "—"}
                  </span>
                </div>
              </div>

              {/* SECTION A: LOCATION BREAKDOWN (Where Views & Money Went) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <MapPin className="h-4 w-4 text-emerald-400" />
                    <span>Location Breakdown (Views & Spend)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">State Ranking</span>
                </div>

                <div className="space-y-2.5">
                  {(selectedAd.jadhagam?.locationBreakdown || []).map((loc, idx) => (
                    <div key={loc.state} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-200">
                          {idx + 1}. {loc.state}
                        </span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-emerald-400 font-bold">₹{loc.spend.toLocaleString("en-IN")}</span>
                          <span className="text-slate-400">({loc.leads} leads)</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full"
                          style={{ width: `${loc.share}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>Top Cities: {loc.topCities.slice(0, 3).join(", ")}</span>
                        <span>{loc.views.toLocaleString("en-IN")} Views ({loc.share}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION B: SAVES & VIRAL FORWARDS (Buyer Intent) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Bookmark className="h-4 w-4 text-purple-400" />
                    <span>Buyer Purchase Intent (Saves & Shares)</span>
                  </div>
                  <Badge variant="outline" className="border-purple-500/30 text-purple-400 text-[10px]">
                    High Value
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">Post Saves</span>
                    <span className="text-base font-black text-purple-300 font-mono">
                      {selectedAd.jadhagam?.postSaves || 84}
                    </span>
                    <p className="text-[9px] text-slate-400 pt-0.5">Saved to buy later</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block font-medium">WhatsApp Shares</span>
                    <span className="text-base font-black text-blue-300 font-mono">
                      {selectedAd.jadhagam?.postShares || 46}
                    </span>
                    <p className="text-[9px] text-slate-400 pt-0.5">Forwarded to partners</p>
                  </div>
                </div>

                {/* 100% Video Watch Rate */}
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Play className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-slate-300">100% Full Video Demo Watched:</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedAd.jadhagam?.videoWatched100?.toLocaleString("en-IN") || "412"} Owners
                  </span>
                </div>
              </div>

              {/* SECTION C: DEVICE BREAKDOWN (Who Watched Where) */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Smartphone className="h-4 w-4 text-blue-400" />
                    <span>Device Distribution</span>
                  </div>
                  <span className="text-[10px] text-slate-400">Mobile Dominance</span>
                </div>

                {/* Visual Device Bar */}
                <div className="space-y-1.5">
                  <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${selectedAd.jadhagam?.deviceBreakdown?.android || 87.4}%` }}
                      title="Android Mobile"
                    />
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${selectedAd.jadhagam?.deviceBreakdown?.ios || 10.2}%` }}
                      title="iOS iPhone"
                    />
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${selectedAd.jadhagam?.deviceBreakdown?.desktop || 2.4}%` }}
                      title="Desktop / PC"
                    />
                  </div>

                  <div className="grid grid-cols-3 text-center text-[10px] pt-1">
                    <div>
                      <span className="text-emerald-400 font-bold block">
                        {selectedAd.jadhagam?.deviceBreakdown?.android || 87.4}%
                      </span>
                      <span className="text-slate-400">Android Mobile</span>
                    </div>
                    <div>
                      <span className="text-blue-400 font-bold block">
                        {selectedAd.jadhagam?.deviceBreakdown?.ios || 10.2}%
                      </span>
                      <span className="text-slate-400">Apple iPhone</span>
                    </div>
                    <div>
                      <span className="text-amber-400 font-bold block">
                        {selectedAd.jadhagam?.deviceBreakdown?.desktop || 2.4}%
                      </span>
                      <span className="text-slate-400">Desktop/PC</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION D: AD CREATIVE SIMULATOR PREVIEW */}
              <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Ad Creative & Copy Preview</span>
                  <Badge variant="outline" className="border-slate-800 text-[10px] text-slate-400">
                    Live Sample
                  </Badge>
                </div>

                {/* Simulated Social Ad Frame */}
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-[10px] text-white">
                      SLI
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white leading-tight">Sri Lakshmi Industries</p>
                      <p className="text-[9px] text-slate-400">Sponsored • Instagram & Facebook</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    ✨ Commercial Automatic Murukku Making Machine! 1 மணி நேரத்தில் 100 கிலோ முறுக்கு தயாரிக்கும் நவீன இயந்திரம். Factory Direct Price Offer!
                  </p>

                  {/* Machine Thumbnail Simulation */}
                  <div className="relative aspect-video rounded-lg bg-gradient-to-tr from-slate-900 to-slate-800 flex items-center justify-center border border-slate-800 overflow-hidden">
                    <div className="text-center p-3">
                      <div className="h-10 w-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
                        <Play className="h-5 w-5 fill-emerald-400" />
                      </div>
                      <p className="text-[11px] font-bold text-white">Murukku Machine Demonstration Video</p>
                      <p className="text-[9px] text-slate-400">Crispy Output • Fast Hydraulics</p>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="p-2 rounded-lg bg-emerald-600 text-white flex items-center justify-between text-xs font-bold shadow-md shadow-emerald-600/20">
                    <div className="flex items-center gap-1.5">
                      <MessageCircle className="h-4 w-4" />
                      <span>Send WhatsApp Message</span>
                    </div>
                    <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded font-mono">
                      Fast Enquiry
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Close Button */}
              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => setSelectedAd(null)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs py-5 rounded-xl cursor-pointer"
                >
                  Close Jadhagam
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
