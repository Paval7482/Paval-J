'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addContactTag, deleteContactTag } from '@/lib/contacts/tag-api';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import type { Contact, Tag, ContactNote, MessageTemplate } from '@/types';
import { TemplatePicker, type TemplateSendValues } from '@/components/inbox/template-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Phone,
  Building2,
  Calendar,
  Send,
  Plus,
  User,
  CheckCircle2,
  FileText,
  Tag as TagIcon,
  Volume2,
  Copy,
  MessageSquare,
  Sparkles,
  RefreshCw,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Package,
  Check,
  CalendarDays,
  IndianRupee,
  X,
  MapPin,
} from 'lucide-react';
import {
  type CustomerProfileData,
  saveCustomerProfile,
  formatCustomerDate,
} from '@/lib/contacts/customer-profile';
import { DEFAULT_MACHINES, formatINR, type MachineItem } from '@/lib/machines/machine-master';

interface ContactDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onUpdated: () => void;
}

interface CallRecord {
  id: string;
  customer_number: string;
  virtual_number?: string;
  agent_name: string;
  agent_phone?: string | null;
  call_status: string;
  call_duration: string;
  call_date: string;
  call_time?: string;
  recording_url?: string | null;
  direction?: 'inbound' | 'outbound';
  created_at?: string;
}

