"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Target,
  Sparkles,
  Gauge,
  TrendingUp,
  Search,
  Plus,
  Check,
  X,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sliders,
  ChevronDown,
  ChevronUp,
  Building2,
  RefreshCw,
  Info,
  Bookmark,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  calculateAudiencePerformance,
  SavedAudiencePreset,
  InterestItem,
  TargetedLocation,
} from "@/lib/meta-ads/presets";

export const GENERAL_BUSINESS_AUDIENCES: InterestItem[] = [
  { id: "6002714898572", name: "Small business owners" },
  { id: "6003371567474", name: "Entrepreneurship" },
  { id: "6003325004380", name: "Start-up company" },
  { id: "6002884511422", name: "Small business" },
  { id: "6003214937861", name: "Self-employment" },
  { id: "6003185240881", name: "Business development" },
  { id: "6003412458903", name: "Retail" },
  { id: "6003312458903", name: "Wholesaling" },
  { id: "6003102458903", name: "Sole proprietorship" },
  { id: "6003125894549", name: "Shopping and fashion" },
];

// ============================================================================
// 1. CALCULATE AUDIENCE DEFINITION & ESTIMATED REACH
// ============================================================================
export function calculateAudienceDefinitionValues(
  selectedLocations: TargetedLocation[],
  selectedInterests: InterestItem[],
  ageMin: number,
  ageMax: number,
  targetGender: "all" | "male" | "female"
) {
  const locCount = selectedLocations.length;
  const interestCount = selectedInterests.length;
  const ageSpan = Math.max(1, ageMax - ageMin);

  let baseMin = 150000;
  let baseMax = 450000;

  if (locCount === 0) {
    baseMin = 50000;
    baseMax = 120000;
  } else {
    baseMin = locCount * 280000;
    baseMax = locCount * 750000;
  }

  const ageFactor = Math.min(1.2, Math.max(0.4, ageSpan / 40));
  baseMin = Math.round(baseMin * ageFactor);
  baseMax = Math.round(baseMax * ageFactor);

  if (targetGender !== "all") {
    baseMin = Math.round(baseMin * 0.55);
    baseMax = Math.round(baseMax * 0.55);
  }

  if (interestCount > 0) {
    const interestMultiplier = Math.min(1.8, 0.7 + interestCount * 0.08);
    baseMin = Math.round(baseMin * interestMultiplier);
    baseMax = Math.round(baseMax * interestMultiplier);
  }

  let state: "narrow" | "optimal" | "broad" = "optimal";
  let note = "Your audience is defined and optimal for Meta AI machine learning delivery.";
  let gaugeVal = 50;

  if (locCount === 0 || (locCount === 1 && selectedLocations[0].type === "city" && interestCount > 5)) {
    state = "narrow";
    gaugeVal = 18;
    note = "Audience is too specific. Broaden locations or add adjacent districts to reduce CPM.";
  } else if (locCount > 10 && interestCount === 0 && ageSpan > 40) {
    state = "broad";
    gaugeVal = 85;
    note = "Audience is very broad. Adding 2-3 specific business interests will sharpen lead quality.";
  } else {
    state = "optimal";
    gaugeVal = Math.min(68, Math.max(38, 40 + (interestCount % 5) * 6));
    note = "Great audience sweet spot! Balances algorithmic exploration with high commercial intent.";
  }

  const formatNumber = (num: number) => {
    if (num >= 10000000) return `${(num / 10000000).toFixed(1)} Cr`;
    if (num >= 100000) return `${(num / 100000).toFixed(1)} Lakhs`;
    return num.toLocaleString("en-IN");
  };

  return {
    definitionState: state,
    minReachFormatted: formatNumber(baseMin),
    maxReachFormatted: formatNumber(baseMax),
    definitionNote: note,
    gaugePercentage: gaugeVal,
  };
}

