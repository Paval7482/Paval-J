"use client";
import { useState, useEffect } from "react";
import { Workflow, Plus, Trash2, CheckCircle2, Phone, User, Send, Loader2, Sparkles, UsersRound, RotateCcw, Zap, Clock, MessageSquare, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { LeadRoutingConfig, SalesExecutive, AdminRecipient } from "@/lib/whatsapp/lead-alert";

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
}

export function LeadRoutingPanel() {
  const [config, setConfig] = useState<LeadRoutingConfig | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const [showAddExec, setShowAddExec] = useState(false);
  const [execName, setExecName] = useState("");
  const [execTamilName, setExecTamilName] = useState("");
  const [execPhone, setExecPhone] = useState("");
  const [execUserId, setExecUserId] = useState<string>("");

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

    const matchedMember = teamMembers.find((m) => m.user_id === execUserId);

    const newExec: SalesExecutive = {
      id: `exec-${Date.now()}`,
      name: execName.trim().toUpperCase(),
      tamilName: execTamilName.trim() || undefined,
      phone:
 cleanPhone.startsWith("91") ? cleanPhone : `91${cleanPhone}`,
      user_id: execUserId || undefined,
      profile_id: matchedMember?.id || undefined,
      active: true,
      role: "Sales Executive",
    };

    const updatedExecs = [...config.executives, newExec];
    handleSaveConfig({ executives: updatedExecs });

    setExecName("");
    setExecTamilName("");
    setExecPhone("");
    setExecUserId("");
    setShowAddExec(false);
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

  const handleSendTest = async (type: "executive" | "admin" | "full", targetId?: string, phone ?: string) => {
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
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-background to-amber-500/5 p-6">
        <div className="flex flex-col md-flex-row md-items-center md:justify-between gap-4">
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
              Automatically assigns incoming WhatsApp and Meta leads across active Sales Executives equally, sends urgent action alerts to Executive WhatsApp, and delivers management summaries to MD Sir.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendTest("full")}
              disabled={testingId === "full"}
              className="border-primary/30 hover:bg-primary/10"
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

        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card/60 p-3 text-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-primary font-semibold mb-1">
              <MessageSquare className="h-4 w-4" />
              <span>1. Inbound Ingestion</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Customer sends WhatsApp enquiry or submits Meta Ad Form.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-3 text-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-amber-500 font-semibold mb-1">
              <RotateCcw className="h-4 w-4" />
              <span>2. Round-Robin Router</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Rotates across <b>{activeExecsCount} Active Executives</b> with auto-skip for offline members.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-3 text-xs flex flex-col justify-between">
            <div className="flex items-center gap-2 text-emerald-500 font-semibold mb-1">
              <Zap className="h-4 w-4" />
              <span>3. Executive Alert & Deal</span>
            </div>
            <p className="text-muted-foreground text-[11px]">
              Inbox conversation assigned + Bilingual WhatsApp Alert sent with 1-click Call/Chat link.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card/60 p-3 text-xs flex flex-col justify-between">
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
              Leads are rotated sequentially through active executives. Toggle an executive OFF when they are on leave to skip them automatically.
            </CardDescription>
          </div>

          <Button size="sm" onClick={() => setShowAddExec(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Sales Executive
          </Button>
        </CardHeader>


        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md-grid-cols-2 gap-3">
            {config.executives.map((exec) => (
              <div
                key={exec.id}
                className={`relative flex items-center justify-between p-3.5 rounded-lg border transition-all ${
                  exec.active
                    ? "border-border bg-card hover:border-primary/40"
                    : "border-border/50 bg-muted/40 opacity-70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${exec.active ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground border border-border"}`}>{exec.name.charAt(0)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{exec.name}</span>
                      {exec.tamilName && (
                        <span className="text-xs text-muted-foreground font-medium">({exec.tamilName})</span>
                      )}
                      {exec.active ? (
                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0 px-1.5 h-4">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0 px-1.5 h-4">On Leave</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <a href={`dttps://wa.me/${exec.phone}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
                        <Phone className="h-3 w-3 text-emerald-500" />
                        +{exec.phone}
                      </a>
                      <span className="text-border">•</span>
                      <span>{exec.role || "Sales Executive"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
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


                  <div className="flex items-center gap-1">
                    <Switch
                      checked={exec.active}
                      onCheckedChange={() => handleToggleExecActive(exec.id, exec.active)}
                      title={exec.active ? "Set On Leave" : "Activate"}
                    />
                  </div>


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
          <div className="grid grid-cols-1 md-grid-cols-2 gap-3">
            {config.adminRecipients.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center font-bold text-sm">
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
                      <Phone className="h-3 w-3 text-emerald-500" />
                      +{admin.phone}
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


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Response SLA & Delivery Rules
          </CardTitle>
          <CardDescription className="text-xs">
            Fine-tune dispatch rules, urgency SLA timer, and notifications.
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


      <Dialog open={showAddExec} onOpenChange={setShowAddExec}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Add Sales Executive to Round-Robin
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a new sales team member who will receive assigned customer leads.
            </DialogDescription>
          </DialogHeader>


          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Executive Name (English) *</Label>
              <Input
                placeholder="e.g. SATHEESH"
                value={execName}
                onChange={(e) => setExecName(e.target.value)}
                className="text-xs uppercase"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Tamil Name (Optional)</Label>
              <Input
                placeholder="e.g. மधী෵"
                value={execTamilName}
                onChange={(e) => setExecTamilName(e.target.value)}
                className="text-xs"
              />
            </div>


            <div className="space-y-1">
              <Label className="text-xs">WhatsApp Mobile Number *</Label>
              <Input
                placeholder="e.g. 919876543210 (with country code)"
                value={execPhone}
                onChange={(e) => setExecPhone(e.target.value)}
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Alerts will be delivered directly to this WhatsApp number.
              </p>
            </div>

            {teamMembers.length > 0 && (
              <div className="space-y-1">
                <Label className="text-xs">Link to CRM User Account (Optional)</Label>
                <Select value={execUserId} onValueChange={(val) => setExecUserId(val || "")}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select team member account" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.user_id} value={member.user_id} className="text-xs">
                        {member.full_name} ({member.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
    </div>
  );
}
