"use client";
import { useState, useEffect } from "react";
import {
  Workflow,
  Plus,
  Trash2,
  CheckCircle2,
  Phone,
  Send,
  Loader2,
  Sparkles,
  UsersRound,
  RotateCcw,
  Zap,
  Clock,
  MessageSquare,
  Crown,
  Pencil,
  Check,
  UserCheck,
  FileText,
  Smartphone,
  Copy,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Globe,
  Scale,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  type LeadRoutingConfig,
  type SalesExecutive,
  type AdminRecipient,
  type SupportedLanguage,
  SUPPORTED_LANGUAGES,
  MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES,
  DEFAULT_EXECUTIVE_TEMPLATE,
  DEFAULT_ADMIN_TEMPLATE,
  DEFAULT_CUSTOMER_WELCOME_TEMPLATE,
  renderLeadTemplate,
} from "@/lib/whatsapp/lead-alert";

interface TeamMember {
  id: string;
  user_id?: string;
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
  account_role?: string | null;
  phone?: string | null;
  mobile_phone?: string | null;
}

const TAMIL_NAME_MAP: Record<string, string> = {
  satheesh: "சதீஷ்",
  sathish: "சதீஷ்",
  subash: "சுபாஷ்",
  subhash: "சுபாஷ்",
  baskar: "பாஸ்கர்",
  bhaskar: "பாஸ்கர்",
  bala: "பாலா",
  balaji: "பாலாஜி",
  nallakaman: "நல்லகாமன்",
  karthick: "கார்த்திக்",
  karthik: "கார்த்திக்",
  madhi: "மதி",
  mathi: "மதி",
  ramesh: "ரமேஷ்",
  suresh: "சுரேஷ்",
  senthil: "செந்தில்",
  praveen: "பிரவீன்",
  dinesh: "தினேஷ்",
  vignesh: "விக்னேஷ்",
  saravanan: "சரவணன்",
  vijay: "விஜய்",
  manoj: "மனோஜ்",
  kumar: "குமார்",
  murugan: "முருகன்",
  selvan: "செல்வன்",
};

const TEMPLATE_VARIABLES = [
  { tag: "{{customer_name}}", label: "Customer Name", desc: "வாடிக்கையாளர் பெயர்" },
  { tag: "{{customer_phone}}", label: "Customer Phone", desc: "மொபைல் எண்" },
  { tag: "{{requirement}}", label: "Requirement", desc: "இயந்திரத் தேவை" },
  { tag: "{{location}}", label: "Location", desc: "இடம் / ஊர்" },
  { tag: "{{customer_message}}", label: "Customer Message", desc: "வாடிக்கையாளர் தகவல்" },
  { tag: "{{executive_name}}", label: "Executive Name", desc: "பணியாளர் பெயர்" },
  { tag: "{{executive_tamil_name}}", label: "Executive Tamil Name", desc: "தமிழ் பெயர்" },
  { tag: "{{executive_phone}}", label: "Executive Phone", desc: "WhatsApp எண்" },
  { tag: "{{time}}", label: "Time", desc: "நேரம் (IST)" },
  { tag: "{{sla_minutes}}", label: "SLA Timer", desc: "SLA நிமிடங்கள்" },
  { tag: "{{quick_call_link}}", label: "WhatsApp Link", desc: "wa.me Chat Link" },
  { tag: "{{crm_inbox_link}}", label: "CRM Portal Link", desc: "CRM Inbox Link" },
];