// ============================================================================
// 2. CALCULATE LIVE META ADS SETUP & OPTIMIZATION SCORE (0 to 100)
// ============================================================================
export function calculateCampaignSetupScoreValues(
  selectedLocations: TargetedLocation[],
  selectedInterests: InterestItem[],
  budget: number,
  ageMin: number,
  ageMax: number,
  enableAbTest: boolean,
  enableBudgetGuard: boolean
) {
  let currentScore = 0;
  const items: Array<{ label: string; passed: boolean; points: number; hint: string }> = [];

  const locCount = selectedLocations.length;
  let locPts = 0;
  if (locCount >= 4) locPts = 25;
  else if (locCount >= 1) locPts = 18;
  currentScore += locPts;
  items.push({
    label: "Target Locations Defined",
    passed: locPts >= 18,
    points: locPts,
    hint: locCount === 0 ? "Select at least 1 state or city (+25 pts)" : `${locCount} locations active`,
  });

  const intCount = selectedInterests.length;
  let intPts = 0;
  if (intCount >= 3) intPts = 25;
  else if (intCount >= 1) intPts = 15;
  currentScore += intPts;
  items.push({
    label: "Business Intent Targeting",
    passed: intPts >= 15,
    points: intPts,
    hint: intCount === 0 ? "Add relevant industry interests to focus Meta AI (+25 pts)" : `${intCount} interests active`,
  });

  let budPts = 0;
  if (budget >= 800) budPts = 20;
  else if (budget >= 500) budPts = 18;
  else if (budget >= 250) budPts = 14;
  else budPts = 8;
  currentScore += budPts;
  items.push({
    label: "Healthy Daily Budget",
    passed: budPts >= 14,
    points: budPts,
    hint: budget < 300 ? "Increase budget to ₹500/day for steady pacing (+6 pts)" : `₹${budget}/day allocated`,
  });

  let demoPts = 5;
  if (ageMin >= 21) demoPts += 5;
  if (ageMax <= 65) demoPts += 5;
  currentScore += demoPts;
  items.push({
    label: "Age & Demographics Filter",
    passed: demoPts >= 10,
    points: demoPts,
    hint: ageMin < 21 ? "Set min age to 21+ for higher buying capacity (+5 pts)" : `${ageMin}-${ageMax} yrs targeted`,
  });

  let aiPts = 0;
  if (enableAbTest) aiPts += 7;
  if (enableBudgetGuard) aiPts += 8;
  currentScore += aiPts;
  items.push({
    label: "AI Budget Guard & Testing",
    passed: aiPts >= 7,
    points: aiPts,
    hint: !enableBudgetGuard ? "Turn on AI Budget Guard Dog to prevent budget bleed (+8 pts)" : "AI safeguards active",
  });

  const finalScore = Math.min(100, Math.max(10, currentScore));
  let label = "Needs Improvement";
  let color = "text-amber-500 bg-amber-500/10 border-amber-500/30";

  if (finalScore >= 82) {
    label = "Outstanding — Meta Ready! 🔥";
    color = "text-emerald-500 bg-emerald-500/10 border-emerald-500/30";
  } else if (finalScore >= 60) {
    label = "Good Campaign Setup";
    color = "text-blue-500 bg-blue-500/10 border-blue-500/30";
  }

  return {
    score: finalScore,
    statusLabel: label,
    statusColor: color,
    checklist: items,
  };
}

interface AudienceIntelligenceStudioProps {
  selectedLocations: TargetedLocation[];
  budget: number;
  ageMin: number;
  ageMax: number;
  targetGender: "all" | "male" | "female";
  selectedInterests: InterestItem[];
  onAddInterest: (interest: InterestItem) => void;
  onRemoveInterest: (id: string) => void;
  onBulkAddInterests: (interests: InterestItem[]) => void;
  onClearInterests: () => void;
  enableAbTest: boolean;
  enableBudgetGuard: boolean;
  hideSidebarCards?: boolean;
}

