"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  BarChart3,
  Smartphone,
  ShieldAlert,
  Play,
  Pause,
  RefreshCw,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  Clock,
  MapPin,
  Users,
  Video,
  Bookmark,
  Share2,
  Wallet,
  Settings,
  ChevronRight,
  Folder,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Globe,
  Search,
  Plus,
  X,
  Loader2,
  ListPlus,
  Target,
  Eye,
  Sliders,
  Check,
  Send,
  MessageCircle,
  FileText,
  DollarSign,
  Key,
  PhoneCall,
  Zap,
  UploadCloud,
  Image as ImageIcon,
  Film,
  Trash2,
  PlayCircle,
  LayoutGrid,
  Monitor,
  Maximize2,
  Minimize2,
  Heart,
  MessageSquare,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";
import type { MetaReportBundle, MetaCampaign } from "@/lib/meta-ads/types";
import { PRESET_MURUKKU_COPIES } from "@/lib/meta-ads/policy-linter";
import { cn } from "@/lib/utils";
import { LeadFormBuilderModal } from "@/components/meta-ads/LeadFormBuilderModal";
import { CampaignInspectorModal } from "@/components/meta-ads/CampaignInspectorModal";
import { CampaignLeadsModal } from "@/components/meta-ads/CampaignLeadsModal";
import { AudienceIntelligenceStudio, AudienceIntelligenceSidebar } from "@/components/meta-ads/AudienceIntelligenceStudio";
import { GoogleAdsStudio } from "@/components/google-ads/GoogleAdsStudio";
import { InfoTip } from "@/components/ui/info-tip";
import {
  calculateLocationPerformance,
  DEFAULT_LOCATION_PRESETS,
  SavedLocationPreset,
} from "@/lib/meta-ads/presets";

interface TargetedLocation {
  key: string;
  name: string;
  type: "region" | "city" | "neighborhood" | "country";
  region?: string;
  country_code?: string;
}

const AVAILABLE_STATES: TargetedLocation[] = [
  { key: "1744", name: "Tamil Nadu", type: "region", country_code: "IN" },
  { key: "1733", name: "Kerala", type: "region", country_code: "IN" },
  { key: "1738", name: "Karnataka", type: "region", country_code: "IN" },
  { key: "1724", name: "Andhra Pradesh", type: "region", country_code: "IN" },
  { key: "4100", name: "Telangana", type: "region", country_code: "IN" },
  { key: "1735", name: "Maharashtra", type: "region", country_code: "IN" },
  { key: "1729", name: "Gujarat", type: "region", country_code: "IN" },
  { key: "1728", name: "Delhi", type: "region", country_code: "IN" },
  { key: "1754", name: "Uttar Pradesh", type: "region", country_code: "IN" },
  { key: "1743", name: "Rajasthan", type: "region", country_code: "IN" },
  { key: "1742", name: "Punjab", type: "region", country_code: "IN" },
  { key: "1753", name: "Madhya Pradesh", type: "region", country_code: "IN" },
  { key: "1740", name: "Odisha", type: "region", country_code: "IN" },
  { key: "1755", name: "West Bengal", type: "region", country_code: "IN" },
];

const RECOMMENDED_AUDIENCES = [
  { id: "6003285729941", name: "Food processing" },
  { id: "6003012404681", name: "Bakery (baked goods)" },
  { id: "6003531402198", name: "Snack food" },
  { id: "6002714898572", name: "Small business owners" },
  { id: "6002925641321", name: "South Indian cuisine" },
  { id: "6003012400881", name: "Factory (manufacturing)" },
  { id: "6003462518903", name: "Packaging and labelling" },
  { id: "6003195973898", name: "Catering" },
  { id: "6003126294549", name: "Potato chip" },
  { id: "6003272376810", name: "Food industry" },
  { id: "6003214937861", name: "Self-employment" },
  { id: "6003325004380", name: "Start-up company" },
];

