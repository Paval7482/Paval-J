"use client";

import { useState, useEffect } from "react";
import {
  Clock,
  Send,
  Plus,
  Trash2,
  CheckCircle2,
  Phone,
  User,
  Globe,
  BellRing,
  Sparkles,
  ExternalLink,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { DailyReportConfig, ReportRecipient } from "@/lib/reports/daily-config";

export function DailyReportSettings() {
  const [config, setConfig] = useState<DailyReportConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  // Time state
  const [timeInput, setTimeInput] = useState("18:05");

  // New recipient form
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newLang, setNewLang] = useState<"ta" | "en">("ta");

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reports/daily-settings");
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
        setTimeInput(data.config.triggerTime || "18:05");
      }
    } catch (err) {
      toast.error("Failed to load daily report settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (updated: Partial<DailyReportConfig>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/reports/daily-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.ok && data.config) {
        setConfig(data.config);
        setTimeInput(data.config.triggerTime || "18:05");
        toast.success("Settings saved successfully!");
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTime = () => {
    if (!timeInput) {
      toast.error("Please enter a valid time");
      return;
    }
    handleSave({ triggerTime: timeInput });
  };

  const handlePresetTime = (preset: string) => {
    setTimeInput(preset);
    handleSave({ triggerTime: preset });
  };

  const handleAddRecipient = () => {
    if (!newName.trim() || !newPhone.trim()) {
      toast.error("Please provide both Name and WhatsApp Phone Number");
      return;
    }

    const cleanPhone = newPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      toast.error("Please enter a valid 10-digit WhatsApp phone number");
      return;
    }

    const recipient: ReportRecipient = {
      id: "rec_" + Date.now(),
      name: newName.trim(),
      phone: cleanPhone.startsWith("91") ? cleanPhone : "91" + cleanPhone,
      language: newLang,
    };

    const newRecipients = [...(config?.recipients || []), recipient];
    handleSave({ recipients: newRecipients });
    setNewName("");
    setNewPhone("");
  };

  const handleRemoveRecipient = (id: string) => {
    const newRecipients = (config?.recipients || []).filter((r) => r.id !== id);
    handleSave({ recipients: newRecipients });
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      const res = await fetch("/api/reports/send-now", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        toast.success(`WhatsApp report link sent to ${data.sentCount} recipient(s)!`);
      } else {
        toast.error(data.error || "Failed to send report");
      }
    } catch (err: any) {
      toast.error(err.message || "Send failed");
    } finally {
      setSending(false);
    }
  };

  if (loading || !config) {
    return (
      <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
        Loading Daily Report settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border border-border bg-card p-5 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">
              Daily Executive Report Automation
            </h3>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs">
              <Sparkles className="h-3 w-3 mr-1" />
              {config.triggerTime} Trigger
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Automatically trigger interactive performance report link to MD Sir & management via WhatsApp
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <a
            href="/reports/daily"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            Preview Live Report
          </a>

          <Button
            onClick={handleSendNow}
            disabled={sending}
            size="sm"
            className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold hover:from-amber-600 hover:to-amber-700 shadow-sm"
          >
            <Send className={`h-3.5 w-3.5 ${sending ? 'animate-spin' : ''}`} />
            {sending ? "Sending..." : "Send Report Now"}
          </Button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Timing Card */}
        <div className="border border-border bg-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <h4 className="text-sm font-bold text-foreground">Trigger Schedule Time</h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{config.enabled ? "Active" : "Paused"}</span>
              <Switch
                checked={config.enabled}
                onCheckedChange={(checked) => handleSave({ enabled: checked })}
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="trigger-time" className="text-xs text-muted-foreground">
              Daily Execution Time (IST / 24-Hour Format)
            </Label>
            
            <div className="flex items-center gap-2.5">
              <Input
                id="trigger-time"
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="w-40 font-mono text-sm"
              />
              <Button
                onClick={handleSaveTime}
                disabled={saving}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-semibold border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              >
                <Save className="h-3.5 w-3.5" />
                Save Time
              </Button>
            </div>

            {/* Quick Presets */}
            <div className="pt-2 border-t border-border">
              <div className="text-[11px] text-muted-foreground mb-1.5">Quick Time Presets:</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { label: "6:05 PM", value: "18:05" },
                  { label: "6:30 PM", value: "18:30" },
                  { label: "7:00 PM", value: "19:00" },
                  { label: "8:00 PM", value: "20:00" },
                ].map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => handlePresetTime(p.value)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all border ${
                      config.triggerTime === p.value
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/40"
                        : "bg-muted text-muted-foreground border-transparent hover:text-foreground"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Add New Recipient Card */}
        <div className="border border-border bg-card p-5 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-amber-500" />
            <h4 className="text-sm font-bold text-foreground">Add Report Recipient</h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <Input
              placeholder="Name (e.g. MD Sir)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="text-xs"
            />
            <Input
              placeholder="WhatsApp No (e.g. 9994440905)"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              className="text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Language:</Label>
              <select
                value={newLang}
                onChange={(e) => setNewLang(e.target.value as any)}
                className="bg-muted border border-border text-xs rounded-md px-2 py-1"
              >
                <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
                <option value="en">🇬🇧 English</option>
              </select>
            </div>

            <Button
              onClick={handleAddRecipient}
              disabled={saving}
              size="sm"
              variant="secondary"
              className="gap-1.5 text-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Recipient
            </Button>
          </div>
        </div>
      </div>

      {/* Recipient List Table */}
      <div className="border border-border bg-card rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
              Configured Recipients ({config.recipients.length})
            </span>
          </div>
          <span className="text-[11px] text-muted-foreground">
            WhatsApp report link will be sent to all listed numbers
          </span>
        </div>

        <div className="divide-y divide-border">
          {config.recipients.map((r) => (
            <div key={r.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-all">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
                  {r.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-xs text-foreground">{r.name}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">+{r.phone}</div>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="text-[11px]">
                  {r.language === "ta" ? "🇮🇳 Tamil" : "🇬🇧 English"}
                </Badge>
                <Button
                  onClick={() => handleRemoveRecipient(r.id)}
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