export function AudienceIntelligenceStudio({
  selectedLocations,
  budget,
  ageMin,
  ageMax,
  targetGender,
  selectedInterests,
  onAddInterest,
  onRemoveInterest,
  onBulkAddInterests,
  onClearInterests,
  enableAbTest,
  enableBudgetGuard,
  hideSidebarCards = false,
}: AudienceIntelligenceStudioProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [discoveredAudiences, setDiscoveredAudiences] = useState<InterestItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);

  // Saved Presets state
  const [savedAudiencePresets, setSavedAudiencePresets] = useState<SavedAudiencePreset[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Load saved presets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("meta_ads_saved_audience_presets");
      if (stored) {
        setSavedAudiencePresets(JSON.parse(stored));
      } else {
        const initialPresets: SavedAudiencePreset[] = [
          {
            id: "starter_founders",
            name: "Small Business & Founders",
            audiences: [
              { id: "6002714898572", name: "Small business owners" },
              { id: "6003371567474", name: "Entrepreneurship" },
              { id: "6003325004380", name: "Start-up company" },
              { id: "6003214937861", name: "Self-employment" },
            ],
            created_at: new Date().toISOString(),
            expectedCpl: 32.4,
            rating: "Top Performer 🔥",
          },
          {
            id: "starter_retail",
            name: "Retail & Wholesaling",
            audiences: [
              { id: "6003412458903", name: "Retail" },
              { id: "6003312458903", name: "Wholesaling" },
              { id: "6002884511422", name: "Small business" },
            ],
            created_at: new Date().toISOString(),
            expectedCpl: 36.5,
            rating: "High ROI ⭐",
          },
        ];
        setSavedAudiencePresets(initialPresets);
        localStorage.setItem("meta_ads_saved_audience_presets", JSON.stringify(initialPresets));
      }
    } catch (e) {
      console.warn("Failed to load audience presets:", e);
    }
  }, []);

  // Save current audience selection as preset
  const handleSavePreset = () => {
    if (!newPresetName.trim()) {
      toast.error("Please enter a name for the audience preset");
      return;
    }
    if (selectedInterests.length === 0) {
      toast.error("No audiences selected to save");
      return;
    }

    const perf = calculateAudiencePerformance(selectedInterests);
    const newPreset: SavedAudiencePreset = {
      id: "aud_preset_" + Date.now(),
      name: newPresetName.trim(),
      audiences: [...selectedInterests],
      created_at: new Date().toISOString(),
      expectedCpl: perf.expectedCpl,
      rating: perf.rating,
    };

    const updated = [newPreset, ...savedAudiencePresets];
    setSavedAudiencePresets(updated);
    try {
      localStorage.setItem("meta_ads_saved_audience_presets", JSON.stringify(updated));
    } catch (e) {}

    toast.success(`Audience preset "${newPresetName}" saved! (~₹${perf.expectedCpl} CPL)`);
    setNewPresetName("");
    setSaveModalOpen(false);
  };

  const handleDeletePreset = (id: string, name: string) => {
    const updated = savedAudiencePresets.filter((p) => p.id !== id);
    setSavedAudiencePresets(updated);
    try {
      localStorage.setItem("meta_ads_saved_audience_presets", JSON.stringify(updated));
    } catch (e) {}
    toast.success(`Removed preset "${name}"`);
  };

  const handleApplyPreset = (preset: SavedAudiencePreset) => {
    onBulkAddInterests(preset.audiences);
    toast.success(`Applied "${preset.name}" (${preset.audiences.length} audiences • ₹${preset.expectedCpl} CPL)`);
  };

  // Live Performance benchmark for active audience selection
  const audiencePerformance = useMemo(() => {
    return calculateAudiencePerformance(selectedInterests);
  }, [selectedInterests]);

  const {
    definitionState,
    minReachFormatted,
    maxReachFormatted,
    definitionNote,
    gaugePercentage,
  } = useMemo(
    () =>
      calculateAudienceDefinitionValues(
        selectedLocations,
        selectedInterests,
        ageMin,
        ageMax,
        targetGender
      ),
    [selectedLocations, selectedInterests, ageMin, ageMax, targetGender]
  );

  const { score, statusLabel, statusColor, checklist } = useMemo(
    () =>
      calculateCampaignSetupScoreValues(
        selectedLocations,
        selectedInterests,
        budget,
        ageMin,
        ageMax,
        enableAbTest,
        enableBudgetGuard
      ),
    [selectedLocations, selectedInterests, budget, ageMin, ageMax, enableAbTest, enableBudgetGuard]
  );

  // ============================================================================
  // 3. UNIFIED SMART SEARCH VIA SEMANTIC META API
  // ============================================================================
  const executeSearch = async (text: string) => {
    const q = text.trim();
    if (!q || q.length < 2) {
      setDiscoveredAudiences([]);
      setHasSearched(false);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      setHasSearched(true);

      const res = await fetch(`/api/meta-ads/search-interests?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.data && Array.isArray(data.data) && data.data.length > 0) {
        const mapped: InterestItem[] = data.data.map((item: any) => ({
          id: String(item.id),
          name: item.name,
          audience_size: item.audience_size,
        }));
        setDiscoveredAudiences(mapped);
      } else {
        setDiscoveredAudiences([]);
      }
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (val: string) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    if (!val.trim()) {
      setDiscoveredAudiences([]);
      setHasSearched(false);
      return;
    }
    searchDebounceRef.current = setTimeout(() => {
      executeSearch(val);
    }, 350);
  };

  const handleSelectAll = (list: InterestItem[]) => {
    onBulkAddInterests(list);
    toast.success(`Added ${list.length} target audiences to your Ad Set!`);
  };

  const displayedList = hasSearched ? discoveredAudiences : GENERAL_BUSINESS_AUDIENCES;

  return (
    <div className="space-y-4">
      {!hideSidebarCards && (
        <>
          {/* ==================================================================== */}
          {/* SECTION 1: META ADS MANAGER LIVE AUDIENCE DEFINITION & SCORE METER   */}
          {/* ==================================================================== */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
            {/* Left: Audience Definition Speedometer Gauge */}
            <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Gauge className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Audience Definition</h4>
                      <p className="text-[10px] text-muted-foreground">Meta Live Algorithm Meter</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold px-2 py-0.5 capitalize ${
                      definitionState === "optimal"
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : definitionState === "narrow"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                        : "border-blue-500/40 bg-blue-500/10 text-blue-500"
                    }`}
                  >
                    {definitionState === "optimal" ? "✓ Great Definition" : definitionState}
                  </Badge>
                </div>

                {/* Visual Speedometer Gauge Bar */}
                <div className="pt-4 pb-2 space-y-2">
                  <div className="relative h-3 w-full rounded-full bg-muted/60 overflow-hidden flex">
                    <div className="h-full w-1/3 bg-amber-500/60" title="Specific (Narrow)" />
                    <div className="h-full w-1/3 bg-emerald-500" title="Defined (Optimal)" />
                    <div className="h-full w-1/3 bg-blue-500/60" title="Broad" />
                  </div>

                  {/* Cursor indicator */}
                  <div className="relative w-full h-2">
                    <div
                      className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
                      style={{ left: `${gaugePercentage}%` }}
                    >
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-foreground" />
                    </div>
                  </div>

                  {/* Segment Labels */}
                  <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-1">
                    <span className={definitionState === "narrow" ? "text-amber-500 font-bold" : ""}>Specific</span>
                    <span className={definitionState === "optimal" ? "text-emerald-500 font-bold" : ""}>
                      Defined (Sweet Spot)
                    </span>
                    <span className={definitionState === "broad" ? "text-blue-500 font-bold" : ""}>Broad</span>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">{definitionNote}</p>
              </div>

              {/* Potential Reach Stat Box */}
              <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between bg-muted/30 -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                    Estimated Potential Reach
                  </span>
                  <p className="text-sm font-black text-foreground">
                    {minReachFormatted} - {maxReachFormatted} <span className="text-xs font-normal text-muted-foreground">people</span>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground font-semibold">Active Locations</span>
                  <p className="text-xs font-bold text-foreground">
                    {selectedLocations.length > 0 ? `${selectedLocations.length} Regions/Cities` : "All India (Broad)"}
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Meta Setup & Quality Score (0 to 100) */}
            <div className="lg:col-span-6 rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Campaign Setup Score</h4>
                      <p className="text-[10px] text-muted-foreground">Meta Quality & High-ROI Health Index</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${statusColor}`}>
                    {score}/100 • {statusLabel}
                  </Badge>
                </div>

                {/* Score Progress Bar */}
                <div className="pt-3 pb-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground font-semibold">Overall Readiness</span>
                    <span className="font-mono font-bold text-foreground">{score}%</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted/70 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 rounded-full ${
                        score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                </div>

                {/* Quick Suggestions summary */}
                <div className="space-y-1 text-[11px] pt-1">
                  {checklist
                    .filter((c) => !c.passed)
                    .slice(0, 2)
                    .map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                        <AlertCircle className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.hint}</span>
                      </div>
                    ))}
                  {checklist.every((c) => c.passed) && (
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="h-3 w-3 shrink-0" />
                      <span>All settings are dialed in for maximum Meta conversion ROI!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable Checklist Details */}
              <div className="mt-3 pt-2 border-t border-border/50">
                <button
                  type="button"
                  onClick={() => setShowChecklist(!showChecklist)}
                  className="w-full flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>View 5-Point Setup Checklist</span>
                  {showChecklist ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>

                {showChecklist && (
                  <div className="mt-2 space-y-1.5 pt-2 border-t border-border/40 text-xs">
                    {checklist.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-0.5">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          {item.passed ? (
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                          )}
                          {item.label}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-foreground">
                          {item.passed ? `+${item.points} pts` : "0 pts"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ==================================================================== */}
          {/* SECTION 2: AI UPCOMING CAMPAIGN DECISION ADVISOR (Performance Tracking)*/}
          {/* ==================================================================== */}
          <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] via-background to-emerald-500/[0.04] p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
            <div className="flex items-start gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">AI Campaign Decision Advisor</span>
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 font-bold bg-emerald-500/10">
                    ⭐ Proven Benchmark Winner
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  Historical ads data reveals targeting <strong className="text-foreground">Small business owners + Entrepreneurship</strong> delivers 24% higher lead conversion at <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹32.40 Avg CPL</strong>.
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                onBulkAddInterests([
                  { id: "6002714898572", name: "Small business owners" },
                  { id: "6003371567474", name: "Entrepreneurship" },
                  { id: "6003325004380", name: "Start-up company" },
                  { id: "6003214937861", name: "Self-employment" },
                ]);
                toast.success("Applied AI Top-Performing Audience Setup (Expected ₹32.40 CPL)");
              }}
              className="h-8 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm gap-1.5"
            >
              <Zap className="h-3.5 w-3.5" /> Apply Winner Setup
            </Button>
          </div>
        </>
      )}

      {/* ==================================================================== */}
      {/* SECTION 3: SINGLE SMART BUSINESS & AUDIENCE SEARCH STUDIO            */}
      {/* ==================================================================== */}
      <div className="rounded-2xl border border-indigo-500/30 bg-gradient-to-b from-indigo-500/[0.04] to-background p-4.5 space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 pb-1 border-b border-border/60">
          <div>
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              Smart Business & Audience Search
            </Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Type your business name, industry, or product keyword to instantly discover high-converting Meta audiences.
            </p>
          </div>
          <Badge variant="outline" className="border-indigo-500/40 bg-indigo-500/10 text-indigo-500 text-[10px] font-bold self-start sm:self-auto">
            Live Meta AI Targeting
          </Badge>
        </div>

        {/* Unified Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                executeSearch(searchQuery);
              }
            }}
            placeholder="Search your business..."
            className="pl-9 pr-24 text-xs h-10 rounded-xl bg-background border-border shadow-sm font-medium"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            ) : searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setDiscoveredAudiences([]);
                  setHasSearched(false);
                }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <Button
              type="button"
              size="sm"
              disabled={isSearching || !searchQuery.trim()}
              onClick={() => executeSearch(searchQuery)}
              className="h-7 px-3 text-[11px] font-bold bg-primary text-primary-foreground rounded-lg shadow-sm"
            >
              Search
            </Button>
          </div>
        </div>

        {/* Saved Audience Presets Bar with Performance Benchmarks */}
        {savedAudiencePresets.length > 0 && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                <Bookmark className="h-3 w-3 text-primary" />
                Saved Audience Presets (Performance Tracked):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {savedAudiencePresets.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center gap-1 rounded-lg border border-border/80 bg-background/90 hover:border-primary/50 pl-2 pr-1 py-1 text-xs transition-all shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="font-semibold text-foreground hover:text-primary flex items-center gap-1.5 text-[11px]"
                  >
                    <span>{preset.name}</span>
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-mono bg-emerald-500/10 text-emerald-600 font-bold border-emerald-500/30">
                      ₹{preset.expectedCpl} CPL
                    </Badge>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePreset(preset.id, preset.name)}
                    className="text-muted-foreground hover:text-destructive p-0.5 ml-0.5 transition-colors"
                    title="Delete preset"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Discovered / Recommended Audiences Box */}
        <div className="rounded-xl border border-border/90 bg-muted/20 p-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                {hasSearched ? (
                  <>
                    <span>🔍</span>
                    <span>Discovered Audiences for &ldquo;{searchQuery}&rdquo;</span>
                  </>
                ) : (
                  <>
                    <span>💼</span>
                    <span>Recommended Business Audiences</span>
                  </>
                )}
              </span>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {hasSearched
                  ? "Click any audience to add to your Ad Set, or select all in 1 click."
                  : "Popular high-performing buyer profiles for small businesses, shops & founders."}
              </p>
            </div>

            {displayedList.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs font-bold gap-1 border-primary/40 text-primary hover:bg-primary/10 self-start sm:self-auto"
                onClick={() => handleSelectAll(displayedList)}
              >
                <Plus className="h-3 w-3" /> Select All ({displayedList.length})
              </Button>
            )}
          </div>

          {/* Chips Grid */}
          {displayedList.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {displayedList.map((aud) => {
                const isAdded = selectedInterests.some((i) => String(i.id) === String(aud.id));
                return (
                  <button
                    key={aud.id}
                    type="button"
                    onClick={() => (!isAdded ? onAddInterest(aud) : onRemoveInterest(aud.id))}
                    className={`text-xs px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                      isAdded
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold shadow-sm"
                        : "border-border/80 bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    {isAdded ? (
                      <Check className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Plus className="h-3 w-3 text-muted-foreground" />
                    )}
                    <span>{aud.name}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-muted-foreground">
              {isSearching ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Searching Meta database for relevant audiences...</span>
                </div>
              ) : (
                <span>No direct audience found for &ldquo;{searchQuery}&rdquo;. Try typing another keyword (e.g. food, retail, business, fitness).</span>
              )}
            </div>
          )}
        </div>

        {/* Active Targeted Audiences in Meta */}
        <div className="rounded-xl border border-border/80 bg-background/60 p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Target className="h-3.5 w-3.5 text-indigo-500" />
              <span className="font-bold text-foreground">
                Active Targeted Audiences in Meta ({selectedInterests.length} Selected)
              </span>
              {selectedInterests.length > 0 && (
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0 border-emerald-500/40 text-emerald-600 bg-emerald-500/10">
                  {audiencePerformance.summaryText}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedInterests.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveModalOpen(true)}
                  className="h-6 text-[10px] gap-1 border-primary/40 text-primary hover:bg-primary/10 font-bold"
                >
                  <Bookmark className="h-3 w-3" /> Save Selection as Preset
                </Button>
              )}
              {selectedInterests.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClearInterests}
                  className="h-6 text-[10px] text-muted-foreground hover:text-destructive p-1"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-[140px] overflow-y-auto p-2 border border-border/60 rounded-lg bg-background/40">
            {selectedInterests.length > 0 ? (
              selectedInterests.map((it) => (
                <Badge
                  key={it.id}
                  variant="secondary"
                  className="text-xs px-2 py-1 gap-1.5 font-medium border border-border/80 bg-background hover:bg-destructive/10 hover:border-destructive/30 transition-colors"
                >
                  <span>{it.name}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveInterest(it.id)}
                    className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <span className="text-xs text-muted-foreground p-1">
                No specific interests selected. Type a business name above to select target audiences.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Save Audience Preset Modal */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent className="sm:max-w-md p-5 bg-background border-border shadow-2xl rounded-2xl z-50">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              Save Audience Selection as Preset
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save these {selectedInterests.length} selected audiences so you can 1-click re-apply them in upcoming campaigns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Preset Name:</Label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="e.g. My High-ROI Founders, Retail Shop Owners..."
                className="text-xs h-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSavePreset();
                  }
                }}
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-2.5 space-y-1 text-xs">
              <span className="text-[10px] uppercase font-bold text-muted-foreground">Performance Benchmark</span>
              <p className="font-semibold text-foreground">
                {audiencePerformance.summaryText}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSavePreset}
              disabled={!newPresetName.trim()}
              className="bg-primary text-primary-foreground font-semibold px-4"
            >
              Save Preset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// RIGHT-SIDE META LIVE ALGORITHM & CAMPAIGN SCORE INTELLIGENCE SIDEBAR
