"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Search,
  Play,
  Pause,
  Download,
  RefreshCw,
  MessageSquare,
  UserCheck,
  Clock,
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Users,
  Timer,
  Mic,
  Headphones,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";

interface TeleCrmCallLog {
  id: string;
  action_id: string;
  customer_name: string;
  customer_number: string;
  agent_name: string;
  call_type: "Incoming" | "Outgoing" | string;
  call_status: string;
  call_duration: string;
  duration_seconds: number;
  call_date: string;
  start_time: string;
  recording_url?: string | null;
  recording_name?: string | null;
  created_at: string;
}

interface ExecutiveStat {
  name: string;
  total: number;
  connected: number;
  missed: number;
  formattedDuration: string;
  connectionRate: number;
}

const DATE_PRESETS = [
  { id: "all", label: "All Dates" },
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 Days" },
  { id: "last30", label: "Last 30 Days" },
  { id: "thisMonth", label: "This Month" },
  { id: "lastMonth", label: "Last Month" },
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
  if (preset === "lastMonth") {
    const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
    const s = formatDate(firstDay);
    const e = formatDate(lastDay);
    return { start: s, end: e, label: `${formatDisplay(s)} - ${formatDisplay(e)}` };
  }
  return { start: "", end: "", label: "All Dates" };
}

