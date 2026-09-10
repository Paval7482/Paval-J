"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import type { Contact, Deal, ContactNote, Tag } from "@/types";
import {
  Phone,
  Mail,
  Copy,
  Check,
  User,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  Edit3,
  MapPin,
  Building,
  Activity,
  Sparkles,
  PhoneCall,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useTranslations } from "next-intl";
import { CustomerProfileModal } from "@/components/contacts/customer-profile-modal";
import {
  getCustomerProfile,
  type CustomerProfileData,
} from "@/lib/contacts/customer-profile";

interface ContactSidebarProps {
  contact: Contact | null;
}

export function ContactSidebar({ contact }: ContactSidebarProps) {
  const tSidebar = useTranslations("Inbox.sidebar");
  const tThread = useTranslations("Inbox.messageThread");

  const { accountId } = useAuth();
  const [copied, setCopied] = useState(false);
  const [copiedAlt, setCopiedAlt] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<(Tag & { contact_tag_id: string })[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profileData, setProfileData] = useState<CustomerProfileData | null>(null);

  const fetchContactData = useCallback(async () => {
    if (!contact) return;

    const supabase = createClient();

    // Fetch deals, notes, tags, and profile in parallel
    const [dealsRes, notesRes, tagsRes, profileRes] = await Promise.all([
      supabase
        .from("deals")
        .select("*, stage:pipeline_stages(*)")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_notes")
        .select("*")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_tags")
        .select("id, tag_id, tags(*)")
        .eq("contact_id", contact.id),
      getCustomerProfile(supabase, contact.id),
    ]);

    if (dealsRes.data) setDeals(dealsRes.data);
    if (notesRes.data) setNotes(notesRes.data);
    if (tagsRes.data) {
      const mapped = tagsRes.data
        .filter((ct: Record<string, unknown>) => ct.tags)
        .map((ct: Record<string, unknown>) => ({
          ...(ct.tags as Tag),
          contact_tag_id: ct.id as string,
        }));
      setTags(mapped);
    }
    if (profileRes) setProfileData(profileRes);
  }, [contact]);

  useEffect(() => {
    fetchContactData();
  }, [fetchContactData]);

  const handleCopyPhone = useCallback(async () => {
    if (!contact?.phone) return;
    await navigator.clipboard.writeText(contact.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [contact]);

  const handleCopyAltPhone = useCallback(async () => {
    if (!profileData?.altPhone) return;
    await navigator.clipboard.writeText(profileData.altPhone);
    setCopiedAlt(true);
    setTimeout(() => setCopiedAlt(false), 2000);
  }, [profileData?.altPhone]);

  const handleAddNote = useCallback(async () => {
    if (!contact || !newNote.trim()) return;
    if (!accountId) return;
    setAddingNote(true);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const user = session?.user;

    const { data, error } = await supabase
      .from("contact_notes")
      .insert({
        contact_id: contact.id,
        account_id: accountId,
        user_id: user?.id,
        note_text: newNote.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setNotes((prev) => [data, ...prev]);
      setNewNote("");
    }
    setAddingNote(false);
  }, [contact, newNote, accountId]);

  if (!contact) {
    return (
      <div className="flex h-full w-80 items-center justify-center border-l border-border bg-card">
        <p className="text-sm text-muted-foreground">{tThread("selectConversation")}</p>
      </div>
    );
  }

  const displayName = profileData?.name || contact.name || contact.phone;
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex h-full w-80 flex-col border-l border-border bg-card">
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Customer Profile Header Card */}
          <div className="rounded-xl border border-border bg-muted/30 p-3.5 shadow-sm text-center relative overflow-hidden">
            <div className="absolute top-2 right-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setProfileModalOpen(true)}
                title="Edit Customer Profile"
                className="h-7 w-7 text-primary hover:bg-primary/10"
              >
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-base font-bold">
                {contact.avatar_url ? (
                  <img
                    src={contact.avatar_url}
                    alt={displayName}
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <h3 className="mt-2 text-sm font-bold text-foreground truncate max-w-[200px]">
                {displayName}
              </h3>
              {profileData?.company && (
                <p className="text-xs text-muted-foreground">{profileData.company}</p>
              )}

              {/* Status Badge */}
              <div className="mt-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs font-semibold px-2.5 py-0.5",
                    profileData?.leadStatus === "Booking / Closed Won"
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : profileData?.leadStatus === "Quotation Sent"
                      ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                      : profileData?.leadStatus === "Lost / Not Interested"
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                  )}
                >
                  {profileData?.leadStatus || "New Enquiry"}
                </Badge>
              </div>
            </div>

            {/* Quick Edit Profile Button */}
            <div className="mt-3">
              <Button
                size="sm"
                onClick={() => setProfileModalOpen(true)}
                className="w-full h-8 text-xs font-semibold bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground transition-all gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Executive Call Entry
              </Button>
            </div>
          </div>

          {/* Customer Requirement Profile Details */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2.5 text-xs">
            <div className="flex items-center justify-between font-semibold text-muted-foreground uppercase text-[11px] pb-1 border-b border-border">
              <span>Requirement Details</span>
              <span className="text-primary cursor-pointer hover:underline" onClick={() => setProfileModalOpen(true)}>Edit</span>
            </div>

            {/* Business Type */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-500" />
                Business:
              </span>
              <span className="font-semibold text-foreground">
                {profileData?.businessType || "Murukku Business"}
              </span>
            </div>

            {/* Production Capacity */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Capacity:
              </span>
              <span className="font-semibold text-foreground">
                {profileData?.capacity || "50 - 100 Kg/Day"}
              </span>
            </div>

            {/* State & District */}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                Location:
              </span>
              <span className="font-semibold text-foreground">
                {profileData?.district
                  ? `${profileData.district}, ${profileData.state || 'TN'}`
                  : profileData?.state || "Tamil Nadu"}
              </span>
            </div>

            {/* Alternative Phone */}
            {profileData?.altPhone && (
              <div className="flex items-center justify-between pt-1 border-t border-border">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <PhoneCall className="h-3.5 w-3.5 text-blue-500" />
                  Alt Phone:
                </span>
                <div className="flex items-center gap-1 font-mono text-foreground">
                  <span>{profileData.altPhone}</span>
                  <button
                    onClick={handleCopyAltPhone}
                    className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                    title="Copy alternative phone"
                  >
                    {copiedAlt ? (
                      <Check className="h-3 w-3 text-primary" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  <a
                    href={`tel:${profileData.altPhone}`}
                    className="p-1 hover:bg-muted rounded text-primary"
                    title="Call alternative phone"
                  >
                    <Phone className="h-3 w-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Primary Phone & Actions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 p-2.5 text-xs">
              <div className="flex items-center gap-2 text-foreground font-mono font-medium">
                <Phone className="h-4 w-4 text-primary" />
                <span>{contact.phone}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyPhone}
                  className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy Phone"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
                <a
                  href={`tel:${contact.phone}`}
                  className="p-1.5 hover:bg-primary/10 rounded text-primary transition-colors"
                  title="Call Customer"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {contact.email && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <TagIcon className="h-3 w-3" />
              {tSidebar("tags")}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{tSidebar("noTags")}</p>
              ) : (
                tags.map((tag) => (
                  <span
                    key={tag.contact_tag_id}
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Active Deals */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <DollarSign className="h-3 w-3" />
              {tSidebar("deals")}
            </div>
            <div className="mt-2 space-y-2">
              {deals.length === 0 ? (
                <p className="px-1 text-xs text-muted-foreground">{tSidebar("noDeals")}</p>
              ) : (
                deals.map((deal) => (
                  <div
                    key={deal.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {deal.title}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {deal.currency ?? "₹"}
                        {deal.value.toLocaleString()}
                      </span>
                      {deal.stage && (
                        <span
                          className="rounded-full px-1.5 py-0.5 text-[10px]"
                          style={{
                            backgroundColor: `${deal.stage.color}20`,
                            color: deal.stage.color,
                          }}
                        >
                          {deal.stage.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-border pt-3">
            <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <StickyNote className="h-3 w-3" />
              {tSidebar("notes")}
            </div>
            <div className="mt-2">
              <div className="flex gap-2">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder={tSidebar("addNotePlaceholder")}
                  rows={2}
                  className="flex-1 resize-none rounded-lg border border-border bg-muted px-3 py-2 text-xs text-foreground placeholder-muted-foreground outline-none focus:border-primary/50"
                />
                <Button
                  size="sm"
                  className="h-auto bg-primary px-2 hover:bg-primary/90"
                  onClick={handleAddNote}
                  disabled={!newNote.trim() || addingNote}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="mt-2 space-y-2">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="rounded-lg bg-muted px-3 py-2"
                  >
                    <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                      {note.note_text}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {format(new Date(note.created_at), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Customer Profile Modal */}
      <CustomerProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        contact={contact}
        onSaved={fetchContactData}
      />
    </div>
  );
}
