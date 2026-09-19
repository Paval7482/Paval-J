"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Phone,
  PhoneCall,
  MessageSquare,
  Search,
  RefreshCw,
  UserCheck,
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Radio,
  Layers,
  MapPin,
  Building,
  Check,
  Sparkles,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface MetaLead {
  id: string;
  note_id: string;
  deal_id?: string | null;
  stage_name: string;
  customer_name: string;
  customer_phone: string;
  campaign_name: string;
  form_name: string;
  language: string;
  location: string;
  requirement: string;
  raw_note?: string;
  assigned_profile_id?: string | null;
  assigned_user_id?: string | null;
  assigned_agent_name: string;
  created_at: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
}

const DATE_PRESETS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "custom", label: "Custom Range" },
];

function calculateDateRange(preset: string): { start: string; end: string; label: string } {
  const now = new Date();
  const formatDate = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatDisplay = (dStr: string) => {
    if (!dStr) return "";
    const d = new Date(dStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  if (preset === "today") {
    const d = formatDate(now);
    return { start: d, end: d, label: `${formatDisplay(d)} - ${formatDisplay(d)}` };
  }
  if (preset === "yesterday") {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 1);
    const d = formatDate(prev);
    return { start: d, end: d, label: `${formatDisplay(d)} - ${formatDisplay(d)}` };
  }
  if (preset === "last7") {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 6);
    const s = formatDate(prev);
    const e = formatDate(now);
    return { start: s, end: e, label: `${formatDisplay(s)} - ${formatDisplay(e)}` };
  }
  if (preset === "last30") {
    const prev = new Date(now);
    prev.setDate(prev.getDate() - 29);
    const s = formatDate(prev);
    const e = formatDate(now);
    return { start: s, end: e, label: `${formatDisplay(s)} - ${formatDisplay(e)}` };
  }
  if (preset === "thisMonth") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const s = formatDate(firstDay);
    const e = formatDate(now);
    return { start: s, end: e, label: `${formatDisplay(s)} - ${formatDisplay(e)}` };
  }
  return { start: "", end: "", label: "All Dates" };
}

function formatDateDisplay(dateStr?: string | null) {
  if (!dateStr) return "Recent";
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  } catch {
    // Fallback
  }
  return dateStr;
}

