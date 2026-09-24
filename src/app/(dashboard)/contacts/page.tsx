'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import type { Contact, Tag, ContactTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  Filter,
  X,
  MessageSquare,
  Phone,
  MapPin,
  Activity,
  Edit3,
  UserCheck,
  ChevronDown,
} from 'lucide-react';
import { ContactForm } from '@/components/contacts/contact-form';
import { ContactDetailView } from '@/components/contacts/contact-detail-view';
import { ImportModal } from '@/components/contacts/import-modal';
import { CustomFieldsManager } from '@/components/contacts/custom-fields-manager';
import { CustomerProfileModal } from '@/components/contacts/customer-profile-modal';
import { useAuth } from '@/hooks/use-auth';
import { useCan } from '@/hooks/use-can';
import { GatedButton } from '@/components/ui/gated-button';
import { useTranslations } from 'next-intl';
import type { CustomerProfileData } from '@/lib/contacts/customer-profile';

const PAGE_SIZE = 25;

interface ContactWithProfile extends Contact {
  tags?: Tag[];
  profile?: CustomerProfileData;
  assignedAgentName?: string;
}

interface TeamMember {
  user_id: string;
  full_name: string;
  role: string;
}

export default function ContactsPage() {
  const t = useTranslations('Contacts.page');
  const supabase = createClient();
  const { user, accountRole, accountId } = useAuth();
  const isAdminOrOwner = accountRole === 'owner' || accountRole === 'admin';
  const canEdit = useCan('send-messages');
  const canEditSettings = useCan('edit-settings');

  const [contacts, setContacts] = useState<ContactWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [members, setMembers] = useState<TeamMember[]>([]);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [editContactTags, setEditContactTags] = useState<ContactTag[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailContactId, setDetailContactId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Customer Profile modal
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [selectedContactForProfile, setSelectedContactForProfile] = useState<Contact | null>(null);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Tags map
  const [tagsMap, setTagsMap] = useState<Record<string, Tag>>({});
  const fetchSeq = useRef(0);

  // Load team members
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

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from('tags').select('*');
    if (data) {
      const map: Record<string, Tag> = {};
      data.forEach((t) => (map[t.id] = t));
      setTagsMap(map);
      setSelectedTagIds((prev) => {
        const pruned = prev.filter((id) => map[id]);
        return pruned.length === prev.length ? prev : pruned;
      });
    }
  }, [supabase]);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const seq = ++fetchSeq.current;
    setLoading(true);
    setSelected(new Set());

    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const term = search.trim();

    try {
      // Step 1: If Executive (non-admin), determine which contact IDs are assigned to this user
      let assignedContactIds: string[] | null = null;

      if (!isAdminOrOwner) {
        const [convRes, callRes] = await Promise.all([
          supabase.from('conversations').select('contact_id').eq('assigned_agent_id', user.id),
          supabase.from('call_logs').select('customer_number').eq('assigned_to', user.id),
        ]);

        const ids = new Set<string>();
        convRes.data?.forEach((c) => {
          if (c.contact_id) ids.add(c.contact_id);
        });

        // Also resolve customer numbers from call logs to contact IDs if any
        if (callRes.data && callRes.data.length > 0) {
          const numbers = callRes.data.map((c) => c.customer_number).filter(Boolean);
          const { data: matchedContacts } = await supabase
            .from('contacts')
            .select('id')
            .in('phone', numbers);
          matchedContacts?.forEach((mc) => ids.add(mc.id));
        }

        assignedContactIds = Array.from(ids);
      } else if (agentFilter !== 'all') {
        // Admin selected a specific agent filter
        const { data: agentConvs } = await supabase
          .from('conversations')
          .select('contact_id')
          .eq('assigned_agent_id', agentFilter);
        assignedContactIds = agentConvs?.map((c) => c.contact_id).filter(Boolean) as string[];
      }

      // If Executive has 0 assigned leads, show empty result
      if (assignedContactIds !== null && assignedContactIds.length === 0) {
        setContacts([]);
        setTotalCount(0);
        setLoading(false);
        return;
      }

      let contactRows: Contact[] = [];
      let count = 0;

      if (selectedTagIds.length > 0) {
        const { data, error } = await supabase.rpc('filter_contacts_by_tags', {
          p_tag_ids: selectedTagIds,
          p_search: term || null,
          p_limit: PAGE_SIZE,
          p_offset: from,
        });
        if (seq !== fetchSeq.current) return;
        if (error) throw error;
        const rows = (data ?? []) as { contact: Contact; total_count: number }[];
        let rawContacts = rows.map((r) => r.contact);
        if (assignedContactIds !== null) {
          rawContacts = rawContacts.filter((c) => assignedContactIds!.includes(c.id));
        }
        contactRows = rawContacts;
        count = rows.length > 0 ? Number(rows[0].total_count) : 0;
      } else {
        let query = supabase
          .from('contacts')
          .select('*', { count: 'exact' })
          .order('updated_at', { ascending: false });

        if (assignedContactIds !== null && !term) {
          query = query.in('id', assignedContactIds);
        }

        if (term) {
          const like = `%${term}%`;
          const digits = term.replace(/\D/g, '');
          if (digits.length >= 4) {
            const last10 = digits.slice(-10);
            query = query.or(`name.ilike.${like},phone.ilike.${like},phone.ilike.%${digits}%,phone.ilike.%${last10}%,email.ilike.${like}`);
          } else {
            query = query.or(`name.ilike.${like},phone.ilike.${like},email.ilike.${like}`);
          }
        }

        const { data, count: exactCount, error } = await query.range(from, to);
        if (seq !== fetchSeq.current) return;
        if (error) throw error;
        contactRows = data ?? [];
        count = exactCount ?? 0;
      }

      setTotalCount(count);

      if (contactRows.length === 0) {
        setContacts([]);
        setLoading(false);
        return;
      }

      const contactIds = contactRows.map((c) => c.id);

      // Fetch tags, custom values, and assigned conversations in parallel
      const [contactTagsRes, customFieldsRes, customValuesRes, convsRes] = await Promise.all([
        supabase.from('contact_tags').select('contact_id, tag_id').in('contact_id', contactIds),
        supabase.from('custom_fields').select('id, field_name'),
        supabase.from('contact_custom_values').select('*').in('contact_id', contactIds),
        supabase.from('conversations').select('contact_id, assigned_agent_id').in('contact_id', contactIds),
      ]);

      if (seq !== fetchSeq.current) return;

      const tagsByContact: Record<string, string[]> = {};
      contactTagsRes.data?.forEach((ct) => {
        if (!tagsByContact[ct.contact_id]) tagsByContact[ct.contact_id] = [];
        tagsByContact[ct.contact_id].push(ct.tag_id);
      });

      const fieldMap: Record<string, string> = {};
      customFieldsRes.data?.forEach((f) => {
        fieldMap[f.id] = f.field_name;
      });

      const memberMap: Record<string, string> = {};
      members.forEach((m) => {
        memberMap[m.user_id] = m.full_name;
      });

      const assignedAgentByContact: Record<string, string> = {};
      convsRes.data?.forEach((cv) => {
        if (cv.contact_id && cv.assigned_agent_id) {
          assignedAgentByContact[cv.contact_id] = memberMap[cv.assigned_agent_id] || 'Executive';
        }
      });

      const profilesByContact: Record<string, CustomerProfileData> = {};
      contactRows.forEach((c) => {
        profilesByContact[c.id] = {
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

      customValuesRes.data?.forEach((v) => {
        const fName = fieldMap[v.custom_field_id];
        if (!fName || !profilesByContact[v.contact_id]) return;

        if (fName === 'Alternative Phone') profilesByContact[v.contact_id].altPhone = v.value;
        if (fName === 'State') profilesByContact[v.contact_id].state = v.value;
        if (fName === 'District') profilesByContact[v.contact_id].district = v.value;
        if (fName === 'Business Type') profilesByContact[v.contact_id].businessType = v.value;
        if (fName === 'Production Capacity') profilesByContact[v.contact_id].capacity = v.value;
        if (fName === 'Lead Status') profilesByContact[v.contact_id].leadStatus = v.value;
      });

      const enriched: ContactWithProfile[] = contactRows.map((c) => ({
        ...c,
        tags: (tagsByContact[c.id] ?? []).map((tid) => tagsMap[tid]).filter(Boolean),
        profile: profilesByContact[c.id],
        assignedAgentName: assignedAgentByContact[c.id] || 'Unassigned',
      }));

      setContacts(enriched);
    } catch (err) {
      console.error('Failed to load contacts:', err);
      toast.error(t('toastFailedLoad'));
    } finally {
      setLoading(false);
    }
  }, [supabase, page, search, selectedTagIds, tagsMap, agentFilter, isAdminOrOwner, user, members, t]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  function openAddForm() {
    setEditContact(null);
    setEditContactTags([]);
    setFormOpen(true);
  }

  async function openEditForm(contact: Contact) {
    const { data } = await supabase
      .from('contact_tags')
      .select('*')
      .eq('contact_id', contact.id);
    setEditContact(contact);
    setEditContactTags(data ?? []);
    setFormOpen(true);
  }

  function openDetail(contactId: string) {
    setDetailContactId(contactId);
    setDetailOpen(true);
  }

  function confirmDelete(contact: Contact) {
    setDeleteTarget(contact);
    setDeleteConfirmOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', deleteTarget.id);

    if (error) {
      toast.error(t('toastFailedDelete'));
    } else {
      toast.success(t('toastDeleted'));
      fetchContacts();
    }

    setDeleting(false);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  const allOnPageSelected =
    contacts.length > 0 && contacts.every((c) => selected.has(c.id));
  const someOnPageSelected = contacts.some((c) => selected.has(c.id));

  function toggleSelectAll() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        contacts.forEach((c) => next.delete(c.id));
      } else {
        contacts.forEach((c) => next.add(c.id));
      }
      return next;
    });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const [bulkProcessing, setBulkProcessing] = useState(false);

  async function handleBulkMoveStage(stageName: string) {
    const ids = [...selected];
    if (ids.length === 0 || !accountId) return;
    setBulkProcessing(true);
    try {
      let mappedStatus = 'New Enquiry';
      if (stageName === 'Lead') mappedStatus = 'In Follow-up';
      if (stageName === 'Booking') mappedStatus = 'Booking / Closed Won';
      if (stageName === 'Retail') mappedStatus = 'Retail / Closed';

      const { data: field } = await supabase
        .from('contact_custom_fields')
        .select('id')
        .eq('name', 'Lead Status')
        .maybeSingle();

      if (field) {
        const payload = ids.map((contactId) => ({
          contact_id: contactId,
          custom_field_id: field.id,
          value: mappedStatus,
        }));
        await supabase
          .from('contact_custom_field_values')
          .upsert(payload, { onConflict: 'contact_id,custom_field_id' });
      }

      const { data: oldField } = await supabase
        .from('custom_fields')
        .select('id')
        .eq('field_name', 'Lead Status')
        .maybeSingle();

      if (oldField) {
        const oldPayload = ids.map((contactId) => ({
          contact_id: contactId,
          custom_field_id: oldField.id,
          value: mappedStatus,
        }));
        await supabase
          .from('contact_custom_values')
          .upsert(oldPayload, { onConflict: 'contact_id,custom_field_id' });
      }

      const { data: pipelines } = await supabase
        .from('pipelines')
        .select('id')
        .eq('account_id', accountId)
        .order('created_at', { ascending: true })
        .limit(1);

      if (pipelines && pipelines.length > 0) {
        const pipelineId = pipelines[0].id;
        const { data: stagesList } = await supabase
          .from('pipeline_stages')
          .select('id, name')
          .eq('pipeline_id', pipelineId);

        const targetStage =
          stagesList?.find((s) =>
            s.name.toLowerCase().includes(stageName.toLowerCase()),
          ) || stagesList?.[0];

        if (targetStage) {
          const { data: existingDeals } = await supabase
            .from('deals')
            .select('id, contact_id')
            .in('contact_id', ids)
            .eq('pipeline_id', pipelineId);

          const existingDealMap: Record<string, string> = {};
          existingDeals?.forEach((d) => {
            if (d.contact_id) existingDealMap[d.contact_id] = d.id;
          });

          const dealsToUpdate = ids.filter((id) => existingDealMap[id]);
          const dealsToInsert = ids.filter((id) => !existingDealMap[id]);

          if (dealsToUpdate.length > 0) {
            await supabase
              .from('deals')
              .update({
                stage_id: targetStage.id,
                updated_at: new Date().toISOString(),
              })
              .in('contact_id', dealsToUpdate)
              .eq('pipeline_id', pipelineId);
          }

          if (dealsToInsert.length > 0) {
            const newDeals = dealsToInsert.map((cId) => {
              const c = contacts.find((ct) => ct.id === cId);
              return {
                title: c?.name || c?.phone || 'Customer Deal',
                contact_id: cId,
                pipeline_id: pipelineId,
                account_id: accountId,
                stage_id: targetStage.id,
                value: 0,
                currency: 'INR',
                assigned_to: (c as any)?.assigned_to || user?.id || null,
              };
            });
            await supabase.from('deals').insert(newDeals);
          }
        }
      }

      toast.success(`Moved ${ids.length} customers to ${stageName}!`);
      setSelected(new Set());
      fetchContacts();
    } catch (err) {
      console.error('Bulk move failed:', err);
      toast.error('Failed to move customers to stage');
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkAssignExecutive(
    executiveUserId: string,
    executiveName: string,
  ) {
    const ids = [...selected];
    if (ids.length === 0) return;
    setBulkProcessing(true);
    try {
      await Promise.all([
        supabase
          .from('contacts')
          .update({ assigned_to: executiveUserId })
          .in('id', ids),
        supabase
          .from('conversations')
          .update({ assigned_agent_id: executiveUserId })
          .in('contact_id', ids),
        supabase
          .from('deals')
          .update({ assigned_to: executiveUserId })
          .in('contact_id', ids),
      ]);

      toast.success(`Assigned ${ids.length} customers to ${executiveName}!`);
      setSelected(new Set());
      fetchContacts();
    } catch (err) {
      console.error('Bulk assign failed:', err);
      toast.error('Failed to assign customers');
    } finally {
      setBulkProcessing(false);
    }
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    if (ids.length === 0) return;
    setDeleting(true);

    const { error } = await supabase.from('contacts').delete().in('id', ids);

    if (error) {
      toast.error(t('toastBulkFailedDelete'));
    } else {
      toast.success(t('toastBulkDeleted', { count: ids.length }));
      setSelected(new Set());
      fetchContacts();
    }

    setDeleting(false);
    setBulkDeleteOpen(false);
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNext = page < totalPages - 1;
  const hasPrev = page > 0;

  const allTags = Object.values(tagsMap).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  const hasActiveFilters = search.trim().length > 0 || selectedTagIds.length > 0 || agentFilter !== 'all';

  function toggleTagFilter(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
    setPage(0);
  }

  function clearTagFilters() {
    setSelectedTagIds([]);
    setAgentFilter('all');
    setPage(0);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-foreground">
              {isAdminOrOwner ? 'Customer Profiles & Leads (Admin All)' : 'My Assigned Customers'}
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
              {isAdminOrOwner ? 'Admin Panel' : 'Executive Panel'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdminOrOwner
              ? `Overall Customer directory across all executives (${totalCount} total contacts)`
              : `Customers & leads assigned to you (${totalCount} assigned)`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEditSettings && (
            <Button
              variant="outline"
              onClick={() => setCustomFieldsOpen(true)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              <SlidersHorizontal className="size-4" />
              {t('customFieldsBtn')}
            </Button>
          )}
          <GatedButton
            variant="outline"
            canAct={canEdit}
            gateReason="add or import contacts"
            onClick={() => setImportOpen(true)}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            <Upload className="size-4" />
            {t('importBtn')}
          </GatedButton>
          <GatedButton
            canAct={canEdit}
            gateReason="add or import contacts"
            onClick={openAddForm}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
          >
            <Plus className="size-4" />
            Add Customer Profile
          </GatedButton>
        </div>
      </div>

      {/* Search + tag filter + Executive filter */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Search by customer name, phone, email..."
              className="pl-8 bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Admin Executive Filter */}
          {isAdminOrOwner ? (
            <select
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value);
                setPage(0);
              }}
              aria-label="Filter by Executive"
              className="h-9 rounded-md border border-input bg-card px-3 py-1 text-xs font-medium shadow-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
            >
              <option value="all">All Executives (All Customers)</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.full_name} ({m.role})
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary border border-primary/20">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Showing My Assigned Leads Only</span>
            </div>
          )}

          <Popover>
            <PopoverTrigger
              render={
                <Button
                  variant="outline"
                  className="border-border text-muted-foreground hover:bg-muted shrink-0"
                />
              }
            >
              <Filter className="size-4" />
              {t('filterByTags')}
              {selectedTagIds.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                  {selectedTagIds.length}
                </span>
              )}
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 p-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-sm font-medium text-popover-foreground">
                  {t('filterByTags')}
                </span>
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={clearTagFilters}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    {t('clearAll')}
                  </button>
                )}
              </div>
              {allTags.length === 0 ? (
                <p className="px-3 py-4 text-sm text-muted-foreground text-center">
                  {t('noTagsYet')}
                </p>
              ) : (
                <div className="max-h-64 overflow-y-auto py-1">
                  {allTags.map((tag) => (
                    <label
                      key={tag.id}
                      className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-muted/50"
                    >
                      <Checkbox
                        checked={selectedTagIds.includes(tag.id)}
                        onCheckedChange={() => toggleTagFilter(tag.id)}
                        aria-label={`Filter by ${tag.name}`}
                      />
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="text-sm text-popover-foreground truncate">
                        {tag.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {selectedTagIds.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedTagIds.map((id) => {
              const tag = tagsMap[id];
              if (!tag) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    backgroundColor: tag.color + '20',
                    color: tag.color,
                  }}
                >
                  {tag.name}
                  <button
                    onClick={() => toggleTagFilter(id)}
                    aria-label={`Remove ${tag.name} filter`}
                    className="hover:opacity-70"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              );
            })}
            <button
              onClick={clearTagFilters}
              className="text-xs text-muted-foreground hover:text-foreground px-1"
            >
              {t('clearAll')}
            </button>
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30 font-bold">
              {selected.size} Selected
            </Badge>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Bulk actions for selected customers:
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Move to Stage (ELBR) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className="inline-flex items-center gap-1.5 rounded-md bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-sm"
              >
                <Activity className="size-3.5 text-primary" />
                <span>Move to Stage (ELBR)</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border-border">
                <DropdownMenuItem
                  onClick={() => handleBulkMoveStage("Enquiry")}
                  disabled={bulkProcessing}
                  className="text-xs cursor-pointer text-blue-500 font-medium"
                >
                  <span className="size-2 rounded-full bg-blue-500 mr-2" />
                  🔵 Move to Enquiry
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkMoveStage("Lead")}
                  disabled={bulkProcessing}
                  className="text-xs cursor-pointer text-amber-500 font-medium"
                >
                  <span className="size-2 rounded-full bg-amber-500 mr-2" />
                  🟡 Move to Lead (Follow-up)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkMoveStage("Booking")}
                  disabled={bulkProcessing}
                  className="text-xs cursor-pointer text-emerald-500 font-medium"
                >
                  <span className="size-2 rounded-full bg-emerald-500 mr-2" />
                  🟢 Move to Booking (Advance Paid)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleBulkMoveStage("Retail")}
                  disabled={bulkProcessing}
                  className="text-xs cursor-pointer text-purple-500 font-medium"
                >
                  <span className="size-2 rounded-full bg-purple-500 mr-2" />
                  🟣 Move to Retail (Delivery)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Bulk Assign Executive (Admin only) */}
            {isAdminOrOwner && members.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="inline-flex items-center gap-1.5 rounded-md bg-card border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted shadow-sm"
                >
                  <UserCheck className="size-3.5 text-emerald-500" />
                  <span>Assign Executive</span>
                  <ChevronDown className="size-3 text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border-border max-h-60 overflow-y-auto">
                  {members.map((m) => (
                    <DropdownMenuItem
                      key={m.user_id}
                      onClick={() => handleBulkAssignExecutive(m.user_id, m.full_name)}
                      disabled={bulkProcessing}
                      className="text-xs cursor-pointer"
                    >
                      <UserCheck className="size-3.5 mr-2 text-primary" />
                      {m.full_name} ({m.role})
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              className="text-xs text-muted-foreground hover:text-foreground h-8"
            >
              Clear
            </Button>

            <GatedButton
              variant="destructive"
              size="sm"
              canAct={canEdit}
              gateReason="delete contacts"
              onClick={() => setBulkDeleteOpen(true)}
              className="h-8 text-xs"
            >
              <Trash2 className="size-3.5 mr-1" />
              Delete
            </GatedButton>
          </div>
        </div>
      )}

      {/* Main Customers Table with Rich Profile Columns */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent bg-muted/30">
              <TableHead className="w-10">
                <Checkbox
                  checked={allOnPageSelected}
                  indeterminate={!allOnPageSelected && someOnPageSelected}
                  onCheckedChange={toggleSelectAll}
                  disabled={contacts.length === 0}
                  aria-label="Select all contacts on this page"
                />
              </TableHead>
              <TableHead className="text-muted-foreground font-semibold">Customer Name</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Phone & Alt No.</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Location</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Business Type</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Capacity</TableHead>
              <TableHead className="text-muted-foreground font-semibold">Lead Status</TableHead>
              {isAdminOrOwner && <TableHead className="text-muted-foreground font-semibold">Assigned Agent</TableHead>}
              <TableHead className="text-muted-foreground font-semibold text-center">Quick Call / WA</TableHead>
              <TableHead className="text-muted-foreground text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow className="border-border">
                <TableCell colSpan={isAdminOrOwner ? 10 : 9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-6 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">{t('loading')}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow className="border-border">
                <TableCell colSpan={isAdminOrOwner ? 10 : 9} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2">
                    <Users className="size-8 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {hasActiveFilters ? t('noContactsMatch') : 'No contacts assigned to you yet.'}
                    </p>
                    {!hasActiveFilters && (
                      <GatedButton
                        canAct={canEdit}
                        gateReason="add or import contacts"
                        variant="outline"
                        size="sm"
                        onClick={openAddForm}
                        className="mt-2 border-border text-muted-foreground hover:bg-muted"
                      >
                        <Plus className="size-3.5" />
                        {t('addFirstContact')}
                      </GatedButton>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => {
                const cleanPhone = contact.phone.replace(/\D/g, '');
                const profile = contact.profile;

                return (
                  <TableRow
                    key={contact.id}
                    className="border-border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => openDetail(contact.id)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selected.has(contact.id)}
                        onCheckedChange={() => toggleSelect(contact.id)}
                        aria-label={`Select ${contact.name || contact.phone}`}
                      />
                    </TableCell>

                    {/* Customer Name */}
                    <TableCell className="text-foreground font-semibold">
                      <div className="flex flex-col">
                        <span>{contact.name || <span className="text-muted-foreground italic font-normal">{t('unnamed')}</span>}</span>
                        {contact.company && (
                          <span className="text-xs text-muted-foreground font-normal">{contact.company}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Phone & Alt Phone */}
                    <TableCell>
                      <div className="flex flex-col font-mono text-xs">
                        <span className="text-foreground font-medium">{contact.phone}</span>
                        {profile?.altPhone && (
                          <span className="text-muted-foreground text-[11px]">Alt: {profile.altPhone}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1 text-foreground">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <span>
                          {profile?.district
                            ? `${profile.district}, ${profile.state || 'TN'}`
                            : profile?.state || 'Tamil Nadu'}
                        </span>
                      </div>
                    </TableCell>

                    {/* Business Type */}
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                      >
                        {profile?.businessType || 'Murukku Business'}
                      </Badge>
                    </TableCell>

                    {/* Production Capacity */}
                    <TableCell className="text-xs font-medium text-foreground">
                      {profile?.capacity || '50 - 100 Kg/Day'}
                    </TableCell>

                    {/* Lead Status */}
                    <TableCell>
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
                    </TableCell>

                    {/* Assigned Agent (Admin Only) */}
                    {isAdminOrOwner && (
                      <TableCell className="text-xs font-medium text-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-muted-foreground" />
                          {contact.assignedAgentName}
                        </span>
                      </TableCell>
                    )}

                    {/* 1-Click WhatsApp & Call */}
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        <a
                          href={`https://wa.me/${cleanPhone}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                          title="Chat on WhatsApp"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </a>
                        <a
                          href={`tel:${contact.phone}`}
                          className="p-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          title="Call Customer"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedContactForProfile(contact);
                            setProfileModalOpen(true);
                          }}
                          className="h-7 text-xs px-2 gap-1 border-border text-foreground hover:bg-primary hover:text-primary-foreground"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Entry</span>
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-foreground h-7 w-7"
                              />
                            }
                          >
                            <MoreHorizontal className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="bg-popover border-border"
                          >
                            <DropdownMenuItem
                              onClick={() => openEditForm(contact)}
                              className="text-popover-foreground focus:bg-muted focus:text-foreground"
                            >
                              <Pencil className="size-4" />
                              Edit Full Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => confirmDelete(contact)}
                            >
                              <Trash2 className="size-4" />
                              {t('deleteAction')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {t('showingPagination', {
              start: page * PAGE_SIZE + 1,
              end: Math.min((page + 1) * PAGE_SIZE, totalCount),
              total: totalCount,
            })}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasPrev}
              onClick={() => setPage((p) => p - 1)}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              {t('pageCount', { page: page + 1, total: totalPages })}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasNext}
              onClick={() => setPage((p) => p + 1)}
              className="border-border text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Contact Form Dialog */}
      <ContactForm
        open={formOpen}
        onOpenChange={setFormOpen}
        contact={editContact}
        contactTags={editContactTags}
        onSaved={() => {
          fetchContacts();
          fetchTags();
        }}
        onViewExisting={(id) => {
          setFormOpen(false);
          openDetail(id);
        }}
      />

      {/* Customer Profile Modal for Fast Call Entry */}
      <CustomerProfileModal
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
        contact={selectedContactForProfile}
        onSaved={fetchContacts}
      />

      {/* Contact Detail Sheet */}
      <ContactDetailView
        open={detailOpen}
        onOpenChange={setDetailOpen}
        contactId={detailContactId}
        onUpdated={fetchContacts}
      />

      {/* Import Modal */}
      <ImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchContacts}
      />

      {/* Custom Fields Manager */}
      {canEditSettings && (
        <CustomFieldsManager
          open={customFieldsOpen}
          onOpenChange={setCustomFieldsOpen}
        />
      )}

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-popover-foreground">{t('deleteContactTitle')}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t('deleteContactDesc', { name: deleteTarget?.name || deleteTarget?.phone || '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-popover border-border">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              {t('cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              {t('deleteBtn')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