export function ContactDetailView({
  open,
  onOpenChange,
  contactId,
  onUpdated,
}: ContactDetailViewProps) {
  const { user } = useAuth();
  const supabase = createClient();

  const [contact, setContact] = useState<Contact | null>(null);
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [availableMachines, setAvailableMachines] = useState<MachineItem[]>(DEFAULT_MACHINES);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'calls' | 'whatsapp' | 'followups' | 'tags'>('profile');

  // Form states for Profile tab
  const [companyName, setCompanyName] = useState('');
  const [stateName, setStateName] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [machineModel, setMachineModel] = useState('');
  const [machinePrice, setMachinePrice] = useState<number>(0);
  const [machineNotes, setMachineNotes] = useState('');
  const [assignedExecutive, setAssignedExecutive] = useState('');
  const [leadStatus, setLeadStatus] = useState('new');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [nextFollowUpTime, setNextFollowUpTime] = useState('');
  const [followUpNote, setFollowUpNote] = useState('');

  // Quick WhatsApp message
  const [quickMsg, setQuickMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);

  // New Note
  const [newNoteContent, setNewNoteContent] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  // Outbound Call Modal
  const [outboundModalOpen, setOutboundModalOpen] = useState(false);
  const [outboundDuration, setOutboundDuration] = useState('01:30');
  const [outboundStatus, setOutboundStatus] = useState('Answered');
  const [outboundNotes, setOutboundNotes] = useState('');
  const [savingOutbound, setSavingOutbound] = useState(false);

  // Load Machine Master
  useEffect(() => {
    async function loadMachines() {
      try {
        const res = await fetch('/api/machines');
        const data = await res.json();
        if (data.ok && Array.isArray(data.machines) && data.machines.length > 0) {
          setAvailableMachines(data.machines);
        }
      } catch {
        setAvailableMachines(DEFAULT_MACHINES);
      }
    }
    loadMachines();
  }, []);

  // Fetch 360 data
  const load360Data = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/360`);
      const data = await res.json();

      if (data.ok) {
        setContact(data.contact);
        setProfile(data.profile);
        setCalls(data.calls || []);
        setMessages(data.messages || []);
        setNotes(data.notes || []);
        setConversationId(data.conversationId || null);

        // Sync form values
        const prof = data.profile || {};
        const cont = data.contact || {};
        setCompanyName(prof.companyName || cont.company || '');
        setStateName(prof.state || '');
        setDistrict(prof.district || '');
        setPincode(prof.pincode || '');
        setAddress(prof.address || '');
        setSelectedMachine(prof.selectedMachineName || '');
        setMachineModel(prof.machineModel || '');
        setMachinePrice(prof.machinePrice || 0);
        setMachineNotes(prof.machineNotes || '');
        setAssignedExecutive(prof.assignedExecutive || cont.assigned_to || '');
        setLeadStatus(prof.leadStatus || cont.status || 'new');
        setNextFollowUpDate(prof.nextFollowUpDate || '');
        setNextFollowUpTime(prof.nextFollowUpTime || '');
        setFollowUpNote(prof.followUpNote || '');
      }

      // Fetch tags
      const { data: contactTagsData } = await supabase
        .from('contact_tags')
        .select('tag_id, tags(*)')
        .eq('contact_id', contactId);

      if (contactTagsData) {
        const mappedTags = contactTagsData
          .map((item: any) => item.tags)
          .filter(Boolean);
        setTags(mappedTags);
      }

      const { data: allTagsData } = await supabase
        .from('tags')
        .select('*')
        .order('name');
      if (allTagsData) setAllTags(allTagsData);
    } catch (err) {
      console.error('Error loading 360 profile:', err);
      toast.error('Failed to load customer profile');
    } finally {
      setLoading(false);
    }
  }, [contactId, supabase]);

  useEffect(() => {
    if (open && contactId) {
      load360Data();
    }
  }, [open, contactId, load360Data]);

  const handleMachineSelect = (machineName: string) => {
    setSelectedMachine(machineName);
    const matched = availableMachines.find((m) => m.name === machineName);
    if (matched) {
      setMachineModel(matched.modelCode);
      setMachinePrice(matched.price);
    }
  };

  const handleSaveProfile = async () => {
    if (!contactId) return;
    setSavingProfile(true);
    try {
      const updatedProfile: CustomerProfileData = {
        ...profile,
        contactId,
        companyName,
        state: stateName,
        district,
        pincode,
        address,
        selectedMachineName: selectedMachine,
        machineModel,
        machinePrice,
        machineNotes,
        assignedExecutive,
        leadStatus,
        nextFollowUpDate,
        nextFollowUpTime,
        followUpNote,
      };

      const res = await saveCustomerProfile(supabase, contactId, updatedProfile);
      if (res.ok) {
        toast.success('Customer profile saved successfully');
        setProfile(updatedProfile);
        onUpdated();
      } else {
        toast.error('Failed to save profile');
      }
    } catch {
      toast.error('Network error saving profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSendQuickMessage = async () => {
    if (!contactId || !quickMsg.trim()) return;
    setSendingMsg(true);
    try {
      let targetConvId = conversationId;
      if (!targetConvId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('contact_id', contactId)
          .maybeSingle();
        targetConvId = conv?.id || null;
      }

      if (!targetConvId) {
        toast.error('No WhatsApp conversation exists for this customer yet');
        return;
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: targetConvId,
          message_type: 'text',
          content_text: quickMsg.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success('WhatsApp message sent');
        setQuickMsg('');
        load360Data();
      } else {
        toast.error(data.error || 'Failed to send message');
      }
    } catch {
      toast.error('Error sending message');
    } finally {
      setSendingMsg(false);
    }
  };

  const handleSendTemplate = async (template: MessageTemplate, values: TemplateSendValues) => {
    if (!contactId) return;
    try {
      let targetConvId = conversationId;
      if (!targetConvId) {
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('contact_id', contactId)
          .maybeSingle();
        targetConvId = conv?.id || null;
      }

      if (!targetConvId) {
        toast.error('No WhatsApp conversation exists for this contact');
        return;
      }

      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: targetConvId,
          message_type: 'template',
          template_name: template.name,
          template_language: template.language,
          template_message_params: {
            body: values.body,
            headerText: values.headerText,
            buttonParams: values.buttonParams,
          },
          template_params: values.body,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`Template "${template.name}" sent to customer!`);
        setTemplatePickerOpen(false);
        load360Data();
      } else {
        toast.error(data.error || 'Failed to send template');
      }
    } catch {
      toast.error('Failed to send WhatsApp template');
    }
  };

  const handleAddNote = async () => {
    if (!contactId || !newNoteContent.trim()) return;
    setAddingNote(true);
    try {
      const { data, error } = await supabase
        .from('contact_notes')
        .insert({
          contact_id: contactId,
          note_text: newNoteContent.trim(),
          user_id: user?.id,
        })
        .select()
        .single();

      if (!error && data) {
        toast.success('Note added');
        setNotes([data as ContactNote, ...notes]);
        setNewNoteContent('');
      } else {
        toast.error('Failed to add note');
      }
    } catch {
      toast.error('Error adding note');
    } finally {
      setAddingNote(false);
    }
  };

  const handleLogOutboundCall = async () => {
    if (!contact?.phone) return;
    setSavingOutbound(true);
    try {
      const now = new Date();
      const executiveName =
        (user as any)?.name ||
        (user?.user_metadata?.full_name as string) ||
        (user?.user_metadata?.name as string) ||
        assignedExecutive ||
        'Executive';

      const { error } = await supabase.from('call_logs').insert({
        customer_number: contact.phone,
        agent_name: executiveName,
        call_status: outboundStatus,
        call_duration: outboundDuration,
        call_date: now.toISOString().split('T')[0],
        call_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        notes: outboundNotes,
        direction: 'outbound',
      });

      if (!error) {
        toast.success('Outbound call logged successfully');
        setOutboundModalOpen(false);
        setOutboundNotes('');
        load360Data();
      } else {
        toast.error('Failed to log call');
      }
    } catch {
      toast.error('Error logging outbound call');
    } finally {
      setSavingOutbound(false);
    }
  };

  const handleAddTag = async (tagId: string) => {
    if (!contactId) return;
    try {
      await addContactTag(contactId, tagId);
      const added = allTags.find((t) => t.id === tagId);
      if (added && !tags.some((t) => t.id === tagId)) {
        setTags([...tags, added]);
      }
      toast.success('Tag assigned');
    } catch {
      toast.error('Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (!contactId) return;
    try {
      await deleteContactTag(contactId, tagId);
      setTags(tags.filter((t) => t.id !== tagId));
      toast.success('Tag removed');
    } catch {
      toast.error('Failed to remove tag');
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (!open) return null;

  const leadSource = profile?.source || 'Direct Inquiry';
  const inboundDateStr = formatCustomerDate(profile?.inboundDate || contact?.created_at);

  const TABS = [
    { id: 'profile', label: 'Machine & Profile', icon: Package },
    { id: 'calls', label: `Call History (${calls.length})`, icon: PhoneCall },
    { id: 'whatsapp', label: `WhatsApp (${messages.length})`, icon: MessageSquare },
    { id: 'followups', label: 'Follow-ups & Notes', icon: CalendarDays },
    { id: 'tags', label: 'Tags', icon: TagIcon },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      {/* Fixed-Height, Non-Jumping Center Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 w-full max-w-4xl h-[650px] max-h-[90vh] flex flex-col overflow-hidden text-slate-800 animate-in fade-in zoom-in-95 duration-150">
        {/* Even & Balanced Header Section */}
        <div className="px-6 py-4 bg-slate-50/90 border-b border-slate-200 shrink-0">
          <div className="flex items-center justify-between gap-4">
            {/* Left Info: Avatar + Details */}
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-xs shrink-0">
                {(contact?.name || 'C').charAt(0).toUpperCase()}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                    {contact?.name || 'Customer Profile'}
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">
                    {leadStatus}
                  </span>
                </div>

                <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 flex-wrap">
                  {contact?.phone && (
                    <div className="flex items-center gap-1.5 font-mono bg-white px-2 py-0.5 rounded-md border border-slate-200 text-slate-800 shadow-2xs">
                      <Phone className="w-3 h-3 text-emerald-600" />
                      <span className="font-semibold text-xs">{contact.phone}</span>
                      <button
                        onClick={() => copyToClipboard(contact.phone, 'Phone number')}
                        className="hover:text-emerald-700 ml-0.5 text-slate-400"
                        title="Copy phone"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  )}

                  {(district || stateName) && (
                    <span className="text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 text-[11px] shadow-2xs truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      {[district, stateName].filter(Boolean).join(', ')}
                    </span>
                  )}

                  {assignedExecutive && (
                    <span className="text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1 text-[11px] shadow-2xs truncate">
                      <User className="w-3 h-3 text-slate-400 shrink-0" />
                      {assignedExecutive}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right Info: Source Badge + Close */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col items-end bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{leadSource}</span>
                </div>
                {profile?.sourceCampaign && (
                  <span className="text-[10px] text-slate-500 max-w-[150px] truncate block font-mono">
                    {profile.sourceCampaign}
                  </span>
                )}
                <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                  <Calendar className="w-2.5 h-2.5" />
                  <span>Entry: {inboundDateStr}</span>
                </div>
              </div>

              <button
                onClick={() => onOpenChange(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all"
                title="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Uniform, Even Tab Navigation Bar */}
        <div className="px-6 py-2.5 bg-slate-100/80 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-5 gap-1.5 bg-white p-1 rounded-xl border border-slate-200/90 shadow-2xs">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all select-none truncate ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inner Content Area - Uniform Scrolling in Fixed Height */}
        <div className="flex-1 overflow-y-auto bg-slate-50/40 p-6">
          {/* TAB 1: Profile & Machine Master Requirements */}
          {activeTab === 'profile' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Machine Master Requirement Section */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 tracking-wide uppercase">
                        Machine Master Requirement
                      </h3>
                      <p className="text-xs text-slate-500">
                        Standardized machinery catalog specs & pricing
                      </p>
                    </div>
                  </div>

                  {machinePrice > 0 && (
                    <div className="text-right bg-white px-3.5 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                        Catalog Price
                      </span>
                      <span className="text-base sm:text-lg font-bold text-emerald-700">
                        {formatINR(machinePrice)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Select Machinery Model from Master Catalog *
                    </label>
                    <select
                      value={selectedMachine}
                      onChange={(e) => handleMachineSelect(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    >
                      <option value="">-- Choose Machine Model --</option>
                      {availableMachines.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name} ({m.modelCode}) - {formatINR(m.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Model Code
                    </label>
                    <input
                      type="text"
                      value={machineModel}
                      onChange={(e) => setMachineModel(e.target.value)}
                      placeholder="e.g. SLI-AMM-500"
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Standard Base Price (INR ₹)
                    </label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        value={machinePrice || ''}
                        onChange={(e) => setMachinePrice(Number(e.target.value))}
                        placeholder="0"
                        className="w-full pl-8 pr-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
                      Machine Customization & Production Notes
                    </label>
                    <textarea
                      value={machineNotes}
                      onChange={(e) => setMachineNotes(e.target.value)}
                      rows={2}
                      placeholder="Customer die preferences, motor specifications, oil heater requirements, output target..."
                      className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Details & Location Section */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  Customer Contact & Business Details
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Company / Bakery / Unit Name
                    </label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. Sri Lakshmi Snacks"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Assigned Sales Executive
                    </label>
                    <input
                      type="text"
                      value={assignedExecutive}
                      onChange={(e) => setAssignedExecutive(e.target.value)}
                      placeholder="Executive Name"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      District / City
                    </label>
                    <input
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      placeholder="e.g. Coimbatore, Madurai, Salem"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      State
                    </label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      placeholder="e.g. Tamil Nadu, Andhra Pradesh"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Full Delivery / Factory Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={2}
                      placeholder="Street, Landmark, City, State..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 px-6 font-semibold"
                >
                  {savingProfile ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  Save Customer Profile
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: Call History & Audio Recordings */}
          {activeTab === 'calls' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    Telephony & Call Recording History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Inbound (MyTelly) and Outbound calls with audio recordings
                  </p>
                </div>

                <Button
                  onClick={() => setOutboundModalOpen(true)}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Log Outbound Call
                </Button>
              </div>

              {calls.length === 0 ? (
                <div className="py-20 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
                  <PhoneIncoming className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-600 font-medium text-sm">No call logs found for this customer</p>
                  <p className="text-xs text-slate-400 mt-1">Inbound calls from MyTelly & logged outbound calls will show here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {calls.map((call) => {
                    const isOutbound = call.direction === 'outbound';
                    return (
                      <div
                        key={call.id}
                        className="bg-white border border-slate-200/90 rounded-xl p-4 hover:border-slate-300 transition-all space-y-3 shadow-2xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`p-2 rounded-xl ${
                                isOutbound
                                  ? 'bg-sky-50 text-sky-700 border border-sky-200'
                                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              }`}
                            >
                              {isOutbound ? (
                                <PhoneOutgoing className="w-4 h-4" />
                              ) : (
                                <PhoneIncoming className="w-4 h-4" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-900 text-sm">
                                  {isOutbound ? 'Outbound Call' : 'Inbound Call (MyTelly)'}
                                </span>
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    call.call_status?.toLowerCase().includes('answer')
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {call.call_status || 'Answered'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Agent: <span className="font-medium text-slate-700">{call.agent_name || 'Executive'}</span> • Duration: {call.call_duration || '00:00'}
                              </p>
                            </div>
                          </div>

                          <div className="text-xs text-slate-400 sm:text-right font-mono">
                            {formatCustomerDate(call.created_at || call.call_date)}
                          </div>
                        </div>

                        {call.recording_url ? (
                          <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center gap-3">
                            <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <audio
                              controls
                              src={call.recording_url}
                              className="w-full h-8 accent-emerald-600"
                              preload="none"
                            >
                              Your browser does not support audio playback.
                            </audio>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-400 italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
                            <span>No audio recording available for this call.</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WhatsApp Live Timeline & Quick Chat */}
          {activeTab === 'whatsapp' && (
            <div className="h-full flex flex-col space-y-3 animate-in fade-in duration-150">
              <div className="flex-1 overflow-y-auto space-y-3 p-4 bg-slate-100/70 rounded-xl border border-slate-200 min-h-[340px]">
                {messages.length === 0 ? (
                  <div className="py-20 text-center text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-medium text-slate-600">No WhatsApp messages yet</p>
                    <p className="text-xs text-slate-400 mt-1">Send a greeting template or type a message below.</p>
                  </div>
                ) : (
                  messages.map((m) => {
                    const isOut = m.direction === 'outbound' || m.sender_type === 'agent';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isOut ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                            isOut
                              ? 'bg-emerald-600 text-white rounded-tr-none shadow-xs'
                              : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-2xs'
                          }`}
                        >
                          <p className="whitespace-pre-wrap leading-relaxed">{m.content_text || m.content || m.text || ''}</p>
                          <div
                            className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                              isOut ? 'text-emerald-100' : 'text-slate-400'
                            }`}
                          >
                            <span>{formatCustomerDate(m.created_at)}</span>
                            {isOut && <Check className="w-3 h-3 text-emerald-100" />}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Composer */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2 shrink-0">
                <Input
                  value={quickMsg}
                  onChange={(e) => setQuickMsg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendQuickMessage();
                    }
                  }}
                  placeholder="Type a WhatsApp message to customer..."
                  className="bg-white border-slate-300 text-sm h-10 text-slate-900 focus:border-emerald-600"
                />
                <Button
                  onClick={handleSendQuickMessage}
                  disabled={sendingMsg || !quickMsg.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 px-4 h-10"
                >
                  {sendingMsg ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={() => setTemplatePickerOpen(true)}
                  variant="outline"
                  className="border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs shrink-0 h-10 font-medium"
                >
                  Send Template
                </Button>
              </div>
            </div>
          )}

          {/* TAB 4: Follow-ups & Notes */}
          {activeTab === 'followups' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Follow-up scheduler */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-emerald-600" />
                  Schedule Next Follow-Up Call / Visit
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Follow-Up Date
                    </label>
                    <input
                      type="date"
                      value={nextFollowUpDate}
                      onChange={(e) => setNextFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Follow-Up Time
                    </label>
                    <input
                      type="time"
                      value={nextFollowUpTime}
                      onChange={(e) => setNextFollowUpTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-slate-600 mb-1 block">
                      Follow-Up Agenda / Reminder Note
                    </label>
                    <input
                      type="text"
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      placeholder="e.g. Call to discuss Murukku machine dies and quotation review"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveProfile}
                    disabled={savingProfile}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Save Reminder
                  </Button>
                </div>
              </div>

              {/* Notes List & Add Note */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" />
                  Executive Notes & Call Discussion History
                </h3>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                  <Textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Write a note about customer call, requirements, or next action..."
                    rows={3}
                    className="bg-white border-slate-300 text-sm text-slate-900 focus:border-emerald-600"
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddNote}
                      disabled={addingNote || !newNoteContent.trim()}
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                    >
                      {addingNote ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                      Add Note
                    </Button>
                  </div>
                </div>

                {notes.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No notes added yet.</p>
                ) : (
                  <div className="space-y-3">
                    {notes.map((n) => (
                      <div
                        key={n.id}
                        className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-1 shadow-2xs"
                      >
                        <p className="text-xs text-slate-800 whitespace-pre-wrap">{n.note_text || (n as any).content || ''}</p>
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span className="font-medium text-slate-600">{(n as any).author_name || 'Executive'}</span>
                          <span>{formatCustomerDate(n.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: Tags */}
          {activeTab === 'tags' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Assigned Tags
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.length === 0 ? (
                    <p className="text-xs text-slate-400">No tags assigned to this customer.</p>
                  ) : (
                    tags.map((t) => (
                      <span
                        key={t.id}
                        className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 rounded-full flex items-center gap-2 text-xs font-medium shadow-2xs"
                      >
                        <span>{t.name}</span>
                        <button
                          onClick={() => handleRemoveTag(t.id)}
                          className="text-slate-400 hover:text-rose-600 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                <h3 className="text-xs font-bold text-slate-800 tracking-wide uppercase">
                  Available Tags to Add
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags
                    .filter((at) => !tags.some((t) => t.id === at.id))
                    .map((at) => (
                      <button
                        key={at.id}
                        onClick={() => handleAddTag(at.id)}
                        className="px-3 py-1 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-800 rounded-full text-xs transition-all flex items-center gap-1.5 font-medium"
                      >
                        <Plus className="w-3 h-3 text-emerald-600" />
                        {at.name}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Log Outbound Call Modal */}
        {outboundModalOpen && (
          <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-slate-800 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <PhoneOutgoing className="w-4 h-4 text-emerald-600" />
                  Log Outbound Call to {contact?.name}
                </h3>
                <button
                  onClick={() => setOutboundModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Call Outcome / Status
                </label>
                <select
                  value={outboundStatus}
                  onChange={(e) => setOutboundStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="Answered">Answered / Connected</option>
                  <option value="Busy">Busy / No Answer</option>
                  <option value="Switched Off">Switched Off / Unreachable</option>
                  <option value="Call Back Requested">Call Back Requested</option>
                  <option value="Interested / Quoted">Interested / Quoted</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Call Duration (MM:SS)
                </label>
                <input
                  type="text"
                  value={outboundDuration}
                  onChange={(e) => setOutboundDuration(e.target.value)}
                  placeholder="02:30"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">
                  Call Notes & Discussion Summary
                </label>
                <textarea
                  value={outboundNotes}
                  onChange={(e) => setOutboundNotes(e.target.value)}
                  rows={3}
                  placeholder="Key discussion points, customer reaction, next action..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOutboundModalOpen(false)}
                  className="border-slate-300 text-slate-700 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleLogOutboundCall}
                  disabled={savingOutbound}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                >
                  {savingOutbound ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                  Save Call Log
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Template Picker */}
        {templatePickerOpen && (
          <TemplatePicker
            open={templatePickerOpen}
            onOpenChange={setTemplatePickerOpen}
            onSelect={handleSendTemplate}
          />
        )}
      </div>
    </div>
  );
}