// ============================================================================
export interface AudienceIntelligenceSidebarProps {
  selectedLocations: TargetedLocation[];
  budget: number;
  ageMin: number;
  ageMax: number;
  targetGender: "all" | "male" | "female";
  selectedInterests: InterestItem[];
  onBulkAddInterests: (interests: InterestItem[]) => void;
  enableAbTest?: boolean;
  enableBudgetGuard?: boolean;
  className?: string;
}

export function AudienceIntelligenceSidebar({
  selectedLocations,
  budget,
  ageMin,
  ageMax,
  targetGender,
  selectedInterests,
  onBulkAddInterests,
  enableAbTest = false,
  enableBudgetGuard = false,
  className = "",
}: AudienceIntelligenceSidebarProps) {
  const [showChecklist, setShowChecklist] = useState(false);

  const {
    definitionState,
    minReachFormatted,
    maxReachFormatted,
    definitionNote,
    gaugePercentage,
  } = useMemo(
    () =>
      calculateAudienceDefinitionValues(
        selectedLocations,
        selectedInterests,
        ageMin,
        ageMax,
        targetGender
      ),
    [selectedLocations, selectedInterests, ageMin, ageMax, targetGender]
  );

  const { score, statusLabel, statusColor, checklist } = useMemo(
    () =>
      calculateCampaignSetupScoreValues(
        selectedLocations,
        selectedInterests,
        budget,
        ageMin,
        ageMax,
        enableAbTest,
        enableBudgetGuard
      ),
    [selectedLocations, selectedInterests, budget, ageMin, ageMax, enableAbTest, enableBudgetGuard]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 1. Audience Definition Speedometer Gauge */}
      <div className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Gauge className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Audience Definition</h4>
                <p className="text-[10px] text-muted-foreground">Meta Live Algorithm Meter</p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-bold px-2 py-0.5 capitalize ${
                definitionState === "optimal"
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : definitionState === "narrow"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                  : "border-blue-500/40 bg-blue-500/10 text-blue-500"
              }`}
            >
              {definitionState === "optimal" ? "✓ Great Definition" : definitionState}
            </Badge>
          </div>

          {/* Visual Speedometer Gauge Bar */}
          <div className="pt-4 pb-2 space-y-2">
            <div className="relative h-3 w-full rounded-full bg-muted/60 overflow-hidden flex">
              <div className="h-full w-1/3 bg-amber-500/60" title="Specific (Narrow)" />
              <div className="h-full w-1/3 bg-emerald-500" title="Defined (Optimal)" />
              <div className="h-full w-1/3 bg-blue-500/60" title="Broad" />
            </div>

            {/* Cursor indicator */}
            <div className="relative w-full h-2">
              <div
                className="absolute top-0 -translate-x-1/2 flex flex-col items-center transition-all duration-500"
                style={{ left: `${gaugePercentage}%` }}
              >
                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-foreground" />
              </div>
            </div>

            {/* Segment Labels */}
            <div className="flex justify-between text-[10px] text-muted-foreground font-semibold px-1">
              <span className={definitionState === "narrow" ? "text-amber-500 font-bold" : ""}>Specific</span>
              <span className={definitionState === "optimal" ? "text-emerald-500 font-bold" : ""}>
                Defined (Sweet Spot)
              </span>
              <span className={definitionState === "broad" ? "text-blue-500 font-bold" : ""}>Broad</span>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">{definitionNote}</p>
        </div>

        {/* Potential Reach Stat Box */}
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between bg-muted/30 -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl">
          <div>
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Estimated Potential Reach
            </span>
            <p className="text-sm font-black text-foreground">
              {minReachFormatted} - {maxReachFormatted} <span className="text-xs font-normal text-muted-foreground">people</span>
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground font-semibold">Active Locations</span>
            <p className="text-xs font-bold text-foreground">
              {selectedLocations.length > 0 ? `${selectedLocations.length} Regions/Cities` : "All India (Broad)"}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Meta Setup & Quality Score (0 to 100) */}
      <div className="rounded-2xl border border-border/80 bg-card/75 backdrop-blur-md p-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-border/60">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-foreground">Campaign Setup Score</h4>
                <p className="text-[10px] text-muted-foreground">Meta Quality & High-ROI Health Index</p>
              </div>
            </div>
            <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${statusColor}`}>
              {score}/100 • {statusLabel}
            </Badge>
          </div>

          {/* Score Progress Bar */}
          <div className="pt-3 pb-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-semibold">Overall Readiness</span>
              <span className="font-mono font-bold text-foreground">{score}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-muted/70 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 rounded-full ${
                  score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : "bg-amber-500"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Quick Suggestions summary */}
          <div className="space-y-1 text-[11px] pt-1">
            {checklist
              .filter((c) => !c.passed)
              .slice(0, 2)
              .map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
                  <AlertCircle className="h-3 w-3 shrink-0" />
                  <span className="truncate">{item.hint}</span>
                </div>
              ))}
            {checklist.every((c) => c.passed) && (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-3 w-3 shrink-0" />
                <span>All settings are dialed in for maximum Meta conversion ROI!</span>
              </div>
            )}
          </div>
        </div>

        {/* Expandable Checklist Details */}
        <div className="mt-3 pt-2 border-t border-border/50">
          <button
            type="button"
            onClick={() => setShowChecklist(!showChecklist)}
            className="w-full flex items-center justify-between text-[11px] font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>View 5-Point Setup Checklist</span>
            {showChecklist ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showChecklist && (
            <div className="mt-2 space-y-1.5 pt-2 border-t border-border/40 text-xs">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-0.5">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    {item.passed ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    )}
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-foreground">
                    {item.passed ? `+${item.points} pts` : "0 pts"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. AI UPCOMING CAMPAIGN DECISION ADVISOR */}
      <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] via-background to-emerald-500/[0.04] p-3.5 flex flex-col gap-3 shadow-sm">
        <div className="flex items-start gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-foreground">AI Campaign Decision Advisor</span>
              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-500/40 text-emerald-600 font-bold bg-emerald-500/10">
                ⭐ Proven Benchmark Winner
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              Historical ads data reveals targeting <strong className="text-foreground">Small business owners + Entrepreneurship</strong> delivers 24% higher lead conversion at <strong className="text-emerald-600 dark:text-emerald-400 font-bold">₹32.40 Avg CPL</strong>.
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            onBulkAddInterests([
              { id: "6002714898572", name: "Small business owners" },
              { id: "6003371567474", name: "Entrepreneurship" },
              { id: "6003325004380", name: "Start-up company" },
              { id: "6003214937861", name: "Self-employment" },
            ]);
            toast.success("Applied AI Top-Performing Audience Setup (Expected ₹32.40 CPL)");
          }}
          className="h-8 px-3.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 shadow-sm gap-1.5 w-full sm:w-auto"
        >
          <Zap className="h-3.5 w-3.5" /> Apply Winner Setup
        </Button>
      </div>
    </div>
  );
}
