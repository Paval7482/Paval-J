"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  MessageCircle,
  Phone,
  Calendar,
  MapPin,
  ExternalLink,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Clock,
  UserCheck,
  Package,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetaCampaign } from "@/lib/meta-ads/types";

interface CampaignLeadsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: MetaCampaign | null;
  datePreset?: string;
  presetLabel?: string;
}

interface MetaLeadItem {
  id: string;
  conversation_id?: string | null;
  deal_id?: string | null;
  note_id?: string | null;
  name?: string;
  customer_name?: string;
  phone?: string;
  customer_phone?: string;
  campaign_name?: string;
  form_name?: string;
  language?: string;
  location?: string;
  requirement?: string;
  assigned_agent_name?: string;
  created_at: string;
  stage_name?: string;
  notes?: string;
  is_whatsapp_lead?: boolean;
}

export function CampaignLeadsModal({
  open,
  onOpenChange,
  campaign,
  datePreset = "maximum",
  presetLabel = "Selected Range",
}: CampaignLeadsModalProps) {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<MetaLeadItem[]>([]);
  const [campaignType, setCampaignType] = useState<
    "instant_form" | "whatsapp_chat" | "expired_form" | "all"
  >("instant_form");
  const [campaignMeta, setCampaignMeta] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFallback, setIsFallback] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState<string>(datePreset);

  useEffect(() => {
    setActiveDateFilter(datePreset);
  }, [datePreset, open]);

  useEffect(() => {
    if (!open || !campaign) return;

    let isMounted = true;
    async function loadLeads() {
      setLoading(true);
      setIsFallback(false);
      setSearchQuery("");

      try {
        // Fetch leads matching this specific campaign name and active date range
        const encodedCamp = encodeURIComponent(campaign?.name || "");
        const dateParam =
          activeDateFilter && activeDateFilter !== "maximum"
            ? `&datePreset=${encodeURIComponent(activeDateFilter)}`
            : "";
        const res = await fetch(`/api/meta-leads?campaign=${encodedCamp}${dateParam}`);
        const data = await res.json();

        if (isMounted) {
          setLeads(data?.leads || []);
          setCampaignType(data?.campaignType || "instant_form");
          setCampaignMeta(data?.campaignMeta || null);
        }
      } catch (err) {
        console.error("Failed to load campaign leads:", err);
        if (isMounted) {
          setLeads([]);
          setCampaignType("instant_form");
          setCampaignMeta(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLeads();
    return () => {
      isMounted = false;
    };
  }, [open, campaign, activeDateFilter]);

  const filteredLeads = useMemo(() => {
    if (!searchQuery.trim()) return leads;
    const q = searchQuery.toLowerCase().trim();
    return leads.filter((l) => {
      const name = (l.customer_name || l.name || "").toLowerCase();
      const phone = (l.customer_phone || l.phone || "").toLowerCase();
      const loc = (l.location || "").toLowerCase();
      const req = (l.requirement || "").toLowerCase();
      const agent = (l.assigned_agent_name || "").toLowerCase();
      return (
        name.includes(q) ||
        phone.includes(q) ||
        loc.includes(q) ||
        req.includes(q) ||
        agent.includes(q)
      );
    });
  }, [leads, searchQuery]);

  const formatLeadPhone = (phone: string) => {
    const cleaned = (phone || "").replace(/\D/g, "");
    if (!cleaned) return "";
    return cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  };

  const getWhatsAppLink = (lead: MetaLeadItem) => {
    const phone = lead.customer_phone || lead.phone || "";
    const rawPhone = formatLeadPhone(phone);
    const name = lead.customer_name || lead.name || "சார்";
    const greetingText = `வணக்கம் ${name}! Sri Lakshmi Industries Commercial Murukku Making Machinery சம்மந்தமாக தாங்கள் பதிவு செய்திருந்த விவரங்கள் பெறப்பட்டது. உங்களுக்கு தேவையான மெஷின் மாடல் & கொட்டேஷன் விவரங்களை பகிரவா?`;
    return `https://wa.me/${rawPhone}?text=${encodeURIComponent(greetingText)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-muted/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
                {campaignType === "whatsapp_chat" ? (
                  <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
              </div>
              <div>
                <DialogTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                  <span>
                    {campaignType === "whatsapp_chat"
                      ? "WhatsApp Customer Inquiries"
                      : "Campaign Customer Leads"}
                  </span>
                  {campaignType === "whatsapp_chat" ? (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1">
                      <MessageCircle className="h-3 w-3" /> Live WhatsApp CRM Sync
                    </Badge>
                  ) : campaignType === "expired_form" ? (
                    <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1">
                      <Clock className="h-3 w-3" /> Meta Archived (&gt;90d)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      Live Meta Lead Sync
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <span className="font-semibold text-foreground truncate max-w-sm">
                    {campaign?.name || "Meta Campaign"}
                  </span>
                  <span>•</span>
                  <span>
                    {campaignType === "whatsapp_chat"
                      ? `${filteredLeads.length} WhatsApp Inquiries Synced`
                      : `${campaign?.insights?.results || leads.length} Inquiries Recorded`}
                  </span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/meta-leads?campaign=${encodeURIComponent(campaign?.name || "all")}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 font-semibold transition-colors"
              >
                <span>Full Leads CRM</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Quick Metrics & Search Bar */}
          <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by customer name, phone, message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl bg-background border-border/70"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {isFallback && (
                <Badge variant="secondary" className="text-[11px] font-normal gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                  <Sparkles className="h-3 w-3" /> Showing Recent Meta Leads
                </Badge>
              )}
              <span className="font-medium text-foreground">
                {filteredLeads.length} {filteredLeads.length === 1 ? "Inquiry" : "Inquiries"}
              </span>
            </div>
          </div>

          {/* Quick Date Range Filter Pills */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto text-xs pb-1">
            <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1 shrink-0">
              <Calendar className="h-3 w-3" /> Date Range:
            </span>
            {[
              { id: "today", label: "Today" },
              { id: "yesterday", label: "Yesterday" },
              { id: "last_7d", label: "7-Day" },
              { id: "last_30d", label: "30-Day" },
              { id: "maximum", label: "All Time (Lifetime)" },
            ].map((p) => {
              const active = activeDateFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveDateFilter(p.id)}
                  className={cn(
                    "px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all cursor-pointer shrink-0",
                    active
                      ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                      : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* Method 1: WhatsApp Click-to-Chat Explanatory Banner */}
          {campaignType === "whatsapp_chat" && (
            <div className="p-3.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-xs flex items-start gap-3 shadow-2xs">
              <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="h-4 w-4" />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-foreground">
                  WhatsApp Click-to-Chat Campaign (Real-Time CRM Inbox Sync)
                </p>
                <p className="text-muted-foreground leading-relaxed text-[11px]">
                  In this campaign, customers tap the WhatsApp button on Meta and start chatting directly with Sri Lakshmi Industries. Real customer conversations from your CRM Inbox are synced below with direct links to chat.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <RefreshCw className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-medium">Fetching real-time customer inquiries...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            campaignType === "expired_form" ? (
              /* Method 2: Meta 90-Day Lead Form Expiry Notice */
              <div className="py-14 px-6 text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto">
                <div className="h-16 w-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                  <Clock className="h-8 w-8" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-foreground">
                    Meta Lead Form Archived by Meta (&gt;90 Days)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This campaign was launched on{" "}
                    <strong className="text-foreground">
                      {campaignMeta?.created_time
                        ? new Date(campaignMeta.created_time).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "June 2026"}
                    </strong>{" "}
                    ({campaignMeta?.ageDays || 90}+ days ago). According to Meta&apos;s Data Retention Policy, Instant Lead Form submissions older than 90 days are automatically purged from the Facebook Graph API.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/50 border border-border/70 text-[11px] text-muted-foreground flex items-center gap-2 text-left">
                  <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Ongoing &amp; Future Campaigns:</strong> Live campaigns stream leads instantly and save them permanently in your Sri Lakshmi CRM database so they never expire.
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Link
                    href="/meta-leads"
                    target="_blank"
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 shadow-sm transition-colors"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Browse Permanent CRM Leads</span>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    className="text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <Users className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {activeDateFilter === "today"
                      ? "No Customer Leads Recorded for Today Yet"
                      : "No Customer Leads Found for Selected Range"}
                  </p>
                  <p className="text-xs max-w-md mt-1 text-muted-foreground">
                    {searchQuery
                      ? "No leads matched your search query."
                      : activeDateFilter !== "maximum"
                      ? `No customer leads matched the '${activeDateFilter.replace("_", " ")}' range in CRM. Click below to view all historical campaign leads.`
                      : "Leads generated by this campaign will automatically appear here once customers submit their details."}
                  </p>
                </div>
                {activeDateFilter !== "maximum" && !searchQuery && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveDateFilter("maximum")}
                    className="gap-1.5 text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Sparkles className="h-3.5 w-3.5" /> View All Time (Lifetime) Leads
                  </Button>
                )}
              </div>
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredLeads.map((lead) => {
                const custName = lead.customer_name || lead.name || "Customer Lead";
                const phoneStr = (lead.customer_phone || lead.phone || "").replace("--", "").trim();
                const rawPhone = formatLeadPhone(phoneStr);
                const waLink = getWhatsAppLink(lead);

                return (
                  <div
                    key={lead.id}
                    className="p-4 rounded-2xl border border-border/70 bg-card/60 hover:bg-card/90 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                  >
                    {/* Top Row: Customer Name & Stage */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "h-9 w-9 rounded-xl font-bold flex items-center justify-center text-sm border shrink-0",
                          lead.is_whatsapp_lead
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-primary/10 text-primary border-primary/20"
                        )}>
                          {lead.is_whatsapp_lead ? (
                            <MessageCircle className="h-4 w-4" />
                          ) : (
                            custName ? custName.charAt(0).toUpperCase() : "C"
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                            {custName}
                          </h4>
                          <p className="text-xs font-mono text-muted-foreground">
                            {phoneStr ? (phoneStr.startsWith("+") ? phoneStr : `+${phoneStr}`) : "No phone provided"}
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0",
                          lead.is_whatsapp_lead
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        {lead.stage_name || (lead.is_whatsapp_lead ? "WhatsApp Chat" : "New Lead")}
                      </Badge>
                    </div>

                    {/* Middle Row: Machinery Inquiry & Location */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-1.5 text-foreground/90 font-medium">
                        <Package className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">
                          {lead.requirement || "Sri Lakshmi Commercial Murukku Machine"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="truncate">{lead.location || "India"}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 font-mono">
                          <Clock className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span>
                            {lead.created_at
                              ? new Date(lead.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Recent"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Executive Assignment & Quick Actions */}
                    <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                        <UserCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="truncate">
                          Assigned:{" "}
                          <strong className="text-foreground">
                            {lead.assigned_agent_name || "Sales Executive"}
                          </strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {lead.is_whatsapp_lead || lead.conversation_id ? (
                          <Link
                            href={`/inbox?conversationId=${lead.conversation_id || lead.id}`}
                            target="_blank"
                            className="h-7 px-2 rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1 shadow-2xs transition-colors"
                            title="Open in CRM Inbox Chat"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>CRM Chat</span>
                          </Link>
                        ) : null}

                        {rawPhone ? (
                          <>
                            <a
                              href={`tel:+${rawPhone}`}
                              className="h-7 w-7 rounded-lg border border-border/80 hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
                              title={`Call ${custName}`}
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={waLink}
                              target="_blank"
                              rel="noreferrer"
                              className="h-7 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shadow-sm transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                              <span>WhatsApp</span>
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 px-5 border-t border-border/60 bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>Patented Food-Grade SS 304 Murukku Machinery Leads</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-7 text-xs"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