export default function MetaLeadsPage() {
  const { accountRole, user } = useAuth();
  const isAdminOrOwner =
    accountRole === "owner" ||
    accountRole === "admin" ||
    user?.email?.toLowerCase().includes("admin");

  const [leads, setLeads] = useState<MetaLead[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [campaignFilter, setCampaignFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  // Date Filter State
  const [datePreset, setDatePreset] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (campaignFilter !== "all") params.set("campaign", campaignFilter);
      if (agentFilter !== "all") params.set("agent", agentFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/meta-leads?${params.toString()}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error("Failed to load Meta leads:", err);
      toast.error("Failed to load Meta campaign leads");
    } finally {
      setLoading(false);
    }
  }, [search, campaignFilter, agentFilter, startDate, endDate]);

  useEffect(() => {
    async function loadTeamMembers() {
      try {
        const res = await fetch("/api/account/members");
        const data = await res.json();
        if (data.ok && Array.isArray(data.members)) {
          setMembers(data.members);
        }
      } catch {
        // Ignored
      }
    }
    loadTeamMembers();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, campaignFilter, agentFilter, startDate, endDate]);

  const handleSelectPreset = (presetId: string) => {
    setDatePreset(presetId);
    if (presetId === "custom") return;
    const range = calculateDateRange(presetId);
    setStartDate(range.start);
    setEndDate(range.end);
    setIsDateOpen(false);
  };

  const handleApplyCustom = () => {
    if (!customStart || !customEnd) {
      toast.error("Please pick both start and end date");
      return;
    }
    if (customStart > customEnd) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setDatePreset("custom");
    setStartDate(customStart);
    setEndDate(customEnd);
    setIsDateOpen(false);
  };

  const handleAssignLead = async (lead: MetaLead, memberId: string, memberName: string) => {
    try {
      // Optimistic update
      setLeads((prev) =>
        prev.map((l) =>
          l.id === lead.id ? { ...l, assigned_agent_name: memberName, assigned_profile_id: memberId } : l,
        ),
      );

      const res = await fetch("/api/meta-leads", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: lead.id,
          noteId: lead.note_id,
          dealId: lead.deal_id,
          profileId: memberId,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(`Lead assigned to ${memberName}`);
      } else {
        toast.error("Failed to assign lead: " + (data.error || "Unknown error"));
        fetchLeads();
      }
    } catch {
      toast.error("Failed to update lead assignment");
      fetchLeads();
    }
  };

  const handleExportCSV = () => {
    if (leads.length === 0) {
      toast.error("No Meta leads to export");
      return;
    }

    const headers = [
      "Customer Name",
      "Customer Phone",
      "Campaign Name",
      "Language",
      "Location",
      "Requirement",
      "Assigned Executive",
      "Stage",
      "Submission Date",
    ];

    const rows = leads.map((l) => [
      `"${(l.customer_name || "").replace(/"/g, '""')}"`,
      `"${l.customer_phone || ""}"`,
      `"${(l.campaign_name || "").replace(/"/g, '""')}"`,
      `"${l.language || ""}"`,
      `"${(l.location || "").replace(/"/g, '""')}"`,
      `"${(l.requirement || "").replace(/"/g, '""')}"`,
      `"${(l.assigned_agent_name || "").replace(/"/g, '""')}"`,
      `"${l.stage_name || ""}"`,
      `"${l.created_at || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Meta_Campaign_Leads_${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Meta leads report exported successfully!");
  };

  // Metrics Calculation
  const totalCount = leads.length;
  const tamilCount = useMemo(
    () => leads.filter((l) => l.language.toLowerCase() === "tamil" || l.campaign_name.toLowerCase().includes("tamil")).length,
    [leads],
  );
  const hindiCount = useMemo(
    () => leads.filter((l) => l.language.toLowerCase() === "hindi" || l.campaign_name.toLowerCase().includes("hindi")).length,
    [leads],
  );
  const assignedCount = useMemo(
    () => leads.filter((l) => l.assigned_agent_name && l.assigned_agent_name !== "Sales Admin").length,
    [leads],
  );

  // Pagination Slice
  const totalPages = Math.ceil(leads.length / pageSize) || 1;
  const paginatedLeads = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return leads.slice(start, start + pageSize);
  }, [leads, currentPage, pageSize]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header & Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Radio className="h-6 w-6 text-blue-600 animate-pulse" />
              Meta Campaign Leads
            </h1>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
              Live Instant Forms
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time Facebook & Instagram Ad Leads (Tamil Murukku Machine & Hindi Campaigns)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 border-border bg-background hover:bg-muted text-foreground"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>Export Report</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchLeads}
            disabled={loading}
            className="gap-1.5 border-border bg-background hover:bg-muted text-foreground"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Analytics KPI Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Leads */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Meta Leads
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{totalCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">All Facebook & Insta campaigns</p>
        </div>

        {/* Tamil Campaign Leads */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Tamil Campaign Leads
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">{tamilCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">murukku machine tamil</p>
        </div>

        {/* Hindi Campaign Leads */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Hindi Campaign Leads
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Radio className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{hindiCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Hindi update Campaign</p>
        </div>

        {/* Assigned Leads */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Assigned Leads
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{assignedCount}</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Executive assigned & active</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3.5 rounded-xl border border-border shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, phone, district, requirement..."
            className="pl-9 h-9 bg-background border-border text-foreground"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Presets Popover */}
          <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-border bg-background text-foreground hover:bg-muted"
                />
              }
            >
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium">
                {datePreset === "custom"
                  ? `${customStart} - ${customEnd}`
                  : calculateDateRange(datePreset).label}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 bg-popover border-border" align="end">
              <div className="space-y-1">
                {DATE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                      datePreset === preset.id
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-foreground hover:bg-muted"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {datePreset === "custom" && (
                <div className="mt-3 pt-3 border-t border-border space-y-2">
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                      From Date
                    </span>
                    <Input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                      To Date
                    </span>
                    <Input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="h-8 text-xs mt-0.5"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={handleApplyCustom}
                    className="w-full h-8 text-xs font-semibold mt-1"
                  >
                    Apply Range
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Campaign Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 border-border bg-background text-foreground hover:bg-muted"
                />
              }
            >
              <Radio className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-medium">
                {campaignFilter === "all"
                  ? "All Campaigns"
                  : campaignFilter.toLowerCase().includes("tamil")
                  ? "Tamil Campaign"
                  : "Hindi Campaign"}
              </span>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              <DropdownMenuItem onClick={() => setCampaignFilter("all")}>
                All Campaigns
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCampaignFilter("tamil")}>
                📥 Tamil Murukku Campaign
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCampaignFilter("hindi")}>
                📥 Hindi Update Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Executive Filter Dropdown (Admin Only) */}
          {isAdminOrOwner ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 border-border bg-background text-foreground hover:bg-muted"
                  />
                }
              >
                <UserCheck className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {agentFilter === "all"
                    ? "All Executives"
                    : members.find((m) => m.id === agentFilter || m.user_id === agentFilter)?.full_name ||
                      agentFilter}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 max-h-64 overflow-y-auto bg-popover border-border">
                <DropdownMenuItem onClick={() => setAgentFilter("all")}>
                  All Executives
                </DropdownMenuItem>
                {members.map((m) => (
                  <DropdownMenuItem
                    key={m.id || m.user_id}
                    onClick={() => setAgentFilter(m.full_name)}
                  >
                    {m.full_name} ({m.role || "Executive"})
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Badge variant="outline" className="h-9 px-3 bg-primary/10 text-primary border-primary/20 gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              My Assigned Leads
            </Badge>
          )}
        </div>
      </div>

      {/* Meta Leads Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b border-border text-[11px] font-semibold uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Customer Details</th>
                <th className="px-4 py-3">Campaign & Language</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Requirement</th>
                <th className="px-4 py-3">Assigned Executive</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Date & Time</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading Meta campaign leads...</span>
                  </td>
                </tr>
              ) : paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground">
                    <Radio className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="font-medium text-foreground">No Meta Campaign Leads found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Try adjusting filters or simulate a test lead from Settings.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const cleanPhone = lead.customer_phone.replace(/\D/g, "");
                  const isTamil = lead.language.toLowerCase() === "tamil";
                  return (
                    <tr key={lead.id + lead.note_id} className="hover:bg-muted/30 transition-colors">
                      {/* Customer Name & Phone */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">{lead.customer_name}</div>
                        <div className="font-mono text-xs text-muted-foreground mt-0.5">
                          {lead.customer_phone}
                        </div>
                      </td>

                      {/* Campaign & Language Badge */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold border ${
                              isTamil
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            }`}
                          >
                            📥 {isTamil ? "Tamil Campaign" : "Hindi Campaign"}
                          </span>
                          <span className="text-[11px] text-muted-foreground line-clamp-1 max-w-[160px]" title={lead.campaign_name}>
                            {lead.campaign_name}
                          </span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs text-foreground">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span>{lead.location || "Tamil Nadu"}</span>
                        </div>
                      </td>

                      {/* Requirement */}
                      <td className="px-4 py-3">
                        <div className="text-xs text-foreground font-medium">
                          {lead.requirement || "Murukku Business"}
                        </div>
                      </td>

                      {/* Assigned Executive Dropdown */}
                      <td className="px-4 py-3">
                        {isAdminOrOwner ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground border border-border transition-all cursor-pointer">
                              <span>{lead.assigned_agent_name || "Sales Admin"}</span>
                              <ChevronDown className="h-3 w-3 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-52 max-h-60 overflow-y-auto bg-popover border-border">
                              {members.map((m) => (
                                <DropdownMenuItem
                                  key={m.id || m.user_id}
                                  onClick={() => handleAssignLead(lead, m.id, m.full_name)}
                                  className="flex items-center justify-between text-xs"
                                >
                                  <span>{m.full_name}</span>
                                  {lead.assigned_agent_name === m.full_name && (
                                    <Check className="h-3.5 w-3.5 text-primary" />
                                  )}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-foreground">
                            <UserCheck className="h-3.5 w-3.5 text-primary" />
                            {lead.assigned_agent_name || "Sales Admin"}
                          </span>
                        )}
                      </td>

                      {/* Pipeline Stage */}
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[11px] font-semibold bg-primary/10 text-primary border-primary/20">
                          {lead.stage_name}
                        </Badge>
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateDisplay(lead.created_at)}
                      </td>

                      {/* Actions (WhatsApp & Call) */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Chat on WhatsApp"
                              className="p-1.5 rounded-lg border border-border bg-background hover:bg-emerald-500/10 hover:text-emerald-600 transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                            </a>
                          )}
                          <a
                            href={`tel:${lead.customer_phone}`}
                            title="Call Customer"
                            className="p-1.5 rounded-lg border border-border bg-background hover:bg-primary/10 hover:text-primary transition-colors"
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>
              Showing {leads.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to{" "}
              {Math.min(currentPage * pageSize, leads.length)} of {leads.length} leads
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 font-medium text-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
