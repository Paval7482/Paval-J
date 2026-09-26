"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  MessageSquare,
  Calendar,
  Clock,
  User,
  Plus,
  CheckCircle2,
  XCircle,
  Play,
  Pause,
  RefreshCw,
  Search,
  Filter,
  Volume2,
  Sparkles,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface LeadItem {
  id: string;
  name: string;
  phone: string;
  stage: string;
  source: string;
  notes?: string;
  followUpDate?: string;
}

interface CallLogItem {
  id: string;
  customer_number: string;
  agent_name: string;
  call_type: string;
  call_status: string;
  call_duration: string;
  recording_url: string | null;
  call_date: string;
}

function MobileCallerContent() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"followups" | "leads" | "calls">("followups");
  
  // Leads & Calls Data
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Audio playback
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioElem, setAudioElem] = useState<HTMLAudioElement | null>(null);

  // Post-Call Dialog State
  const [showPostCallDialog, setShowPostCallDialog] = useState(false);
  const [dialogPhone, setDialogPhone] = useState("");
  const [dialogType, setDialogType] = useState("outbound");
  const [dialogDuration, setDialogDuration] = useState("");
  const [dialogContactName, setDialogContactName] = useState("");
  const [dialogNotes, setDialogNotes] = useState("");
  const [dialogOutcome, setDialogOutcome] = useState("interested");
  const [dialogNextFollowup, setDialogNextFollowup] = useState("");
  const [isClassifiedAsLead, setIsClassifiedAsLead] = useState(true);
  const [isSavingDialog, setIsSavingDialog] = useState(false);

  // Check URL parameters for native post-call trigger (e.g., ?postCall=1&phone=+919840012345&type=outbound&duration=01:30)
  useEffect(() => {
    const postCall = searchParams.get("postCall");
    const phone = searchParams.get("phone");
    const type = searchParams.get("type") || "outbound";
    const duration = searchParams.get("duration") || "00:45";

    if (postCall && phone) {
      setDialogPhone(phone);
      setDialogType(type);
      setDialogDuration(duration);
      setShowPostCallDialog(true);
      // Auto-set tomorrow 11:00 AM as default followup
      const tmrw = new Date();
      tmrw.setDate(tmrw.getDate() + 1);
      tmrw.setHours(11, 0, 0, 0);
      setDialogNextFollowup(tmrw.toISOString().slice(0, 16));
    }
  }, [searchParams]);

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Calls
      const callRes = await fetch("/api/mobile/calls");
      const callData = await callRes.json();
      if (callData.ok && Array.isArray(callData.logs)) {
        setCalls(callData.logs);
      }

      // 2. Fetch Leads / Contacts
      const contactRes = await fetch("/api/v1/contacts?limit=50");
      const contactData = await contactRes.json();
      if (contactData.ok && Array.isArray(contactData.data)) {
        const mapped = contactData.data.map((c: any) => ({
          id: c.id,
          name: c.name || "Customer Lead",
          phone: c.phone || "",
          stage: c.stage || "lead",
          source: c.source || "Meta Ads",
        }));
        setLeads(mapped);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handlePlayAudio = (id: string, url: string | null) => {
    if (!url) {
      toast.error("No audio recording file found.");
      return;
    }
    if (playingId === id) {
      audioElem?.pause();
      setPlayingId(null);
    } else {
      if (audioElem) audioElem.pause();
      const newAudio = new Audio(url);
      newAudio.play().catch(() => toast.error("Unable to play audio"));
      newAudio.onended = () => setPlayingId(null);
      setAudioElem(newAudio);
      setPlayingId(id);
    }
  };

  const handleSavePostCall = async () => {
    if (!isClassifiedAsLead) {
      toast.info("Call classified as personal/others. No record synced.");
      setShowPostCallDialog(false);
      return;
    }

    setIsSavingDialog(true);
    try {
      const res = await fetch("/api/mobile/log-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: dialogPhone,
          contactName: dialogContactName,
          outcome: dialogOutcome,
          notes: dialogNotes,
          nextFollowUpDate: dialogNextFollowup,
          agentName: "Sales Executive",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("✅ Call notes & follow-up reminder saved!");
        setShowPostCallDialog(false);
        // Reset form
        setDialogNotes("");
        setDialogContactName("");
        fetchData();
      } else {
        toast.error(`Error: ${data.error}`);
      }
    } catch (err: any) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSavingDialog(false);
    }
  };

  const filteredLeads = leads.filter(
    (l) =>
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col max-w-md mx-auto border-x border-slate-800 shadow-2xl relative">
      {/* Top Mobile Bar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
            SLI
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100 leading-tight">Sri Lakshmi Industries</h1>
            <p className="text-[11px] text-emerald-400 font-medium">Sales Executive Calling Portal</p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            // Quick simulator button for testing popup
            setDialogPhone("+91 98400 12345");
            setDialogType("outbound");
            setDialogDuration("02:15");
            setShowPostCallDialog(true);
          }}
          className="h-8 text-[10px] px-2.5 bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300"
        >
          <Sparkles className="h-3 w-3 mr-1 text-emerald-400" />
          Test Popup
        </Button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 bg-slate-900/90 border-b border-slate-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab("followups")}
          className={`py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "followups"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Today's Calls
        </button>
        <button
          onClick={() => setActiveTab("leads")}
          className={`py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "leads"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Assigned Leads
        </button>
        <button
          onClick={() => setActiveTab("calls")}
          className={`py-3 text-center border-b-2 transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === "calls"
              ? "border-emerald-500 text-emerald-400 bg-emerald-500/10"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <PhoneCall className="h-3.5 w-3.5" />
          Recordings
        </button>
      </div>

      {/* Search Filter */}
      <div className="p-3 bg-slate-900/50 border-b border-slate-800">
        <div className="relative">
          <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lead name or phone number..."
            className="pl-9 h-9 text-xs bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Main List Body */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto pb-24">
        {activeTab === "followups" && (
          <div className="space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Scheduled Follow-ups for Today</span>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                {filteredLeads.length} Pending
              </Badge>
            </div>

            {filteredLeads.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                No pending calls for today. You're all caught up!
              </div>
            ) : (
              filteredLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-md space-y-2.5 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">{lead.name}</h3>
                      <p className="text-xs text-emerald-400 font-mono mt-0.5">+{lead.phone}</p>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                      {lead.stage}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                    <Button
                      size="sm"
                      onClick={() => (window.location.href = `tel:+${lead.phone}`)}
                      className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <PhoneCall className="h-3.5 w-3.5" /> Call Customer
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, "")}`, "_blank")}
                      className="h-9 px-3 bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400 text-xs rounded-xl flex items-center justify-center gap-1"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "leads" && (
          <div className="space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Campaign & Inbound Leads</span>
              <Button size="sm" variant="ghost" onClick={fetchData} className="h-6 w-6 p-0 text-slate-400">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            {filteredLeads.map((lead) => (
              <div
                key={lead.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">{lead.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">+{lead.phone}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-500/30">
                    {lead.source}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <Button
                    size="sm"
                    onClick={() => (window.location.href = `tel:+${lead.phone}`)}
                    className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5"
                  >
                    <PhoneCall className="h-3.5 w-3.5" /> Dial Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(`https://wa.me/${lead.phone.replace(/\D/g, "")}`, "_blank")}
                    className="h-9 px-3 bg-slate-800 hover:bg-slate-700 border-slate-700 text-emerald-400 text-xs rounded-xl"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "calls" && (
          <div className="space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>Synced Call Recordings</span>
              <Button size="sm" variant="ghost" onClick={fetchData} className="h-6 w-6 p-0 text-slate-400">
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>

            {calls.map((call) => (
              <div
                key={call.id}
                className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`p-1.5 rounded-lg ${
                        call.call_type.includes("in")
                          ? "bg-emerald-500/20 text-emerald-400"
                          : "bg-blue-500/20 text-blue-400"
                      }`}
                    >
                      {call.call_type.includes("in") ? (
                        <PhoneIncoming className="h-3.5 w-3.5" />
                      ) : (
                        <PhoneOutgoing className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <span className="font-semibold text-slate-200">+{call.customer_number}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700">
                    {call.call_duration || "01:20"}
                  </Badge>
                </div>

                {call.recording_url && (
                  <Button
                    size="sm"
                    onClick={() => handlePlayAudio(call.id, call.recording_url)}
                    className="w-full h-8 text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-1.5"
                  >
                    {playingId === call.id ? (
                      <>
                        <Pause className="h-3.5 w-3.5" /> Pause Recording
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" /> Listen to Audio
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 🔔 SMART POST-CALL POPUP DIALOG */}
      <Dialog open={showPostCallDialog} onOpenChange={setShowPostCallDialog}>
        <DialogContent className="max-w-sm bg-slate-900 border-slate-800 text-slate-100 rounded-3xl p-5 shadow-2xl">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <PhoneCall className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-base font-bold text-slate-100">
                  Call Finished ({dialogDuration})
                </DialogTitle>
                <DialogDescription className="text-xs text-emerald-400 font-mono">
                  {dialogPhone}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Lead vs Others Toggle */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setIsClassifiedAsLead(true)}
                className={`py-2 rounded-lg font-semibold transition-all ${
                  isClassifiedAsLead
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                👤 Customer Lead
              </button>
              <button
                type="button"
                onClick={() => setIsClassifiedAsLead(false)}
                className={`py-2 rounded-lg font-semibold transition-all ${
                  !isClassifiedAsLead
                    ? "bg-slate-800 text-slate-200 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ❌ Others / Personal
              </button>
            </div>

            {isClassifiedAsLead ? (
              <div className="space-y-3 animate-in fade-in-50">
                {/* Customer Name */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Customer / Company Name</label>
                  <Input
                    value={dialogContactName}
                    onChange={(e) => setDialogContactName(e.target.value)}
                    placeholder="E.g. Kumar Paper Plates"
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>

                {/* Outcome */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Call Outcome</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "interested", label: "👍 Interested" },
                      { id: "callback", label: "📞 Call Back" },
                      { id: "quotation_sent", label: "📑 Quoted" },
                      { id: "not_interested", label: "👎 Not Interested" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setDialogOutcome(opt.id)}
                        className={`p-2 rounded-xl text-left border transition-all text-[11px] font-medium ${
                          dialogOutcome === opt.id
                            ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-semibold"
                            : "bg-slate-950 border-slate-800 text-slate-400"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Customer Discussion Notes</label>
                  <textarea
                    rows={3}
                    value={dialogNotes}
                    onChange={(e) => setDialogNotes(e.target.value)}
                    placeholder="Enna pesinanga? Requirements, machine model, delivery date..."
                    className="w-full p-2 text-xs rounded-xl bg-slate-950 border border-slate-800 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* Next Follow-up Date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-slate-300">Next Follow-up Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={dialogNextFollowup}
                    onChange={(e) => setDialogNextFollowup(e.target.value)}
                    className="h-8 text-xs bg-slate-950 border-slate-800 text-slate-200"
                  />
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-center space-y-1">
                <p className="font-semibold text-slate-300">Personal / Irrelevant Call</p>
                <p className="text-[11px]">This call audio will not be saved or synced to Sri Lakshmi CRM.</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowPostCallDialog(false)}
              className="flex-1 h-9 bg-slate-800 border-slate-700 text-slate-300 text-xs rounded-xl"
            >
              Skip / Dismiss
            </Button>
            <Button
              type="button"
              onClick={handleSavePostCall}
              disabled={isSavingDialog}
              className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl"
            >
              {isSavingDialog ? "Saving..." : isClassifiedAsLead ? "Save & Sync" : "Discard"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MobileCallerPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-slate-400">Loading Calling Portal...</div>}>
      <MobileCallerContent />
    </Suspense>
  );
}
