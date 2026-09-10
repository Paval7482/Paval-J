'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import type { Conversation, Contact } from '@/types';
import {
  MessageSquare,
  Phone,
  PhoneCall,
  Search,
  RefreshCw,
  UserCheck,
  MapPin,
  Activity,
  Sparkles,
  CheckCircle2,
  Clock,
  User,
  Edit3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { CustomerProfileModal } from '@/components/contacts/customer-profile-modal';
import {
  INDIAN_STATES,
  BUSINESS_TYPES,
  PRODUCTION_CAPACITIES,
  LEAD_STATUSES,
  type CustomerProfileData,
} from '@/lib/contacts/customer-profile';

interface InboxTableViewProps {
  conversations: Conversation[];
  onSelectConversation: (conv: Conversation) => void;
  onRefresh: () => void;
  loading?: boolean;
}

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

export function InboxTableView({
  conversations,
  onSelectConversation,
  onRefresh,
  loading = false,
}: InboxTableViewProps) {
  const supabase = createClient();
  const { accountRole, user } = useAuth();
  const isAdminOrOwner = accountRole === 'owner' || accountRole === 'admin';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [businessFilter, setBusinessFilter] = useState<string>('all');
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Selected contact for profile modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedContactForProfile, setSelectedContactForProfile] = useState<Contact | null>(null);

  // Custom profile values map: contact_id -> CustomerProfileData
  const [profilesMap, setProfilesMap] = useState<Record<string, CustomerProfileData>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Fetch team members
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch('/api/account/members');
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

  // Fetch custom values for all contacts in loaded conversations
  const fetchProfiles = useCallback(async () => {
    if (conversations.length === 0) return;
    setLoadingProfiles(true);

    try {
      const contactIds = conversations
        .map((c) => c.contact_id || c.contact?.id)
        .filter(Boolean) as string[];

      if (contactIds.length === 0) return;

      const [fieldsRes, valuesRes] = await Promise.all([
        supabase.from('custom_fields').select('id, field_name'),
        supabase.from('contact_custom_values').select('*').in('contact_id', contactIds),
      ]);

      const fieldMap: Record<string, string> = {};
      fieldsRes.data?.forEach((f) => {
        fieldMap[f.id] = f.field_name;
      });

      const map: Record<string, CustomerProfileData> = {};

      conversations.forEach((conv) => {
        const c = conv.contact;
        if (!c) return;
        map[c.id] = {
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          company: c.company || '',
          businessType: 'Murukku Business',
          capacity: '50 - 100 Kg/Day',
          state: 'Tamil Nadu',
          district: '',
          leadStatus: 'In Follow-up',
        };
      });

      valuesRes.data?.forEach((v) => {
        const fieldName = fieldMap[v.custom_field_id];
        if (!fieldName || !map[v.contact_id]) return;

        if (fieldName === 'Alternative Phone') map[v.contact_id].altPhone = v.value;
        if (fieldName === 'State') map[v.contact_id].state = v.value;
        if (fieldName === 'District') map[v.contact_id].district = v.value;
        if (fieldName === 'Business Type') map[v.contact_id].businessType = v.value;
        if (fieldName === 'Production Capacity') map[v.contact_id].capacity = v.value;
        if (fieldName === 'Lead Status') map[v.contact_id].leadStatus = v.value;
      });

      setProfilesMap(map);
    } catch (err) {
      console.error('Failed to load profiles map:', err);
    } finally {
      setLoadingProfiles(false);
    }
  }, [conversations, supabase]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // Reassign conversation
  const handleReassign = async (conversationId: string, member: TeamMember) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .update({ assigned_agent_id: member.user_id, updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      if (error) throw error;
      toast.success(`Assigned WhatsApp lead to ${member.full_name}`);
      onRefresh();
    } catch (err) {
      toast.error('Failed to assign conversation');
    }
  };

  // Filter conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((conv) => {
      const contact = conv.contact;
      const profile = contact ? profilesMap[contact.id] : null;

      // Executive isolation: non-admin only sees assigned to them or unassigned
      if (!isAdminOrOwner && user) {
        if (conv.assigned_agent_id && conv.assigned_agent_id !== user.id) {
          return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = contact?.name?.toLowerCase().includes(q) || profile?.name?.toLowerCase().includes(q);
        const phoneMatch = contact?.phone?.includes(q) || profile?.altPhone?.includes(q);
        const cityMatch = profile?.district?.toLowerCase().includes(q) || profile?.state?.toLowerCase().includes(q);
        const businessMatch = profile?.businessType?.toLowerCase().includes(q);
        const messageMatch = conv.last_message_text?.toLowerCase().includes(q);

        if (!nameMatch && !phoneMatch && !cityMatch && !businessMatch && !messageMatch) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && conv.status !== statusFilter) {
        return false;
      }

      // Agent filter (Admin only)
      if (isAdminOrOwner && agentFilter !== 'all') {
        if (conv.assigned_agent_id !== agentFilter) {
          return false;
        }
      }

      // Business Type filter
      if (businessFilter !== 'all') {
        if (profile?.businessType !== businessFilter) {
          return false;
        }
      }

      return true;
    });
  }, [conversations, profilesMap, search, statusFilter, agentFilter, businessFilter, isAdminOrOwner, user]);

  // Member map for quick name resolution
  const memberNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.user_id] = m.full_name;
    });
    return map;
  }, [members]);

  // Stats
  const totalLeads = conversations.length;
  const openLeads = conversations.filter((c) => c.status === 'open').length;
  const pendingLeads = conversations.filter((c) => c.status === 'pending').length;
  const unreadCount = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 overflow-y-auto h-full">
      {/* Top Header & Refresh */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              WhatsApp Leads Directory
            </h2>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              Live Inbox Table
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Table view of WhatsApp enquiries, customer profiles, and executive assignments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onRefresh();
              fetchProfiles();
            }}
            disabled={loading}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading || loadingProfiles ? 'animate-spin' : ''}`} />
            Refresh Table
          </Button>
        </div>
      </div>

      {/* Stats Cards Matching MyTelly Theme */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total WhatsApp Leads</span>
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-foreground">{totalLeads}</div>
          <span className="text-[11px] text-muted-foreground">All Inbound Enquiries</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Active / Open</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {openLeads}
          </div>
          <span className="text-[11px] text-muted-foreground">Requires Executive Action</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">In Follow-up / Pending</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {pendingLeads}
          </div>
          <span className="text-[11px] text-muted-foreground">Follow-up in progress</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Unread Messages</span>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-1.5 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {unreadCount}
          </div>
          <span className="text-[11px] text-muted-foreground">New customer replies</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card p-3 rounded-lg border border-border">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customer, phone, location..."
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
            aria-label="Filter by Status"
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Conversation Status</option>
            <option value="open">Open (Active)</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
          </select>

          {/* Business Type Filter */}
          <select
            value={businessFilter}
            onChange={(e) => setBusinessFilter(e.target.value)}
            aria-label="Filter by Business"
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="all">All Business Types</option>
            {BUSINESS_TYPES.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Agent Filter (Admin) or Assigned Badge (Executive) */}
          {isAdminOrOwner ? (
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              aria-label="Filter by Agent"
              className="h-9 rounded-md border border-input bg-background px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="all">All Executives</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary border border-primary/20">
              <UserCheck className="h-3.5 w-3.5" />
              <span>My Assigned Leads</span>
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
                <th className="px-4 py-3.5">Customer & Phone</th>
                <th className="px-4 py-3.5">Location</th>
                <th className="px-4 py-3.5">Business Type</th>
                <th className="px-4 py-3.5">Capacity</th>
                <th className="px-4 py-3.5">Lead Status</th>
                <th className="px-4 py-3.5">Assigned Agent</th>
                <th className="px-4 py-3.5 text-center">Quick Call / WA</th>
                <th className="px-4 py-3.5">Last Message</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && conversations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="mx-auto h-6 w-6 animate-spin mb-2 text-primary" />
                    Loading WhatsApp leads table...
                  </td>
                </tr>
              ) : filteredConversations.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">
                    <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" />
                    No WhatsApp leads found matching filters.
                  </td>
                </tr>
              ) : (
                filteredConversations.map((conv) => {
                  const contact = conv.contact;
                  const profile = contact ? profilesMap[contact.id] : null;
                  const cleanPhone = contact?.phone?.replace(/\D/g, '') || '';
                  const displayName = profile?.name || contact?.name || contact?.phone || 'Customer';
                  const assignedName = conv.assigned_agent_id
                    ? memberNameMap[conv.assigned_agent_id] || 'Executive'
                    : 'Unassigned';

                  return (
                    <tr
                      key={conv.id}
                      className="transition-colors hover:bg-muted/40 cursor-pointer"
                      onClick={() => onSelectConversation(conv)}
                    >
                      {/* Customer Name & Phone */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              <span>{displayName}</span>
                              {conv.unread_count > 0 && (
                                <span className="inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {contact?.phone || '-'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Location: State & District */}
                      <td className="px-4 py-3 text-xs">
                        <div className="flex items-center gap-1 text-foreground">
                          <MapPin className="h-3 w-3 text-primary shrink-0" />
                          <span className="font-medium">
                            {profile?.district
                              ? `${profile.district}, ${profile.state || 'TN'}`
                              : profile?.state || 'Tamil Nadu'}
                          </span>
                        </div>
                      </td>

                      {/* Business Type */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className="text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        >
                          {profile?.businessType || 'Murukku Business'}
                        </Badge>
                      </td>

                      {/* Production Capacity */}
                      <td className="px-4 py-3 text-xs font-medium text-foreground">
                        {profile?.capacity || '50 - 100 Kg/Day'}
                      </td>

                      {/* Lead Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            profile?.leadStatus === 'Booking / Closed Won'
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : profile?.leadStatus === 'Quotation Sent'
                              ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400'
                              : profile?.leadStatus === 'Lost / Not Interested'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              profile?.leadStatus === 'Booking / Closed Won'
                                ? 'bg-emerald-500'
                                : profile?.leadStatus === 'Quotation Sent'
                                ? 'bg-blue-500'
                                : 'bg-amber-500'
                            }`}
                          />
                          {profile?.leadStatus || 'In Follow-up'}
                        </span>
                      </td>

                      {/* Assigned Agent */}
                      <td className="px-4 py-3 text-xs">
                        <div className="font-medium text-foreground flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span>{assignedName}</span>
                        </div>
                      </td>

                      {/* Quick Call & WA */}
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          {cleanPhone && (
                            <a
                              href={`https://wa.me/${cleanPhone}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3.5 w-3.5" />
                            </a>
                          )}
                          {contact?.phone && (
                            <a
                              href={`tel:${contact.phone}`}
                              className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                              title="Call Customer"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Last Message */}
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[180px]">
                        <p className="truncate text-foreground font-medium">
                          {conv.last_message_text || 'Enquiry received'}
                        </p>
                        {conv.last_message_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(conv.last_message_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (contact) {
                                setSelectedContactForProfile(contact);
                                setProfileModalOpen(true);
                              }
                            }}
                            className="h-7 text-xs px-2 gap-1 border-border text-foreground hover:bg-primary hover:text-primary-foreground"
                          >
                            <Edit3 className="h-3 w-3" />
                            <span>Entry</span>
                          </Button>

                          {isAdminOrOwner && (
                            <DropdownMenu>
                              <DropdownMenuTrigger
                                render={
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                                  />
                                }
                              >
                                <UserCheck className="h-3.5 w-3.5" />
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <div className="px-2 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase">
                                  Assign Lead
                                </div>
                                {members.map((m) => (
                                  <DropdownMenuItem
                                    key={m.user_id}
                                    onClick={() => handleReassign(conv.id, m)}
                                    className="cursor-pointer text-xs"
                                  >
                                    {m.full_name}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}

                          <Button
                            size="sm"
                            onClick={() => onSelectConversation(conv)}
                            className="h-7 text-xs px-2.5 bg-primary text-primary-foreground hover:bg-primary/90 gap-1"
                          >
                            <span>Chat</span>
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile Modal for Quick Call Entry */}
      <CustomerProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        contact={selectedContactForProfile}
        onSaved={() => {
          fetchProfiles();
          onRefresh();
        }}
      />
    </div>
  );
}
