"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PhoneCall,
  Flame,
  MessageSquare,
  TrendingUp,
  Globe,
  Calendar,
  Users,
  Play,
  Clock,
  CheckCircle2,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Filter,
  Volume2,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ExecutiveStat {
  userId: string;
  profileId: string;
  name: string;
  totalCalls: number;
  connectedCalls: number;
  missedCalls: number;
  totalDurationSeconds: number;
  metaLeadsCount: number;
  whatsappChatsCount: number;
  followUpsCount: number;
}

interface CallRecord {
  id: string;
  call_id: string;
  customer_number: string;
  agent_name: string;
  agent_phone: string;
  assigned_to: string;
  call_status: string;
  call_duration: string;
  duration_seconds: number;
  start_time: string;
  recording_url: string | null;
  customer_location: string | null;
  created_at: string;
}

interface DealRecord {
  id: string;
  title: string;
  stage: string;
  user_id: string;
  created_at: string;
  notes: string | null;
  contacts?: {
    name: string;
    phone: string;
    language: string;
  };
}

interface ConversationRecord {
  id: string;
  assigned_agent_id: string;
  last_message_text: string;
  last_message_at: string;
  unread_count: number;
  status: string;
  contact?: {
    name: string;
    phone: string;
    language: string;
  };
}

export default function DailyReportPage() {
  const [lang, setLang] = useState<"ta" | "en">("ta");
  const [activeTab, setActiveTab] = useState<"calls" | "leads" | "whatsapp" | "summary">("calls");
  const [selectedExec, setSelectedExec] = useState<string>("all");
  const [dateStr, setDateStr] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState<boolean>(true);

  const [executives, setExecutives] = useState<any[]>([]);
  const [stats, setStats] = useState<ExecutiveStat[]>([]);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [deals, setDeals] = useState<DealRecord[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/daily-data?date=${dateStr}&executive=${selectedExec}`);
      const data = await res.json();
      if (data.ok) {
        setExecutives(data.executives || []);
        setStats(data.stats || []);
        setCalls(data.calls || []);
        setDeals(data.deals || []);
        setConversations(data.conversations || []);
      }
    } catch (err) {
      console.error("Failed to load report data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [dateStr, selectedExec]);

  const sortedStats = useMemo(() => {
    return [...stats].sort((a, b) => {
      const scoreA = (a.connectedCalls * 3) + (a.totalCalls * 2) + a.metaLeadsCount + a.whatsappChatsCount + Math.floor(a.totalDurationSeconds / 60);
      const scoreB = (b.connectedCalls * 3) + (b.totalCalls * 2) + b.metaLeadsCount + b.whatsappChatsCount + Math.floor(b.totalDurationSeconds / 60);
      return scoreB - scoreA;
    });
  }, [stats]);

  // Overall totals
  const overallCalls = calls.length;
  const overallDurationSec = calls.reduce((acc, c) => acc + (c.duration_seconds || 0), 0);
  const overallConnected = calls.filter((c) => c.call_status === "Connected" || (c.duration_seconds && c.duration_seconds > 0)).length;
  const overallMissed = overallCalls - overallConnected;
  const overallLeads = deals.length;
  const overallWhatsapp = conversations.length;

  const formatDuration = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs}h ${remMins}m`;
    }
    return `${mins}m ${remainingSec}s`;
  };

  const t = {
    ta: {
      title: "ஸ்ரீ லக்ஷ்மி இண்டஸ்ட்ரீஸ்",
      subTitle: "தினசரி சேல்ஸ் & எக்சிகியூட்டிவ் நேரலை அறிக்கை",
      tabCalls: "My Telly அழைப்புகள்",
      tabLeads: "மெட்டா லீட்ஸ்",
      tabWhatsapp: "வாட்ஸ்அப் என்குயரி",
      tabSummary: "முழுமையான தொகுப்பு",
      allExecs: "அனைத்து அதிகாரிகள்",
      totalCalls: "மொத்த அழைப்புகள்",
      totalTalktime: "பேசிய நேரம்",
      connectedCalls: "இணைக்கப்பட்டவை",
      missedCalls: "தவறியவை",
      totalMetaLeads: "இன்றைய புதிய லீட்ஸ்",
      totalWhatsappChats: "வாட்ஸ்அப் சேட்கள்",
      execPerformance: "அதிகாரிகள் வாரியாக செயல்திறன்",
      listenRecording: "ரெக்கார்டிங் கேட்க",
      customerNumber: "வாடிக்கையாளர்",
      callDuration: "கால அளவு",
      callStatus: "நிலை",
      audioAvailable: "ஆடியோ தயார்",
      noDataToday: "இன்றைய தேதிக்கு பதிவுகள் இல்லை",
      badgeVerified: "நேரலை சிஸ்டம் தரவு",
      quickFilter: "அதிகாரியைத் தேர்ந்தெடுக்க:",
      leadStatus: "ஃபாலோ-அப் நிலை",
      tamilCampaign: "தமிழ் முறுக்கு மெஷின்",
      hindiCampaign: "ஹிந்தி ஸ்நாக்ஸ் மெஷின்",
    },
    en: {
      title: "Sri Lakshmi Industries",
      subTitle: "Daily Sales & Executive Performance Live Report",
      tabCalls: "My Telly Calls",
      tabLeads: "Meta Leads",
      tabWhatsapp: "WhatsApp Enquiries",
      tabSummary: "Overall Summary",
      allExecs: "All Executives",
      totalCalls: "Total Calls",
      totalTalktime: "Talk Time",
      connectedCalls: "Connected",
      missedCalls: "Missed",
      totalMetaLeads: "New Leads Today",
      totalWhatsappChats: "WhatsApp Chats",
      execPerformance: "Executive-wise Performance",
      listenRecording: "Play Recording",
      customerNumber: "Customer",
      callDuration: "Duration",
      callStatus: "Status",
      audioAvailable: "Audio Available",
      noDataToday: "No records found for this date",
      badgeVerified: "Live System Verified",
      quickFilter: "Select Executive:",
      leadStatus: "Follow-up Stage",
      tamilCampaign: "Tamil Murukku Machine",
      hindiCampaign: "Hindi Snacks Machine",
    },
  }[lang];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-slate-900 p-1 flex items-center justify-center border border-slate-700 shadow-md">
              <img
                src="/logo.png"
                alt="SLI"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                {t.title}
              </h1>
              <p className="text-[11px] text-slate-400 leading-none">
                {t.subTitle}
              </p>
            </div>
          </div>

          {/* Language Switcher Pill */}
          <div className="flex items-center bg-slate-800 p-1 rounded-full border border-slate-700">
            <button
              onClick={() => setLang("ta")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                lang === "ta"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇮🇳 தமிழ்
            </button>
            <button
              onClick={() => setLang("en")}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                lang === "en"
                  ? "bg-amber-500 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🇬🇧 English
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-4 sm:px-6 space-y-4">
        {/* Date & Filter Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-400" />
              <input
                type="date"
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[11px]">
                <ShieldCheck className="h-3 w-3 mr-1" />
                {t.badgeVerified}
              </Badge>
              <button
                onClick={fetchReportData}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Executive Selector */}
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedExec}
              onChange={(e) => setSelectedExec(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-400"
            >
              <option value="all">🌟 {t.allExecs}</option>
              {executives.map((e) => (
                <option key={e.user_id} value={e.user_id}>
                  👤 {e.full_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4 Interactive Navigation Tabs (Mobile optimized) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveTab("calls")}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
              activeTab === "calls"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <PhoneCall className="h-4 w-4" />
            <span>{t.tabCalls}</span>
          </button>

          <button
            onClick={() => setActiveTab("leads")}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
              activeTab === "leads"
                ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-500 shadow-md shadow-amber-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <Flame className="h-4 w-4" />
            <span>{t.tabLeads}</span>
          </button>

          <button
            onClick={() => setActiveTab("whatsapp")}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
              activeTab === "whatsapp"
                ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>{t.tabWhatsapp}</span>
          </button>

          <button
            onClick={() => setActiveTab("summary")}
            className={`flex items-center justify-center gap-2 p-3 rounded-2xl border text-xs font-bold transition-all ${
              activeTab === "summary"
                ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white border-purple-500 shadow-md shadow-purple-500/20"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
            }`}
          >
            <TrendingUp className="h-4 w-4" />
            <span>{t.tabSummary}</span>
          </button>
        </div>

        {/* TAB 1: MY TELLY CALLS */}
        {activeTab === "calls" && (
          <div className="space-y-4">
            {/* Quick KPI Stat Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col">
                <span className="text-[11px] text-slate-400">{t.totalCalls}</span>
                <span className="text-2xl font-black text-white mt-1">{overallCalls}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col">
                <span className="text-[11px] text-slate-400">{t.totalTalktime}</span>
                <span className="text-2xl font-black text-blue-400 mt-1">{formatDuration(overallDurationSec)}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col">
                <span className="text-[11px] text-slate-400">{t.connectedCalls}</span>
                <span className="text-2xl font-black text-emerald-400 mt-1">{overallConnected}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col">
                <span className="text-[11px] text-slate-400">{t.missedCalls}</span>
                <span className="text-2xl font-black text-rose-400 mt-1">{overallMissed}</span>
              </div>
            </div>

            {/* Executive Wise Breakdown Cards */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                {t.execPerformance}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {stats.map((s) => (
                  <div key={s.userId} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-sm text-white">{s.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {s.totalCalls} calls • {formatDuration(s.totalDurationSeconds)}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs font-bold">
                      {s.connectedCalls} Connected
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Call Logs & Audio Recordings */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Call Logs & Recordings</span>
                <span className="text-[11px] text-slate-500 font-normal">{calls.length} calls</span>
              </h3>

              {calls.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">{t.noDataToday}</div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {calls.map((c) => (
                    <div key={c.id} className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-xs text-slate-200">
                            + {c.customer_number}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Agent: {c.agent_name || "Sales Executive"} • {c.start_time || new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            c.call_status === "Connected"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          }`}
                        >
                          {c.call_duration || formatDuration(c.duration_seconds || 0)}
                        </Badge>
                      </div>

                      {/* Audio player if recording exists */}
                      {c.recording_url && (
                        <div className="pt-1.5 border-t border-slate-900 flex items-center gap-2">
                          <audio
                            controls
                            className="w-full h-8 rounded"
                            src={c.recording_url}
                            preload="none"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: META LEAD CAMPAIGN */}
        {activeTab === "leads" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
                <span className="text-[11px] text-slate-400">{t.totalMetaLeads}</span>
                <span className="text-3xl font-black text-amber-400 mt-1">{overallLeads}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
                <span className="text-[11px] text-slate-400">Campaigns</span>
                <span className="text-xs font-semibold text-slate-200 mt-2">
                  Tamil: Murukku Machine<br />Hindi: Snacks Machine
                </span>
              </div>
            </div>

            {/* Leads List */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Today's Meta Enquiries ({deals.length})
              </h3>
              {deals.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">{t.noDataToday}</div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {deals.map((d) => (
                    <div key={d.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-white">
                          {d.title}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {d.contacts?.phone ? `+${d.contacts.phone}` : "Meta Lead"} • {new Date(d.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[11px] capitalize">
                        {d.stage}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: WHATSAPP CAMPAIGN */}
        {activeTab === "whatsapp" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
                <span className="text-[11px] text-slate-400">{t.totalWhatsappChats}</span>
                <span className="text-3xl font-black text-emerald-400 mt-1">{overallWhatsapp}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col">
                <span className="text-[11px] text-slate-400">Response Rate</span>
                <span className="text-3xl font-black text-white mt-1">100%</span>
              </div>
            </div>

            {/* Conversations list */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active WhatsApp Chats ({conversations.length})
              </h3>
              {conversations.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">{t.noDataToday}</div>
              ) : (
                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {conversations.map((c) => (
                    <div key={c.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-white">
                          {c.contact?.name || "Customer"} ({c.contact?.phone ? `+${c.contact.phone}` : "WhatsApp"})
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-2">
                        {c.last_message_text || "Enquiry received"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: OVERALL SUMMARY LEADERBOARD */}
        {activeTab === "summary" && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-400" />
                Team Executive Leaderboard
              </h3>

              <div className="space-y-3">
                {sortedStats.map((s, idx) => (
                  <div key={s.userId} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 rounded-full bg-slate-800 text-slate-300 font-bold text-[10px] items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="font-bold text-sm text-white">{s.name}</span>
                      </div>
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                        {s.totalCalls} Calls
                      </Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-900 text-center">
                      <div>
                        <div className="text-[10px] text-slate-500">Talk Time</div>
                        <div className="text-xs font-bold text-blue-400">{formatDuration(s.totalDurationSeconds)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">Meta Leads</div>
                        <div className="text-xs font-bold text-amber-400">{s.metaLeadsCount}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500">WA Followups</div>
                        <div className="text-xs font-bold text-emerald-400">{s.whatsappChatsCount}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