function formatDateDisplay(datePart?: string | null, createdAt?: string | null) {
  if (datePart && datePart !== "Invalid Date" && !datePart.toLowerCase().includes("invalid")) {
    const parsed = new Date(datePart.includes("T") ? datePart : `${datePart}T00:00:00`);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  if (createdAt) {
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
  }
  return datePart || "Recent";
}

export default function TeleCrmCallsDashboard() {
  const { accountRole } = useAuth();
  const isAdminOrOwner = accountRole === "owner" || accountRole === "admin";

  const [calls, setCalls] = useState<TeleCrmCallLog[]>([]);
  const [stats, setStats] = useState<any>({
    totalCalls: 0,
    connectedCalls: 0,
    missedCalls: 0,
    incomingCalls: 0,
    outgoingCalls: 0,
    totalDurationSeconds: 0,
    formattedTotalDuration: "00:00:00",
    connectionRate: 0,
  });
  const [executiveBreakdown, setExecutiveBreakdown] = useState<ExecutiveStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);

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

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("callType", typeFilter);
      if (agentFilter !== "all") params.set("agent", agentFilter);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const res = await fetch(`/api/telecrm/calls?${params.toString()}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.logs)) {
        setCalls(data.logs);
        if (data.stats) setStats(data.stats);
        if (data.executiveBreakdown) setExecutiveBreakdown(data.executiveBreakdown);
      }
    } catch (err) {
      console.error("Failed to load TeleCRM calls:", err);
      toast.error("Failed to load TeleCRM calls");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, agentFilter, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, typeFilter, agentFilter, startDate, endDate]);

  useEffect(() => {
    fetchCalls();
    // Auto-refresh calls list every 30 seconds
    const pollInterval = setInterval(() => {
      fetchCalls();
    }, 30000);
    return () => clearInterval(pollInterval);
  }, [fetchCalls]);

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      const res = await fetch("/api/telecrm/sync-calls", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.data?.message || "Synced TeleCRM calls successfully");
        await fetchCalls();
      } else {
        toast.error(data.error || "Failed to sync TeleCRM calls");
      }
    } catch {
      toast.error("Error syncing TeleCRM calls");
    } finally {
      setSyncing(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setDatePreset(presetId);
    if (presetId === "custom") {
      return;
    }
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

  const handleExportCSV = () => {
    if (calls.length === 0) {
      toast.error("No TeleCRM call logs to export");
      return;
    }

    const headers = [
      "Executive Name",
      "Customer Name",
      "Customer Number",
      "Call Type",
      "Call Status",
      "Call Duration",
      "Date",
      "Time",
      "Recording URL",
      "Action ID",
    ];

    const rows = calls.map((c) => {
      return [
        `"${(c.agent_name || "").replace(/"/g, '""')}"`,
        `"${(c.customer_name || "").replace(/"/g, '""')}"`,
        `"${(c.customer_number || "").replace(/"/g, '""')}"`,
        `"${(c.call_type || "").replace(/"/g, '""')}"`,
        `"${(c.call_status || "").replace(/"/g, '""')}"`,
        `"${(c.call_duration || "00:00:00").replace(/"/g, '""')}"`,
        `"${(c.call_date || c.created_at.slice(0, 10)).replace(/"/g, '""')}"`,
        `"${(c.start_time || "").replace(/"/g, '""')}"`,
        `"${(c.recording_url || "").replace(/"/g, '""')}"`,
        `"${(c.action_id || "").replace(/"/g, '""')}"`,
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const exportTime = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `Sri_Lakshmi_Industries_TeleCRM_Calls_${exportTime}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${calls.length} TeleCRM call records successfully!`);
  };

  const getActiveDateLabel = () => {
    if (datePreset === "all") return "All Dates";
    if (datePreset === "custom") {
      const formatDisplay = (dStr: string) => {
        if (!dStr) return "";
        const d = new Date(dStr + "T00:00:00");
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      };
      return `${formatDisplay(startDate)} - ${formatDisplay(endDate)}`;
    }
    return calculateDateRange(datePreset).label;
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(calls.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, calls.length);
  const paginatedCalls = calls.slice(startIndex, endIndex);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-3 pt-1 border-b border-border/40 flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                TeleCRM Calls Dashboard
              </h1>
              <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300">
                <Sparkles className="h-3 w-3 mr-1 text-indigo-500" />
                TeleCRM Cloud Sync Active
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Live executive incoming & outgoing calling logs, duration & recordings from TeleCRM Mobile App
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncNow}
              disabled={syncing}
              className="gap-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 shadow-xs"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
              <span>Sync TeleCRM Calls</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-xs"
            >
              <Download className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Export CSV</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchCalls}
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-1">
          <Link
            href="/calls"
            className="px-3 py-1.5 text-xs font-medium rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            All Calls & IVR
          </Link>
          <Link
            href="/telecrm-calls"
            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-indigo-600 text-white shadow-xs flex items-center gap-1.5"
          >
            <span>TeleCRM Dashboard</span>
            <span className="inline-flex items-center rounded-md px-1.5 py-0 text-[10px] font-semibold bg-white/20 text-white">
              Live
            </span>
          </Link>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-2.5 rounded-lg border border-border shadow-xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by customer phone, name or executive..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Popover */}
            <Popover open={isDateOpen} onOpenChange={setIsDateOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-2 text-xs sm:text-sm font-medium border-input bg-background hover:bg-muted"
                  />
                }
              >
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate max-w-[170px] sm:max-w-none">{getActiveDateLabel()}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0 opacity-70" />
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-3 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border">
                  Filter By Date Range
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {DATE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset.id)}
                      className={`px-2.5 py-1.5 rounded-md text-xs font-medium text-left transition-colors ${
                        datePreset === preset.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "hover:bg-muted text-foreground"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                {datePreset === "custom" && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <div className="text-xs font-medium text-muted-foreground">
                      Custom Date Interval
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">
                          From Date
                        </label>
                        <Input
                          type="date"
                          value={customStart}
                          onChange={(e) => setCustomStart(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-muted-foreground block mb-1">
                          To Date
                        </label>
                        <Input
                          type="date"
                          value={customEnd}
                          onChange={(e) => setCustomEnd(e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs mt-1"
                      onClick={handleApplyCustom}
                    >
                      Apply Custom Filter
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* Call Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              aria-label="Filter by call type"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Call Types</option>
              <option value="Outgoing">Outgoing Calls</option>
              <option value="Incoming">Incoming Calls</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter calls by status"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="Connected">Connected Calls</option>
              <option value="Missed">Missed Calls</option>
            </select>

            {/* Executive Filter (Admin only) */}
            {isAdminOrOwner ? (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                aria-label="Filter calls by executive"
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="all">All Executives</option>
                <option value="SUBASH">SUBASH</option>
                <option value="NALLAKAMAN">NALLAKAMAN</option>
                <option value="Paval">Paval J</option>
                <option value="RK PRASAD">RK PRASAD</option>
                <option value="karthick">KARTHICK</option>
                <option value="Satheesh">SATHEESH</option>
                <option value="BALA">BALA</option>
                <option value="BASKAR">BASKAR</option>
                <option value="MD SIR">MD SIR</option>
              </select>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
                <UserCheck className="h-3.5 w-3.5" />
                <span>My TeleCRM Calls</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total TeleCRM Calls</span>
            <Phone className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{stats.totalCalls}</div>
          <span className="text-xs text-muted-foreground">
            {stats.outgoingCalls} Outgoing | {stats.incomingCalls} Incoming
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Connected Calls</span>
            <PhoneIncoming className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.connectedCalls}
          </div>
          <span className="text-xs text-muted-foreground">
            {stats.connectionRate}% Connection Rate
          </span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Missed / Unanswered</span>
            <PhoneMissed className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {stats.missedCalls}
          </div>
          <span className="text-xs text-muted-foreground">Follow-up Needed</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Talk Time</span>
            <Timer className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground font-mono">
            {stats.formattedTotalDuration}
          </div>
          <span className="text-xs text-muted-foreground">Across All Calls</span>
        </div>
      </div>

      {/* Executive Performance Highlights Bar (Admin view) */}
      {isAdminOrOwner && executiveBreakdown.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Users className="h-4 w-4 text-primary" />
              <span>Executive Calling Performance</span>
            </div>
            <span className="text-xs text-muted-foreground">Live TeleCRM Sync</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {executiveBreakdown.map((exec) => (
              <div
                key={exec.name}
                onClick={() => setAgentFilter(agentFilter === exec.name ? "all" : exec.name)}
                className={`cursor-pointer rounded-lg border p-3 transition-all hover:shadow-xs ${
                  agentFilter === exec.name
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border bg-muted/30 hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-xs text-foreground truncate">{exec.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background">
                    {exec.connectionRate}% Conn.
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Calls: <strong className="text-foreground">{exec.total}</strong></span>
                  <span>Duration: <strong className="text-foreground font-mono">{exec.formattedDuration}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main TeleCRM Call Records Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-border bg-muted/95 backdrop-blur-sm text-xs uppercase font-semibold text-muted-foreground shadow-xs">
              <tr>
                <th className="px-4 py-3.5">Type</th>
                <th className="px-4 py-3.5">Executive</th>
                <th className="px-4 py-3.5">Customer</th>
                <th className="px-4 py-3.5 text-center">Quick Actions</th>
                <th className="px-4 py-3.5">Call Status</th>
                <th className="px-4 py-3.5">Duration</th>
                <th className="px-4 py-3.5">Date & Time</th>
                <th className="px-4 py-3.5 text-center">Recording</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && calls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
                    Loading call records from TeleCRM...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <PhoneMissed className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    No TeleCRM call records found matching your filters.
                  </td>
                </tr>
              ) : (
                paginatedCalls.map((call) => {
                  const isMissed =
                    call.call_status.toLowerCase().includes("missed") ||
                    call.call_status.toLowerCase().includes("no answer") ||
                    call.call_status.toLowerCase().includes("rejected");

                  const isIncoming = call.call_type === "Incoming";
                  const cleanCustomerDigits = call.customer_number.replace(/\D/g, "");

                  return (
                    <tr
                      key={call.id}
                      className={`transition-colors hover:bg-muted/40 ${
                        isMissed ? "bg-rose-500/5" : ""
                      }`}
                    >
                      {/* Call Type Icon & Label */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isMissed
                                ? "bg-rose-500/10 text-rose-600"
                                : isIncoming
                                ? "bg-emerald-500/10 text-emerald-600"
                                : "bg-blue-500/10 text-blue-600"
                            }`}
                          >
                            {isMissed ? (
                              <PhoneMissed className="h-4 w-4" />
                            ) : isIncoming ? (
                              <PhoneIncoming className="h-4 w-4" />
                            ) : (
                              <PhoneOutgoing className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-foreground">
                              {call.call_type} Call
                            </span>
                            <div className="text-[10px] text-muted-foreground font-mono">
                              App Synced
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Executive Name */}
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {call.agent_name}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          Sales Executive
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {call.customer_name}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">
                          {call.customer_number}
                        </div>
                      </td>

                      {/* Quick Actions (WhatsApp & Call) */}
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <a
                            href={`https://wa.me/${cleanCustomerDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat on WhatsApp"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`tel:${call.customer_number}`}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            title="Call Customer"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Call Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isMissed
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isMissed ? "bg-rose-500" : "bg-emerald-500"
                            }`}
                          />
                          {call.call_status}
                        </span>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 font-mono text-xs text-foreground font-semibold">
                        {call.call_duration || "00:00:00"}
                      </td>

                      {/* Date & Time */}
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{formatDateDisplay(call.call_date, call.created_at)}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>{call.start_time || ""}</span>
                        </div>
                      </td>

                      {/* Recording */}
                      <td className="px-4 py-3 text-center">
                        {call.recording_url ? (
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setPlayingId(playingId === call.id ? null : call.id)
                                }
                                className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                                  playingId === call.id
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted text-foreground hover:bg-primary/10 hover:text-primary"
                                }`}
                                title={playingId === call.id ? "Close Player" : "Play Audio"}
                              >
                                {playingId === call.id ? (
                                  <Pause className="h-3.5 w-3.5" />
                                ) : (
                                  <Play className="h-3.5 w-3.5 ml-0.5" />
                                )}
                              </button>
                              <a
                                href={call.recording_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-colors"
                                title="Download Audio Recording"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </a>
                            </div>

                            {/* Inline Audio Player Dropdown */}
                            {playingId === call.id && (
                              <div className="mt-2 p-2 rounded-lg bg-card border border-border shadow-md">
                                <audio
                                  controls
                                  autoPlay
                                  src={call.recording_url}
                                  className="h-8 w-60"
                                />
                              </div>
                            )}
                          </div>
                        ) : call.recording_name ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 shadow-2xs"
                              title={`Recorded in TeleCRM Mobile App: ${call.recording_name}`}
                            >
                              <Mic className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                              <span>App Recorded</span>
                            </span>
                            <a
                              href="https://next.telecrm.in"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              title="Listen on TeleCRM Portal"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {calls.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span>
                Showing <strong className="text-foreground">{startIndex + 1}</strong> to{" "}
                <strong className="text-foreground">{endIndex}</strong> of{" "}
                <strong className="text-foreground">{calls.length}</strong> records
              </span>
              <span className="hidden sm:inline text-muted-foreground/40">|</span>
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  aria-label="Records per page"
                  className="h-7 rounded border border-input bg-background px-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 gap-1 text-xs"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev</span>
              </Button>

              <div className="flex items-center px-2.5 font-medium text-foreground text-xs">
                Page {currentPage} of {totalPages}
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2.5 gap-1 text-xs"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <span>Next</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
