"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { PipelineStage, Contact } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  UserCheck,
  Check,
  Loader2,
  Phone,
  MessageSquare,
  MapPin,
  Building,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { CustomerProfileData } from "@/lib/contacts/customer-profile";

interface AddCustomerToStageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages: PipelineStage[];
  defaultStageId?: string;
  pipelineId: string;
  onAdded: () => void;
}

interface EnrichedContact extends Contact {
  assigned_to?: string | null;
  profile?: CustomerProfileData | null;
  existingDealStageId?: string | null;
  leadSource?: "whatsapp" | "mytelly" | "both";
}

export function AddCustomerToStageDialog({
  open,
  onOpenChange,
  stages,
  defaultStageId,
  pipelineId,
  onAdded,
}: AddCustomerToStageDialogProps) {
  const supabase = createClient();
  const { user, accountId, accountRole } = useAuth();
  const isAdminOrOwner =
    accountRole === "owner" ||
    accountRole === "admin" ||
    user?.email?.toLowerCase().includes("admin");

  const [loading, setLoading] = useState(false);
  const [contacts, setContacts] = useState<EnrichedContact[]>([]);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "whatsapp" | "mytelly">("all");
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedStageId, setSelectedStageId] = useState<string>(defaultStageId || "");
  const [dealValue, setDealValue] = useState<string>("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (defaultStageId) {
      setSelectedStageId(defaultStageId);
    } else if (stages.length > 0) {
      setSelectedStageId(stages[0].id);
    }
  }, [defaultStageId, stages]);

  const loadEligibleContacts = useCallback(async () => {
    if (!open || !user || !accountId) return;
    setLoading(true);
    try {
      // 1. Fetch existing deals for this pipeline
      const { data: existingDeals } = await supabase
        .from("deals")
        .select("id, contact_id, stage_id")
        .eq("pipeline_id", pipelineId);

      const dealMap: Record<string, string> = {};
      existingDeals?.forEach((d) => {
        if (d.contact_id) dealMap[d.contact_id] = d.stage_id;
      });

      // 2. Fetch all conversations, MyTelly contact_notes, and profiles
      const [allConvsRes, allNotesRes, profilesRes] = await Promise.all([
        supabase.from("conversations").select("contact_id, assigned_agent_id"),
        supabase
          .from("contact_notes")
          .select("id, contact_id, note_text")
          .or("note_text.ilike.%MyTelly%,note_text.ilike.%Call Status:%"),
        supabase.from("profiles").select("id, user_id, full_name, email"),
      ]);

      const allConvs = allConvsRes.data || [];
      const allNotes = allNotesRes.data || [];
      const allProfiles = profilesRes.data || [];

      const whatsappContactIds = new Set(
        allConvs.map((c) => c.contact_id).filter(Boolean),
      );
      const mytellyContactIds = new Set(
        allNotes.map((n) => n.contact_id).filter(Boolean),
      );

      const callerProfile = allProfiles.find((p) => p.user_id === user.id);
      const executiveName = (callerProfile?.full_name || "").trim().toLowerCase();

      // 3. Fetch contacts
      let contactsData: any[] = [];
      if (!isAdminOrOwner) {
        const assignedIds = new Set<string>();

        // WhatsApp assigned to user
        allConvs.forEach((c) => {
          if (c.contact_id && c.assigned_agent_id === user.id) {
            assignedIds.add(c.contact_id);
          }
        });

        // MyTelly notes assigned to user
        if (executiveName) {
          allNotes.forEach((n) => {
            if (n.contact_id && n.note_text?.toLowerCase().includes(executiveName)) {
              assignedIds.add(n.contact_id);
            }
          });
        }

        // Direct contacts created by user
        const { data: ownContacts } = await supabase
          .from("contacts")
          .select("id")
          .eq("user_id", user.id);
        ownContacts?.forEach((c) => assignedIds.add(c.id));

        // Deals assigned to user or user's profile
        const { data: userDeals } = await supabase
          .from("deals")
          .select("contact_id")
          .or(
            `user_id.eq.${user.id}${
              callerProfile?.id ? `,assigned_to.eq.${callerProfile.id}` : ""
            }`,
          );
        userDeals?.forEach((d) => {
          if (d.contact_id) assignedIds.add(d.contact_id);
        });

        if (assignedIds.size > 0) {
          const { data, error } = await supabase
            .from("contacts")
            .select("*")
            .in("id", Array.from(assignedIds))
            .order("created_at", { ascending: false });
          if (error) throw error;
          contactsData = data || [];
        } else {
          const { data, error } = await supabase
            .from("contacts")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(100);
          if (error) throw error;
          contactsData = data || [];
        }
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1000);
        if (error) throw error;
        contactsData = data || [];
      }

      if (contactsData.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const contactIds = contactsData.map((c) => c.id);

      // 4. Load custom field values
      const [cf1, cv1] = await Promise.all([
        supabase.from("custom_fields").select("id, field_name"),
        supabase.from("contact_custom_values").select("*").in("contact_id", contactIds),
      ]);

      const fieldMap1: Record<string, string> = {};
      cf1.data?.forEach((f) => {
        fieldMap1[f.id] = f.field_name;
      });

      const profileMap: Record<string, any> = {};
      contactsData.forEach((c) => {
        profileMap[c.id] = {
          name: c.name || "",
          phone: c.phone || "",
          businessType: "Murukku Business",
          capacity: "50 - 100 Kg/Day",
          state: "Tamil Nadu",
          district: "",
          leadStatus: "Enquiry",
        };
      });

      cv1.data?.forEach((v) => {
        const fName = fieldMap1[v.custom_field_id];
        if (!fName || !profileMap[v.contact_id]) return;
        if (fName === "State") profileMap[v.contact_id].state = v.value;
        if (fName === "District") profileMap[v.contact_id].district = v.value;
        if (fName === "Business Type") profileMap[v.contact_id].businessType = v.value;
        if (fName === "Production Capacity") profileMap[v.contact_id].capacity = v.value;
        if (fName === "Lead Status") profileMap[v.contact_id].leadStatus = v.value;
      });

      const enriched: EnrichedContact[] = contactsData.map((c) => {
        const isMyTelly = mytellyContactIds.has(c.id);
        const isWhatsApp = whatsappContactIds.has(c.id);

        let leadSource: "whatsapp" | "mytelly" | "both" = "whatsapp";
        if (isWhatsApp && isMyTelly) leadSource = "both";
        else if (isMyTelly) leadSource = "mytelly";
        else if (isWhatsApp) leadSource = "whatsapp";
        else leadSource = "whatsapp";

        return {
          ...c,
          profile: profileMap[c.id],
          existingDealStageId: dealMap[c.id] || null,
          leadSource,
        };
      });

      setContacts(enriched);
    } catch (err) {
      console.error("Failed to load contacts for pipeline stage:", err);
      toast.error("Failed to load customer list");
    } finally {
      setLoading(false);
    }
  }, [open, user, accountId, isAdminOrOwner, pipelineId, supabase]);

  useEffect(() => {
    if (open) {
      loadEligibleContacts();
      setSelectedContactId(null);
      setSearch("");
      setSourceFilter("all");
    }
  }, [open, loadEligibleContacts]);

  const whatsappCount = useMemo(
    () => contacts.filter((c) => c.leadSource === "whatsapp" || c.leadSource === "both").length,
    [contacts],
  );
  const mytellyCount = useMemo(
    () => contacts.filter((c) => c.leadSource === "mytelly" || c.leadSource === "both").length,
    [contacts],
  );

  const filteredContacts = useMemo(() => {
    let result = contacts;
    if (sourceFilter === "whatsapp") {
      result = result.filter(
        (c) => c.leadSource === "whatsapp" || c.leadSource === "both",
      );
    } else if (sourceFilter === "mytelly") {
      result = result.filter(
        (c) => c.leadSource === "mytelly" || c.leadSource === "both",
      );
    }

    if (!search.trim()) return result;
    const s = search.toLowerCase();
    return result.filter((c) => {
      const matchName = (c.name || "").toLowerCase().includes(s);
      const matchPhone = (c.phone || "").toLowerCase().includes(s);
      const matchBiz = (c.profile?.businessType || "").toLowerCase().includes(s);
      const matchDist = (c.profile?.district || c.profile?.state || "")
        .toLowerCase()
        .includes(s);
      return matchName || matchPhone || matchBiz || matchDist;
    });
  }, [contacts, search, sourceFilter]);

  const selectedContact = useMemo(() => {
    return contacts.find((c) => c.id === selectedContactId) || null;
  }, [contacts, selectedContactId]);

  async function handleAddOrMove() {
    if (!selectedContact || !selectedStageId || !accountId || !user) {
      toast.error("Please select a customer and stage");
      return;
    }

    setSaving(true);
    try {
      const targetStage = stages.find((s) => s.id === selectedStageId);
      const stageName = targetStage?.name || "Enquiry";

      // Resolve profile.id for assigned_to foreign key
      let targetProfileId: string | null = null;
      if (user?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (prof?.id) targetProfileId = prof.id;
      }

      // 1. Check if deal exists
      const { data: existingDeal } = await supabase
        .from("deals")
        .select("id")
        .eq("pipeline_id", pipelineId)
        .eq("contact_id", selectedContact.id)
        .maybeSingle();

      const numVal = parseFloat(dealValue) || 0;

      if (existingDeal) {
        // Update stage
        const { error: updateErr } = await supabase
          .from("deals")
          .update({
            stage_id: selectedStageId,
            value: numVal,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingDeal.id);
        if (updateErr) throw updateErr;
      } else {
        // Insert new deal
        const { error: insertErr } = await supabase.from("deals").insert({
          title: selectedContact.name || selectedContact.phone || "Customer Deal",
          contact_id: selectedContact.id,
          pipeline_id: pipelineId,
          user_id: user.id,
          account_id: accountId,
          stage_id: selectedStageId,
          value: numVal,
          currency: "INR",
          status: "open",
          assigned_to: targetProfileId,
        });
        if (insertErr) throw insertErr;
      }

      // 2. Sync Custom Field 'Lead Status'
      try {
        const { data: cf } = await supabase
          .from("custom_fields")
          .select("id")
          .eq("field_name", "Lead Status")
          .maybeSingle();

        if (cf) {
          await supabase.from("contact_custom_values").upsert(
            {
              contact_id: selectedContact.id,
              custom_field_id: cf.id,
              value: stageName,
            },
            { onConflict: "contact_id,custom_field_id" },
          );
        }
      } catch (syncErr) {
        console.warn("Could not sync custom field Lead Status:", syncErr);
      }

      toast.success(
        `${selectedContact.name || selectedContact.phone} added to ${stageName}!`,
      );
      onOpenChange(false);
      onAdded();
    } catch (err: any) {
      console.error("Failed to add customer to stage:", err);
      const msg =
        err?.message ||
        err?.details ||
        (typeof err === "string" ? err : "Failed to add customer");
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-card border-border text-foreground shadow-2xl p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Add Customer to Pipeline Stage
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {isAdminOrOwner
                  ? "Select a customer from directory to place into pipeline"
                  : "Select from your assigned customers to place into your stage"}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4 flex-1 overflow-y-auto">
          {/* Target Stage Selector */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Target Pipeline Stage (ELBR)
            </Label>
            <div className="grid grid-cols-4 gap-2 mt-1.5">
              {stages.map((st) => {
                const isSelected = selectedStageId === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setSelectedStageId(st.id)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                        : "border-border bg-background hover:bg-muted text-foreground"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full mb-1"
                      style={{ backgroundColor: st.color }}
                    />
                    <span>{st.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deal Value (Optional) */}
          <div className="flex gap-3">
            <div className="flex-1">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Deal Value (₹ INR)
              </Label>
              <Input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="0"
                className="mt-1 h-9 bg-background border-border text-foreground"
              />
            </div>
          </div>

          {/* Customer Search, Source Filter & Select */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Customer ({filteredContacts.length} Available)
              </Label>
              {!isAdminOrOwner && (
                <span className="text-[11px] text-primary flex items-center gap-1 font-medium">
                  <UserCheck className="h-3 w-3" />
                  My Assigned Only
                </span>
              )}
            </div>

            {/* Source Filter Buttons */}
            <div className="flex items-center gap-1.5 pb-1">
              <button
                type="button"
                onClick={() => setSourceFilter("all")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                  sourceFilter === "all"
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                All ({contacts.length})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter("whatsapp")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                  sourceFilter === "whatsapp"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-background text-emerald-600 dark:text-emerald-400 border-border hover:bg-emerald-500/10"
                }`}
              >
                <MessageSquare className="h-3 w-3" />
                WhatsApp Leads ({whatsappCount})
              </button>
              <button
                type="button"
                onClick={() => setSourceFilter("mytelly")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-all ${
                  sourceFilter === "mytelly"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-background text-indigo-600 dark:text-indigo-400 border-border hover:bg-indigo-500/10"
                }`}
              >
                <Phone className="h-3 w-3" />
                MyTelly Leads ({mytellyCount})
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, phone number, district, business..."
                className="pl-8 h-9 text-xs bg-background border-border text-foreground"
              />
            </div>

            {/* Customer List */}
            <div className="max-h-60 overflow-y-auto rounded-lg border border-border divide-y divide-border bg-background">
              {loading ? (
                <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary mb-1" />
                  <span className="text-xs">Loading customers...</span>
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No customers found matching search.
                </div>
              ) : (
                filteredContacts.map((c) => {
                  const isSelected = selectedContactId === c.id;
                  const currentStage = stages.find((s) => s.id === c.existingDealStageId);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedContactId(c.id)}
                      className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-primary/10 border-l-4 border-l-primary"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground truncate">
                            {c.name || "Unnamed Customer"}
                          </span>
                          {currentStage && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground"
                            >
                              Currently: {currentStage.name}
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 mt-1 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 font-mono text-foreground font-semibold">
                            <Phone className="h-3 w-3 text-emerald-500" />
                            {c.phone}
                          </span>
                          {c.profile?.businessType && (
                            <span className="flex items-center gap-1 font-medium">
                              <Building className="h-3 w-3 text-amber-500" />
                              {c.profile.businessType}
                            </span>
                          )}
                          {(c.profile?.district || c.profile?.state) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3 text-blue-500" />
                              {[c.profile?.district, c.profile?.state]
                                .filter(Boolean)
                                .join(", ")}
                            </span>
                          )}

                          {/* WhatsApp Lead / MyTelly Lead Tag beside Location */}
                          {c.leadSource === "mytelly" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-semibold border border-indigo-500/20">
                              <Phone className="h-2.5 w-2.5" />
                              MyTelly Lead
                            </span>
                          )}
                          {c.leadSource === "whatsapp" && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                              <MessageSquare className="h-2.5 w-2.5" />
                              WhatsApp Lead
                            </span>
                          )}
                          {c.leadSource === "both" && (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
                                <MessageSquare className="h-2.5 w-2.5" />
                                WhatsApp Lead
                              </span>
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-semibold border border-indigo-500/20">
                                <Phone className="h-2.5 w-2.5" />
                                MyTelly Lead
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                            isSelected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-border bg-muted/30 flex items-center justify-between sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleAddOrMove}
            disabled={saving || !selectedContactId}
            className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-xs"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Add Customer to Stage
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
