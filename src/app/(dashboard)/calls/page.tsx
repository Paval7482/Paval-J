"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneMissed,
  Search,
  Play,
  Pause,
  Download,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  UserCheck,
  Filter,
  Clock,
  Calendar,
  Volume2,
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

interface CallLog {
  id: string;
  customer_number: string;
  virtual_number: string;
  agent_name: string;
  agent_phone?: string | null;
  call_status: "Connected" | "Missed" | string;
  call_duration: string;
  call_date: string;
  start_time: string;
  end_time?: string | null;
  recording_url?: string | null;
  customer_location?: string | null;
  assigned_to?: string | null;
  created_at: string;
}

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

export default function CallsPage() {
  const { accountRole, accountId } = useAuth();
  const isAdminOrOwner = accountRole === "owner" || accountRole === "admin";

  const [calls, setCalls] = useState<CallLog[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (agentFilter !== "all") params.set("agent", agentFilter);

      const res = await fetch(`/api/calls?${params.toString()}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.logs)) {
        setCalls(data.logs);
      }
    } catch (err) {
      console.error("Failed to load calls:", err);
      toast.error("Failed to load call logs");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, agentFilter]);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/account/members");
      const data = await res.json();
      if (data.ok && Array.isArray(data.members)) {
        setMembers(data.members);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  useEffect(() => {
    if (isAdminOrOwner) {
      fetchMembers();
    }
  }, [isAdminOrOwner, fetchMembers]);

  const handleReassign = async (callId: string, member: TeamMember) => {
    try {
      const res = await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId,
          assignedTo: member.user_id,
          agentName: member.full_name,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(`Assigned call to ${member.full_name}`);
        setCalls((prev) =>
          prev.map((c) =>
            c.id === callId
              ? { ...c, assigned_to: member.user_id, agent_name: member.full_name }
              : c,
          ),
        );
      } else {
        toast.error(data.error || "Failed to reassign call");
      }
    } catch {
      toast.error("Network error while reassigning");
    }
  };

  // Stats
  const totalCalls = calls.length;
  const connectedCalls = calls.filter((c) =>
    c.call_status.toLowerCase().includes("connected"),
  ).length;
  const missedCalls = calls.filter((c) =>
    c.call_status.toLowerCase().includes("missed"),
  ).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Top Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              MyTelly Calls
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              Virtual No: 9672115123
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time incoming & missed calls log from MyTelly IVR system
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCalls}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh Logs
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Calls</span>
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">{totalCalls}</div>
          <span className="text-xs text-muted-foreground">All Virtual Calls</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Connected Calls</span>
            <PhoneIncoming className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {connectedCalls}
          </div>
          <span className="text-xs text-muted-foreground">Answered by Executives</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Missed Calls</span>
            <PhoneMissed className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {missedCalls}
          </div>
          <span className="text-xs text-muted-foreground">Needs Immediate Follow-up</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Connection Rate</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-foreground">
            {totalCalls > 0 ? `${Math.round((connectedCalls / totalCalls) * 100)}%` : "100%"}
          </div>
          <span className="text-xs text-muted-foreground">Overall Performance</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer phone or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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

          {/* Agent Filter (Admin only) or Executive Badge */}
          {isAdminOrOwner ? (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              aria-label="Filter calls by agent"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Agents</option>
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
              <span>My Assigned Calls</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Table Matching MyTelly Portal UI */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
              <tr>
                <th className="px-4 py-3.5">Agent Name</th>
                <th className="px-4 py-3.5">Virtual Number</th>
                <th className="px-4 py-3.5">Call Status</th>
                <th className="px-4 py-3.5">Customer No.</th>
                <th className="px-4 py-3.5 text-center">Click to Call</th>
                <th className="px-4 py-3.5">Call Duration</th>
                <th className="px-4 py-3.5">Date</th>
                <th className="px-4 py-3.5">Time</th>
                <th className="px-4 py-3.5 text-center">Recording</th>
                {isAdminOrOwner && <th className="px-4 py-3.5 text-right">Assign</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && calls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2" />
                    Loading call logs from MyTelly...
                  </td>
                </tr>
              ) : calls.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-muted-foreground">
                    <PhoneMissed className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    No call logs found matching your filters.
                  </td>
                </tr>
              ) : (
                calls.map((call) => {
                  const isMissed =
                    call.call_status.toLowerCase().includes("missed") ||
                    call.agent_name === "--";
                  const cleanCustomerDigits = call.customer_number.replace(/\D/g, "");

                  return (
                    <tr
                      key={call.id}
                      className={`transition-colors hover:bg-muted/40 ${
                        isMissed ? "bg-rose-500/5" : ""
                      }`}
                    >
                      {/* Agent Name Column */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                              isMissed
                                ? "bg-rose-500/10 text-rose-600"
                                : "bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {isMissed ? (
                              <PhoneMissed className="h-4 w-4" />
                            ) : (
                              <PhoneIncoming className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {isMissed ? "--" : call.agent_name}
                            </div>
                            {call.agent_phone && (
                              <div className="text-xs text-muted-foreground">
                                {call.agent_phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Virtual Number */}
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {call.virtual_number || "9672115123"}
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
                          {isMissed ? "Missed" : "Connected"}
                        </span>
                      </td>

                      {/* Customer No. */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground font-mono">
                            {call.customer_number}
                          </span>
                          <a
                            href={`https://wa.me/${cleanCustomerDigits}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Chat on WhatsApp"
                            className="text-emerald-600 hover:text-emerald-700 p-1 hover:bg-emerald-500/10 rounded transition-colors"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>

                      {/* Click to Call */}
                      <td className="px-4 py-3 text-center">
                        <a
                          href={`tel:${call.customer_number}`}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Call Customer"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </td>

                      {/* Duration */}
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {call.call_duration || "00:00:00"}
                      </td>

                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {call.call_date || new Date(call.created_at).toLocaleDateString()}
                      </td>

                      {/* Time */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        <div className="font-medium text-foreground">
                          {call.start_time || new Date(call.created_at).toLocaleTimeString()}
                        </div>
                        {call.end_time && (
                          <div className="text-[10px] text-muted-foreground">
                            End: {call.end_time}
                          </div>
                        )}
                      </td>

                      {/* Recording */}
                      <td className="px-4 py-3 text-center">
                        {call.recording_url ? (
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
                        ) : (
                          <span className="text-xs text-muted-foreground/50">-</span>
                        )}

                        {/* Inline Audio Player Dropdown */}
                        {playingId === call.id && call.recording_url && (
                          <div className="mt-2 p-2 rounded-lg bg-card border border-border shadow-md">
                            <audio
                              controls
                              autoPlay
                              src={call.recording_url}
                              className="h-8 w-60"
                            />
                          </div>
                        )}
                      </td>

                      {/* Assign Actions (Admin only) */}
                      {isAdminOrOwner && (
                        <td className="px-4 py-3 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              {isMissed ? "Assign" : "Reassign"}
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase">
                                Assign to Executive
                              </div>
                              {members.map((m) => (
                                <DropdownMenuItem
                                  key={m.user_id}
                                  onClick={() => handleReassign(call.id, m)}
                                  className="cursor-pointer"
                                >
                                  {m.full_name} ({m.role})
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