export function LeadRoutingPanel() {
  const [config, setConfig] = useState<LeadRoutingConfig | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Template Customization State
  const [activeTemplateTab, setActiveTemplateTab] = useState<"customer" | "executive" | "admin">("customer");
  const [activeCustomerLang, setActiveCustomerLang] = useState<SupportedLanguage>("all_in_one");
  const [multilingualTemplates, setMultilingualTemplates] = useState<Record<SupportedLanguage, string>>(
    MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES
  );
  const [execTemplate, setExecTemplate] = useState<string>(DEFAULT_EXECUTIVE_TEMPLATE);
  const [adminTemplate, setAdminTemplate] = useState<string>(DEFAULT_ADMIN_TEMPLATE);

  // Add Executive Dialog State
  const [showAddExec, setShowAddExec] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [execName, setExecName] = useState("");
  const [execTamilName, setExecTamilName] = useState("");
  const [execPhone, setExecPhone] = useState("");
  const [execUserId, setExecUserId] = useState<string>("");
  const [execProfileId, setExecProfileId] = useState<string>("");
  const [execLanguages, setExecLanguages] = useState<SupportedLanguage[]>(["ta", "en"]);
  const [execPriority, setExecPriority] = useState<number>(1);

  // Edit Executive Dialog State
  const [editingExec, setEditingExec] = useState<SalesExecutive | null>(null);
  const [editName, setEditName] = useState("");
  const [editTamilName, setEditTamilName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLanguages, setEditLanguages] = useState<SupportedLanguage[]>(["ta", "en"]);
  const [editPriority, setEditPriority] = useState<number>(1);

  // Admin numbers state
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [editingAdmin, setEditingAdmin] = useState<AdminRecipient | null>(null);
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminPhone, setEditAdminPhone] = useState("");

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/lead-routing");
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
        const savedMulti = data.config.multilingualCustomerTemplates || MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES;
        setMultilingualTemplates({
          ...MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES,
          ...savedMulti,
          all_in_one: savedMulti.all_in_one || data.config.customerWelcomeTemplate || MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES.all_in_one,
        });
        setExecTemplate(data.config.executiveAlertTemplate || DEFAULT_EXECUTIVE_TEMPLATE);
        setAdminTemplate(data.config.adminAlertTemplate || DEFAULT_ADMIN_TEMPLATE);
        setTeamMembers(data.teamMembers || []);
        try {
          localStorage.setItem("sli_lead_routing_backup", JSON.stringify(data.config));
        } catch {}
      }
    } catch {
      try {
        const localBackup = localStorage.getItem("sli_lead_routing_backup");
        if (localBackup) {
          const parsed = JSON.parse(localBackup);
          setConfig(parsed);
        }
      } catch {}
      toast.error("Failed to load Lead Routing settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSaveConfig = async (updated: Partial<LeadRoutingConfig>) => {
    if (!config) return;
    setSaving(true);
    try {
      const res = await fetch("/api/settings/lead-routing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
        try {
          localStorage.setItem("sli_lead_routing_backup", JSON.stringify(data.config));
        } catch {}
        if (data.config.multilingualCustomerTemplates) {
          setMultilingualTemplates({
            ...MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES,
            ...data.config.multilingualCustomerTemplates,
          });
        }
        if (data.config.executiveAlertTemplate) setExecTemplate(data.config.executiveAlertTemplate);
        if (data.config.adminAlertTemplate) setAdminTemplate(data.config.adminAlertTemplate);
        toast.success("Lead assignment settings saved successfully!");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTemplates = () => {
    handleSaveConfig({
      customerWelcomeTemplate: multilingualTemplates.all_in_one || multilingualTemplates.ta,
      multilingualCustomerTemplates: multilingualTemplates,
      executiveAlertTemplate: execTemplate,
      adminAlertTemplate: adminTemplate,
      welcomeGreetingMode: "all_in_one",
    });
  };

  const handleUpdateCurrentLangTemplate = (val: string) => {
    setMultilingualTemplates((prev) => ({
      ...prev,
      [activeCustomerLang]: val,
    }));
  };

  const handleResetTemplate = (type: "customer" | "executive" | "admin") => {
    if (type === "customer") {
      const defTemplate = MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES[activeCustomerLang];
      setMultilingualTemplates((prev) => ({
        ...prev,
        [activeCustomerLang]: defTemplate,
      }));
      toast.success(`${activeCustomerLang.toUpperCase()} Welcome template reset to default!`);
    } else if (type === "executive") {
      setExecTemplate(DEFAULT_EXECUTIVE_TEMPLATE);
      handleSaveConfig({ executiveAlertTemplate: DEFAULT_EXECUTIVE_TEMPLATE });
      toast.success("Executive template reset to default!");
    } else {
      setAdminTemplate(DEFAULT_ADMIN_TEMPLATE);
      handleSaveConfig({ adminAlertTemplate: DEFAULT_ADMIN_TEMPLATE });
      toast.success("Management template reset to default!");
    }
  };

  const handleInsertTag = (tag: string) => {
    if (activeTemplateTab === "customer") {
      handleUpdateCurrentLangTemplate(`${multilingualTemplates[activeCustomerLang] || ""} ${tag}`);
    } else if (activeTemplateTab === "executive") {
      setExecTemplate((prev) => `${prev} ${tag}`);
    } else {
      setAdminTemplate((prev) => `${prev} ${tag}`);
    }
  };

  const handleToggleExecActive = (execId: string, currentActive: boolean) => {
    if (!config) return;
    const updatedExecs = config.executives.map((e) =>
      e.id === execId ? { ...e, active: !currentActive } : e
    );
    handleSaveConfig({ executives: updatedExecs });
  };

  const handleRemoveExec = (execId: string) => {
    if (!config) return;
    if (config.executives.length <= 1) {
      toast.error("At least 1 sales executive must remain in the roster.");
      return;
    }
    const updatedExecs = config.executives.filter((e) => e.id !== execId);
    handleSaveConfig({ executives: updatedExecs });
  };

  const handleSelectTeamMember = (memberId: string | null) => {
    if (!memberId) return;
    setSelectedMemberId(memberId);
    if (memberId === "custom") {
      setExecName("");
      setExecTamilName("");
      setExecPhone("");
      setExecUserId("");
      setExecProfileId("");
      return;
    }

    const member = teamMembers.find((m) => m.id === memberId || m.user_id === memberId);
    if (!member) return;

    const rawName = member.full_name || member.email?.split("@")[0] || "";
    const cleanName = rawName.toUpperCase().trim();
    setExecName(cleanName);

    // Auto-suggest Tamil name if recognized
    const firstWord = cleanName.split(" ")[0].toLowerCase();
    if (TAMIL_NAME_MAP[firstWord]) {
      setExecTamilName(TAMIL_NAME_MAP[firstWord]);
    } else {
      setExecTamilName("");
    }

    // Auto-populate phone if member has one, otherwise check if they existed previously
    const existingExec = config?.executives.find(
      (e) => e.user_id === member.user_id || e.profile_id === member.id || e.name.toLowerCase() === cleanName.toLowerCase()
    );

    const initialPhone =
      member.mobile_phone ||
      member.phone ||
      existingExec?.phone ||
      "";

    setExecPhone(initialPhone ? initialPhone.replace(/\D/g, "") : "");
    setExecUserId(member.user_id || "");
    setExecProfileId(member.id || "");
  };

  const handleAddExecutive = () => {
    if (!config) return;
    if (!execName.trim() || !execPhone.trim()) {
      toast.error("Please enter both Executive Name and WhatsApp Number");
      return;
    }

    const cleanPhone = execPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10+ digit WhatsApp number");
      return;
    }

    const newExec: SalesExecutive = {
      id: `exec-${Date.now()}`,
      name: execName.trim().toUpperCase(),
      tamilName: execTamilName.trim() || undefined,
      phone: cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
      user_id: execUserId || undefined,
      profile_id: execProfileId || undefined,
      active: true,
      role: "Sales Executive",
    };

    const updatedExecs = [...config.executives, newExec];
    handleSaveConfig({ executives: updatedExecs });

    setSelectedMemberId("");
    setExecName("");
    setExecTamilName("");
    setExecPhone("");
    setExecUserId("");
    setExecProfileId("");
    setShowAddExec(false);
  };

  const handleOpenEditExec = (exec: SalesExecutive) => {
    setEditingExec(exec);
    setEditName(exec.name);
    setEditTamilName(exec.tamilName || "");
    setEditPhone(exec.phone);
    setEditLanguages(exec.languages && exec.languages.length > 0 ? exec.languages : ["ta", "en"]);
  };

  const handleSaveEditExec = () => {
    if (!config || !editingExec) return;
    if (!editName.trim() || !editPhone.trim()) {
      toast.error("Please enter both Executive Name and WhatsApp Number");
      return;
    }

    const cleanPhone = editPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10+ digit WhatsApp number");
      return;
    }

    const updatedExecs = config.executives.map((e) =>
      e.id === editingExec.id
        ? {
            ...e,
            name: editName.trim().toUpperCase(),
            tamilName: editTamilName.trim() || undefined,
            phone: cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
            languages: editLanguages,
          }
        : e
    );

    handleSaveConfig({ executives: updatedExecs });
    setEditingExec(null);
  };

  const handleToggleAdminActive = (adminId: string, currentActive: boolean) => {
    if (!config) return;
    const updatedAdmins = config.adminRecipients.map((a) =>
      a.id === adminId ? { ...a, active: !currentActive } : a
    );
    handleSaveConfig({ adminRecipients: updatedAdmins });
  };

  const handleAddAdmin = () => {
    if (!config) return;
    if (!adminName.trim() || !adminPhone.trim()) {
      toast.error("Please provide both Admin Name and WhatsApp Phone Number");
      return;
    }

    const cleanPhone = adminPhone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10+ digit WhatsApp number");
      return;
    }

    const newAdmin: AdminRecipient = {
      id: `admin-${Date.now()}`,
      name: adminName.trim(),
      phone: cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
      active: true,
    };

    const updatedAdmins = [...config.adminRecipients, newAdmin];
    handleSaveConfig({ adminRecipients: updatedAdmins });
    setAdminName("");
    setAdminPhone("");
  };

  const handleRemoveAdmin = (adminId: string) => {
    if (!config) return;
    if (config.adminRecipients.length <= 1) {
      toast.error("At least 1 management alert number must be configured.");
      return;
    }
    const updatedAdmins = config.adminRecipients.filter((a) => a.id !== adminId);
    handleSaveConfig({ adminRecipients: updatedAdmins });
  };

  const handleMoveExecutive = (execId: string, direction: "up" | "down") => {
    if (!config) return;
    const list = [...config.executives];
    const idx = list.findIndex((e) => e.id === execId);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;

    const temp = list[idx];
    list[idx] = list[targetIdx];
    list[targetIdx] = temp;

    const updated = list.map((item, index) => ({
      ...item,
      priority: index + 1,
    }));

    handleSaveConfig({ executives: updated });
    toast.success(`Priority updated! ${temp.name} moved ${direction}.`);
  };

  const handleSetExecutivePriority = (execId: string, newPriority: number) => {
    if (!config) return;
    const list = [...config.executives];
    const target = list.find((e) => e.id === execId);
    if (!target) return;

    target.priority = newPriority;
    list.sort((a, b) => (a.priority || 999) - (b.priority || 999));
    const updated = list.map((item, index) => ({
      ...item,
      priority: index + 1,
    }));

    handleSaveConfig({ executives: updated });
    toast.success(`Priority set to #${newPriority} for ${target.name}`);
  };

  const handleSendTest = async (
    type: "executive" | "admin" | "full",
    targetId?: string,
    phone?: string
  ) => {
    setTestingId(targetId || type);
    try {
      const res = await fetch("/api/settings/lead-routing/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: type,
          targetExecutiveId: targetId,
          targetAdminPhone: phone,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(data.message || "Test alert sent via WhatsApp!");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send test alert");
    } finally {
      setTestingId(null);
    }
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeExecsCount = config.executives.filter((e) => e.active).length;
  const activeAdminsCount = config.adminRecipients.filter((a) => a.active).length;

  // Sample lead data for real-time preview simulation
  const previewData = {
    customer_name: "Ramanathan M",
    customer_phone: "919876543210",
    requirement: "Double Die Murukku Machine (Semi-Automatic)",
    location: "Madurai, Tamil Nadu",
    customer_message: "Murukku machine price list and catalogue details venum.",
    executive_name: config.executives[0]?.name || "SATHEESH",
    executive_tamil_name: config.executives[0]?.tamilName || "சதீஷ்",
    executive_phone: config.executives[0]?.phone || "919786390479",
    time: "01:15 pm",
    sla_minutes: config.slaMinutes || 5,
    quick_call_link: "https://wa.me/919876543210",
    crm_inbox_link: "https://sli-crm-rho.vercel.app/inbox",
  };

  const currentCustomerTemplate = multilingualTemplates[activeCustomerLang] || MULTILINGUAL_CUSTOMER_WELCOME_TEMPLATES.ta;
  const renderedCustomerPreview = renderLeadTemplate(currentCustomerTemplate, previewData);
  const renderedExecPreview = renderLeadTemplate(execTemplate, previewData);
  const renderedAdminPreview = renderLeadTemplate(adminTemplate, previewData);

  return (
    <div className="space-y-8">
      {/* Top Automation Flow Banner */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Workflow className="h-6 w-6 text-primary" />
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                WhatsApp Lead Auto-Assignment & Round-Robin Flow
              </h2>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Live Automation
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Automatically greets incoming leads in their native language (Tamil, Hindi, Kannada, Malayalam, Telugu, English), matches language-specialist Sales Executives, sends urgent action alerts to Executive WhatsApp, and delivers management tracking summaries to MD Sir.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendTest("full")}
              disabled={testingId === "full"}
              className="border-primary/30 hover:bg-primary/10 font-medium"
            >
              {testingId === "full" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2 text-primary" />
              )}
              Test Complete Flow
            </Button>

            <div className="flex items-center gap-2 border-l border-border pl-3">
              <span className="text-xs font-semibold text-muted-foreground">Auto-Assignment:</span>
              <Switch
                checked={config.enabled}
                onCheckedChange={(val) => handleSaveConfig({ enabled: val })}
              />
            </div>
          </div>
        </div>

        {/* Visual 4-Step Diagram */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card/70 p-3.5 text-xs flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-primary font-semibold mb-1">
              <MessageSquare className="h-4 w-4" />
              <span>1. Inbound Lead</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Customer sends WhatsApp message, submits Meta Lead Form, or calls.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/70 p-3.5 text-xs flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-blue-500 font-semibold mb-1">
              <Sparkles className="h-4 w-4" />
              <span>2. Multi-Language Greeting</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Auto-detects language (Tamil/Hindi/Kannada/Malayalam/Telugu/English) and sends executive info.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/70 p-3.5 text-xs flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-1">
              <Zap className="h-4 w-4" />
              <span>3. Language-Matched Exec</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Assigned to executive speaking customer's language with 1-click Call link.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/70 p-3.5 text-xs flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-purple-500 font-semibold mb-1">
              <Crown className="h-4 w-4" />
              <span>4. MD Tracking Alert</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Summary sent to <b>{activeAdminsCount} Management Numbers</b> (MD Sir).
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: WhatsApp Alert & Welcome Templates Customizer */}
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                WhatsApp Message & Alert Templates Customizer
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                6 Languages Supported
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Customize the automatic customer welcome greeting across 6 languages (Tamil, Hindi, Kannada, Malayalam, Telugu, English), executive alert, and management summary.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleResetTemplate(activeTemplateTab)}
              className="text-xs gap-1.5 h-8"
              title="Reset template to default"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to Default
            </Button>
            <Button
              size="sm"
              onClick={handleSaveTemplates}
              disabled={saving}
              className="text-xs gap-1.5 h-8 font-medium shadow-xs"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Save Templates
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <Tabs
            value={activeTemplateTab}
            onValueChange={(val) => setActiveTemplateTab(val as "customer" | "executive" | "admin")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 max-w-xl h-9 p-1 bg-muted/60">
              <TabsTrigger value="customer" className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Customer Welcome Greeting
              </TabsTrigger>
              <TabsTrigger value="executive" className="text-xs font-semibold flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-emerald-500" />
                Executive WhatsApp Alert
              </TabsTrigger>
              <TabsTrigger value="admin" className="text-xs font-semibold flex items-center gap-1.5">
                <Crown className="h-3.5 w-3.5 text-amber-500" />
                Management (MD Sir)
              </TabsTrigger>
            </TabsList>

            {/* Dynamic Placeholder Insertion Chips */}
            <div className="mt-4 p-3 rounded-lg border border-border bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  1-Click Dynamic Placeholders:
                </span>
                <span className="text-[11px] text-muted-foreground">Click tag to insert into template</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => handleInsertTag(v.tag)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-mono font-medium bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 border border-border transition-all shadow-2xs"
                    title={`${v.desc} - Click to insert`}
                  >
                    <span className="text-primary font-bold">+</span>
                    <span>{v.tag}</span>
                    <span className="text-muted-foreground font-sans text-[10px]">({v.label})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Editor & Live WhatsApp Preview Grid */}
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
              {/* Left Column: Template Textarea Editor */}
              <div className="lg:col-span-7 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground">
                    {activeTemplateTab === "customer"
                      ? `Customer Welcome (${SUPPORTED_LANGUAGES.find(l => l.code === activeCustomerLang)?.label || "Tamil"})`
                      : activeTemplateTab === "executive"
                      ? "Sales Executive WhatsApp Message Template"
                      : "Management / MD Sir WhatsApp Message Template"}
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    {activeTemplateTab === "customer"
                      ? currentCustomerTemplate.length
                      : activeTemplateTab === "executive"
                      ? execTemplate.length
                      : adminTemplate.length}{" "}
                    characters
                  </span>
                </div>

                <TabsContent value="customer" className="mt-0 space-y-3">
                  <div className="flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-2.5">
                    <p className="text-xs text-muted-foreground">
                      ⚡ Automatically sent to every new lead in their language upon arrival.
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">Auto-Send:</span>
                      <Switch
                        checked={config.notifyCustomer !== false}
                        onCheckedChange={(val) => handleSaveConfig({ notifyCustomer: val })}
                      />
                    </div>
                  </div>

                  {/* Clean Greeting Header with + Create / Customize Language Option */}
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/40 rounded-xl border border-border">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-1 ${activeCustomerLang === "all_in_one" ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" : "bg-primary/10 text-primary border-primary/30"}`}>
                        {activeCustomerLang === "all_in_one" ? "✨ Primary Greeting (All-in-One Company Profile)" : `🌐 ${SUPPORTED_LANGUAGES.find(l => l.code === activeCustomerLang)?.native || activeCustomerLang} Greeting`}
                      </Badge>
                      {activeCustomerLang !== "all_in_one" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveCustomerLang("all_in_one")}
                          className="text-xs h-7 text-muted-foreground hover:text-foreground"
                        >
                          ← Back to Primary Greeting
                        </Button>
                      )}
                    </div>

                    {/* Optional Language Switcher Dropdown */}
                    <div className="flex items-center gap-1.5">
                      <select
                        value={activeCustomerLang}
                        onChange={(e) => setActiveCustomerLang(e.target.value as SupportedLanguage)}
                        className="text-xs rounded-md border border-border bg-background px-2.5 py-1 text-foreground shadow-2xs font-medium cursor-pointer focus:ring-1 focus:ring-primary"
                      >
                        <option value="all_in_one">✨ Primary Greeting (All-in-One)</option>
                        <optgroup label="Optional Specific Languages">
                          <option value="ta">🇮🇳 தமிழ் (Tamil)</option>
                          <option value="en">🌐 English</option>
                          <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                          <option value="kn">🇮🇳 ಕನ್ನಡ (Kannada)</option>
                          <option value="ml">🇮🇳 മലയാളം (Malayalam)</option>
                          <option value="te">🇮🇳 తెలుగు (Telugu)</option>
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  <Textarea
                    value={multilingualTemplates[activeCustomerLang] || ""}
                    onChange={(e) => handleUpdateCurrentLangTemplate(e.target.value)}
                    rows={14}
                    placeholder={`Enter customer welcome message template in ${activeCustomerLang}...`}
                    className="font-mono text-xs leading-relaxed bg-background p-3"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ⚡ Use WhatsApp formatting: <code className="bg-muted px-1 py-0.5 rounded">*bold*</code>, <code className="bg-muted px-1 py-0.5 rounded">_italic_</code>, emojis, and placeholders like <code className="bg-muted px-1 py-0.5 rounded">&#123;&#123;customer_name&#125;&#125;</code> and <code className="bg-muted px-1 py-0.5 rounded">&#123;&#123;executive_name&#125;&#125;</code>.
                  </p>
                </TabsContent>

                <TabsContent value="executive" className="mt-0 space-y-2">
                  <Textarea
                    value={execTemplate}
                    onChange={(e) => setExecTemplate(e.target.value)}
                    rows={15}
                    placeholder="Enter executive alert message template..."
                    className="font-mono text-xs leading-relaxed bg-background p-3"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ⚡ Use WhatsApp formatting: <code className="bg-muted px-1 py-0.5 rounded">*bold*</code>, <code className="bg-muted px-1 py-0.5 rounded">_italic_</code>, emojis, and Tamil/English instructions.
                  </p>
                </TabsContent>

                <TabsContent value="admin" className="mt-0 space-y-2">
                  <Textarea
                    value={adminTemplate}
                    onChange={(e) => setAdminTemplate(e.target.value)}
                    rows={15}
                    placeholder="Enter management alert message template..."
                    className="font-mono text-xs leading-relaxed bg-background p-3"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    ⚡ This summary template will be sent to all active numbers in the Management list (MD Sir).
                  </p>
                </TabsContent>
              </div>

              {/* Right Column: Live WhatsApp Chat Simulator Preview */}
              <div className="lg:col-span-5 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-500" />
                    Live WhatsApp Preview:
                  </Label>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
                    Real-time Simulation
                  </Badge>
                </div>

                <div className="rounded-xl border border-border bg-[#0b141a] text-slate-100 p-4 shadow-inner min-h-[340px] flex flex-col justify-between">
                  {/* WhatsApp Chat Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
                        SLI
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">Sri Lakshmi Industries</div>
                        <div className="text-[10px] text-emerald-400">
                          {activeTemplateTab === "customer"
                            ? "Customer Welcome Message"
                            : activeTemplateTab === "executive"
                            ? "Executive Alert"
                            : "Management Summary"}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400">Today</span>
                  </div>

                  {/* WhatsApp Message Bubble */}
                  <div className="my-3 bg-[#005c4b] text-white p-3 rounded-lg rounded-tl-xs text-xs whitespace-pre-wrap font-sans leading-relaxed shadow-sm border border-emerald-600/30">
                    {activeTemplateTab === "customer"
                      ? renderedCustomerPreview
                      : activeTemplateTab === "executive"
                      ? renderedExecPreview
                      : renderedAdminPreview}
                    <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-emerald-200">
                      <span>01:15 pm</span>
                      <Check className="h-3 w-3 text-emerald-300" />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Simulated with sample lead data</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleSendTest(
                          activeTemplateTab === "customer"
                            ? "full"
                            : activeTemplateTab === "executive"
                            ? "executive"
                            : "admin"
                        )
                      }
                      className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20 px-2"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Test Ping
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {/* SECTION: Lead Assignment Distribution Strategy Selector */}
      <Card className="border-primary/30 shadow-sm bg-gradient-to-b from-card to-muted/20">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Workflow className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">
                  Lead Assignment & Distribution Strategy
                </CardTitle>
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                  Selectable Logic
                </Badge>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Choose how incoming WhatsApp and Meta leads are assigned to your active sales executives.
              </CardDescription>
            </div>

            {/* Current Active Strategy Badge */}
            <Badge className="bg-primary text-primary-foreground font-semibold px-3 py-1 text-xs self-start sm:self-auto">
              {config.assignmentMethod === "priority_sequence"
                ? "🔢 Custom Priority Sequence Active"
                : config.assignmentMethod === "language_match"
                ? "🌐 Language-Wise Routing Active"
                : config.assignmentMethod === "workload_balanced"
                ? "⚖️ Workload Balanced Active"
                : "🔄 Standard Round Robin Active"}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* OPTION 1: Round Robin */}
            <div
              onClick={() => handleSaveConfig({ assignmentMethod: "round_robin" })}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                config.assignmentMethod === "round_robin" || !config.assignmentMethod
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-card hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <RotateCcw className="h-4 w-4 text-primary" />
                    1. Round Robin
                  </span>
                  {(config.assignmentMethod === "round_robin" || !config.assignmentMethod) && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Equal rotation across all active executives turn-by-turn.
                </p>
              </div>
              <Badge variant="secondary" className="mt-3 w-fit text-[10px] font-normal">
                Equal Turn-by-Turn
              </Badge>
            </div>

            {/* OPTION 2: Priority Sequence (1st, 2nd, 3rd) */}
            <div
              onClick={() => handleSaveConfig({ assignmentMethod: "priority_sequence" })}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                config.assignmentMethod === "priority_sequence"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-card hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <ListOrdered className="h-4 w-4 text-primary" />
                    2. Priority Sequence
                  </span>
                  {config.assignmentMethod === "priority_sequence" && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Strict 1st Lead ➔ 2nd Lead ➔ 3rd Lead order configured below, irrespective of language.
                </p>
              </div>
              <Badge variant="secondary" className="mt-3 w-fit text-[10px] font-normal">
                1st ➔ 2nd ➔ 3rd Order
              </Badge>
            </div>

            {/* OPTION 3: Language-Wise Routing */}
            <div
              onClick={() => handleSaveConfig({ assignmentMethod: "language_match" })}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                config.assignmentMethod === "language_match"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-card hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <Globe className="h-4 w-4 text-primary" />
                    3. Language Wise
                  </span>
                  {config.assignmentMethod === "language_match" && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Directly routes to Tamil, Telugu, Hindi, Malayalam, or Kannada specialist executive.
                </p>
              </div>
              <Badge variant="secondary" className="mt-3 w-fit text-[10px] font-normal">
                Native Language Match
              </Badge>
            </div>

            {/* OPTION 4: Workload Balanced */}
            <div
              onClick={() => handleSaveConfig({ assignmentMethod: "workload_balanced" })}
              className={`cursor-pointer rounded-xl border p-3.5 transition-all flex flex-col justify-between ${
                config.assignmentMethod === "workload_balanced"
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20 shadow-xs"
                  : "border-border bg-card hover:border-border hover:bg-muted/40"
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                    <Scale className="h-4 w-4 text-primary" />
                    4. Workload Balanced
                  </span>
                  {config.assignmentMethod === "workload_balanced" && (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Distributes leads dynamically to balance team load equally.
                </p>
              </div>
              <Badge variant="secondary" className="mt-3 w-fit text-[10px] font-normal">
                Least Busy First
              </Badge>
            </div>
          </div>

          {/* Live Next Lead Target Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                🎯 Next Incoming Lead Target:
              </span>
              <span className="font-bold text-foreground bg-background/80 px-2 py-0.5 rounded border border-border">
                {(() => {
                  const activeList = config.assignmentMethod === "priority_sequence"
                    ? [...config.executives].sort((a, b) => (a.priority || 999) - (b.priority || 999)).filter(e => e.active !== false)
                    : config.executives.filter(e => e.active !== false);
                  if (activeList.length === 0) return "No Active Executives";
                  const nextIdx = (config.lastAssignedIndex + 1) % activeList.length;
                  const target = activeList[nextIdx] || activeList[0];
                  return `${target.name} (+${target.phone})`;
                })()}
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              {config.assignmentMethod === "priority_sequence"
                ? "Following custom 1st ➔ 2nd ➔ 3rd priority sequence"
                : config.assignmentMethod === "language_match"
                ? "Matching customer's preferred language"
                : "Rotating through active executives roster"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Sales Executives Pool (Round-Robin Roster) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-primary" />
                {config.assignmentMethod === "priority_sequence"
                  ? "Sales Executives Pool (Custom Priority Sequence)"
                  : config.assignmentMethod === "language_match"
                  ? "Sales Executives Pool (Language-Wise Roster)"
                  : config.assignmentMethod === "workload_balanced"
                  ? "Sales Executives Pool (Workload Balanced Roster)"
                  : "Sales Executives Pool (Round-Robin Equal Rotation)"}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {activeExecsCount} Active / {config.executives.length} Total
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              {config.assignmentMethod === "priority_sequence"
                ? "Re-order executives using [ ⬆️ ] [ ⬇️ ] buttons or the rank dropdown to set 1st Lead, 2nd Lead, 3rd Lead order."
                : config.assignmentMethod === "language_match"
                ? "Leads are routed to executives speaking the customer's preferred language (Tamil, Telugu, Malayalam, Hindi, Kannada, English)."
                : config.assignmentMethod === "workload_balanced"
                ? "Leads are distributed automatically to executives with the lowest current workload."
                : "Leads are rotated equally through active executives in equal turn-by-turn rotation."}
            </CardDescription>
          </div>

          <Button size="sm" onClick={() => setShowAddExec(true)} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Sales Executive
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.executives.map((exec, idx) => {
              const priorityNum = exec.priority || idx + 1;
              const isPriorityMode = config.assignmentMethod === "priority_sequence";
              const activeList = isPriorityMode
                ? [...config.executives].sort((a, b) => (a.priority || 999) - (b.priority || 999)).filter((e) => e.active !== false)
                : config.executives.filter((e) => e.active !== false);
              const nextIdx = (config.lastAssignedIndex + 1) % (activeList.length || 1);
              const isNextTarget = activeList[nextIdx]?.id === exec.id;

              return (
                <div
                  key={exec.id}
                  className={`relative flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                    isNextTarget && exec.active
                      ? "border-emerald-500/60 bg-emerald-500/5 ring-1 ring-emerald-500/30 shadow-xs"
                      : exec.active
                      ? "border-border bg-card hover:border-primary/40 shadow-xs"
                      : "border-border/50 bg-muted/40 opacity-70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Priority Sequence Rank & Up/Down Controls (ONLY VISIBLE IN PRIORITY SEQUENCE MODE) */}
                    {isPriorityMode && (
                      <div className="flex flex-col items-center gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          disabled={idx === 0}
                          onClick={() => handleMoveExecutive(exec.id, "up")}
                          title="Move Up in Priority (Earlier Lead)"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 h-5 flex items-center justify-center ${
                            priorityNum === 1
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                              : priorityNum === 2
                              ? "bg-blue-500/10 text-blue-700 border-blue-500/30"
                              : "bg-muted text-foreground border-border"
                          }`}
                          title={`Assigned Lead #${priorityNum} in Sequence`}
                        >
                          #{priorityNum}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                          disabled={idx === config.executives.length - 1}
                          onClick={() => handleMoveExecutive(exec.id, "down")}
                          title="Move Down in Priority (Later Lead)"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                        exec.active
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {exec.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{exec.name}</span>
                        {exec.tamilName && (
                          <span className="text-xs text-muted-foreground font-medium">({exec.tamilName})</span>
                        )}
                        {isNextTarget && exec.active && (
                          <Badge className="text-[10px] bg-emerald-600 text-white py-0 px-1.5 h-4 font-semibold">
                            🎯 Next Target
                          </Badge>
                        )}
                        {exec.active ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0 px-1.5 h-4"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0 px-1.5 h-4"
                          >
                            On Leave
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <a
                          href={`https://wa.me/${exec.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 hover:text-emerald-600 transition-colors font-medium text-foreground/80"
                          title="Click to open WhatsApp chat"
                        >
                          <Phone className="h-3 w-3 text-emerald-500" />
                          +{exec.phone}
                        </a>
                        <span className="text-border">•</span>
                        {isPriorityMode ? (
                          <span className="text-[11px] font-medium text-primary">
                            {priorityNum === 1 ? "1st Lead" : priorityNum === 2 ? "2nd Lead" : priorityNum === 3 ? "3rd Lead" : `${priorityNum}th Lead`}
                          </span>
                        ) : (
                          <span>{exec.role || "Sales Executive"}</span>
                        )}
                      </div>

                      {/* Language Badges */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {(exec.languages && exec.languages.length > 0 ? exec.languages : (["ta", "en"] as SupportedLanguage[])).map((langCode) => {
                          const lObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
                          return (
                            <span
                              key={langCode}
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium"
                            >
                              <span>{lObj?.flag}</span>
                              <span>{lObj?.native || langCode}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Quick Priority Select Dropdown (ONLY VISIBLE IN PRIORITY SEQUENCE MODE) */}
                    {isPriorityMode && (
                      <select
                        value={String(priorityNum)}
                        onChange={(e) => handleSetExecutivePriority(exec.id, parseInt(e.target.value))}
                        className="text-xs rounded-md border border-border bg-background px-2 py-1 text-foreground shadow-2xs font-medium cursor-pointer"
                        title="Set Priority Rank Position"
                      >
                        {config.executives.map((_, pIdx) => (
                          <option key={pIdx + 1} value={pIdx + 1}>
                            #{pIdx + 1} {pIdx === 0 ? "(1st)" : pIdx === 1 ? "(2nd)" : pIdx === 2 ? "(3rd)" : `(${pIdx + 1}th)`}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Edit Executive Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                      onClick={() => {
                        setEditingExec(exec);
                        setEditName(exec.name);
                        setEditTamilName(exec.tamilName || "");
                        setEditPhone(exec.phone);
                        setEditLanguages(exec.languages || ["ta", "en"]);
                        setEditPriority(exec.priority || idx + 1);
                      }}
                      title="Edit WhatsApp Number & Details"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>

                    {/* Ping WhatsApp Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs hover:bg-primary/10 text-primary"
                      disabled={testingId === exec.id}
                      onClick={() => handleSendTest("executive", exec.id)}
                      title="Send Test Lead Alert via WhatsApp"
                    >
                      {testingId === exec.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5 mr-1" />
                      )}
                      Ping
                    </Button>

                    {/* Active / On-Leave Toggle */}
                    <Switch
                      checked={exec.active}
                      onCheckedChange={() => handleToggleExecActive(exec.id, exec.active)}
                      title={exec.active ? "Set On Leave (Skip in Rotation)" : "Set Active"}
                    />

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveExec(exec.id)}
                      title="Remove from roster"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Management & Admin Notification Numbers (MD Sir) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                Management & Admin Notification Numbers (MD Sir)
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {activeAdminsCount} Active Admin{activeAdminsCount !== 1 ? "s" : ""}
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              These management numbers receive real-time summary notifications for every incoming lead, including assigned executive details.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.adminRecipients.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
                    {admin.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {admin.name}
                      </span>
                      {admin.active ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0 px-1.5 h-4">Receiving Alerts</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-muted text-muted-foreground py-0 px-1.5 h-4">Muted</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <a
                        href={`https://wa.me/${admin.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-emerald-600 transition-colors font-medium text-foreground/80"
                      >
                        <Phone className="h-3 w-3 text-emerald-500" />
                        +{admin.phone}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Edit Admin Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                    onClick={() => {
                      setEditingAdmin(admin);
                      setEditAdminName(admin.name);
                      setEditAdminPhone(admin.phone);
                    }}
                    title="Edit Management Alert Details & WhatsApp Number"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs hover:bg-amber-500/10 text-amber-600"
                    disabled={testingId === admin.id}
                    onClick={() => handleSendTest("admin", admin.id, admin.phone)}
                    title="Send Test Summary Alert via WhatsApp"
                  >
                    {testingId === admin.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5 mr-1" />
                    )}
                    Test Alert
                  </Button>

                  <Switch
                    checked={admin.active}
                    onCheckedChange={() => handleToggleAdminActive(admin.id, admin.active)}
                  />

                  {config.adminRecipients.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemoveAdmin(admin.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-border">
            <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-primary" />
              Add Management Alert Number
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                placeholder="Name (e.g. Sales Director / MD Sir)"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="WhatsApp Number (e.g. 919994440905)"
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="text-xs"
              />
              <Button size="sm" onClick={handleAddAdmin} disabled={saving} className="gap-1.5 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Admin Number
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: SLA & Notification Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Response SLA & Delivery Rules
          </CardTitle>
          <CardDescription className="text-xs">
            Fine-tune dispatch rules, urgency SLA timer, and notification channels.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Contact SLA (Minutes)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={config.slaMinutes || 5}
                onChange={(e) =>
                  handleSaveConfig({ slaMinutes: parseInt(e.target.value) || 5 })
                }
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Urgent timer highlighted in Executive WhatsApp alert (Default: 5 mins).
              </p>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Alert Executives</Label>
                <p className="text-[11px] text-muted-foreground">
                  Send WhatsApp message to assigned sales executive
                </p>
              </div>
              <Switch
                checked={config.notifyExecutive}
                onCheckedChange={(val) => handleSaveConfig({ notifyExecutive: val })}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Alert Management</Label>
                <p className="text-[11px] text-muted-foreground">
                  Send summary message to MD Sir / Admin numbers
                </p>
              </div>
              <Switch
                checked={config.notifyAdmin}
                onCheckedChange={(val) => handleSaveConfig({ notifyAdmin: val })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIALOG 1: Add Sales Executive to Round-Robin */}
      <Dialog open={showAddExec} onOpenChange={setShowAddExec}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Add Sales Executive to Round-Robin
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select an active CRM executive from the dropdown. Configure their spoken languages for intelligent lead routing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Dropdown to select from CRM Team Accounts */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Select Executive (from CRM Accounts) *</span>
                <span className="text-[10px] text-primary font-normal">Auto-populates data</span>
              </Label>
              <Select value={selectedMemberId} onValueChange={handleSelectTeamMember}>
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="-- Select Sales Executive / Team Member --" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id} className="text-xs py-2">
                      <div className="flex flex-col">
                        <span className="font-semibold">{member.full_name || member.email}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {member.role || member.account_role || "Executive"} • {member.email || "No email"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom" className="text-xs text-primary font-medium">
                    + Custom / Other Executive (Manual Entry)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. Executive Name (Auto-filled & Editable) */}
            <div className="space-y-1">
              <Label className="text-xs">Executive Name (English) *</Label>
              <Input
                placeholder="e.g. SATHEESH"
                value={execName}
                onChange={(e) => setExecName(e.target.value)}
                className="text-xs uppercase"
              />
            </div>

            {/* 3. Tamil Name (Auto-suggested & Editable) */}
            <div className="space-y-1">
              <Label className="text-xs">Tamil Name (Optional)</Label>
              <Input
                placeholder="e.g. சதீஷ்"
                value={execTamilName}
                onChange={(e) => setExecTamilName(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Priority Sequence Rank */}
            <div className="space-y-1">
              <Label className="text-xs">Priority Sequence Rank (1st, 2nd, 3rd...)</Label>
              <Input
                type="number"
                min={1}
                value={execPriority}
                onChange={(e) => setExecPriority(parseInt(e.target.value) || 1)}
                className="text-xs font-mono"
              />
            </div>

            {/* 4. Language Categories Handled */}
            <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Languages Handled (Language Category) *</span>
                <span className="text-[10px] text-muted-foreground">Click to toggle</span>
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = execLanguages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (execLanguages.length > 1) {
                            setExecLanguages(execLanguages.filter((l) => l !== lang.code));
                          }
                        } else {
                          setExecLanguages([...execLanguages, lang.code]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 border transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.native}</span>
                      <span className="text-[10px] opacity-80">({lang.label})</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Incoming leads in these languages will be intelligently assigned to this executive.
              </p>
            </div>

            {/* 5. WhatsApp Number (Fully Editable) */}
            <div className="space-y-1.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp Mobile Number (Lead Alert Delivery) *
              </Label>
              <Input
                placeholder="e.g. 919876543210 (with country code)"
                value={execPhone}
                onChange={(e) => setExecPhone(e.target.value)}
                className="text-xs bg-background font-mono font-medium"
              />
              <p className="text-[11px] text-muted-foreground">
                ⚡ <b>Leads will be assigned & forwarded directly to this WhatsApp number</b>.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddExec(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!config) return;
                if (!execName.trim() || !execPhone.trim()) {
                  toast.error("Please enter both Executive Name and WhatsApp Number");
                  return;
                }

                const cleanPhone = execPhone.replace(/\D/g, "");
                if (cleanPhone.length < 10) {
                  toast.error("Please enter a valid 10+ digit WhatsApp number");
                  return;
                }

                const newExec: SalesExecutive = {
                  id: `exec-${Date.now()}`,
                  name: execName.trim().toUpperCase(),
                  tamilName: execTamilName.trim() || undefined,
                  phone: cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
                  user_id: execUserId || undefined,
                  profile_id: execProfileId || undefined,
                  active: true,
                  role: "Sales Executive",
                  languages: execLanguages,
                  priority: execPriority || config.executives.length + 1,
                };

                const updatedExecs = [...config.executives, newExec];
                handleSaveConfig({ executives: updatedExecs });

                setSelectedMemberId("");
                setExecName("");
                setExecTamilName("");
                setExecPhone("");
                setExecUserId("");
                setExecProfileId("");
                setExecLanguages(["ta", "en"]);
                setExecPriority(updatedExecs.length + 1);
                setShowAddExec(false);
              }}
              disabled={saving}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-4 w-4" />
              Add to Rotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: Edit Sales Executive */}
      <Dialog open={!!editingExec} onOpenChange={(open) => !open && setEditingExec(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Executive Details & Languages
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update name, languages handled, priority sequence, or WhatsApp number for <b>{editingExec?.name}</b>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Executive Name (English) *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-xs uppercase"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tamil Name (Optional)</Label>
              <Input
                placeholder="e.g. சதீஷ்"
                value={editTamilName}
                onChange={(e) => setEditTamilName(e.target.value)}
                className="text-xs"
              />
            </div>

            {/* Priority Sequence Rank */}
            <div className="space-y-1">
              <Label className="text-xs">Priority Sequence Rank (1st, 2nd, 3rd...)</Label>
              <Input
                type="number"
                min={1}
                value={editPriority}
                onChange={(e) => setEditPriority(parseInt(e.target.value) || 1)}
                className="text-xs font-mono"
              />
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5 p-3 rounded-lg border border-primary/20 bg-primary/5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>Languages Handled *</span>
                <span className="text-[10px] text-muted-foreground">Click to toggle</span>
              </Label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = editLanguages.includes(lang.code);
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        if (isSelected) {
                          if (editLanguages.length > 1) {
                            setEditLanguages(editLanguages.filter((l) => l !== lang.code));
                          }
                        } else {
                          setEditLanguages([...editLanguages, lang.code]);
                        }
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs flex items-center gap-1.5 border transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary font-semibold shadow-2xs"
                          : "bg-background text-muted-foreground border-border hover:bg-muted"
                      }`}
                    >
                      <span>{lang.flag}</span>
                      <span>{lang.native}</span>
                      <span className="text-[10px] opacity-80">({lang.label})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5 p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
              <Label className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp Mobile Number *
              </Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="e.g. 919876543210"
                className="text-xs bg-background font-mono font-medium"
              />
              <p className="text-[11px] text-muted-foreground">
                WhatsApp leads assigned to this executive will be delivered directly to this number.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingExec(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!config || !editingExec) return;
                if (!editName.trim() || !editPhone.trim()) {
                  toast.error("Please enter both Executive Name and WhatsApp Number");
                  return;
                }

                const cleanPhone = editPhone.replace(/\D/g, "");
                if (cleanPhone.length < 10) {
                  toast.error("Please enter a valid 10+ digit WhatsApp number");
                  return;
                }

                const updatedExecs = config.executives.map((e) =>
                  e.id === editingExec.id
                    ? {
                        ...e,
                        name: editName.trim().toUpperCase(),
                        tamilName: editTamilName.trim() || undefined,
                        phone: cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
                        languages: editLanguages,
                        priority: editPriority,
                      }
                    : e
                );

                handleSaveConfig({ executives: updatedExecs });
                setEditingExec(null);
              }}
              disabled={saving}
              className="gap-1.5"
            >
              <Check className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: Edit Management Alert Number */}
      <Dialog open={!!editingAdmin} onOpenChange={(open) => !open && setEditingAdmin(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              Edit Management Alert Number (MD Sir)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update recipient name or WhatsApp mobile number for management alerts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Management Name / Role *</Label>
              <Input
                placeholder="e.g. MD Sir / Sales Director"
                value={editAdminName}
                onChange={(e) => setEditAdminName(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <Label className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                WhatsApp Mobile Number *
              </Label>
              <Input
                value={editAdminPhone}
                onChange={(e) => setEditAdminPhone(e.target.value)}
                placeholder="e.g. 919994440905"
                className="text-xs bg-background font-mono font-medium"
              />
              <p className="text-[11px] text-muted-foreground">
                Real-time lead summary alerts will be sent directly to this WhatsApp number.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditingAdmin(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!config || !editingAdmin) return;
                if (!editAdminName.trim() || !editAdminPhone.trim()) {
                  toast.error("Please enter both Name and WhatsApp Number");
                  return;
                }

                const cleanPhone = editAdminPhone.replace(/\D/g, "");
                if (cleanPhone.length < 10) {
                  toast.error("Please enter a valid 10+ digit WhatsApp number");
                  return;
                }

                const updatedAdmins = config.adminRecipients.map((a) =>
                  a.id === editingAdmin.id
                    ? {
                        ...a,
                        name: editAdminName.trim(),
                        phone: cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
                      }
                    : a
                );

                handleSaveConfig({ adminRecipients: updatedAdmins });
                setEditingAdmin(null);
              }}
              disabled={saving}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Check className="h-4 w-4" />
              Save Admin Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
