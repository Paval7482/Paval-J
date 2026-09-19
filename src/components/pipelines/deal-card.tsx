"use client";

import type { Deal, PipelineStage } from "@/types";
import { Calendar, Check, X, Phone, MessageSquare, MapPin, Building, Activity, User } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { useTranslations } from "next-intl";

interface DealCardProps {
  deal: Deal & {
    customProfile?: {
      businessType?: string;
      capacity?: string;
      state?: string;
      district?: string;
      leadStatus?: string;
      altPhone?: string;
    };
  };
  stage: PipelineStage | null;
  onEdit: (deal: Deal) => void;
  isOverlay?: boolean;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function initials(name?: string, fallback?: string) {
  const source = (name || fallback || "?").trim();
  if (!source) return "?";
  return source.charAt(0).toUpperCase();
}

export function DealCard({ deal, stage, onEdit, isOverlay }: DealCardProps) {
  const t = useTranslations("Pipelines.card");
  const contactName = deal.contact?.name || "";
  const contactPhone = deal.contact?.phone || "";
  const title = deal.title || contactName || contactPhone || "Customer Enquiry";
  const assigneeLabel = deal.assignee?.full_name || (deal as any).assignee_name || null;
  const profile = deal.customProfile || (deal.contact as any)?.profile;
  const cleanPhone = contactPhone.replace(/\D/g, "");

  return (
    <div
      onClick={(e) => {
        if (isOverlay) return;
        onEdit(deal);
      }}
      className={`group relative w-full cursor-pointer rounded-xl border border-border/70 bg-card p-3.5 text-left shadow-xs transition-all hover:border-primary/40 hover:shadow-md ${
        isOverlay ? "shadow-2xl ring-2 ring-primary bg-card/95 scale-105" : ""
      }`}
    >
      {/* Stage Accent bar on left */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-1 rounded-l-xl transition-all group-hover:w-1.5"
        style={{ backgroundColor: stage?.color ?? "#3b82f6" }}
      />

      {/* Top Title & Status */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="flex-1 text-sm font-semibold text-foreground leading-snug break-words">
          {title}
        </h4>
        {deal.status === "won" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" />
            Won
          </span>
        )}
        {deal.status === "lost" && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-semibold text-rose-500">
            <X className="h-3 w-3" />
            Lost
          </span>
        )}
      </div>

      {/* Customer Phone & Quick Actions */}
      {contactPhone && (
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-mono font-medium text-foreground/80">
            {contactPhone}
          </span>
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            {cleanPhone && (
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Chat on WhatsApp"
                className="p-1 rounded-full text-emerald-600 hover:bg-emerald-500/10 transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </a>
            )}
            <a
              href={`tel:${contactPhone}`}
              title="Call Customer"
              className="p-1 rounded-full text-primary hover:bg-primary/10 transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Profile Details Badges (Business Type, Capacity, Location) */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {profile?.businessType && (
          <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            <Building className="h-2.5 w-2.5" />
            {profile.businessType}
          </span>
        )}
        {profile?.capacity && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
            <Activity className="h-2.5 w-2.5" />
            {profile.capacity}
          </span>
        )}
        {(profile?.state || profile?.district) && (
          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {profile.district ? `${profile.district}, ${profile.state || ""}` : profile.state}
          </span>
        )}
        {/* Lead Source Badges */}
        {(deal as any).leadSource === "meta_tamil" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-semibold border border-blue-500/20">
            📥 Meta Lead (Tamil)
          </span>
        )}
        {(deal as any).leadSource === "meta_hindi" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] font-semibold border border-amber-500/20">
            📥 Meta Lead (Hindi)
          </span>
        )}
        {(deal as any).leadSource === "meta" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 text-[10px] font-semibold border border-blue-500/20">
            📥 Meta Lead Form
          </span>
        )}
        {(deal as any).leadSource === "mytelly" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 text-[10px] font-semibold border border-indigo-500/20">
            <Phone className="h-2.5 w-2.5" />
            MyTelly Lead
          </span>
        )}
        {(deal as any).leadSource === "whatsapp" && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.5 text-[10px] font-semibold border border-emerald-500/20">
            <MessageSquare className="h-2.5 w-2.5" />
            WhatsApp Lead
          </span>
        )}
        {(deal as any).leadSource === "both" && (
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

      {/* Footer: Value & Assigned Agent */}
      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50 text-xs">
        <span className="font-bold text-foreground">
          {Number(deal.value) > 0
            ? formatCurrency(deal.value, deal.currency || "INR")
            : "₹0"}
        </span>

        {assigneeLabel ? (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
              {initials(assigneeLabel)}
            </span>
            <span className="truncate max-w-[90px]">{assigneeLabel}</span>
          </div>
        ) : (
          <span className="text-[10px] text-muted-foreground/60">Unassigned</span>
        )}
      </div>
    </div>
  );
}
