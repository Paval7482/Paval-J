'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { Contact } from '@/types';
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
import { Textarea } from '@/components/ui/textarea';
import { Loader2, User, Phone, MapPin, Building, Activity, Sparkles, CheckCircle2 } from 'lucide-react';
import {
  BUSINESS_TYPES,
  PRODUCTION_CAPACITIES,
  LEAD_STATUSES,
  INDIAN_STATES,
  getCustomerProfile,
  saveCustomerProfile,
  type CustomerProfileData,
} from '@/lib/contacts/customer-profile';

interface CustomerProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onSaved?: () => void;
}

export function CustomerProfileModal({
  open,
  onOpenChange,
  contact,
  onSaved,
}: CustomerProfileModalProps) {
  const supabase = createClient();
  const { accountId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

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
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && contact) {
      setName(contact.name ?? '');
      setPhone(contact.phone ?? '');
      setEmail(contact.email ?? '');
      setCompany(contact.company ?? '');
      setNotes('');

      const loadProfile = async () => {
        setLoading(true);
        try {
          const profile = await getCustomerProfile(supabase, contact.id);
          if (profile) {
            setName(profile.name || contact.name || '');
            setPhone(profile.phone || contact.phone || '');
            setAltPhone(profile.altPhone || '');
            setState(profile.state || 'Tamil Nadu');
            setDistrict(profile.district || '');
            setBusinessType(profile.businessType || 'Murukku Business');
            setCapacity(profile.capacity || '50 - 100 Kg/Day');
            setLeadStatus(profile.leadStatus || 'In Follow-up');
            setEmail(profile.email || contact.email || '');
            setCompany(profile.company || contact.company || '');
          }
        } catch (err) {
          console.error('Failed to load profile:', err);
        } finally {
          setLoading(false);
        }
      };

      loadProfile();
    }
  }, [open, contact, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact || !accountId) return;

    if (!phone.trim()) {
      toast.error('Primary phone number is required');
      return;
    }

    setSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) throw new Error('Not authenticated');

      const data: CustomerProfileData = {
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
        notes,
      };

      await saveCustomerProfile(supabase, contact.id, accountId, user.id, data);
      toast.success('Customer Profile updated successfully!');
      onOpenChange(false);
      onSaved?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save customer profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-card border-border text-foreground shadow-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-5 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <User className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Executive Call Entry - Customer Profile
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Update customer requirement details gathered during executive call
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Customer Details Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Customer Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="bg-background border-border h-9 text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Primary Phone <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="919876543210"
                    className="pl-8 bg-background border-border h-9 text-sm font-mono"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Alternative Phone & Company */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Alternative Phone Number
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={altPhone}
                    onChange={(e) => setAltPhone(e.target.value)}
                    placeholder="e.g. 9840123456 / WhatsApp"
                    className="pl-8 bg-background border-border h-9 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Company / Shop Name
                </Label>
                <div className="relative">
                  <Building className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Sri Lakshmi Sweets and Murukku"
                    className="pl-8 bg-background border-border h-9 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Location Row: State & District */}
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
                  placeholder="e.g. Madurai, Coimbatore, Hyderabad"
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

            {/* Pipeline Stage (ELBR Category) */}
            <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <Label className="text-xs font-bold text-primary flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                Pipeline Stage (ELBR Category)
              </Label>
              <select
                value={leadStatus}
                onChange={(e) => setLeadStatus(e.target.value)}
                className="w-full h-9 rounded-md border border-primary/30 bg-background px-3 py-1 text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
              >
                {LEAD_STATUSES.map((ls) => (
                  <option key={ls} value={ls}>
                    {ls}
                  </option>
                ))}
              </select>
            </div>

            {/* Executive Call Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">
                Call Summary / Customer Requirement Notes
              </Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Spoke with customer over phone. Interested in Automatic Murukku Extruder & Fryer combo for new startup. Requested quotation and video demo..."
                className="bg-background border-border text-sm min-h-[75px] resize-none"
              />
            </div>
          </form>
        )}

        <DialogFooter className="p-4 border-t border-border bg-muted/40">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving || loading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-5"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving Profile...
              </>
            ) : (
              'Save Customer Profile'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