export default function MetaAdsStudioPage() {
  const [adChannel, setAdChannel] = useState<"meta" | "google">("meta");
  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<MetaReportBundle | null>(null);
  const [activeTab, setActiveTab] = useState("launcher");
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ch = params.get("channel");
      if (ch === "google" || ch === "meta") {
        setAdChannel(ch);
      }
    }
  }, []);

  // Inspector state
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaignName, setSelectedCampaignName] = useState<string>("");
  const [selectedCampaignStatus, setSelectedCampaignStatus] = useState<string>("ACTIVE");
  const [selectedCampaignInsights, setSelectedCampaignInsights] = useState<any>(null);
  const [inspectorInitialLevel, setInspectorInitialLevel] = useState<"campaign" | "adset" | "ad" | "summary" | "jadhagam">("campaign");

  const handleOpenInspector = (camp: MetaCampaign, initialTab: "campaign" | "summary" | "jadhagam" = "campaign") => {
    setSelectedCampaignId(camp.id);
    setSelectedCampaignName(camp.name);
    setSelectedCampaignStatus(camp.status);
    setSelectedCampaignInsights(camp.insights);
    setInspectorInitialLevel(initialTab);
    setInspectorOpen(true);
  };

  // Leads Viewer Modal state
  const [leadsModalOpen, setLeadsModalOpen] = useState(false);
  const [selectedCampaignForLeads, setSelectedCampaignForLeads] = useState<MetaCampaign | null>(null);

  const handleOpenLeads = (camp: MetaCampaign) => {
    setSelectedCampaignForLeads(camp);
    setLeadsModalOpen(true);
  };

  // Settings / Token state
  const [tokenInput, setTokenInput] = useState("");
  const [savingToken, setSavingToken] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  // Launcher state
  const [launcherStep, setLauncherStep] = useState<"campaign" | "adset" | "creative">("campaign");
  const [launchMode, setLaunchMode] = useState<"quick_wizard" | "guided_pro" | "retargeting">("quick_wizard");
  const [objective, setObjective] = useState<"CLICK_TO_WHATSAPP" | "INSTANT_LEAD_FORM" | "CLICK_TO_CALL">("CLICK_TO_WHATSAPP");
  const [cluster, setCluster] = useState<"tamil_nadu_kerala" | "north_hindi_belt" | "telugu_south">("tamil_nadu_kerala");
  const [budget, setBudget] = useState(800);
  const [launchStatus, setLaunchStatus] = useState<"PAUSED" | "ACTIVE">("PAUSED");
  const [enableAbTest, setEnableAbTest] = useState(false);
  const [enableBudgetGuard, setEnableBudgetGuard] = useState(true);
  const [campaignName, setCampaignName] = useState("Commercial Murukku Machine - Growth 2026");
  const [adHeadline, setAdHeadline] = useState(PRESET_MURUKKU_COPIES.tamil_pas.headline);
  const [adPrimaryText, setAdPrimaryText] = useState(PRESET_MURUKKU_COPIES.tamil_pas.primaryText);
  const [launching, setLaunching] = useState(false);

  // Ad Set Rich Controls (Matching Screenshot 2 / Campaign Inspector)
  const [adsetName, setAdsetName] = useState("Sri Lakshmi Murukku Leads Ad Set");
  const [adsetStatus, setAdsetStatus] = useState<"ACTIVE" | "PAUSED">("ACTIVE");
  const [selectedLocations, setSelectedLocations] = useState<TargetedLocation[]>([
    { key: "1744", name: "Tamil Nadu", type: "region", country_code: "IN" },
    { key: "1733", name: "Kerala", type: "region", country_code: "IN" },
    { key: "1738", name: "Karnataka", type: "region", country_code: "IN" },
    { key: "1724", name: "Andhra Pradesh", type: "region", country_code: "IN" },
    { key: "4100", name: "Telangana", type: "region", country_code: "IN" },
    { key: "1735", name: "Maharashtra", type: "region", country_code: "IN" },
  ]);
  const [excludedLocations, setExcludedLocations] = useState<TargetedLocation[]>([]);
  const [locationMode, setLocationMode] = useState<"include" | "exclude">("include");
  const [locationSearchQuery, setLocationSearchQuery] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState<any[]>([]);
  const [isSearchingLocations, setIsSearchingLocations] = useState(false);

  // Saved Location Presets state (Performance Tracked)
  const [savedLocationPresets, setSavedLocationPresets] = useState<SavedLocationPreset[]>([]);
  const [saveLocationModalOpen, setSaveLocationModalOpen] = useState(false);
  const [newLocationPresetName, setNewLocationPresetName] = useState("");

  // Bulk Location Modal state
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkLocationType, setBulkLocationType] = useState<"regions" | "cities">("regions");
  const [bulkInputText, setBulkInputText] = useState("");
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Audience & Demographics state
  const [ageMin, setAgeMin] = useState(21);
  const [ageMax, setAgeMax] = useState(55);
  const [targetGender, setTargetGender] = useState<"male" | "all">("male");
  const [selectedInterests, setSelectedInterests] = useState<{ id: string; name: string }[]>([
    { id: "6003285729941", name: "Food processing" },
    { id: "6003012404681", name: "Bakery (baked goods)" },
    { id: "6003531402198", name: "Snack food" },
    { id: "6002714898572", name: "Small business owners" },
  ]);
  const [interestSearchQuery, setInterestSearchQuery] = useState("");
  const [interestSearchResults, setInterestSearchResults] = useState<any[]>([]);
  const [isSearchingInterests, setIsSearchingInterests] = useState(false);

  // Destination & Phone Routing state
  const [whatsappNumber, setWhatsappNumber] = useState("+91 99439 72999");
  const [callNumber, setCallNumber] = useState("+91 99439 72999");

  // Lead Form Studio state
  const [leadFormMode, setLeadFormMode] = useState<"existing" | "new">("existing");
  const [existingFormId, setExistingFormId] = useState("1947142303323073");
  const [formTitle, setFormTitle] = useState("Sri Lakshmi Murukku Machine Qualification Form");
  const [completionCta, setCompletionCta] = useState<"whatsapp" | "call" | "website">("whatsapp");
  const [formQuestions, setFormQuestions] = useState({
    namePhone: true,
    stateDistrict: true,
    businessType: true,
    outputCapacity: true,
  });
  const [leadFormBuilderOpen, setLeadFormBuilderOpen] = useState(false);
  const [leadFormsList, setLeadFormsList] = useState<any[]>([]);
  const [selectedLeadForm, setSelectedLeadForm] = useState<any>(null);

  // Media Creative Upload & Picker state
  const [mediaType, setMediaType] = useState<"video" | "image">("video");
  const [mediaSource, setMediaSource] = useState<"upload" | "preset" | "url">("upload");
  const [mediaUrl, setMediaUrl] = useState<string>("");
  const [mediaFilename, setMediaFilename] = useState<string>("");
  const [mediaFileSize, setMediaFileSize] = useState<string>("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Policy linter state
  const [lintResult, setLintResult] = useState<any>(null);
  const [linting, setLinting] = useState(false);

  // Multi-placement aspect ratio preview state (Resolves Screenshot 4: 9:16 vs 1:1 vs 16:9)
  const [previewPlacement, setPreviewPlacement] = useState<"9_16" | "1_1" | "16_9">("9_16");
  const [advancedPlacementModalOpen, setAdvancedPlacementModalOpen] = useState(false);
  const [advancedModalFilter, setAdvancedModalFilter] = useState<"all" | "feeds" | "stories_reels" | "stream">("all");
  const [isFullscreenPreview, setIsFullscreenPreview] = useState(false);

  // Creative safe-zone simulator state
  const [safeZoneFormat, setSafeZoneFormat] = useState<"9_16" | "1_1">("9_16");
  const [videoChecklist, setVideoChecklist] = useState({
    hook: true,
    material: true,
    capacity: true,
    roi: true,
    cta: true,
  });

  const [datePreset, setDatePreset] = useState<string>("maximum");

  const getPresetLabel = (preset: string) => {
    switch (preset) {
      case "maximum": return "Lifetime";
      case "last_30d": return "30-Day";
      case "this_month": return "This Month";
      case "last_month": return "Last Month";
      case "last_14d": return "14-Day";
      case "last_7d": return "7-Day";
      case "today": return "Today's";
      case "yesterday": return "Yesterday's";
      default: return "Selected Range";
    }
  };

  const fetchInsights = async (preset?: string) => {
    try {
      setSyncing(true);
      const activePreset = typeof preset === "string" ? preset : datePreset;
      const res = await fetch(`/api/meta-ads/insights?date_preset=${activePreset}`);
      if (!res.ok) throw new Error("Failed to load insights");
      const data = await res.json();
      setBundle(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch ad insights");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/meta-ads/config");
      const data = await res.json();
      setHealthStatus(data.health);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLeadForms = async () => {
    try {
      const res = await fetch("/api/meta-ads/lead-forms");
      const data = await res.json();
      if (data.success && Array.isArray(data.forms) && data.forms.length > 0) {
        setLeadFormsList(data.forms);
        setSelectedLeadForm(data.forms[0]);
      }
    } catch (e) {
      console.warn("Failed to load lead forms:", e);
    }
  };

  useEffect(() => {
    fetchInsights();
    fetchConfig();
    fetchLeadForms();

    try {
      const stored = localStorage.getItem("meta_ads_saved_location_presets");
      if (stored) {
        setSavedLocationPresets(JSON.parse(stored));
      } else {
        const initialLocPresets: SavedLocationPreset[] = [
          {
            id: "preset_south_fast_track",
            name: "South Core (TN, AP, KA)",
            locations: AVAILABLE_STATES.filter((s) => ["1744", "1724", "1738"].includes(s.key)),
            created_at: new Date().toISOString(),
            totalLeads: 661,
            avgCpl: 32.6,
            rating: "Lowest CPL 🔥",
          },
        ];
        setSavedLocationPresets(initialLocPresets);
        localStorage.setItem("meta_ads_saved_location_presets", JSON.stringify(initialLocPresets));
      }
    } catch (e) {
      console.warn("Failed to load location presets:", e);
    }
  }, []);

  const handleToggleCampaign = async (campaignId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      const res = await fetch("/api/meta-ads/campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaign_id: campaignId, status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update campaign status");
      if (data.local_only) {
        toast.success(`Campaign marked ${nextStatus} in CRM! (Connect token in Settings to sync live with Meta)`);
      } else {
        toast.success(`Campaign marked ${nextStatus} live on Meta!`);
      }
      fetchInsights();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) {
      toast.error("Please enter a valid Meta Ads access token");
      return;
    }
    try {
      setSavingToken(true);
      const res = await fetch("/api/meta-ads/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: tokenInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save token");
      toast.success("Meta Ads token saved & connection tested!");
      setHealthStatus(data.health);
      setTokenInput("");
      setTokenModalOpen(false);
      fetchInsights();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingToken(false);
    }
  };

  const handleCheckLint = async () => {
    try {
      setLinting(true);
      const res = await fetch("/api/meta-ads/lint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headline: adHeadline, primary_text: adPrimaryText }),
      });
      const data = await res.json();
      setLintResult(data);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLinting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingMedia(true);
      const isVid = file.type.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(file.name);
      setMediaType(isVid ? "video" : "image");

      const localBlob = URL.createObjectURL(file);
      setMediaUrl(localBlob);
      setMediaFilename(file.name);
      setMediaFileSize(`${(file.size / (1024 * 1024)).toFixed(1)} MB`);

      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/meta-ads/upload-media", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload media");

      setMediaUrl(data.url);
      toast.success(`${isVid ? "Video" : "Image"} uploaded successfully!`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  // Location Search & Controls
  const handleSearchLocations = async (query: string) => {
    setLocationSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setLocationSearchResults([]);
      return;
    }
    try {
      setIsSearchingLocations(true);
      const res = await fetch(`/api/meta-ads/search-locations?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.data) {
        setLocationSearchResults(data.data);
      }
    } catch (e) {
      console.warn("Location search error:", e);
    } finally {
      setIsSearchingLocations(false);
    }
  };

  const addLocation = (loc: TargetedLocation, mode: "include" | "exclude") => {
    if (mode === "include") {
      if (!selectedLocations.some((l) => l.key === loc.key)) {
        setSelectedLocations((prev) => [...prev, loc]);
        toast.success(`Target location added: ${loc.name}`);
      } else {
        toast.info(`Already added: ${loc.name}`);
      }
    } else {
      if (!excludedLocations.some((l) => l.key === loc.key)) {
        setExcludedLocations((prev) => [...prev, loc]);
        toast.success(`Location excluded: ${loc.name}`);
      }
    }
    setLocationSearchQuery("");
    setLocationSearchResults([]);
  };

  const removeLocation = (key: string, mode: "include" | "exclude") => {
    if (mode === "include") {
      setSelectedLocations((prev) => prev.filter((l) => l.key !== key));
    } else {
      setExcludedLocations((prev) => prev.filter((l) => l.key !== key));
    }
  };

  const applyCluster = (cl: "south" | "industrial" | "all") => {
    if (cl === "south") {
      const southKeys = ["1744", "1733", "1738", "1724", "4100"];
      setSelectedLocations(AVAILABLE_STATES.filter((s) => southKeys.includes(s.key)));
      toast.success("Applied South India Hub (TN, KL, KA, AP, TS)");
    } else if (cl === "industrial") {
      const indKeys = ["1735", "1729", "1728", "1754", "1743"];
      setSelectedLocations(AVAILABLE_STATES.filter((s) => indKeys.includes(s.key)));
      toast.success("Applied North & West (MH, GJ, DL, UP, RJ)");
    } else {
      setSelectedLocations([...AVAILABLE_STATES]);
      toast.success("Applied All India Major States");
    }
  };

  const handleSaveLocationPreset = () => {
    if (!newLocationPresetName.trim()) {
      toast.error("Please enter a name for the location preset");
      return;
    }
    if (selectedLocations.length === 0) {
      toast.error("No locations selected to save");
      return;
    }

    const perf = calculateLocationPerformance(selectedLocations);
    const newPreset: SavedLocationPreset = {
      id: "loc_preset_" + Date.now(),
      name: newLocationPresetName.trim(),
      locations: [...selectedLocations],
      created_at: new Date().toISOString(),
      totalLeads: perf.totalLeads,
      avgCpl: perf.avgCpl,
      rating: perf.rating,
    };

    const updated = [newPreset, ...savedLocationPresets];
    setSavedLocationPresets(updated);
    try {
      localStorage.setItem("meta_ads_saved_location_presets", JSON.stringify(updated));
    } catch (e) {}

    toast.success(`Location preset "${newLocationPresetName}" saved! (${perf.summaryText})`);
    setNewLocationPresetName("");
    setSaveLocationModalOpen(false);
  };

  const handleDeleteLocationPreset = (id: string, name: string) => {
    const updated = savedLocationPresets.filter((p) => p.id !== id);
    setSavedLocationPresets(updated);
    try {
      localStorage.setItem("meta_ads_saved_location_presets", JSON.stringify(updated));
    } catch (e) {}
    toast.success(`Removed preset "${name}"`);
  };

  const handleApplyLocationPreset = (preset: SavedLocationPreset) => {
    setSelectedLocations([...preset.locations]);
    toast.success(`Applied "${preset.name}" (${preset.locations.length} locations • ₹${preset.avgCpl} CPL)`);
  };

  const handleBulkMatch = async () => {
    if (!bulkInputText.trim()) return;
    try {
      setIsProcessingBulk(true);
      const names = bulkInputText
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 1);

      let addedCount = 0;
      for (const name of names) {
        const found = AVAILABLE_STATES.find(
          (s) => s.name.toLowerCase() === name.toLowerCase()
        );
        if (found) {
          if (!selectedLocations.some((l) => l.key === found.key)) {
            setSelectedLocations((prev) => [...prev, found]);
            addedCount++;
          }
        } else {
          const res = await fetch(`/api/meta-ads/search-locations?q=${encodeURIComponent(name)}`);
          const data = await res.json();
          if (data.data && data.data.length > 0) {
            const first = data.data[0];
            if (!selectedLocations.some((l) => l.key === first.key)) {
              setSelectedLocations((prev) => [
                ...prev,
                {
                  key: first.key,
                  name: first.name,
                  type: first.type || "region",
                  region: first.region,
                  country_code: "IN",
                },
              ]);
              addedCount++;
            }
          }
        }
      }
      toast.success(`${addedCount} locations successfully matched & added!`);
      setBulkInputText("");
      setBulkModalOpen(false);
    } catch (e) {
      toast.error("Failed to match bulk locations");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  // Interest Search & Controls
  const handleSearchInterests = async (query: string) => {
    setInterestSearchQuery(query);
    if (!query || query.trim().length < 2) {
      setInterestSearchResults([]);
      return;
    }
    try {
      setIsSearchingInterests(true);
      const res = await fetch(`/api/meta-ads/search-interests?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.data) {
        setInterestSearchResults(data.data);
      }
    } catch (e) {
      console.warn("Interest search error:", e);
    } finally {
      setIsSearchingInterests(false);
    }
  };

  const addInterest = (it: { id: string; name: string }) => {
    if (!selectedInterests.some((i) => i.id === it.id)) {
      setSelectedInterests((prev) => [...prev, it]);
      toast.success(`Interest added: ${it.name}`);
    } else {
      toast.info(`Already added: ${it.name}`);
    }
    setInterestSearchQuery("");
    setInterestSearchResults([]);
  };

  const removeInterest = (id: string) => {
    setSelectedInterests((prev) => prev.filter((i) => i.id !== id));
  };

  const handleBulkAddInterests = (interestsToAdd: Array<{ id: string; name: string }>) => {
    setSelectedInterests((prev) => {
      const existingIds = new Set(prev.map((i) => i.id));
      const newItems = interestsToAdd.filter((i) => !existingIds.has(i.id));
      return [...prev, ...newItems];
    });
  };

  const handleClearInterests = () => {
    setSelectedInterests([]);
  };

  const handleLaunch = async () => {
    try {
      setLaunching(true);
      const res = await fetch("/api/meta-ads/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: launchMode,
          objective,
          campaign_name: campaignName,
          adset_name: adsetName,
          cluster,
          daily_budget_inr: budget,
          status: launchStatus,
          enable_ab_test: enableAbTest,
          budget_guard_limit_inr: enableBudgetGuard ? 60 : undefined,
          targeted_locations: selectedLocations,
          excluded_locations: excludedLocations,
          interests: selectedInterests,
          min_age: ageMin,
          max_age: ageMax,
          gender: targetGender,
          headline: adHeadline,
          primary_text: adPrimaryText,
          media_type: mediaType,
          video_url: mediaType === "video" ? mediaUrl : undefined,
          image_url: mediaType === "image" ? mediaUrl : undefined,
          whatsapp_number: whatsappNumber,
          phone_number: callNumber,
          lead_form_mode: leadFormMode,
          existing_form_id: existingFormId,
          form_title: formTitle,
          completion_cta: completionCta,
          cta_type:
            objective === "CLICK_TO_WHATSAPP"
              ? "WHATSAPP_MESSAGE"
              : objective === "CLICK_TO_CALL"
              ? "CALL_NOW"
              : "GET_QUOTE",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.violations) {
          toast.error(`Policy Violation: ${data.violations[0]}`);
        } else {
          toast.error(data.error || "Failed to launch campaign");
        }
        return;
      }

      if (data.local_only) {
        toast.success(
          `Campaign draft created in CRM! (ID: ${data.campaign_id}). Connect token in Settings to push live to Meta.`
        );
      } else {
        toast.success(
          `Campaign launched successfully in Meta Ads Manager! (ID: ${data.campaign_id}, Status: ${launchStatus})`
        );
      }
      fetchInsights();
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred during launch");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Cross-Platform Channel Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-sm ring-1 ring-border/40">
        <div className="flex items-center gap-2.5">
          <Badge variant="outline" className="text-xs uppercase tracking-wider font-bold bg-muted px-2.5 py-1">
            Omnichannel Ads Engine
          </Badge>
          <span className="text-xs text-muted-foreground hidden md:inline">
            Sri Lakshmi Paid Media Console: Seamlessly manage Meta and Google Ads
          </span>
        </div>
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60">
          <button
            type="button"
            onClick={() => setAdChannel("meta")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
              adChannel === "meta"
                ? "bg-blue-600 text-white shadow-sm ring-1 ring-blue-500/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <span className="flex h-2 w-2 rounded-full bg-blue-300 animate-pulse" />
            🔵 Meta Ads Manager
          </button>
          <button
            type="button"
            onClick={() => setAdChannel("google")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer",
              adChannel === "google"
                ? "bg-rose-600 text-white shadow-sm ring-1 ring-rose-500/50"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <span className="flex h-2 w-2 rounded-full bg-rose-300 animate-pulse" />
            🔴 Google Ads AI Studio
          </button>
        </div>
      </div>

      {adChannel === "google" ? (
        <GoogleAdsStudio />
      ) : (
        <>
          {/* Top Hero Banner */}
          <div className="flex flex-col gap-4 rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl p-6 shadow-sm ring-1 ring-border/40 luxury-card md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sri Lakshmi Meta Ads AI Studio</h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Agency-Grade Campaign Launcher & 360° Intelligence Suite for Patented Murukku Machinery
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="outline" className="border-primary/40 bg-primary/10 font-mono text-primary">
              {bundle?.account?.id || "act_245155721099304"}
            </Badge>
            {bundle?.account?.name && (
              <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-400 font-medium">
                {bundle.account.name}
              </Badge>
            )}
            <Badge variant="outline" className="border-border bg-muted/60">
              Page ID: 676208215584034
            </Badge>
            {bundle?.is_cached ? (
              <Badge variant="secondary" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-500">
                <Info className="h-3 w-3" /> Historical Snapshot Active
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" /> Live Marketing API
              </Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Meta Ads Style Date Preset Filter */}
          <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background/90 px-2 py-1 shadow-sm">
            <Calendar className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Range:</span>
            <Select
              value={datePreset}
              onValueChange={(val) => {
                if (val) {
                  setDatePreset(val);
                  fetchInsights(val);
                }
              }}
            >
              <SelectTrigger className="h-7 w-[160px] border-none bg-transparent p-0 text-xs font-bold text-foreground shadow-none focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent align="end" className="bg-popover/95 backdrop-blur-md">
                <SelectItem value="maximum" className="font-semibold text-emerald-600 dark:text-emerald-400">
                  📊 Maximum (Lifetime)
                </SelectItem>
                <SelectItem value="last_30d">Last 30 days</SelectItem>
                <SelectItem value="this_month">This month</SelectItem>
                <SelectItem value="last_month">Last month</SelectItem>
                <SelectItem value="last_14d">Last 14 days</SelectItem>
                <SelectItem value="last_7d">Last 7 days</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchInsights(datePreset)}
            disabled={syncing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Reports"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setTokenModalOpen(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            <Key className="h-4 w-4" />
            API Token
          </Button>
        </div>
      </div>


      {/* Main Studio Navigation Menu */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="rounded-2xl border border-border/80 bg-card/85 p-2 shadow-sm backdrop-blur-xl ring-1 ring-border/40 luxury-card">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              {
                id: "launcher",
                label: "Smart Ad Launcher",
                subtitle: "Automated Campaign Setup for Murukku Machinery",
                icon: Rocket,
                badge: "⚡ 30s Fast",
                badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
                iconBg: "bg-emerald-500/15 text-emerald-400",
                activeBorder: "border-emerald-500/50 bg-emerald-500/[0.08] shadow-sm ring-1 ring-emerald-500/30",
                indicatorColor: "bg-emerald-500",
              },
              {
                id: "analytics",
                label: "Intelligence Reports",
                subtitle: `${bundle?.campaigns?.length ?? 0} Live Campaigns & 360° Real-Time Analytics`,
                icon: BarChart3,
                badge: `${bundle?.campaigns?.length ?? 0} Live`,
                badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
                iconBg: "bg-blue-500/15 text-blue-400",
                activeBorder: "border-blue-500/50 bg-blue-500/[0.08] shadow-sm ring-1 ring-blue-500/30",
                indicatorColor: "bg-blue-500",
              },
              {
                id: "creative",
                label: "Creative Studio Lab",
                subtitle: "Murukku Video & Copy Safe-Zone Simulator",
                icon: Smartphone,
                badge: "Tamil / Multi",
                badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
                iconBg: "bg-amber-500/15 text-amber-400",
                activeBorder: "border-amber-500/50 bg-amber-500/[0.08] shadow-sm ring-1 ring-amber-500/30",
                indicatorColor: "bg-amber-500",
              },
              {
                id: "doctor",
                label: "AI Policy Ad Doctor",
                subtitle: "Meta Compliance Linter & Ban Protection",
                icon: ShieldAlert,
                badge: "100% Guard",
                badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
                iconBg: "bg-rose-500/15 text-rose-400",
                activeBorder: "border-rose-500/50 bg-rose-500/[0.08] shadow-sm ring-1 ring-rose-500/30",
                indicatorColor: "bg-rose-500",
              },
              {
                id: "settings",
                label: "Studio & WABA Config",
                subtitle: "Meta Token, Numbers & API Endpoints",
                icon: Settings,
                badge: healthStatus?.valid ? "Connected" : "Live API",
                badgeColor: "bg-purple-500/10 text-purple-400 border-purple-500/30",
                iconBg: "bg-purple-500/15 text-purple-400",
                activeBorder: "border-purple-500/50 bg-purple-500/[0.08] shadow-sm ring-1 ring-purple-500/30",
                indicatorColor: "bg-purple-500",
              },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-200 ${
                    isActive
                      ? `${tab.activeBorder}`
                      : "border-transparent bg-transparent hover:border-border/60 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div>
                    <div className="flex w-full items-center justify-between gap-1.5">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-105 ${
                          isActive
                            ? tab.iconBg
                            : "bg-muted/60 text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${tab.badgeColor}`}
                      >
                        {tab.badge}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span
                        className={`text-xs sm:text-sm font-bold tracking-tight truncate ${
                          isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        {tab.label}
                      </span>
                      <InfoTip content={tab.subtitle} title={tab.label} />
                    </div>
                  </div>

                  {isActive && (
                    <div
                      className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full ${tab.indicatorColor}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ==================================================================== */}
        {/* TAB 1: SMART MURUKKU AD LAUNCHER */}
        {/* ==================================================================== */}
        <TabsContent value="launcher" className="space-y-4">
          <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card overflow-hidden">
            <CardHeader className="pb-3 border-b border-border/70 bg-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Rocket className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <span>Smart Murukku Ad Launcher</span>
                      <Badge variant="outline" className="border-primary/30 text-primary text-[10px]">
                        act_245155721099304
                      </Badge>
                      <InfoTip
                        content="3-Level Meta Architecture (Campaign ➔ Ad Set ➔ Ad Creative). Automatically structures commercial automatic Murukku machinery campaigns."
                        title="Meta Ad Launcher"
                      />
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Create, configure, and publish high-ROI ads to Meta Ads Manager
                    </p>
                  </div>
                </div>

                {/* 3-Step Breadcrumbs (Matching CampaignInspectorModal) */}
                <div className="flex items-center gap-1 rounded-xl border border-border/80 bg-background/80 p-1 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setLauncherStep("campaign")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      launcherStep === "campaign"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Folder className="h-3.5 w-3.5" />
                    1. Campaign
                  </button>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                  <button
                    type="button"
                    onClick={() => setLauncherStep("adset")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      launcherStep === "adset"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    2. Ad Set
                  </button>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                  <button
                    type="button"
                    onClick={() => setLauncherStep("creative")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      launcherStep === "creative"
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Film className="h-3.5 w-3.5" />
                    3. Ad Creative
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* ============================================================ */}
              {/* STEP 1: CAMPAIGN LEVEL */}
              {/* ============================================================ */}
              {launcherStep === "campaign" && (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {/* Campaign Name & Status Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl border border-border/70 bg-muted/20">
                    <div className="md:col-span-2 space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Campaign Name
                      </Label>
                      <Input
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className="font-mono text-sm bg-background font-semibold"
                        placeholder="Campaign Name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Initial Publish State
                      </Label>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setLaunchStatus("PAUSED")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            launchStatus === "PAUSED"
                              ? "border-amber-500 bg-amber-500/10 text-amber-500"
                              : "border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          ⏸️ PAUSED (Draft)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLaunchStatus("ACTIVE")}
                          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold border transition-all ${
                            launchStatus === "ACTIVE"
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                              : "border-border text-muted-foreground hover:bg-muted/50"
                          }`}
                        >
                          ▶️ ACTIVE (Live)
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Architecture Mode Selector */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Campaign Architecture Mode
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Tailored for Sri Lakshmi Murukku Machines</span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <button
                        type="button"
                        onClick={() => setLaunchMode("quick_wizard")}
                        className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                          launchMode === "quick_wizard"
                            ? "border-emerald-500 bg-emerald-500/[0.08] shadow-sm ring-1 ring-emerald-500/40"
                            : "border-border/70 hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-bold">
                              <Zap className="h-4 w-4" />
                            </div>
                            <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                              ⚡ 30s Quick
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between font-bold text-sm text-foreground">
                            <span>Mode A: 1-Click Wizard</span>
                            <InfoTip
                              content="Zero friction. Auto-picks best Murukku video creative, copy & target audience."
                              title="Mode A: 1-Click Wizard"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                          <span>Best for Daily Leads</span>
                          {launchMode === "quick_wizard" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLaunchMode("guided_pro")}
                        className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                          launchMode === "guided_pro"
                            ? "border-blue-500 bg-blue-500/[0.08] shadow-sm ring-1 ring-blue-500/40"
                            : "border-border/70 hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400 font-bold">
                              <Sliders className="h-4 w-4" />
                            </div>
                            <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-500 border border-blue-500/20">
                              🎯 Full Control
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between font-bold text-sm text-foreground">
                            <span>Mode B: Guided Pro</span>
                            <InfoTip
                              content="Custom lead forms, qualification questions, A/B testing & budget guardrails."
                              title="Mode B: Guided Pro"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                          <span>High-Ticket Buyer Filtration</span>
                          {launchMode === "guided_pro" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setLaunchMode("retargeting")}
                        className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-200 ${
                          launchMode === "retargeting"
                            ? "border-purple-500 bg-purple-500/[0.08] shadow-sm ring-1 ring-purple-500/40"
                            : "border-border/70 hover:border-border hover:bg-muted/40"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/20 text-purple-400 font-bold">
                              <RefreshCw className="h-4 w-4" />
                            </div>
                            <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-[10px] font-bold text-purple-400 border border-purple-500/20">
                              🔥 Highest ROI
                            </span>
                          </div>
                          <div className="mt-3 flex items-center justify-between font-bold text-sm text-foreground">
                            <span>Mode C: Warm Retargeting</span>
                            <InfoTip
                              content="Laser retargets 469 Instagram post savers & 343 video sharers from Murukku ads."
                              title="Mode C: Warm Retargeting"
                            />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-[11px] font-medium text-purple-600 dark:text-purple-400">
                          <span>Expected ₹12 - ₹20 CPL</span>
                          {launchMode === "retargeting" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Campaign Objective Cards */}
                  <div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Select Campaign Objective
                      </Label>
                      <span className="text-[11px] text-muted-foreground">Optimized for B2B Murukku Machinery Leads</span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {/* Option 1: WhatsApp */}
                      <button
                        type="button"
                        onClick={() => setObjective("CLICK_TO_WHATSAPP")}
                        className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                          objective === "CLICK_TO_WHATSAPP"
                            ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/30"
                            : "border-border hover:border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                            <MessageCircle className="h-4 w-4" />
                          </div>
                          {objective === "CLICK_TO_WHATSAPP" && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between w-full">
                          <p className="font-bold text-sm text-foreground">Click-to-WhatsApp</p>
                          <InfoTip
                            content="Direct chats on WhatsApp with instant machinery catalogue and pricing."
                            title="Click-to-WhatsApp"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Direct buyers route directly to Sri Lakshmi sales executive WhatsApp.
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-border/50 w-full">
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-[10px] text-emerald-400">
                            ₹19.90 / chat
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">High Volume</span>
                        </div>
                      </button>

                      {/* Option 2: Instant Lead Form */}
                      <button
                        type="button"
                        onClick={() => setObjective("INSTANT_LEAD_FORM")}
                        className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                          objective === "INSTANT_LEAD_FORM"
                            ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                            : "border-border hover:border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                            <FileText className="h-4 w-4" />
                          </div>
                          {objective === "INSTANT_LEAD_FORM" && (
                            <CheckCircle2 className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between w-full">
                          <p className="font-bold text-sm text-foreground">Instant Lead Form</p>
                          <InfoTip
                            content="Higher-intent buyer qualification form with custom questions."
                            title="Instant Lead Form"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Pre-filled Meta native form capturing business type, output capacity & phone.
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-border/50 w-full">
                          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-[10px] text-primary">
                            ₹34.60 / lead
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">High Intent</span>
                        </div>
                      </button>

                      {/* Option 3: Click-to-Call */}
                      <button
                        type="button"
                        onClick={() => setObjective("CLICK_TO_CALL")}
                        className={`relative flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                          objective === "CLICK_TO_CALL"
                            ? "border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/30"
                            : "border-border hover:border-border/80 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                            <PhoneCall className="h-4 w-4" />
                          </div>
                          {objective === "CLICK_TO_CALL" && (
                            <CheckCircle2 className="h-4 w-4 text-blue-400" />
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between w-full">
                          <p className="font-bold text-sm text-foreground">Click-to-Call</p>
                          <InfoTip
                            content="Direct phone calls to Sri Lakshmi sales desk for immediate consultation."
                            title="Click-to-Call"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Connects customer straight to factory direct consultation desk.
                        </p>
                        <div className="mt-3 flex items-center gap-1.5 pt-2 border-t border-border/50 w-full">
                          <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-[10px] text-blue-400">
                            Direct Calls
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Hot Inquiries</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Meta Architecture Specs Callout & Next Button */}
                  <div className="rounded-xl border border-border/80 bg-muted/30 p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono text-[10px]">AUCTION</Badge>
                      <Badge variant="secondary" className="font-mono text-[10px]">OUTCOME_LEADS</Badge>
                      <span className="text-muted-foreground">Special Ad Categories: None (Commercial Machinery B2B)</span>
                    </div>
                    <Button
                      type="button"
                      size="default"
                      onClick={() => setLauncherStep("adset")}
                      className="gap-2 font-bold px-6 bg-primary text-primary-foreground shadow hover:bg-primary/90 ml-auto"
                    >
                      <span>Next: 2. Ad Set (Audience & Budget)</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 2: AD SET LEVEL (EXACT INSPECTOR & EDIT MODAL DESIGN) */}
              {/* ============================================================ */}
              {launcherStep === "adset" && (
                <div className="space-y-6 max-w-7xl mx-auto">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    {/* Left Column (xl:col-span-7 2xl:col-span-8): Form Controls */}
                    <div className="xl:col-span-7 2xl:col-span-8 space-y-5">
                      <div className="rounded-xl border border-border bg-card p-5 space-y-5 shadow-sm">
                    {/* Top Ad Set Header Row (Name & Status Toggle - Screenshot 2) */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-border/60 gap-3">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <Layers className="h-4 w-4 text-blue-500" />
                          <Input
                            value={adsetName}
                            onChange={(e) => setAdsetName(e.target.value)}
                            className="h-8 text-sm font-bold max-w-sm"
                            placeholder="Ad Set Name"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Ad Set Architecture: <span className="font-mono text-foreground font-semibold">Smart Delivery (ABO)</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label htmlFor="adset-status" className="text-xs font-semibold">
                          {adsetStatus === "ACTIVE" ? "Active" : "Paused"}
                        </Label>
                        <Switch
                          id="adset-status"
                          checked={adsetStatus === "ACTIVE"}
                          onCheckedChange={(c) => setAdsetStatus(c ? "ACTIVE" : "PAUSED")}
                        />
                      </div>
                    </div>

                    {/* Conversion Destination & Verified Identity (Screenshot 2 Top Cards) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.05] p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">Conversion Location</span>
                          {objective === "CLICK_TO_WHATSAPP" ? (
                            <MessageCircle className="h-4 w-4 text-emerald-500" />
                          ) : objective === "CLICK_TO_CALL" ? (
                            <PhoneCall className="h-4 w-4 text-blue-500" />
                          ) : (
                            <FileText className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <p className="text-sm font-bold text-foreground">
                          {objective === "CLICK_TO_WHATSAPP"
                            ? "WhatsApp Messaging"
                            : objective === "CLICK_TO_CALL"
                            ? "Click-to-Call Phone Line"
                            : "Instant Lead Form"}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Optimization Goal: {objective === "CLICK_TO_WHATSAPP" ? "CONVERSATIONS" : objective === "CLICK_TO_CALL" ? "QUALITY_CALL" : "LEADS"}
                        </p>
                      </div>

                      <div className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-muted-foreground">Assets & Verified Identity</span>
                          <Smartphone className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-xs font-bold text-foreground">
                          Page: {bundle?.account?.name || "Sri Lakshmi Industries"}
                        </p>
                        <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                          {objective === "CLICK_TO_CALL" ? `Call: ${callNumber}` : `WhatsApp: ${whatsappNumber}`}
                        </p>
                      </div>
                    </div>

                    {/* Daily Budget Control (Meta Live Sync) - Matching Screenshot 2 */}
                    <div className="rounded-xl border border-border p-4 bg-background/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Sliders className="h-3.5 w-3.5 text-primary" />
                          Daily Budget Control (Meta Live Sync)
                        </Label>
                        <span className="text-xs font-mono font-bold text-emerald-500">
                          ₹{budget} / day
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">
                            ₹
                          </span>
                          <Input
                            type="number"
                            value={budget}
                            onChange={(e) => setBudget(Number(e.target.value) || 0)}
                            className="pl-7 text-sm font-bold"
                            placeholder="500"
                            min={100}
                            step={50}
                          />
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {[500, 600, 800, 1000, 1500].map((b) => (
                            <button
                              key={b}
                              type="button"
                              onClick={() => setBudget(b)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                                budget === b
                                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "border-border hover:bg-muted text-muted-foreground"
                              }`}
                            >
                              ₹{b}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Locations (Controls) - Exact Match of Screenshot 2 */}
                    <div className="rounded-xl border border-border p-4 bg-background/50 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-border/60">
                        <div>
                          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-red-500" />
                            Locations (Controls)
                          </Label>
                          <p className="text-[11px] text-muted-foreground">
                            We won&apos;t reach people beyond these settings, even with Advantage+ on.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => setBulkModalOpen(true)}
                          >
                            <ListPlus className="h-3.5 w-3.5" />
                            Add locations in bulk
                          </Button>
                          {selectedLocations.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1 border-primary/40 text-primary hover:bg-primary/10 font-bold"
                              onClick={() => setSaveLocationModalOpen(true)}
                            >
                              <Bookmark className="h-3.5 w-3.5" />
                              Save as Preset
                            </Button>
                          )}
                          {selectedLocations.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-muted-foreground hover:text-destructive"
                              onClick={() => setSelectedLocations([])}
                            >
                              Clear all
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Active Selected Locations Box (Screenshot 2 Match) */}
                      <div className="rounded-xl border border-border/80 bg-muted/20 p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold text-foreground">
                          <span className="flex items-center gap-1.5">
                            <Globe className="h-3.5 w-3.5 text-blue-500" />
                            India ({selectedLocations.length} Locations Active)
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {selectedLocations.filter((l) => l.type === "region").length} States,{" "}
                            {selectedLocations.filter((l) => l.type === "city" || l.type === "neighborhood").length} Cities
                          </span>
                        </div>

                        {/* Live Location Performance Benchmark */}
                        {selectedLocations.length > 0 && (
                          <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-background/80 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                            <span className="flex items-center gap-1.5 font-bold">
                              <TrendingUp className="h-3.5 w-3.5" />
                              Estimated Benchmark:
                            </span>
                            <span className="font-mono font-bold">
                              {calculateLocationPerformance(selectedLocations).summaryText}
                            </span>
                          </div>
                        )}

                        {/* Scrollable list of locations with remove button */}
                        <div className="max-h-48 overflow-y-auto space-y-1 pr-1 divide-y divide-border/40">
                          {selectedLocations.length > 0 ? (
                            selectedLocations.map((loc) => (
                              <div
                                key={loc.key}
                                className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-background/80 transition-colors text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 text-[10px]">
                                    <MapPin className="h-3 w-3" />
                                  </span>
                                  <div>
                                    <span className="font-semibold text-foreground">{loc.name}</span>
                                    {loc.region && loc.type !== "region" && (
                                      <span className="text-[10px] text-muted-foreground ml-1">
                                        ({loc.region})
                                      </span>
                                    )}
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] px-1.5 py-0 border-border text-muted-foreground ml-1"
                                  >
                                    {loc.type === "region" ? "State / Region" : "City (+25 km)"}
                                  </Badge>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeLocation(loc.key, "include")}
                                  className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                                  title="Remove location"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 text-center text-xs text-muted-foreground">
                              No locations selected. Use the search bar below or presets to add.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Excluded Locations View if any */}
                      {excludedLocations.length > 0 && (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-3 space-y-1.5">
                          <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Excluded Locations ({excludedLocations.length})
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {excludedLocations.map((loc) => (
                              <Badge
                                key={loc.key}
                                variant="destructive"
                                className="text-xs px-2 py-0.5 gap-1"
                              >
                                {loc.name}
                                <button
                                  type="button"
                                  onClick={() => removeLocation(loc.key, "exclude")}
                                  className="hover:opacity-75"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Search Bar with Include / Exclude Dropdown */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center gap-2">
                          <Select
                            value={locationMode}
                            onValueChange={(val: any) => setLocationMode(val)}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs font-bold border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="include" className="text-emerald-600 font-semibold">
                                include
                              </SelectItem>
                              <SelectItem value="exclude" className="text-destructive font-semibold">
                                exclude
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              value={locationSearchQuery}
                              onChange={(e) => handleSearchLocations(e.target.value)}
                              placeholder="Search location (e.g. Tamil Nadu, Coimbatore, Pune, Madurai, Gujarat)..."
                              className="pl-8 text-xs h-8"
                            />
                            {isSearchingLocations && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-primary" />
                            )}
                          </div>
                        </div>

                        {/* Search Results Dropdown List */}
                        {locationSearchResults.length > 0 && (
                          <div className="rounded-lg border border-border bg-popover shadow-xl max-h-52 overflow-y-auto divide-y divide-border/60 z-30">
                            {locationSearchResults.map((item) => (
                              <div
                                key={item.key}
                                className="p-2 flex items-center justify-between hover:bg-muted/60 transition-colors text-xs"
                              >
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                  <div>
                                    <p className="font-semibold text-foreground">{item.display_label}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      Type: {item.type} • Key: {item.key}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-6 text-[10px] gap-1 border-primary/30 text-primary hover:bg-primary/10"
                                  onClick={() =>
                                    addLocation(
                                      {
                                        key: item.key,
                                        name: item.name,
                                        type: item.type,
                                        region: item.region,
                                        country_code: item.country_code,
                                      },
                                      locationMode
                                    )
                                  }
                                >
                                  <Plus className="h-3 w-3" /> Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Quick Presets Buttons with Performance Tags & Custom Saved Presets */}
                      <div className="space-y-1.5 pt-1 border-t border-border/40">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3 text-amber-500" />
                            Regional Presets & Benchmarks:
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 gap-1 hover:border-emerald-500"
                              onClick={() => applyCluster("south")}
                            >
                              <span>South Hub (TN, KL, KA, AP, TS)</span>
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-emerald-500/10 text-emerald-600 font-bold">
                                ₹32.8 CPL 🔥
                              </Badge>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 gap-1 hover:border-blue-500"
                              onClick={() => applyCluster("industrial")}
                            >
                              <span>North & West (MH, GJ, DL, UP, RJ)</span>
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-blue-500/10 text-blue-500 font-bold">
                                ₹35.8 CPL
                              </Badge>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] px-2 gap-1"
                              onClick={() => applyCluster("all")}
                            >
                              <span>All India Major States</span>
                              <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-muted text-muted-foreground font-bold">
                                ₹38.8 CPL
                              </Badge>
                            </Button>
                          </div>
                        </div>

                        {/* User Saved Location Presets */}
                        {savedLocationPresets.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                              <Bookmark className="h-3 w-3 text-primary" />
                              Saved Custom Presets:
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {savedLocationPresets.map((preset) => (
                                <div
                                  key={preset.id}
                                  className="flex items-center gap-1 rounded-lg border border-border/80 bg-background hover:border-primary/50 pl-2 pr-1 py-0.5 text-xs transition-colors shadow-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleApplyLocationPreset(preset)}
                                    className="font-semibold text-foreground hover:text-primary flex items-center gap-1.5 text-[11px]"
                                  >
                                    <span>{preset.name}</span>
                                    <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-emerald-500/10 text-emerald-600 font-bold">
                                      ₹{preset.avgCpl} CPL
                                    </Badge>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteLocationPreset(preset.id, preset.name)}
                                    className="text-muted-foreground hover:text-destructive p-0.5 transition-colors"
                                    title="Delete preset"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target Age & Demographic Grouping */}
                    <div className="rounded-xl border border-border p-4 bg-background/50 space-y-3">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-indigo-500" />
                        Target Age & Demographic Grouping
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            Minimum Age
                          </span>
                          <Select
                            value={String(ageMin)}
                            onValueChange={(val) => setAgeMin(Number(val))}
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold">
                              <SelectValue placeholder="Min Age" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="18">18 years</SelectItem>
                              <SelectItem value="21">21 years (Recommended)</SelectItem>
                              <SelectItem value="25">25 years (Business Owners)</SelectItem>
                              <SelectItem value="30">30 years</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            Maximum Age
                          </span>
                          <Select
                            value={String(ageMax)}
                            onValueChange={(val) => setAgeMax(Number(val))}
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold">
                              <SelectValue placeholder="Max Age" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="50">50 years</SelectItem>
                              <SelectItem value="55">55 years</SelectItem>
                              <SelectItem value="60">60 years</SelectItem>
                              <SelectItem value="65">65+ years (All-inclusive)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1.5">
                          <span className="text-[11px] text-muted-foreground font-semibold">
                            Gender Target
                          </span>
                          <Select
                            value={targetGender}
                            onValueChange={(val: any) => setTargetGender(val)}
                          >
                            <SelectTrigger className="h-8 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male (B2B Factory Owners)</SelectItem>
                              <SelectItem value="all">All Genders</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    {/* Audience & Detailed Interests with Universal Business Finder */}
                    <AudienceIntelligenceStudio
                      selectedLocations={selectedLocations}
                      budget={budget}
                      ageMin={ageMin}
                      ageMax={ageMax}
                      targetGender={targetGender}
                      selectedInterests={selectedInterests}
                      onAddInterest={addInterest}
                      onRemoveInterest={removeInterest}
                      onBulkAddInterests={handleBulkAddInterests}
                      onClearInterests={handleClearInterests}
                      enableAbTest={enableAbTest}
                      enableBudgetGuard={enableBudgetGuard}
                      hideSidebarCards={true}
                    />

                    {/* Advantage+ Toggles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-border/80 p-4 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-foreground">A/B Creative Test</p>
                          <p className="text-[11px] text-muted-foreground">50/50 budget split between 2 videos</p>
                        </div>
                        <Switch
                          checked={enableAbTest}
                          onCheckedChange={setEnableAbTest}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-foreground">AI Budget Guard Dog</p>
                          <p className="text-[11px] text-muted-foreground">Auto-pause if CPL exceeds ₹60</p>
                        </div>
                        <Switch
                          checked={enableBudgetGuard}
                          onCheckedChange={setEnableBudgetGuard}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (xl:col-span-5 2xl:col-span-4): Sticky Intelligence Sidebar in the Right Space */}
                <div className="xl:col-span-5 2xl:col-span-4 space-y-4 xl:sticky xl:top-6">
                  <AudienceIntelligenceSidebar
                    selectedLocations={selectedLocations}
                    budget={budget}
                    ageMin={ageMin}
                    ageMax={ageMax}
                    targetGender={targetGender}
                    selectedInterests={selectedInterests}
                    onBulkAddInterests={handleBulkAddInterests}
                    enableAbTest={enableAbTest}
                    enableBudgetGuard={enableBudgetGuard}
                  />
                </div>
              </div>

                  {/* Navigation Buttons */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/70">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLauncherStep("campaign")}
                      className="gap-2 text-xs font-semibold"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to 1. Campaign
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setLauncherStep("creative")}
                      className="gap-2 font-bold px-6 bg-primary text-primary-foreground shadow hover:bg-primary/90"
                    >
                      <span>Next: 3. Ad Creative (Media & Copy)</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* ============================================================ */}
              {/* STEP 3: AD CREATIVE LEVEL & LIVE PREVIEW */}
              {/* ============================================================ */}
              {launcherStep === "creative" && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left 7 Cols: Media Upload & Copy Builder */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* Visual Media Card */}
                      <div className="rounded-2xl border border-border/80 bg-muted/20 p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div>
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Film className="h-4 w-4 text-primary" />
                              Visual Media Creative
                            </Label>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              1080x1920 (9:16) Master Video auto-adapts to Reels, Feed & Stories
                            </p>
                          </div>

                          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border">
                            <Button
                              type="button"
                              variant={mediaType === "video" ? "default" : "ghost"}
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setMediaType("video")}
                            >
                              <Video className="h-3.5 w-3.5" /> Video Ad
                            </Button>
                            <Button
                              type="button"
                              variant={mediaType === "image" ? "default" : "ghost"}
                              size="sm"
                              className="h-7 text-xs gap-1"
                              onClick={() => setMediaType("image")}
                            >
                              <ImageIcon className="h-3.5 w-3.5" /> Image Ad
                            </Button>
                          </div>
                        </div>

                        {/* Source Selector Tabs */}
                        <div className="flex gap-4 border-b border-border/60 pb-2 text-xs">
                          <button
                            type="button"
                            onClick={() => setMediaSource("upload")}
                            className={`font-semibold pb-1 border-b-2 transition-all ${
                              mediaSource === "upload"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            📤 Upload from Device
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaSource("preset")}
                            className={`font-semibold pb-1 border-b-2 transition-all ${
                              mediaSource === "preset"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            🏭 Sri Lakshmi Factory Presets
                          </button>
                          <button
                            type="button"
                            onClick={() => setMediaSource("url")}
                            className={`font-semibold pb-1 border-b-2 transition-all ${
                              mediaSource === "url"
                                ? "border-primary text-primary"
                                : "border-transparent text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            🔗 Direct Media URL
                          </button>
                        </div>

                        {/* Source 1: Upload */}
                        {mediaSource === "upload" && (
                          <div className="space-y-3">
                            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-6 cursor-pointer hover:bg-primary/10 transition-all text-center">
                              <input
                                type="file"
                                accept={mediaType === "video" ? "video/mp4,video/quicktime,video/webm" : "image/jpeg,image/png,image/webp"}
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={uploadingMedia}
                              />
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary mb-2">
                                <UploadCloud className={`h-5 w-5 ${uploadingMedia ? "animate-bounce" : ""}`} />
                              </div>
                              <p className="font-bold text-xs text-foreground">
                                {uploadingMedia ? "Uploading Media to Server..." : `Click to Upload ${mediaType === "video" ? "Murukku Video" : "Machinery Image"}`}
                              </p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {mediaType === "video"
                                  ? "MP4 or MOV • Max 100MB • 9:16 Reels (1080x1920) or 1:1 Feed recommended"
                                  : "JPG or PNG • Max 15MB • High Resolution Food-Grade Machine Photo"}
                              </p>
                            </label>
                          </div>
                        )}

                        {/* Source 2: Presets */}
                        {mediaSource === "preset" && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {[
                              {
                                title: "30-50 kg/hr Automatic Murukku Extruder",
                                format: "9:16 Video Reel",
                                url: "/assets/murukku_extruder_reel.mp4",
                                type: "video" as const,
                                desc: "Fast dough extrusion with raw motor sound. 34% 3s hook rate.",
                              },
                              {
                                title: "Food-Grade SS 304 Full Factory Demo",
                                format: "1:1 Feed Video",
                                url: "/assets/murukku_factory_demo.mp4",
                                type: "video" as const,
                                desc: "Hygienic stainless steel certification & commercial dough hopper.",
                              },
                              {
                                title: "Patented Commercial Murukku Machine",
                                format: "High-Res Image",
                                url: "/assets/murukku_machine_hero.jpg",
                                type: "image" as const,
                                desc: "Clean studio photo showing patent badge & warranty seal.",
                              },
                            ].map((p, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => {
                                  setMediaType(p.type);
                                  setMediaUrl(p.url);
                                  setMediaFilename(p.title);
                                  setMediaFileSize(p.format);
                                  toast.success(`Selected preset: ${p.title}`);
                                }}
                                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                                  mediaUrl === p.url
                                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
                                    : "border-border hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex w-full items-center justify-between">
                                  <Badge variant="outline" className="text-[9px] text-primary">
                                    {p.format}
                                  </Badge>
                                  {mediaUrl === p.url && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                                </div>
                                <span className="font-bold text-xs mt-1.5 text-foreground">{p.title}</span>
                                <span className="text-[10px] text-muted-foreground mt-1 leading-snug">{p.desc}</span>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Source 3: URL */}
                        {mediaSource === "url" && (
                          <div className="space-y-2">
                            <Label className="text-xs">Direct Media Link (Cloud/CDN URL)</Label>
                            <div className="flex gap-2">
                              <Input
                                placeholder="https://example.com/murukku_machine_video.mp4"
                                value={mediaUrl}
                                onChange={(e) => setMediaUrl(e.target.value)}
                                className="text-xs font-mono"
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  if (mediaUrl.trim()) toast.success("Media URL linked!");
                                }}
                              >
                                Apply
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Active Media Badge */}
                        {mediaUrl && (
                          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                                {mediaType === "video" ? <Film className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-xs text-foreground truncate max-w-xs">
                                    {mediaFilename || "Selected Murukku Creative"}
                                  </p>
                                  <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/30">
                                    Ready for Meta
                                  </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground">
                                  {mediaType === "video" ? "Video Creative" : "Image Creative"} • {mediaFileSize || "Optimized"}
                                </p>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] text-destructive hover:bg-destructive/10 gap-1 px-2"
                              onClick={() => {
                                setMediaUrl("");
                                setMediaFilename("");
                                setMediaFileSize("");
                              }}
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </Button>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-2 rounded-xl border border-primary/25 bg-primary/5 p-2.5 text-xs">
                          <span className="text-[11px] text-foreground flex items-center gap-1.5 font-medium">
                            <Sparkles className="h-3.5 w-3.5 text-primary" /> Advantage+ auto-adjusts to Feed, Reels &amp; Stories
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6 text-[10px] gap-1 font-semibold text-primary border-primary/40 hover:bg-primary/10"
                            onClick={() => setAdvancedPlacementModalOpen(true)}
                          >
                            <Eye className="h-3 w-3" /> Preview 16+ Sizes
                          </Button>
                        </div>
                      </div>

                      {/* Lead Form Widget (if INSTANT_LEAD_FORM selected) */}
                      {objective === "INSTANT_LEAD_FORM" && (
                        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <FileText className="h-4 w-4 text-primary" />
                                Meta Instant Lead Form (1-Click Auto-Fill)
                              </Label>
                              <p className="text-[11px] text-muted-foreground mt-0.5">
                                Automatically captures customer name &amp; WhatsApp number
                              </p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                              onClick={() => setLeadFormBuilderOpen(true)}
                            >
                              <Sparkles className="h-3.5 w-3.5" /> Form Studio
                            </Button>
                          </div>

                          <div className="rounded-xl border border-border/80 bg-card p-3 space-y-2 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs text-foreground">
                                {selectedLeadForm?.name || "Sri Lakshmi Murukku Machinery Quotation Form"}
                              </span>
                              <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold">
                                Active Form
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Full Name</Badge>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">WhatsApp Number</Badge>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Email</Badge>
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">City</Badge>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* High-Converting Ad Copy Builder */}
                      <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-3 shadow-sm">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Ad Copy &amp; Headlines (B2B Murukku Machinery)
                          </Label>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2"
                              onClick={() => {
                                setAdHeadline(PRESET_MURUKKU_COPIES.tamil_pas.headline);
                                setAdPrimaryText(PRESET_MURUKKU_COPIES.tamil_pas.primaryText);
                              }}
                            >
                              Tamil
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2"
                              onClick={() => {
                                setAdHeadline(PRESET_MURUKKU_COPIES.hindi_expansion.headline);
                                setAdPrimaryText(PRESET_MURUKKU_COPIES.hindi_expansion.primaryText);
                              }}
                            >
                              Hindi
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-[11px] px-2"
                              onClick={() => {
                                setAdHeadline(PRESET_MURUKKU_COPIES.english_b2b.headline);
                                setAdPrimaryText(PRESET_MURUKKU_COPIES.english_b2b.primaryText);
                              }}
                            >
                              English B2B
                            </Button>
                          </div>
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Headline</Label>
                          <Input
                            value={adHeadline}
                            onChange={(e) => setAdHeadline(e.target.value)}
                            className="mt-1 text-sm font-semibold"
                          />
                        </div>

                        <div>
                          <Label className="text-xs font-semibold">Primary Text</Label>
                          <Textarea
                            rows={4}
                            value={adPrimaryText}
                            onChange={(e) => setAdPrimaryText(e.target.value)}
                            className="mt-1 font-sans text-xs leading-relaxed"
                          />
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={handleCheckLint}
                            disabled={linting}
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {linting ? "Scanning Policy..." : "AI Policy Check"}
                          </Button>
                          {lintResult && (
                            <Badge variant={lintResult.valid ? "secondary" : "destructive"} className="text-xs">
                              {lintResult.valid ? `✅ Policy Score: ${lintResult.score}/100` : `❌ Violation`}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right 5 Cols: Live Ad Preview (Reels, Feed, Stream) */}
                    <div className="lg:col-span-5 space-y-4">
                      <Card className="border-border/80 shadow-md overflow-hidden bg-card/90">
                        <CardHeader className="p-3 pb-2 border-b border-border/60 bg-muted/30">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-muted-foreground">
                              <Smartphone className="h-3.5 w-3.5 text-primary" />
                              Live Ad Preview
                            </CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10 gap-1 border border-primary/20"
                              onClick={() => setAdvancedPlacementModalOpen(true)}
                            >
                              <Layers className="h-3 w-3" /> 16+ Sizes
                            </Button>
                          </div>

                          <div className="mt-2 grid grid-cols-3 gap-1 bg-background/80 p-0.5 rounded-lg border border-border/60">
                            <Button
                              type="button"
                              variant={previewPlacement === "9_16" ? "default" : "ghost"}
                              size="sm"
                              className="h-6 text-[10px] px-1 py-0 font-medium"
                              onClick={() => setPreviewPlacement("9_16")}
                            >
                              <Smartphone className="h-3 w-3 mr-1" /> 9:16 Reels
                            </Button>
                            <Button
                              type="button"
                              variant={previewPlacement === "1_1" ? "default" : "ghost"}
                              size="sm"
                              className="h-6 text-[10px] px-1 py-0 font-medium"
                              onClick={() => setPreviewPlacement("1_1")}
                            >
                              <LayoutGrid className="h-3 w-3 mr-1" /> 1:1 Feed
                            </Button>
                            <Button
                              type="button"
                              variant={previewPlacement === "16_9" ? "default" : "ghost"}
                              size="sm"
                              className="h-6 text-[10px] px-1 py-0 font-medium"
                              onClick={() => setPreviewPlacement("16_9")}
                            >
                              <Monitor className="h-3 w-3 mr-1" /> 16:9 Stream
                            </Button>
                          </div>
                        </CardHeader>

                        <CardContent className="p-3 space-y-2 text-xs">
                          {/* 9:16 Reels Preview */}
                          {previewPlacement === "9_16" && (
                            <div className="space-y-2">
                              <div className="relative mx-auto w-full max-w-[240px] h-[400px] rounded-2xl border-4 border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col justify-between">
                                {mediaUrl ? (
                                  mediaType === "video" ? (
                                    <video
                                      src={mediaUrl}
                                      controls
                                      autoPlay
                                      muted
                                      loop
                                      className="absolute inset-0 h-full w-full object-cover"
                                    />
                                  ) : (
                                    <img
                                      src={mediaUrl}
                                      alt="Reel Media"
                                      className="absolute inset-0 h-full w-full object-cover"
                                    />
                                  )
                                ) : (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-4 text-center bg-slate-900">
                                    <Film className="h-7 w-7 mb-1.5 text-primary/60 animate-pulse" />
                                    <p className="font-bold text-xs text-foreground">No Media Attached</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      Upload 1080x1920 video
                                    </p>
                                  </div>
                                )}

                                <div className="relative z-10 p-2.5 bg-gradient-to-b from-black/80 via-black/30 to-transparent flex items-center justify-between">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[9px] shadow">
                                      SLI
                                    </div>
                                    <div className="leading-tight drop-shadow">
                                      <p className="font-bold text-[11px] text-white">Sri Lakshmi Industries</p>
                                      <p className="text-[9px] text-slate-300">Sponsored • Reels</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline" className="text-[8px] bg-black/40 text-white border-white/20 px-1 py-0">
                                    9:16
                                  </Badge>
                                </div>

                                <div className="relative z-10 p-2.5 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-1.5">
                                  <p className="text-[10px] text-white/95 line-clamp-2 drop-shadow leading-snug">
                                    {adPrimaryText}
                                  </p>
                                  <Button
                                    size="sm"
                                    className="w-full h-6 text-[11px] font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                                    onClick={() => toast.info(`Reels CTA: Connects to ${objective === "CLICK_TO_WHATSAPP" ? whatsappNumber : objective === "CLICK_TO_CALL" ? callNumber : "Lead Form"}`)}
                                  >
                                    {objective === "CLICK_TO_WHATSAPP" && <><MessageCircle className="h-3 w-3" /> Chat on WhatsApp</>}
                                    {objective === "CLICK_TO_CALL" && <><PhoneCall className="h-3 w-3" /> Call Now</>}
                                    {objective === "INSTANT_LEAD_FORM" && <><FileText className="h-3 w-3" /> Get Quote</>}
                                  </Button>
                                </div>
                              </div>
                              <p className="text-[10px] text-center text-muted-foreground">
                                📱 Vertical 9:16 • Instagram &amp; Facebook Reels
                              </p>
                            </div>
                          )}

                          {/* 1:1 Feed Preview */}
                          {previewPlacement === "1_1" && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[10px] shadow-sm">
                                  SLI
                                </div>
                                <div className="leading-tight">
                                  <p className="font-bold text-xs text-foreground">Sri Lakshmi Industries</p>
                                  <p className="text-[9px] text-muted-foreground">Sponsored • 🌐</p>
                                </div>
                              </div>

                              <p className="text-[11px] text-foreground/90 line-clamp-2">
                                {adPrimaryText}
                              </p>

                              <div className="relative aspect-square w-full rounded-lg border border-border/80 bg-slate-950 overflow-hidden flex items-center justify-center">
                                {mediaUrl ? (
                                  mediaType === "video" ? (
                                    <video src={mediaUrl} controls className="h-full w-full object-cover" />
                                  ) : (
                                    <img src={mediaUrl} alt="Feed Creative" className="h-full w-full object-cover" />
                                  )
                                ) : (
                                  <div className="text-muted-foreground text-center p-3">
                                    <Film className="h-6 w-6 mx-auto mb-1 text-primary/60" />
                                    <p className="text-[11px]">No Media Attached</p>
                                  </div>
                                )}
                              </div>

                              <div className="rounded-lg border border-border p-2 bg-muted/40 flex items-center justify-between gap-1.5">
                                <div className="truncate flex-1">
                                  <p className="font-bold text-[11px] text-foreground truncate">
                                    {adHeadline}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] font-bold gap-1 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => toast.info(`Action: Connects to ${objective === "CLICK_TO_WHATSAPP" ? whatsappNumber : objective === "CLICK_TO_CALL" ? callNumber : "Lead Form"}`)}
                                >
                                  {objective === "CLICK_TO_WHATSAPP" && "WhatsApp"}
                                  {objective === "CLICK_TO_CALL" && "Call Now"}
                                  {objective === "INSTANT_LEAD_FORM" && "Get Quote"}
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* 16:9 Stream Preview */}
                          {previewPlacement === "16_9" && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary font-bold text-primary-foreground text-[10px] shadow-sm">
                                  SLI
                                </div>
                                <div className="leading-tight">
                                  <p className="font-bold text-xs text-foreground">Sri Lakshmi Industries</p>
                                  <p className="text-[9px] text-muted-foreground">Sponsored • In-Stream</p>
                                </div>
                              </div>

                              <p className="text-[11px] text-foreground/90 line-clamp-2">
                                {adPrimaryText}
                              </p>

                              <div className="relative aspect-video w-full rounded-lg border border-border/80 bg-slate-950 overflow-hidden flex items-center justify-center">
                                {mediaUrl ? (
                                  mediaType === "video" ? (
                                    <video src={mediaUrl} controls className="h-full w-full object-cover" />
                                  ) : (
                                    <img src={mediaUrl} alt="Stream Creative" className="h-full w-full object-cover" />
                                  )
                                ) : (
                                  <div className="text-muted-foreground text-center p-3">
                                    <Film className="h-6 w-6 mx-auto mb-1 text-primary/60" />
                                    <p className="text-[11px]">No Media Attached</p>
                                  </div>
                                )}
                              </div>

                              <div className="rounded-lg border border-border p-2 bg-muted/40 flex items-center justify-between gap-1.5">
                                <span className="font-bold text-[11px] text-foreground truncate">{adHeadline}</span>
                                <Button
                                  size="sm"
                                  className="h-6 text-[10px] font-bold gap-1 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={() => toast.info(`Action: Connects to ${objective === "CLICK_TO_WHATSAPP" ? whatsappNumber : objective === "CLICK_TO_CALL" ? callNumber : "Lead Form"}`)}
                                >
                                  {objective === "CLICK_TO_WHATSAPP" && "WhatsApp"}
                                  {objective === "CLICK_TO_CALL" && "Call Now"}
                                  {objective === "INSTANT_LEAD_FORM" && "Get Quote"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  {/* Bottom Navigation & Launch Action Bar */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t border-border/70 rounded-2xl bg-muted/20 p-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setLauncherStep("adset")}
                      className="gap-2 text-xs font-semibold"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to 2. Ad Set
                    </Button>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs font-semibold text-foreground">
                          Target Account: <code className="text-primary font-mono">act_245155721099304</code>
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          Status: <strong className={launchStatus === "ACTIVE" ? "text-emerald-500" : "text-amber-500"}>{launchStatus}</strong> • Budget: ₹{budget}/day
                        </p>
                      </div>

                      <Button
                        size="lg"
                        onClick={handleLaunch}
                        disabled={launching}
                        className="gap-2 bg-primary font-bold shadow-md hover:bg-primary/90 px-8"
                      >
                        <Rocket className={`h-5 w-5 ${launching ? "animate-bounce" : ""}`} />
                        {launching ? "Publishing to Meta..." : "🚀 Launch Live Campaign to Meta"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 2: 360° LIVE ANALYTICS (18 REPORTS) */}
        {/* ==================================================================== */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Executive KPI Summary Cards */}
          {/* Executive KPI Summary Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">{getPresetLabel(datePreset)} Ad Spend</CardDescription>
                <CardTitle className="text-lg font-bold text-foreground">
                  ₹{bundle ? bundle.overview.total_spend_30d.toLocaleString("en-IN") : "0"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Lifetime: ₹{bundle?.account?.amount_spent ? parseFloat(bundle.account.amount_spent).toLocaleString("en-IN") : "0"}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">{getPresetLabel(datePreset)} Form Leads</CardDescription>
                <CardTitle className="text-lg font-bold text-primary">
                  {bundle?.overview.total_leads_30d ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Synced directly to CRM
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">{getPresetLabel(datePreset)} WhatsApp Chats</CardDescription>
                <CardTitle className="text-lg font-bold text-emerald-500">
                  {bundle?.overview.total_chats_30d ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                {bundle?.overview.total_chats_30d ? "Cost / Conversation" : "No chats yet"}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">{getPresetLabel(datePreset)} Phone Calls</CardDescription>
                <CardTitle className="text-lg font-bold text-sky-500">
                  {bundle?.overview.total_calls_30d ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Click-to-Call Ads
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">Avg Cost Per Lead</CardDescription>
                <CardTitle className="text-lg font-bold text-amber-500">
                  ₹{bundle?.overview.avg_cpl ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-emerald-500">
                {bundle?.overview.avg_cpl ? "Average across campaigns" : "Awaiting active spend"}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">Ad Wallet Balance</CardDescription>
                <CardTitle className="text-lg font-bold text-blue-500">
                  ₹{bundle?.overview.wallet_balance ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-muted-foreground">
                Min Daily: ₹{bundle?.account?.min_daily_budget || 500}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="p-4 pb-1">
                <CardDescription className="text-xs">Post Savers & Shares</CardDescription>
                <CardTitle className="text-lg font-bold text-purple-500">
                  {bundle?.overview.saves_count ?? 0} 🔖 / {bundle?.overview.shares_count ?? 0} 📤
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-1 text-[11px] text-purple-400">
                Retargeting Ready
              </CardContent>
            </Card>
          </div>

          {/* Section A: Live Campaign Control Table */}
          <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span>Live Campaign Command (Report 1)</span>
                  <InfoTip
                    content="Instant status toggle and budget control directly in Sri Lakshmi CRM with zero delay."
                    title="Live Campaign Command"
                  />
                </CardTitle>
              </div>
              <Badge variant="outline" className="font-mono">
                {bundle?.campaigns.length || 0} Campaigns Active
              </Badge>
            </CardHeader>
            <CardContent>
              {/* Mobile Card List (Screens < 768px): Clean, compact, readable for Owners & Marketing */}
              <div className="block md:hidden space-y-3">
                {(!bundle?.campaigns || bundle.campaigns.length === 0) ? (
                  <div className="p-6 text-center text-muted-foreground rounded-2xl border border-dashed border-border/70 bg-muted/20">
                    {loading || syncing ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-4">
                        <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                        <p className="font-semibold text-xs text-foreground">Syncing Live Meta Campaigns...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1.5 py-4">
                        <Rocket className="h-6 w-6 text-muted-foreground/40" />
                        <p className="font-semibold text-xs text-foreground">No Published Campaigns Found</p>
                      </div>
                    )}
                  </div>
                ) : (
                  bundle.campaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="rounded-2xl border border-border/80 bg-card p-3.5 shadow-sm space-y-3 hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {camp.status === "ACTIVE" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] h-5 px-1.5 font-bold">
                                ACTIVE
                              </Badge>
                            ) : camp.status === "ARCHIVED" ? (
                              <Badge variant="outline" className="text-muted-foreground/70 border-muted text-[10px] h-5 px-1.5">
                                ARCHIVED
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-bold">
                                PAUSED
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                              {camp.objective}
                            </span>
                          </div>
                          <p className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                            {camp.name}
                          </p>
                        </div>
                      </div>

                      {/* 4-Stat Compact Grid */}
                      <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted/30 p-2.5 text-xs border border-border/40">
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Spend</p>
                          <p className="font-extrabold text-foreground text-sm">
                            ₹{camp.insights?.spend?.toLocaleString("en-IN") || "0"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Leads</p>
                          <button
                            type="button"
                            onClick={() => handleOpenLeads(camp)}
                            className="font-extrabold text-primary hover:underline text-sm flex items-center gap-1"
                          >
                            <Users className="h-3 w-3" />
                            {camp.insights?.results || 0}
                          </button>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Cost / Lead</p>
                          <p className="font-bold text-amber-500 text-xs">
                            ₹{camp.insights?.cost_per_result || 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Daily Budget</p>
                          <p className="font-mono text-xs font-semibold text-foreground">
                            ₹{camp.daily_budget ? Math.round(Number(camp.daily_budget) / 100) : "N/A"}
                          </p>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 h-8 text-xs font-bold gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm"
                          onClick={() => handleOpenInspector(camp, "summary")}
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          View Ad Summary & History
                        </Button>
                        {camp.status !== "ARCHIVED" && (
                          <Button
                            variant={camp.status === "ACTIVE" ? "outline" : "secondary"}
                            size="sm"
                            className="h-8 text-xs px-2.5 font-semibold shrink-0"
                            onClick={() => handleToggleCampaign(camp.id, camp.status)}
                          >
                            {camp.status === "ACTIVE" ? (
                              <>
                                <Pause className="h-3 w-3 mr-1" /> Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" /> Play
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Desktop Table View (Screens >= 768px) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                    <tr>
                      <th className="p-3">Status</th>
                      <th className="p-3">Campaign Name</th>
                      <th className="p-3">Objective</th>
                      <th className="p-3">Spend ({getPresetLabel(datePreset)})</th>
                      <th className="p-3">Results</th>
                      <th className="p-3">Cost / Result</th>
                      <th className="p-3">Daily Budget</th>
                      <th className="p-3 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {(!bundle?.campaigns || bundle.campaigns.length === 0) ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground">
                          {loading || syncing ? (
                            <div className="flex flex-col items-center justify-center gap-2.5 py-6">
                              <RefreshCw className="h-7 w-7 animate-spin text-primary" />
                              <p className="font-semibold text-sm text-foreground">
                                Syncing Live Meta Marketing API Campaigns...
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Fetching real-time campaigns and performance metrics from Sri Lakshmi Ad Account ({bundle?.account?.id || "act_245155721099304"}).
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-6">
                              <Rocket className="h-8 w-8 text-muted-foreground/30" />
                              <p className="font-semibold text-sm text-foreground">
                                No Published Campaigns Found in Sri Lakshmi Ad Account ({bundle?.account?.id || "act_245155721099304"})
                              </p>
                              <p className="text-xs text-muted-foreground max-w-md">
                                All active campaigns published in your Meta Ads Manager will appear here automatically with real-time controls and lead attribution.
                              </p>
                            </div>
                          )}
                        </td>
                      </tr>
                    ) : (
                      bundle.campaigns.map((camp) => (
                        <tr key={camp.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3">
                            {camp.status === "ACTIVE" ? (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                                ACTIVE
                              </Badge>
                            ) : camp.status === "ARCHIVED" ? (
                              <Badge variant="outline" className="text-muted-foreground/70 border-muted">
                                ARCHIVED
                              </Badge>
                            ) : (
                              <Badge variant="secondary">PAUSED</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleOpenInspector(camp)}
                              className="font-semibold text-foreground hover:text-primary transition-colors hover:underline text-left inline-flex items-center gap-1.5 group cursor-pointer"
                              title="Click to Inspect & Edit Campaign details"
                            >
                              <span>{camp.name}</span>
                              <Sliders className="h-3 w-3 text-primary/60 group-hover:text-primary group-hover:scale-110 transition-all shrink-0" />
                            </button>
                          </td>
                          <td className="p-3 text-muted-foreground">{camp.objective}</td>
                          <td className="p-3 font-semibold">
                            ₹{camp.insights?.spend?.toLocaleString("en-IN") || "0"}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => handleOpenLeads(camp)}
                              className="group inline-flex items-center gap-1.5 font-bold text-primary hover:text-emerald-500 hover:underline transition-all cursor-pointer text-left"
                              title="Click to view all leads for this campaign"
                            >
                              <Users className="h-3.5 w-3.5 text-primary group-hover:scale-110 group-hover:text-emerald-500 transition-all" />
                              <span>{camp.insights?.results || 0} ({camp.insights?.result_type || "Leads"})</span>
                            </button>
                          </td>
                          <td className="p-3 font-semibold text-amber-500">
                            ₹{camp.insights?.cost_per_result || 0}
                          </td>
                          <td className="p-3 font-mono">
                            ₹{camp.daily_budget ? Math.round(Number(camp.daily_budget) / 100) : "N/A"}
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs gap-1 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={() => handleOpenInspector(camp, "summary")}
                                title="Open 360° Ad Summary & Performance History"
                              >
                                <Sparkles className="h-3 w-3" /> Summary & History
                              </Button>
                              {camp.status === "ARCHIVED" ? (
                                <Badge variant="outline" className="h-7 text-xs px-2 text-muted-foreground border-border/60">
                                  Archived
                                </Badge>
                              ) : (
                                <Button
                                  variant={camp.status === "ACTIVE" ? "outline" : "default"}
                                  size="sm"
                                  className="h-7 text-xs gap-1 font-semibold"
                                  onClick={() => handleToggleCampaign(camp.id, camp.status)}
                                >
                                  {camp.status === "ACTIVE" ? (
                                    <>
                                      <Pause className="h-3 w-3" /> Pause
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-3 w-3" /> Resume
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Section B: State ROI & Hourly Heatmap (2 Charts) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Report 3: State ROI */}
            <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>State-Wise Lead Generation & CPL (Report 3)</span>
                    <InfoTip
                      content="Odisha (₹24) & AP (₹26.7) produce the cheapest leads across India."
                      title="State-Wise CPL"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs">Top: MH & TN</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bundle?.state_breakdown || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(val: any, name: any) =>
                        name === "spend" ? `₹${val}` : val
                      }
                    />
                    <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cpl" fill="#f59e0b" name="Cost Per Lead (₹)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Report 6: Hourly Peak Heatmap */}
            <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>24-Hour Lead Inflow Heatmap (Report 6)</span>
                    <InfoTip
                      content="Machinery owners respond best at night (9-10 PM) and lunch (1-2 PM)."
                      title="Peak Lead Inflow Hours"
                    />
                  </div>
                  <Badge variant="outline" className="text-xs">Peak: 9-10 PM</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={bundle?.hourly || []}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="leads"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      name="Leads Generated"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Section C: Placement & Demographics */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Report 5: Placement Performance */}
            <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Placement ROI Breakdown (Report 5)</span>
                  <InfoTip
                    content="WhatsApp Status is a ₹9.70 goldmine; Instagram Reels is ₹105.90 (too expensive)."
                    title="Placement Breakdown"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bundle?.placements.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-border/80 p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold capitalize text-foreground">
                          {p.publisher_platform} - {p.platform_position.replace("_", " ")}
                        </p>
                        <p className="text-muted-foreground text-[11px]">
                          Spend: ₹{p.spend.toLocaleString("en-IN")} | CTR: {p.ctr}%
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-primary">{p.leads} Results</p>
                        <p className={`font-semibold ${p.cpl > 60 ? "text-destructive" : "text-emerald-500"}`}>
                          ₹{p.cpl} / result
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Report 4: Age Leak Detector */}
            <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <span>Age Leak Detector (Report 4)</span>
                  <InfoTip
                    content="Ages 18-24 & 65+ waste ₹5,239 without generating machinery sales."
                    title="Age Demographics"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bundle?.demographics.map((d, idx) => {
                    const isLeak = d.age === "18-24" || d.age === "65+";
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between rounded-lg border p-3 text-xs ${
                          isLeak
                            ? "border-amber-500/40 bg-amber-500/5 text-amber-500"
                            : "border-border/80 bg-muted/20"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-foreground">Age {d.age}</span>
                            {isLeak && (
                              <Badge variant="outline" className="border-amber-500/40 text-[10px] text-amber-500">
                                Budget Leak
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-[11px] mt-0.5">
                            Spend: ₹{d.spend.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground">{d.leads} Leads</p>
                          <p className="font-mono text-[11px]">CPL: ₹{d.cpl}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Section D: Video Retention Funnel (Report 9) */}
          <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span>Video Retention & Drop-Off Funnel (Report 9)</span>
                <InfoTip
                  content="Analysis of 1,62,908 views — drop-off happens within 4-5 seconds."
                  title="Video Retention"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-5 text-center">
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">3s Visual Hook</p>
                  <p className="text-lg font-bold text-primary mt-1">1,62,908</p>
                  <p className="text-[11px] text-muted-foreground">34.2% Rate</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">25% Watched</p>
                  <p className="text-lg font-bold text-foreground mt-1">26,152</p>
                  <p className="text-[11px] text-muted-foreground">5.5%</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">50% Watched</p>
                  <p className="text-lg font-bold text-foreground mt-1">11,420</p>
                  <p className="text-[11px] text-muted-foreground">2.4%</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">75% Watched</p>
                  <p className="text-lg font-bold text-foreground mt-1">6,840</p>
                  <p className="text-[11px] text-muted-foreground">1.4%</p>
                </div>
                <div className="rounded-lg border border-border p-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">100% Watched</p>
                  <p className="text-lg font-bold text-emerald-500 mt-1">4,120</p>
                  <p className="text-[11px] text-emerald-500">High Intent Buyers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 3: CREATIVE LAB & SAFE-ZONE SIMULATOR */}
        {/* ==================================================================== */}
        <TabsContent value="creative" className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Phone Safe-Zone Simulator */}
            <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-primary" />
                    <span>Mobile Safe-Zone Simulator</span>
                    <InfoTip
                      content="Keep phone numbers & machinery text inside the Green Golden Zone so Meta UI doesn't crop it on Reels & Feed."
                      title="Safe-Zone Simulator"
                    />
                  </CardTitle>
                  <div className="flex gap-1">
                    <Button
                      variant={safeZoneFormat === "9_16" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSafeZoneFormat("9_16")}
                    >
                      9:16 (Reels)
                    </Button>
                    <Button
                      variant={safeZoneFormat === "1_1" ? "default" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setSafeZoneFormat("1_1")}
                    >
                      1:1 (Feed)
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex justify-center p-4">
                {/* Simulated Phone Frame */}
                <div className="relative h-[480px] w-[270px] rounded-3xl border-4 border-slate-700 bg-slate-900 shadow-2xl overflow-hidden flex flex-col justify-between">
                  {/* Top Red UI Exclusion Zone */}
                  <div className="h-[14%] w-full bg-red-500/30 border-b border-red-500/50 flex items-center justify-center text-[10px] text-red-200 font-mono">
                    ⚠️ Header Block (250px)
                  </div>

                  {/* Golden Center Zone (Murukku Machine Visual) */}
                  <div className="flex-1 w-full bg-emerald-500/10 border-y border-emerald-500/40 flex flex-col items-center justify-center p-3 text-center">
                    <div className="rounded-lg bg-emerald-500/20 px-2 py-1 text-emerald-300 font-bold text-xs">
                      ✅ GOLDEN SAFE ZONE (51%)
                    </div>
                    <p className="mt-2 text-[11px] text-slate-300">
                      Place Murukku Machine Extrusion, Phone Number, and 30-50 kg/hr Text Here!
                    </p>
                  </div>

                  {/* Bottom Red UI Exclusion Zone */}
                  <div className="h-[35%] w-full bg-red-500/30 border-t border-red-500/50 flex flex-col items-center justify-center text-[10px] text-red-200 font-mono p-2">
                    <p>⚠️ Audio, Caption & CTA Bar (630px)</p>
                    <div className="mt-2 h-6 w-36 rounded bg-primary/80 flex items-center justify-center text-[9px] text-white">
                      [Send WhatsApp Message]
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Video Blueprint Checklist */}
            <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Video className="h-4 w-4 text-primary" />
                  <span>25–35s Murukku Video Formula Checklist</span>
                  <InfoTip
                    content="Meta 2026 Andromeda algorithm requires high 3-second visual retention for B2B machinery ads."
                    title="Video Retention Checklist"
                  />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setVideoChecklist((s) => ({ ...s, hook: !s.hook }))}
                >
                  <input type="checkbox" checked={videoChecklist.hook} readOnly className="mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">0–3s Hypnotic Visual Hook & Motor Sound</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Show high-speed Murukku dough extrusion immediately. Never start with a talking head or static logo.
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setVideoChecklist((s) => ({ ...s, material: !s.material }))}
                >
                  <input type="checkbox" checked={videoChecklist.material} readOnly className="mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">3–12s SS 304 Food-Grade Stainless Steel Proof</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Close-up shot of heavy-duty fabrication and food-grade certified dies.
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setVideoChecklist((s) => ({ ...s, capacity: !s.capacity }))}
                >
                  <input type="checkbox" checked={videoChecklist.capacity} readOnly className="mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">12–20s Commercial Output Capacity</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Show dough batch being loaded and continuous production of 30–50 kg/hour.
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setVideoChecklist((s) => ({ ...s, roi: !s.roi }))}
                >
                  <input type="checkbox" checked={videoChecklist.roi} readOnly className="mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">20–28s Price / ROI Value Anchor</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Mention "Recovers investment in 30 days" instead of raw machine price.
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer hover:bg-muted/30"
                  onClick={() => setVideoChecklist((s) => ({ ...s, cta: !s.cta }))}
                >
                  <input type="checkbox" checked={videoChecklist.cta} readOnly className="mt-1" />
                  <div>
                    <p className="font-semibold text-foreground">28–35s Direct CTA (WhatsApp & Catalogue)</p>
                    <p className="text-muted-foreground text-[11px] mt-0.5">
                      Clear arrow pointing downwards to the "Send Message" WhatsApp button.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 4: AI AD DOCTOR & POLICY GUARD */}
        {/* ==================================================================== */}
        <TabsContent value="doctor" className="space-y-6">
          <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-emerald-500" />
                <span>Meta Ads Compliance Guard (Zero Account Ban Protection)</span>
                <InfoTip
                  content="Scans ad headlines and text for forbidden financial claims, machine safety guidelines, and patented food-grade SS 304 Murukku machinery exclusivity."
                  title="Policy Doctor"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-lg border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                    <AlertTriangle className="h-4 w-4" /> Prohibited Income Guarantees
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Words like "Earn ₹50,000/day" or "100% Guaranteed profit" trigger instant account suspension.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                    <Info className="h-4 w-4" /> Operational Safety Standards
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Never depict hands inside active moving cutters. Highlight safety guards and food-grade SS 304 build.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Murukku Machinery Exclusivity
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Sri Lakshmi Industries manufactures ONLY commercial automatic Murukku making machines.
                  </p>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold">Test Copy Scanner</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter ad headline or copy to test..."
                    value={adHeadline}
                    onChange={(e) => setAdHeadline(e.target.value)}
                  />
                  <Button onClick={handleCheckLint} disabled={linting}>
                    {linting ? "Scanning..." : "Scan Copy"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================================================================== */}
        {/* TAB 5: TOKEN & SETTINGS */}
        {/* ==================================================================== */}
        <TabsContent value="settings" className="space-y-6">
          <Card className="rounded-3xl border-border/80 bg-card/90 shadow-sm ring-1 ring-border/30 luxury-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                <span>Meta Ads API Connection & Access Token</span>
                <InfoTip
                  content="Configure or update your Meta Ads Access Token whenever refreshed via Facebook Developer App or System User."
                  title="Meta API Configuration"
                />
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-xl">
              <div className="rounded-lg border border-border p-4 bg-muted/20 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ad Account ID:</span>
                  <span className="font-mono font-bold text-foreground">
                    {bundle?.account?.id || "act_245155721099304"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business Page ID:</span>
                  <span className="font-mono font-bold text-foreground">676208215584034</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Connection Status:</span>
                  {healthStatus?.connected ? (
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                      ✅ Connected ({healthStatus?.name})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                      ⚠️ Token Needs Refresh
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Update Meta Ads Access Token</Label>
                <Textarea
                  rows={3}
                  placeholder="Paste your 60-day or System User Meta Access Token (starts with EAA... or EAB...)"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>

              <Button
                onClick={handleSaveToken}
                disabled={savingToken}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                {savingToken ? "Testing & Saving..." : "Save & Verify Connection"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Interactive Token Modal Dialog */}
      <Dialog open={tokenModalOpen} onOpenChange={setTokenModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Key className="h-5 w-5 text-primary" />
              Connect Meta Ads Access Token
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Paste your Meta Access Token to enable live campaign controls, budget changes, and direct ad launching.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-lg border border-border p-3 bg-muted/40 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Ad Account:</span>
                <span className="font-mono font-bold text-foreground">{bundle?.account?.id || "act_245155721099304"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Business Page ID:</span>
                <span className="font-mono font-bold text-foreground">676208215584034</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Current Status:</span>
                {healthStatus?.connected ? (
                  <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                    ✅ Connected ({healthStatus?.name})
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                    ⚠️ Needs Token / Offline
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Meta Ads Access Token (EAA... / EAB...)</Label>
              <Textarea
                rows={4}
                placeholder="Paste your System User Token or 60-day User Token here..."
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                className="font-mono text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Generate token via Facebook Developer App &rarr; Graph API Explorer or Meta Business Suite System Users with <code>ads_management</code> & <code>ads_read</code>.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTokenModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveToken}
              disabled={savingToken}
              className="gap-1.5 bg-primary font-semibold"
            >
              <Check className="h-4 w-4" />
              {savingToken ? "Testing & Saving..." : "Save & Verify Connection"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Advanced Placement Preview Dialog (Exact Simulation of Screenshot 4: 9:16 Reels vs 1:1 Feeds vs 16:9 Stream) */}
      <Dialog open={advancedPlacementModalOpen} onOpenChange={setAdvancedPlacementModalOpen}>
        <DialogContent
          className={cn(
            "flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl transition-all duration-150",
            isFullscreenPreview
              ? "!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none z-50"
              : "!fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 !w-[96vw] !max-w-[96vw] !h-[92vh] !max-h-[92vh] rounded-2xl z-50"
          )}
        >
          <DialogHeader className="p-4 pb-3 border-b border-border/80 bg-muted/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <DialogTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  Advanced Preview — Advantage+ Multi-Placement Simulator
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Review how your ad will appear on different placements as well as how it might be adapted with Advantage+ creative.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/30 font-semibold gap-1.5 py-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  Advantage+ Auto-Adapting
                </Badge>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  onClick={() => setIsFullscreenPreview((prev) => !prev)}
                >
                  {isFullscreenPreview ? (
                    <>
                      <Minimize2 className="h-3.5 w-3.5" /> Standard View (96%)
                    </>
                  ) : (
                    <>
                      <Maximize2 className="h-3.5 w-3.5" /> Full Display (100%)
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Placement Filter Pills (Matching Screenshot 4 Top Navigation) */}
            <div className="flex items-center gap-1.5 pt-3 overflow-x-auto text-xs">
              <Button
                type="button"
                variant={advancedModalFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setAdvancedModalFilter("all")}
              >
                All Placements (9)
              </Button>
              <Button
                type="button"
                variant={advancedModalFilter === "feeds" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setAdvancedModalFilter("feeds")}
              >
                Feeds & Marketplace (1:1)
              </Button>
              <Button
                type="button"
                variant={advancedModalFilter === "stories_reels" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setAdvancedModalFilter("stories_reels")}
              >
                Stories, Status & Reels (9:16)
              </Button>
              <Button
                type="button"
                variant={advancedModalFilter === "stream" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setAdvancedModalFilter("stream")}
              >
                In-Stream & Search (16:9)
              </Button>
            </div>
          </DialogHeader>

          {/* Placements Mockup Grid */}
          <div className="flex-1 overflow-y-auto p-4 bg-muted/15 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">

              {/* CARD 1: Facebook Feed (1:1 Square) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "feeds") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <p className="font-bold text-xs text-foreground flex items-center gap-1">
                        <LayoutGrid className="h-3 w-3 text-primary" /> Facebook Feed
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">1:1 Square</Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground font-bold text-[9px] flex items-center justify-center">SLI</div>
                      <div className="leading-none">
                        <p className="text-[11px] font-bold">{bundle?.account?.name || "Sri Lakshmi Industries"}</p>
                        <p className="text-[9px] text-muted-foreground">Sponsored • 🌐</p>
                      </div>
                    </div>
                    <p className="text-[11px] text-foreground/90 line-clamp-2 mt-1.5">{adPrimaryText}</p>
                  </div>

                  <div className="relative aspect-square w-full rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center my-1">
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="FB Feed" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <Film className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="rounded border border-border/80 p-2 bg-muted/40 flex items-center justify-between gap-1 text-[10px]">
                    <span className="font-semibold truncate max-w-[120px]">{adHeadline}</span>
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 shrink-0">WhatsApp</Badge>
                  </div>
                </div>
              )}

              {/* CARD 2: Instagram Feed (1:1 Square) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "feeds") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <p className="font-bold text-xs text-foreground flex items-center gap-1">
                        <LayoutGrid className="h-3 w-3 text-pink-500" /> Instagram Feed
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">1:1 Square</Badge>
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <div className="h-6 w-6 rounded-full bg-gradient-to-tr from-amber-500 to-pink-500 p-0.5">
                        <div className="h-full w-full rounded-full bg-primary text-primary-foreground font-bold text-[8px] flex items-center justify-center">SLI</div>
                      </div>
                      <div className="leading-none">
                        <p className="text-[11px] font-bold">srilakshmi_murukku_machines</p>
                        <p className="text-[9px] text-muted-foreground">Sponsored</p>
                      </div>
                    </div>
                  </div>

                  <div className="relative aspect-square w-full rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center my-1">
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="IG Feed" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <Film className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs px-1">
                      <div className="flex items-center gap-2">
                        <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" />
                        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Chat on WhatsApp</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                      <strong>srilakshmi_murukku_machines</strong> {adPrimaryText}
                    </p>
                  </div>
                </div>
              )}

              {/* CARD 3: Instagram Reels (9:16 Vertical 1080x1920) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "stories_reels") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <p className="font-bold text-xs text-foreground flex items-center gap-1">
                      <Smartphone className="h-3 w-3 text-pink-500" /> Instagram Reels
                    </p>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1 py-0">9:16 (1080x1920)</Badge>
                  </div>

                  {/* Simulated Vertical Phone */}
                  <div className="relative mx-auto w-full h-[320px] rounded-xl border-2 border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex flex-col justify-between">
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls autoPlay muted loop className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="Reel" className="absolute inset-0 h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><Film className="h-6 w-6" /></div>
                    )}

                    <div className="relative z-10 p-2 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white text-[9px]">
                      <span className="font-bold">Reels • Sponsored</span>
                      <span>1080x1920</span>
                    </div>

                    <div className="relative z-10 p-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-1.5 text-white">
                      <p className="text-[10px] font-semibold line-clamp-1">{bundle?.account?.name || "Sri Lakshmi Industries"}</p>
                      <p className="text-[9px] text-slate-300 line-clamp-1">{adHeadline}</p>
                      <div className="w-full py-1 rounded bg-emerald-600 text-center font-bold text-[9px]">
                        Send WhatsApp Message
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">Native 9:16 Full Screen Experience</p>
                </div>
              )}

              {/* CARD 4: Facebook Reels (9:16 Vertical) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "stories_reels") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <p className="font-bold text-xs text-foreground flex items-center gap-1">
                      <Smartphone className="h-3 w-3 text-blue-500" /> Facebook Reels
                    </p>
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[9px] px-1 py-0">9:16 (1080x1920)</Badge>
                  </div>

                  <div className="relative mx-auto w-full h-[320px] rounded-xl border-2 border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex flex-col justify-between">
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls autoPlay muted loop className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="FB Reel" className="absolute inset-0 h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><Film className="h-6 w-6" /></div>
                    )}

                    <div className="relative z-10 p-2 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white text-[9px]">
                      <span className="font-bold">FB Reels</span>
                      <span className="text-slate-300">Sponsored</span>
                    </div>

                    <div className="relative z-10 p-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent space-y-1.5 text-white">
                      <p className="text-[9px] text-slate-200 line-clamp-1">{adPrimaryText}</p>
                      <div className="w-full py-1 rounded bg-emerald-600 text-center font-bold text-[9px]">
                        Chat on WhatsApp
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">High 3s Hook Retention Placement</p>
                </div>
              )}

              {/* CARD 5: Instagram & Facebook Stories (9:16 Vertical) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "stories_reels") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <p className="font-bold text-xs text-foreground flex items-center gap-1">
                      <Smartphone className="h-3 w-3 text-purple-500" /> Instagram Stories
                    </p>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">9:16 Vertical</Badge>
                  </div>

                  <div className="relative mx-auto w-full h-[320px] rounded-xl border-2 border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex flex-col justify-between">
                    {/* Top Stories Progress Line */}
                    <div className="relative z-10 p-2 pt-1.5 flex items-center gap-1">
                      <div className="h-0.5 flex-1 rounded bg-white"></div>
                      <div className="h-0.5 flex-1 rounded bg-white/40"></div>
                    </div>

                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls autoPlay muted loop className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="Story" className="absolute inset-0 h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><Film className="h-6 w-6" /></div>
                    )}

                    <div className="relative z-10 p-2 bg-gradient-to-t from-black/90 to-transparent text-center space-y-1">
                      <div className="inline-block px-3 py-1 rounded-full bg-white text-black font-bold text-[9px] shadow">
                        Swipe Up / WhatsApp
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">24h Ephemeral Stories Format</p>
                </div>
              )}

              {/* CARD 6: WhatsApp Status (9:16 Vertical) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "stories_reels") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2 border-b border-border/60">
                    <p className="font-bold text-xs text-foreground flex items-center gap-1">
                      <MessageCircle className="h-3 w-3 text-emerald-500" /> WhatsApp Status
                    </p>
                    <Badge variant="secondary" className="text-[9px] px-1 py-0">9:16 Vertical</Badge>
                  </div>

                  <div className="relative mx-auto w-full h-[320px] rounded-xl border-2 border-slate-700 bg-slate-950 overflow-hidden shadow-inner flex flex-col justify-between">
                    <div className="relative z-10 p-2 bg-emerald-950/80 text-white flex items-center justify-between text-[9px]">
                      <span className="font-semibold">Sri Lakshmi Status</span>
                      <span>Just now</span>
                    </div>

                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls autoPlay muted loop className="absolute inset-0 h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="WA Status" className="absolute inset-0 h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><Film className="h-6 w-6" /></div>
                    )}

                    <div className="relative z-10 p-2 bg-black/80 text-center">
                      <div className="w-full py-1 rounded bg-emerald-600 text-white font-bold text-[9px]">
                        Reply to Sri Lakshmi
                      </div>
                    </div>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">Direct Click-To-WhatsApp Status</p>
                </div>
              )}

              {/* CARD 7: Facebook Marketplace (1:1 Square) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "feeds") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <p className="font-bold text-xs text-foreground flex items-center gap-1">
                        <Wallet className="h-3 w-3 text-amber-500" /> Facebook Marketplace
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">1:1 Square</Badge>
                    </div>
                    <p className="text-[11px] font-bold mt-2 truncate">Automatic Murukku Making Machine</p>
                    <p className="text-[10px] text-emerald-500 font-semibold">₹3,25,000 • Coimbatore Ex-Factory</p>
                  </div>

                  <div className="relative aspect-square w-full rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center my-1">
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="Marketplace" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <Film className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="rounded border border-border/80 p-1.5 bg-muted/40 flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Commercial Buyer</span>
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Message Seller</Badge>
                  </div>
                </div>
              )}

              {/* CARD 8: Facebook In-Stream Video & Reels (16:9 Landscape) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "stream") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <p className="font-bold text-xs text-foreground flex items-center gap-1">
                        <Monitor className="h-3 w-3 text-cyan-500" /> Facebook In-Stream Video
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">16:9 Landscape</Badge>
                    </div>
                    <p className="text-[11px] font-semibold text-foreground truncate mt-2">{adHeadline}</p>
                  </div>

                  <div className="relative aspect-video w-full rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center my-1">
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="In-Stream" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <Film className="h-6 w-6 text-muted-foreground" />
                    )}
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                      Ad • 0:15
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Plays during video streams</span>
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Learn More</Badge>
                  </div>
                </div>
              )}

              {/* CARD 9: Search Results & Explore (1:1 Square) */}
              {(advancedModalFilter === "all" || advancedModalFilter === "stream") && (
                <div className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-border/60">
                      <p className="font-bold text-xs text-foreground flex items-center gap-1">
                        <Eye className="h-3 w-3 text-indigo-500" /> Search Results & Explore
                      </p>
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">1:1 Square</Badge>
                    </div>
                    <p className="text-[11px] font-semibold text-foreground truncate mt-2">{adHeadline}</p>
                  </div>

                  <div className="relative aspect-square w-full rounded-lg bg-slate-950 overflow-hidden flex items-center justify-center my-1">
                    {mediaUrl ? (
                      mediaType === "video" ? (
                        <video src={mediaUrl} controls className="h-full w-full object-cover" />
                      ) : (
                        <img src={mediaUrl} alt="Explore" className="h-full w-full object-cover" />
                      )
                    ) : (
                      <Film className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-muted-foreground">Keyword discovery</span>
                    <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">Contact</Badge>
                  </div>
                </div>
              )}

            </div>

            {/* Information Banner matching Meta Ads Manager */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                How Meta Advantage+ Creative Handles Your 1080x1920 Video Across All Sizes:
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                1080x1920 (9:16) வீடியோதான் Meta-வின் Master Video Format ஆகும். நீங்கள் இந்த ஒரே வீடியோவை அப்லோட் செய்தால் போதுமானது. Meta-வின் AI அல்காரிதம் Facebook Feed (1:1), Instagram Reels (9:16), WhatsApp Status, மற்றும் In-Stream Video (16:9) போன்ற அனைத்து இடங்களிலும் வீடியோவின் மையப்பகுதி (Golden Zone) கட் ஆகாதவாறு தானாகவே பிக்சலை ரீ-அட்ஜஸ்ட் செய்து பிளே செய்யும்.
              </p>
            </div>
          </div>

          <div className="p-3 border-t border-border/80 bg-muted/40 flex justify-end">
            <Button
              type="button"
              size="sm"
              onClick={() => setAdvancedPlacementModalOpen(false)}
              className="bg-primary text-primary-foreground font-semibold px-4"
            >
              Done / Close Preview
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meta Instant Lead Form Builder Studio Modal (Matching Screenshots 1 to 5) */}
      <LeadFormBuilderModal
        open={leadFormBuilderOpen}
        onOpenChange={setLeadFormBuilderOpen}
        onFormCreated={(newForm) => {
          setSelectedLeadForm(newForm);
          setLeadFormsList((prev) => [newForm, ...prev]);
        }}
        pageName={bundle?.account?.name || "Sri Lakshmi Industries"}
      />

      {/* Live Campaign Leads Viewer Modal */}
      <CampaignLeadsModal
        open={leadsModalOpen}
        onOpenChange={setLeadsModalOpen}
        campaign={selectedCampaignForLeads}
        datePreset={datePreset}
        presetLabel={getPresetLabel(datePreset)}
      />

      {/* Meta Ads Manager 3-Level Live Inspector & Editor Modal */}
      <CampaignInspectorModal
        open={inspectorOpen}
        onOpenChange={setInspectorOpen}
        campaignId={selectedCampaignId}
        initialCampaignName={selectedCampaignName}
        initialStatus={selectedCampaignStatus}
        campaignInsights={selectedCampaignInsights}
        initialLevel={inspectorInitialLevel}
        onUpdated={fetchInsights}
      />

      {/* Add Locations in Bulk Modal */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="sm:max-w-md p-5 bg-background border-border shadow-2xl rounded-2xl z-50">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground">
              Add locations in bulk
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select your location type and paste states, cities, or districts separated by commas or lines.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Location type:</Label>
              <Select
                value={bulkLocationType}
                onValueChange={(val: any) => setBulkLocationType(val)}
              >
                <SelectTrigger className="h-8 text-xs font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="regions">Countries or regions (States)</SelectItem>
                  <SelectItem value="cities">Towns / Cities</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Paste locations list:
              </Label>
              <Textarea
                value={bulkInputText}
                onChange={(e) => setBulkInputText(e.target.value)}
                placeholder="e.g.&#10;Tamil Nadu&#10;Kerala&#10;Maharashtra&#10;Karnataka&#10;Gujarat"
                rows={6}
                className="text-xs font-mono resize-none"
              />
              <p className="text-[10px] text-muted-foreground">
                Separate each state or city by a new line or comma.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setBulkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleBulkMatch}
              disabled={isProcessingBulk || !bulkInputText.trim()}
              className="bg-primary text-primary-foreground font-semibold px-4"
            >
              {isProcessingBulk ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              Match & Add Locations
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Location Preset Modal */}
      <Dialog open={saveLocationModalOpen} onOpenChange={setSaveLocationModalOpen}>
        <DialogContent className="sm:max-w-md p-5 bg-background border-border shadow-2xl rounded-2xl z-50">
          <DialogHeader className="pb-2 border-b border-border/60">
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-primary" />
              Save Selected Locations as Preset
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Save your current target locations ({selectedLocations.length} selected) to reuse with 1-click in future campaigns.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Preset Name:</Label>
              <Input
                value={newLocationPresetName}
                onChange={(e) => setNewLocationPresetName(e.target.value)}
                placeholder="e.g., South Core (TN + AP + KA), Tier 1 Industrial, etc."
                className="text-xs"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSaveLocationPreset();
                  }
                }}
              />
            </div>

            <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Included Locations ({selectedLocations.length})</span>
                {(() => {
                  const perf = calculateLocationPerformance(selectedLocations);
                  return (
                    <Badge variant="outline" className={`text-[10px] font-bold ${
                      perf.rating === "winner" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                      perf.rating === "steady" ? "bg-blue-500/10 text-blue-600 border-blue-500/20" :
                      "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}>
                      {perf.totalLeads > 0 ? `Est. ₹${perf.avgCpl} CPL` : "New Region"}
                    </Badge>
                  );
                })()}
              </div>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                {selectedLocations.map((loc) => (
                  <Badge key={loc.key} variant="secondary" className="text-[10px] px-2 py-0.5">
                    {loc.name}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSaveLocationModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveLocationPreset}
              disabled={!newLocationPresetName.trim() || selectedLocations.length === 0}
              className="bg-primary text-primary-foreground font-semibold px-4 gap-1.5"
            >
              <Bookmark className="h-3.5 w-3.5" />
              Save Location Preset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
}
