'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { addContactTag, deleteContactTag } from '@/lib/contacts/tag-api';
import { toast } from 'sonner';
import type { Contact, Tag, ContactTag } from '@/types';
import {
  findExistingContact,
  isExactMatch,
  isUniqueViolation,
  type ExistingContact,
} from '@/lib/contacts/dedupe';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle, MapPin, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  BUSINESS_TYPES,
  PRODUCTION_CAPACITIES,
  LEAD_STATUSES,
  INDIAN_STATES,
  getCustomerProfile,
  saveCustomerProfile,
  type CustomerProfileData,
} from '@/lib/contacts/customer-profile';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  contactTags?: ContactTag[];
  onSaved: () => void;
  onViewExisting?: (contactId: string) => void;
}

export function ContactForm({
  open,
  onOpenChange,
  contact,
  contactTags = [],
  onSaved,
  onViewExisting,
}: ContactFormProps) {
  const t = useTranslations('Contacts.form');
  const supabase = createClient();
  const { accountId } = useAuth();
  const isEdit = !!contact;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('');
  const [businessType, setBusinessType] = useState('Murukku Business');
  const [capacity, setCapacity] = useState('50 - 100 Kg/Day');
  const [leadStatus, setLeadStatus] = useState('In Follow-up');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);

  const [dupMatch, setDupMatch] = useState<{ contact: ExistingContact; exact: boolean } | null>(null);
  const [checkingDup, setCheckingDup] = useState(false);

  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? '');
      setPhone(contact?.phone ?? '');
      setEmail(contact?.email ?? '');
      setCompany(contact?.company ?? '');
      setSelectedTagIds(contactTags.map((ct) => ct.tag_id));
      setDupMatch(null);
      fetchTags();

      if (contact) {
        getCustomerProfile(supabase, contact.id).then((prof) => {
          if (prof) {
            setAltPhone(prof.altPhone || '');
            setState(prof.state || 'Tamil Nadu');
            setDistrict(prof.district || '');
            setBusinessType(prof.businessType || 'Murukku Business');
            setCapacity(prof.capacity || '50 - 100 Kg/Day');
            setLeadStatus(prof.leadStatus || 'In Follow-up');
          }
        });
      } else {
        setAltPhone('');
        setState('Tamil Nadu');
        setDistrict('');
        setBusinessType('Murukku Business');
        setCapacity('50 - 100 Kg/Day');
        setLeadStatus('New Enquiry');
      }
    }
  }, [open, contact, supabase]);

  async function checkDuplicate() {
    if (isEdit || !accountId) return;
    const value = phone.trim();
    if (!value) {
      setDupMatch(null);
      return;
    }
    setCheckingDup(true);
    try {
      const existing = await findExistingContact(supabase, accountId, value);
      setDupMatch(
        existing
          ? { contact: existing, exact: isExactMatch(existing, value) }
          : null,
      );
    } finally {
      setCheckingDup(false);
    }
  }

  async function fetchTags() {
    setLoadingTags(true);
    const { data } = await supabase.from('tags').select('*').order('name');
    if (data) setTags(data);
    setLoadingTags(false);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!phone.trim()) {
      toast.error(t('phoneRequired'));
      return;
    }

    if (!isEdit && dupMatch?.exact) {
      toast.error(t('toastConflict'));
      return;
    }

    setSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');
      if (!accountId) throw new Error('Your profile is not linked to an account.');

      let contactId = contact?.id;

      if (isEdit && contactId) {
        const { error } = await supabase
          .from('contacts')
          .update({
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', contactId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('contacts')
          .insert({
            user_id: user.id,
            account_id: accountId,
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
          })
          .select('id')
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      if (contactId) {
        const profilePayload: CustomerProfileData = {
          name,
          phone,
          altPhone,
          state,
          district,
          businessType,
          capacity,
          leadStatus,
          email,
          company,
        };
        await saveCustomerProfile(supabase, contactId, accountId, user.id, profilePayload);

        const existingTagIds = new Set(contactTags.map((tag) => tag.tag_id));
        const desiredTagIds = new Set(selectedTagIds);
        const toRemove = [...existingTagIds].filter((id) => !desiredTagIds.has(id));
        const toAdd = [...desiredTagIds].filter((id) => !existingTagIds.has(id));

        for (const tagId of toRemove) {
          await deleteContactTag(contactId, tagId);
        }
        for (const tagId of toAdd) {
          await addContactTag(contactId, tagId);
        }
      }

      toast.success(isEdit ? t('toastSuccessEdit') : t('toastSuccessAdd'));
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      if (isUniqueViolation(err)) {
        toast.error(t('toastConflict'));
        if (!isEdit && accountId) {
          const existing = await findExistingContact(supabase, accountId, phone.trim());
          if (existing) setDupMatch({ contact: existing, exact: true });
        }
        return;
      }
      const message = err instanceof Error ? err.message : t('toastError');
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-5 border-b border-border bg-muted/40">
          <DialogTitle className="text-foreground text-lg font-bold">
            {isEdit ? 'Edit Customer Details' : 'Add New Customer'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            {isEdit
              ? 'Update customer requirements, phone, location & business type.'
              : 'Add a new customer with requirement profile & contact information.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cf-name" className="text-xs font-semibold text-muted-foreground">
                Customer Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cf-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="bg-background border-border h-9 text-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cf-phone" className="text-xs font-semibold text-muted-foreground">
                Primary Phone <span className="text-red-500">*</span>
              </Label>
              <Input
                id="cf-phone"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (dupMatch) setDupMatch(null);
                }}
                onBlur={checkDuplicate}
                placeholder="919876543210"
                className="bg-background border-border h-9 text-sm font-mono"
                required
              />
              {dupMatch && (
                <div
                  className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-400 px-2.5 py-1.5 text-xs"
                >
                  <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                  <div>
                    <p>{dupMatch.exact ? 'Phone already exists' : 'Similar number found'}</p>
                    {onViewExisting && (
                      <button
                        type="button"
                        onClick={() => onViewExisting(dupMatch.contact.id)}
                        className="font-medium underline underline-offset-2"
                      >
                        View {dupMatch.contact.name || dupMatch.contact.phone}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Alternative Phone Number
              </Label>
              <Input
                value={altPhone}
                onChange={(e) => setAltPhone(e.target.value)}
                placeholder="e.g. 9840123456"
                className="bg-background border-border h-9 text-sm font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Company / Shop Name
              </Label>
              <Input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Sri Lakshmi Sweets"
                className="bg-background border-border h-9 text-sm"
              />
            </div>
          </div>

          {/* Location details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg border border-border bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                State
              </Label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                District / City
              </Label>
              <Input
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Madurai, Coimbatore"
                className="bg-background border-border h-9 text-sm"
              />
            </div>
          </div>

          {/* Business Type & Capacity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 rounded-lg border border-border bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-amber-500" />
                Business Type
              </Label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {BUSINESS_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                Production Capacity
              </Label>
              <select
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {PRODUCTION_CAPACITIES.map((cap) => (
                  <option key={cap} value={cap}>
                    {cap}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead Status & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Lead Status
              </Label>
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {LEAD_STATUSES.map((ls) => (
                  <option key={ls} value={ls}>
                    {ls}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cf-email" className="text-xs font-semibold text-muted-foreground">
                Email Address
              </Label>
              <Input
                id="cf-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="bg-background border-border h-9 text-sm"
              />
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-1.5 pt-2">
            <Label className="text-xs font-semibold text-muted-foreground">Tags</Label>
            {loadingTags ? (
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Loader2 className="size-3 animate-spin" />
                Loading tags...
              </div>
            ) : tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">No tags created yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? 'ring-2 ring-primary ring-offset-1 ring-offset-border'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                        borderColor: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/40 -mx-5 -mb-5 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || checkingDup || (!isEdit && !!dupMatch?.exact)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
            >
              {saving && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEdit ? 'Update Customer' : 'Create Customer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
