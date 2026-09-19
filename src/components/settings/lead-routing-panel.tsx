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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { LeadRoutingConfig, SalesExecutive, AdminRecipient } from "@/lib/whatsapp/lead-alert";

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

export function LeadRoutingPanel() {
  const [config, setConfig] = useState<LeadRoutingConfig | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  // Add Executive Dialog State
  const [showAddExec, setShowAddExec] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [execName, setExecName] = useState("");
  const [execTamilName, setExecTamilName] = useState("");
  const [execPhone, setExecPhone] = useState("");
  const [execUserId, setExecUserId] = useState<string>("");
  const [execProfileId, setExecProfileId] = useState<string>("");

  // Edit Executive Dialog State
  const [editingExec, setEditingExec] = useState<SalesExecutive | null>(null);
  const [editName, setEditName] = useState("");
  const [editTamilName, setEditTamilName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  // Admin numbers state
  const [adminName, setAdminName] = useState("");
  const [adminPhone, setAdminPhone] = useState("");

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/lead-routing");
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
        setTeamMembers(data.teamMembers || []);
      }
    } catch {
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
              Automatically assigns incoming WhatsApp and Meta leads across active Sales Executives equally, sends urgent action alerts to Executive WhatsApp, and delivers management tracking summaries to MD Sir.
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
              Customer sends WhatsApp message or submits Meta Lead Form.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/70 p-3.5 text-xs flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-amber-500 font-semibold mb-1">
              <RotateCcw className="h-4 w-4" />
              <span>2. Round-Robin Router</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Rotates across <b>{activeExecsCount} Active Executives</b> with auto-skip for offline members.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/70 p-3.5 text-xs flex flex-col justify-between shadow-xs">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-1">
              <Zap className="h-4 w-4" />
              <span>3. Executive WhatsApp Alert</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Lead assigned in CRM + WhatsApp alert sent to Executive with 1-click Call link.
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

      {/* Section 1: Sales Executives Pool (Round-Robin Roster) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <UsersRound className="h-5 w-5 text-primary" />
                Sales Executives Pool (Round-Robin Roster)
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {activeExecsCount} Active / {config.executives.length} Total
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Leads are rotated sequentially through active executives. Click <b>Edit</b> to update their WhatsApp number or toggle <b>Active / On Leave</b> to skip them automatically.
            </CardDescription>
          </div>

          <Button size="sm" onClick={() => setShowAddExec(true)} className="gap-1.5 shadow-xs">
            <Plus className="h-4 w-4" />
            Add Sales Executive
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.executives.map((exec) => (
              <div
                key={exec.id}
                className={`relative flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                  exec.active
                    ? "border-border bg-card hover:border-primary/40 shadow-xs"
                    : "border-border/50 bg-muted/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
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
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{exec.name}</span>
                      {exec.tamilName && (
                        <span className="text-xs text-muted-foreground font-medium">({exec.tamilName})</span>
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
                      <span>{exec.role || "Sales Executive"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Edit Executive Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => handleOpenEditExec(exec)}
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
                    title={exec.active ? "Set On Leave (Skip in Round-Robin)" : "Set Active"}
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Management & Admin Notification Numbers (MD Sir) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
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
              Select an active CRM executive from the dropdown. Their details will auto-fill, and you can edit their WhatsApp number.
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

            {/* 4. WhatsApp Number (Fully Editable) */}
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
                ⚡ <b>Leads will be assigned & forwarded directly to this WhatsApp number</b>. You can change or edit this number anytime.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowAddExec(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAddExecutive} disabled={saving} className="gap-1.5">
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
              Edit Executive Details & WhatsApp Number
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update name, Tamil translation, or WhatsApp alert forwarding number for <b>{editingExec?.name}</b>.
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
            <Button size="sm" onClick={handleSaveEditExec} disabled={saving} className="gap-1.5">
              <Check className="h-4 w-4" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
