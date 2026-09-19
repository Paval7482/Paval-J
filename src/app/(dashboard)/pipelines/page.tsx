"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Pipeline, PipelineStage, Deal } from "@/types";
import { PipelineBoard } from "@/components/pipelines/pipeline-board";
import { PipelineSettings } from "@/components/pipelines/pipeline-settings";
import { DealForm } from "@/components/pipelines/deal-form";
import { AddCustomerToStageDialog } from "@/components/pipelines/add-customer-to-stage-dialog";
import { PipelineAnalytics } from "@/components/pipelines/pipeline-analytics";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, ChevronDown, Settings, Search, UserCheck, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useCan } from "@/hooks/use-can";
import { useAuth } from "@/hooks/use-auth";
import { GatedButton } from "@/components/ui/gated-button";
import { useTranslations } from "next-intl";

// Sri Lakshmi Industries standard sales pipeline stages
const SPEC_DEFAULT_STAGES = [
  { name: "Enquiry", color: "#3b82f6", position: 0 },
  { name: "Lead", color: "#eab308", position: 1 },
  { name: "Booking", color: "#10b981", position: 2 },
  { name: "Retail", color: "#8b5cf6", position: 3 },
];

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

export default function PipelinesPage() {
  const t = useTranslations("Pipelines.page");
  const supabase = createClient();
  const canEditSettings = useCan("edit-settings");
  const canCreateDeals = useCan("send-messages");
  const { accountId, user, accountRole } = useAuth();
  const isAdminOrOwner =
    accountRole === "owner" ||
    accountRole === "admin" ||
    user?.email?.toLowerCase().includes("admin");

  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("all");

  // Dialog / sheet state
  const [newPipelineOpen, setNewPipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState("");
  const [creating, setCreating] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Deal form state is lifted here so both the top-bar "Add Deal" and
  // the per-column "+" trigger the same Sheet.
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [addCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [defaultStageId, setDefaultStageId] = useState<string>("");

  // Guard against double-seeding (React StrictMode double-effect in dev).
  const seedAttempted = useRef(false);

  // Fetch team members for admin filter
  useEffect(() => {
    async function loadMembers() {
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
    loadMembers();
  }, []);

  const loadPipelines = useCallback(async () => {
    const { data, error } = await supabase
      .from("pipelines")
      .select("*")
      .order("created_at");
    if (error) {
      console.error("Failed to load pipelines:", error.message);
      return [];
    }
    return data ?? [];
  }, [supabase]);

  const loadStages = useCallback(
    async (pipelineId: string) => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("pipeline_id", pipelineId)
        .order("position");

      let currentStages = data ?? [];

      // Check if stages need migration to Enquiry, Lead, Booking, Retail
      const stageNames = currentStages.map((s) => s.name.toLowerCase());
      const hasOldStages =
        stageNames.includes("new lead") ||
        stageNames.includes("qualified") ||
        stageNames.includes("proposal sent") ||
        stageNames.includes("negotiation") ||
        stageNames.includes("won");

      if (hasOldStages || currentStages.length === 0) {
        if (currentStages.length >= 4) {
          for (let i = 0; i < 4; i++) {
            await supabase
              .from("pipeline_stages")
              .update({
                name: SPEC_DEFAULT_STAGES[i].name,
                color: SPEC_DEFAULT_STAGES[i].color,
                position: SPEC_DEFAULT_STAGES[i].position,
              })
              .eq("id", currentStages[i].id);
          }
          if (currentStages.length > 4) {
            for (let i = 4; i < currentStages.length; i++) {
              await supabase
                .from("deals")
                .update({ stage_id: currentStages[2].id })
                .eq("stage_id", currentStages[i].id);
              await supabase.from("pipeline_stages").delete().eq("id", currentStages[i].id);
            }
          }
        } else {
          await supabase.from("pipeline_stages").delete().eq("pipeline_id", pipelineId);
          const payload = SPEC_DEFAULT_STAGES.map((s) => ({
            pipeline_id: pipelineId,
            name: s.name,
            color: s.color,
            position: s.position,
          }));
          await supabase.from("pipeline_stages").insert(payload);
        }

        const { data: updated } = await supabase
          .from("pipeline_stages")
          .select("*")
          .eq("pipeline_id", pipelineId)
          .order("position");
        return updated ?? [];
      }

      return currentStages;
    },
    [supabase],
  );

  const [userAssignedContactIds, setUserAssignedContactIds] = useState<Set<string>>(new Set());

  const loadDeals = useCallback(
    async (pipelineId: string, stagesList?: PipelineStage[]) => {
      try {
        const activeStages = stagesList && stagesList.length > 0 ? stagesList : stages;
        const defaultStage = activeStages[0]?.id || "";
        const enquiryStage =
          activeStages.find((s) => s.name.toLowerCase().includes("enquiry"))?.id || defaultStage;
        const leadStage =
          activeStages.find((s) => s.name.toLowerCase().includes("lead"))?.id || defaultStage;
        const bookingStage =
          activeStages.find((s) => s.name.toLowerCase().includes("book"))?.id || defaultStage;
        const retailStage =
          activeStages.find((s) => s.name.toLowerCase().includes("retail"))?.id || defaultStage;

        // 1. Fetch contacts, convs, MyTelly notes, and profiles
        const [contactsRes, convsRes, notesRes, profRes] = await Promise.all([
          supabase
            .from("contacts")
            .select("id, name, phone, email, company, user_id, created_at")
            .order("created_at", { ascending: false }),
          supabase.from("conversations").select("contact_id, assigned_agent_id"),
          supabase
            .from("contact_notes")
            .select("id, contact_id, note_text")
            .or("note_text.ilike.%MyTelly%,note_text.ilike.%Call Status:%"),
          supabase.from("profiles").select("id, user_id, full_name, email"),
        ]);

        const contactsData = contactsRes.data || [];
        const contactIds = contactsData.map((c) => c.id);
        const allProfiles = profRes.data || [];

        const userToProfileMap: Record<string, string> = {};
        const profileToUserMap: Record<string, string> = {};
        allProfiles.forEach((p) => {
          if (p.user_id && p.id) {
            userToProfileMap[p.user_id] = p.id;
            profileToUserMap[p.id] = p.user_id;
          }
        });

        const callerProfile = allProfiles.find((p) => p.user_id === user?.id);
        const executiveName = (callerProfile?.full_name || "").trim().toLowerCase();

        const assignedIds = new Set<string>();
        const contactAssigneeMap: Record<string, string> = {};

        // WhatsApp assigned agents
        convsRes.data?.forEach((cv) => {
          if (cv.contact_id && cv.assigned_agent_id) {
            contactAssigneeMap[cv.contact_id] = cv.assigned_agent_id;
            if (user && cv.assigned_agent_id === user.id) assignedIds.add(cv.contact_id);
          }
        });

        // MyTelly notes assigned executives
        notesRes.data?.forEach((n) => {
          if (!n.contact_id || !n.note_text) return;
          const match = n.note_text.match(/Executive:\s*([^\n\r]+)/i);
          if (!match) return;
          const exec = match[1].replace(/\s*\([^)]+\)/, "").trim().toLowerCase();
          if (!exec || exec === "--" || exec === "none" || exec.includes("not connected")) return;

          const matchedProf = allProfiles.find(
            (p) =>
              p.full_name?.toLowerCase().includes(exec) ||
              exec.includes(p.full_name?.toLowerCase() || "___"),
          );
          if (matchedProf) {
            contactAssigneeMap[n.contact_id] = matchedProf.user_id;
            if (user && matchedProf.user_id === user.id) {
              assignedIds.add(n.contact_id);
            }
          }
        });

        // Direct contact owners
        contactsData.forEach((c) => {
          if (user && c.user_id === user.id) {
            assignedIds.add(c.id);
            if (!contactAssigneeMap[c.id]) contactAssigneeMap[c.id] = user.id;
          }
        });

        setUserAssignedContactIds(assignedIds);

        // 2. Fetch custom fields from BOTH tables
        const [cf1, cv1, cf2, cv2] = await Promise.all([
          supabase.from("custom_fields").select("id, field_name"),
          supabase.from("contact_custom_values").select("*").in("contact_id", contactIds),
          supabase.from("contact_custom_fields").select("id, name"),
          supabase.from("contact_custom_field_values").select("*").in("contact_id", contactIds),
        ]);

        const fieldMap1: Record<string, string> = {};
        cf1.data?.forEach((f) => {
          fieldMap1[f.id] = f.field_name;
        });
        const fieldMap2: Record<string, string> = {};
        cf2.data?.forEach((f) => {
          fieldMap2[f.id] = f.name;
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
            altPhone: "",
          };
        });

        cv1.data?.forEach((v) => {
          const fName = fieldMap1[v.custom_field_id];
          if (!fName || !profileMap[v.contact_id]) return;
          if (fName === "Alternative Phone") profileMap[v.contact_id].altPhone = v.value;
          if (fName === "State") profileMap[v.contact_id].state = v.value;
          if (fName === "District") profileMap[v.contact_id].district = v.value;
          if (fName === "Business Type") profileMap[v.contact_id].businessType = v.value;
          if (fName === "Production Capacity") profileMap[v.contact_id].capacity = v.value;
          if (fName === "Lead Status") profileMap[v.contact_id].leadStatus = v.value;
        });

        cv2.data?.forEach((v) => {
          const fName = fieldMap2[v.custom_field_id];
          if (!fName || !profileMap[v.contact_id]) return;
          if (fName === "Alternative Phone") profileMap[v.contact_id].altPhone = v.value;
          if (fName === "State") profileMap[v.contact_id].state = v.value;
          if (fName === "District") profileMap[v.contact_id].district = v.value;
          if (fName === "Business Type") profileMap[v.contact_id].businessType = v.value;
          if (fName === "Production Capacity") profileMap[v.contact_id].capacity = v.value;
          if (fName === "Lead Status") profileMap[v.contact_id].leadStatus = v.value;
        });

        // 3. Fetch existing deals & profiles for foreign key resolution
        const { data: dealRows } = await supabase
          .from("deals")
          .select("*, contact:contacts(*), assignee:profiles!deals_assigned_to_fkey(*)")
          .eq("pipeline_id", pipelineId)
          .order("created_at", { ascending: false });

        const existingContactDealMap: Record<string, any> = {};
        (dealRows || []).forEach((d) => {
          if (d.contact_id) existingContactDealMap[d.contact_id] = d;
        });

        const newDealsToInsert: any[] = [];
        contactsData.forEach((c) => {
          const prof = profileMap[c.id];
          const st = (prof?.leadStatus || "").toLowerCase();
          let targetStage = enquiryStage;
          if (st.includes("book") || st.includes("won")) targetStage = bookingStage;
          else if (st.includes("retail") || st.includes("deliver")) targetStage = retailStage;
          else if (
            st.includes("lead") ||
            st.includes("follow") ||
            st.includes("quotation") ||
            st.includes("demo")
          )
            targetStage = leadStage;
          else if (st.includes("enquiry")) targetStage = enquiryStage;

          const existingDeal = existingContactDealMap[c.id];
          if (!existingDeal && user?.id) {
            const rawAssignee = contactAssigneeMap[c.id] || c.user_id || user.id;
            const targetAssignedProfileId = rawAssignee
              ? userToProfileMap[rawAssignee] || null
              : null;

            newDealsToInsert.push({
              title: c.name || c.phone || "Customer",
              contact_id: c.id,
              pipeline_id: pipelineId,
              user_id: rawAssignee || user.id,
              account_id: accountId,
              stage_id: targetStage,
              value: 0,
              currency: "INR",
              status: "open",
              assigned_to: targetAssignedProfileId,
            });
          }
        });

        if (newDealsToInsert.length > 0 && accountId && defaultStage) {
          await supabase.from("deals").insert(newDealsToInsert);
        }

        const { data: reloadedDeals } = await supabase
          .from("deals")
          .select("*, contact:contacts(*), assignee:profiles!deals_assigned_to_fkey(*)")
          .eq("pipeline_id", pipelineId)
          .order("created_at", { ascending: false });

        const whatsappContactIds = new Set(
          (convsRes.data || []).map((c) => c.contact_id).filter(Boolean),
        );
        const mytellyContactIds = new Set<string>();
        const metaTamilContactIds = new Set<string>();
        const metaHindiContactIds = new Set<string>();
        const metaContactIds = new Set<string>();

        notesRes.data?.forEach((n) => {
          if (!n.contact_id || !n.note_text) return;
          const txt = n.note_text.toLowerCase();
          if (txt.includes("meta ad") || txt.includes("meta lead")) {
            if (txt.includes("tamil")) metaTamilContactIds.add(n.contact_id);
            else if (txt.includes("hindi")) metaHindiContactIds.add(n.contact_id);
            else metaContactIds.add(n.contact_id);
          } else if (txt.includes("mytelly") || txt.includes("call status")) {
            mytellyContactIds.add(n.contact_id);
          }
        });

        const contactSourceMap: Record<
          string,
          "whatsapp" | "mytelly" | "both" | "meta_tamil" | "meta_hindi" | "meta"
        > = {};
        contactsData.forEach((c) => {
          if (metaTamilContactIds.has(c.id)) {
            contactSourceMap[c.id] = "meta_tamil";
          } else if (metaHindiContactIds.has(c.id)) {
            contactSourceMap[c.id] = "meta_hindi";
          } else if (metaContactIds.has(c.id)) {
            contactSourceMap[c.id] = "meta";
          } else {
            const isWhatsApp = whatsappContactIds.has(c.id);
            const isMyTelly = mytellyContactIds.has(c.id);
            if (isWhatsApp && isMyTelly) contactSourceMap[c.id] = "both";
            else if (isMyTelly) contactSourceMap[c.id] = "mytelly";
            else if (isWhatsApp) contactSourceMap[c.id] = "whatsapp";
            else contactSourceMap[c.id] = "whatsapp";
          }
        });

        return ((reloadedDeals ?? []) as any[]).map((d) => {
          let source: any = d.contact_id ? contactSourceMap[d.contact_id] : null;
          if (!source && d.notes?.toLowerCase().includes("meta")) {
            if (
              d.notes?.toLowerCase().includes("tamil") ||
              d.title?.toLowerCase().includes("tamil")
            )
              source = "meta_tamil";
            else if (
              d.notes?.toLowerCase().includes("hindi") ||
              d.title?.toLowerCase().includes("hindi")
            )
              source = "meta_hindi";
            else source = "meta";
          }
          return {
            ...d,
            customProfile: d.contact_id ? profileMap[d.contact_id] : null,
            resolvedAssigneeId: d.contact_id ? contactAssigneeMap[d.contact_id] : null,
            leadSource: source || "whatsapp",
          };
        });
      } catch (err) {
        console.error("Failed to load pipeline deals:", err);
        return [];
      }
    },
    [supabase, accountId, stages, user],
  );

  const seedDefaultPipeline = useCallback(async (): Promise<Pipeline | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userSession = session?.user;
    if (!userSession || !accountId) return null;

    const { data: pipeline, error } = await supabase
      .from("pipelines")
      .insert({ user_id: userSession.id, account_id: accountId, name: "Sales Pipeline" })
      .select()
      .single();

    if (error || !pipeline) {
      console.error("Failed to seed pipeline:", error?.message);
      return null;
    }

    const stagesPayload = SPEC_DEFAULT_STAGES.map((s) => ({
      pipeline_id: pipeline.id,
      name: s.name,
      color: s.color,
      position: s.position,
    }));
    await supabase.from("pipeline_stages").insert(stagesPayload);

    return pipeline as Pipeline;
  }, [supabase, accountId]);

  // Initial load + seed-if-empty
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let list = await loadPipelines();

      if (list.length === 0 && !seedAttempted.current) {
        seedAttempted.current = true;
        const seeded = await seedDefaultPipeline();
        if (seeded) list = await loadPipelines();
      }

      if (cancelled) return;
      setPipelines(list);
      if (list.length > 0) {
        setSelectedPipelineId((prev) =>
          prev && list.some((p) => p.id === prev) ? prev : list[0].id,
        );
      } else {
        setSelectedPipelineId("");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPipelines, seedDefaultPipeline]);

  // Load stages + deals whenever selected pipeline changes.
  useEffect(() => {
    if (!selectedPipelineId) {
      setStages([]);
      setDeals([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const s = await loadStages(selectedPipelineId);
      const d = await loadDeals(selectedPipelineId, s);
      if (cancelled) return;
      setStages(s);
      setDeals(d);
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedPipelineId, loadStages, loadDeals]);

  const refreshPipelines = useCallback(async () => {
    const list = await loadPipelines();
    setPipelines(list);
    if (list.length === 0) setSelectedPipelineId("");
    else if (!list.some((p) => p.id === selectedPipelineId))
      setSelectedPipelineId(list[0].id);
  }, [loadPipelines, selectedPipelineId]);

  const refreshStages = useCallback(async () => {
    if (!selectedPipelineId) return;
    setStages(await loadStages(selectedPipelineId));
  }, [loadStages, selectedPipelineId]);

  const refreshDeals = useCallback(async () => {
    if (!selectedPipelineId) return;
    setDeals(await loadDeals(selectedPipelineId, stages));
  }, [loadDeals, selectedPipelineId, stages]);

  const handleDealMoved = useCallback(
    async (dealId: string, newStageId: string) => {
      const targetStage = stages.find((s) => s.id === newStageId);
      const stageName = targetStage?.name || "Next Stage";

      // Optimistic update
      setDeals((prev) =>
        prev.map((d) => (d.id === dealId ? { ...d, stage_id: newStageId } : d)),
      );

      const deal = deals.find((d) => d.id === dealId);
      const { error } = await supabase
        .from("deals")
        .update({ stage_id: newStageId })
        .eq("id", dealId);

      if (error) {
        toast.error("Failed to move deal");
        refreshDeals();
        return;
      }

      toast.success(`Customer moved to ${stageName}`);

      // Sync customer profile status if linked to contact
      if (deal?.contact_id) {
        try {
          const { data: cf } = await supabase
            .from("custom_fields")
            .select("id")
            .eq("field_name", "Lead Status")
            .maybeSingle();

          if (cf) {
            await supabase.from("contact_custom_values").upsert(
              {
                contact_id: deal.contact_id,
                custom_field_id: cf.id,
                value: stageName,
              },
              { onConflict: "contact_id,custom_field_id" },
            );
          }
        } catch (syncErr) {
          console.warn("Could not sync custom fields on deal move:", syncErr);
        }
      }
    },
    [supabase, refreshDeals, stages, deals],
  );

  const handleAddCustomer = useCallback(
    (stageId?: string) => {
      setDefaultStageId(stageId ?? stages[0]?.id ?? "");
      setAddCustomerModalOpen(true);
    },
    [stages],
  );

  const handleEditDeal = useCallback((deal: Deal) => {
    setEditingDeal(deal);
    setDefaultStageId(deal.stage_id);
    setDealFormOpen(true);
  }, []);

  async function handleCreatePipeline() {
    const name = newPipelineName.trim();
    if (!name || !accountId) return;
    setCreating(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userSession = session?.user;
    if (!userSession) {
      setCreating(false);
      return;
    }

    const { data: pipeline, error } = await supabase
      .from("pipelines")
      .insert({ user_id: userSession.id, account_id: accountId, name })
      .select()
      .single();

    if (error || !pipeline) {
      toast.error("Failed to create pipeline");
      setCreating(false);
      return;
    }

    const stagesPayload = SPEC_DEFAULT_STAGES.map((s) => ({
      pipeline_id: pipeline.id,
      name: s.name,
      color: s.color,
      position: s.position,
    }));
    await supabase.from("pipeline_stages").insert(stagesPayload);

    setNewPipelineName("");
    setNewPipelineOpen(false);
    setSelectedPipelineId(pipeline.id);
    await refreshPipelines();
    setCreating(false);
    toast.success("Pipeline created successfully!");
  }

  // Filter deals based on role & search
  const filteredDeals = useMemo(() => {
    return deals.filter((d: any) => {
      // 1. Role-based isolation
      if (!isAdminOrOwner && user) {
        const isAssignedToUser =
          d.user_id === user.id ||
          d.assigned_to === user.id ||
          d.assignee?.user_id === user.id ||
          d.resolvedAssigneeId === user.id ||
          d.contact?.user_id === user.id ||
          (d.contact_id && userAssignedContactIds.has(d.contact_id));
        if (!isAssignedToUser) return false;
      } else if (agentFilter !== "all") {
        const matchAgent =
          d.assignee?.full_name?.toLowerCase().includes(agentFilter.toLowerCase()) ||
          d.assigned_to === agentFilter ||
          d.resolvedAssigneeId === agentFilter;
        if (!matchAgent) return false;
      }

      // 2. Search
      if (search.trim()) {
        const s = search.toLowerCase();
        const matchTitle = (d.title || "").toLowerCase().includes(s);
        const matchPhone = (d.contact?.phone || "").toLowerCase().includes(s);
        const matchName = (d.contact?.name || "").toLowerCase().includes(s);
        const matchBiz = (d.customProfile?.businessType || "").toLowerCase().includes(s);
        const matchLoc = (d.customProfile?.state || d.customProfile?.district || "")
          .toLowerCase()
          .includes(s);
        if (!matchTitle && !matchPhone && !matchName && !matchBiz && !matchLoc) return false;
      }

      return true;
    });
  }, [deals, isAdminOrOwner, user, agentFilter, search, userAssignedContactIds]);

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="flex gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 w-72 animate-pulse rounded-xl bg-muted/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Sticky Frozen Top Header & Controls */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pt-1 pb-3 space-y-3 border-b border-border/60 -mx-6 px-6 shadow-xs">
        {/* Top Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Sales Pipelines
              </h1>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                {filteredDeals.length} Customer Deals
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Track customer enquiry follow-ups, bookings & retail delivery stages
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Pipeline selector dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors shadow-2xs"
              >
                <GitBranch className="h-4 w-4 text-primary" />
                <span>{selectedPipeline?.name ?? "Sales Pipeline"}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-56 border-border bg-popover text-popover-foreground"
              >
                {pipelines.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => setSelectedPipelineId(p.id)}
                    className={
                      p.id === selectedPipelineId
                        ? "text-primary font-semibold"
                        : "text-popover-foreground"
                    }
                  >
                    <GitBranch className="mr-2 h-3.5 w-3.5" />
                    {p.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator className="bg-border" />
                {selectedPipeline && (
                  <DropdownMenuItem
                    onClick={() => setSettingsOpen(true)}
                    className="text-popover-foreground"
                  >
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    Manage Pipeline
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <GatedButton
              canAct={canCreateDeals}
              gateReason="create deals"
              disabled={!selectedPipelineId || stages.length === 0}
              onClick={() => handleAddCustomer()}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 font-semibold shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>+ Add Customer to Stage</span>
            </GatedButton>

            <Button
              variant="outline"
              size="sm"
              onClick={refreshDeals}
              className="h-9 gap-1.5 border-border text-foreground hover:bg-muted"
              title="Refresh Board"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-2.5 rounded-lg border border-border shadow-2xs">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customer, phone, business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8.5 text-xs bg-background border-border text-foreground"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Agent Filter (Admin only) or Executive Badge */}
            {isAdminOrOwner ? (
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                aria-label="Filter deals by executive"
                className="h-8.5 rounded-md border border-input bg-background px-3 py-1 text-xs font-semibold shadow-2xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
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
              <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
                <UserCheck className="h-3.5 w-3.5" />
                <span>My Assigned Leads</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Analytics Summary */}
      <PipelineAnalytics stages={stages} deals={filteredDeals} />

      {/* Board with Drag and Drop */}
      {pipelines.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-20 bg-card">
          <GitBranch className="h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium text-foreground">
            No Pipelines Available
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Create a pipeline to track customer enquiries and follow-ups
          </p>
          <GatedButton
            canAct={canEditSettings}
            gateReason="create pipelines"
            onClick={() => setNewPipelineOpen(true)}
            className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="mr-1 h-4 w-4" />
            Create Pipeline
          </GatedButton>
        </div>
      ) : (
        <PipelineBoard
          stages={stages}
          deals={filteredDeals}
          onDealMoved={handleDealMoved}
          onAddDeal={handleAddCustomer}
          onEditDeal={handleEditDeal}
        />
      )}

      {/* New Pipeline Dialog */}
      <Dialog open={newPipelineOpen} onOpenChange={setNewPipelineOpen}>
        <DialogContent className="sm:max-w-sm bg-popover border-border">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">New Pipeline</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Label className="text-muted-foreground">Pipeline Name</Label>
            <Input
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="e.g. Machinery Sales"
              className="mt-2 bg-muted border-border text-foreground"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreatePipeline();
              }}
            />
          </div>
          <DialogFooter className="bg-popover/50 border-border">
            <Button
              variant="outline"
              onClick={() => setNewPipelineOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreatePipeline}
              disabled={creating || !newPipelineName.trim()}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {creating ? "Creating..." : "Create Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Settings */}
      {selectedPipeline && (
        <PipelineSettings
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          pipeline={selectedPipeline}
          stages={stages}
          onPipelinesChanged={refreshPipelines}
          onStagesChanged={refreshStages}
          onCreateNewPipeline={() => {
            setSettingsOpen(false);
            setNewPipelineOpen(true);
          }}
        />
      )}

      {/* Deal Form (Sheet) */}
      <DealForm
        open={dealFormOpen}
        onOpenChange={setDealFormOpen}
        deal={editingDeal}
        pipelineId={selectedPipelineId}
        stages={stages}
        defaultStageId={defaultStageId}
        onSaved={refreshDeals}
      />

      {/* Add Customer To Stage Modal */}
      <AddCustomerToStageDialog
        open={addCustomerModalOpen}
        onOpenChange={setAddCustomerModalOpen}
        stages={stages}
        defaultStageId={defaultStageId}
        pipelineId={selectedPipelineId}
        onAdded={refreshDeals}
      />
    </div>
  );
}
