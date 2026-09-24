'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import {
  ArrowLeftRight,
  Check,
  Copy,
  Download,
  Info,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Zap,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { SettingsPanelHead } from './settings-panel-head';

interface ExecutiveSyncConfig {
  id: string;
  name: string;
  phone: string;
  userId: string;
  profileId?: string;
  syncMode: 'leads_only' | 'all';
  passKey: string;
  lastSyncAt: string | null;
  syncedMessagesCount: number;
  active: boolean;
}

export function WhatsAppChatSyncPanel() {
  const [configs, setConfigs] = useState<ExecutiveSyncConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/whatsapp-sync');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && Array.isArray(json.data)) {
          setConfigs(json.data);
        }
      }
    } catch (e) {
      console.error('[WhatsAppChatSync] Error loading configs:', e);
      toast.error('Failed to load WhatsApp Chat Sync settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  const copyPassKey = (id: string, passKey: string, name: string) => {
    navigator.clipboard.writeText(passKey);
    setCopiedId(id);
    toast.success(`Pass Key copied for ${name}! Paste this in the SLI WhatsApp Extension.`);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleUpdate = async (id: string, updates: Partial<ExecutiveSyncConfig>) => {
    setSavingId(id);
    setConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
    );

    try {
      const res = await fetch('/api/settings/whatsapp-sync', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!res.ok) {
        toast.error('Failed to save settings');
        loadConfigs();
      } else {
        toast.success('Sync settings updated successfully');
      }
    } catch (e) {
      toast.error('Network error while saving settings');
      loadConfigs();
    } finally {
      setSavingId(null);
    }
  };

  const handleRegenerateKey = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/settings/whatsapp-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'REGENERATE_PASSKEY' }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          setConfigs((prev) =>
            prev.map((c) => (c.id === id ? json.data : c))
          );
          toast.success(`Generated new Pass Key for ${name}`);
        }
      }
    } catch (e) {
      toast.error('Failed to regenerate pass key');
    }
  };

  const fmtLastSync = (iso: string | null) => {
    if (!iso) return 'Never synced';
    const date = new Date(iso);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-200">
      <SettingsPanelHead
        title="WhatsApp Chat Sync (TeleCRM Architecture)"
        description="Connect sales executive WhatsApp Web accounts to SLI CRM for real-time customer conversation logging and lead tracking."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={loadConfigs}
            className="border-border text-foreground hover:bg-muted"
          >
            <RefreshCw className="size-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Highlights & Security Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-emerald-500/10 border-emerald-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="size-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                100% Anti-Ban Guarantee
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Uses client-side read-only DOM syncing. No bot scripts or bulk messaging risks.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/10 border-blue-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <Zap className="size-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                Real-Time Auto Sync
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Messages sync automatically to CRM Inbox & Customer Timeline while executives chat.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="p-4 flex items-start gap-3">
            <KeyRound className="size-5 text-purple-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                1-Click Pass Key Setup
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                Executives just copy their Pass Key once into WhatsApp Web extension.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3-Step Setup Instructions */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            How Sales Executives Connect
          </CardTitle>
          <CardDescription>
            Simple 3-step setup for every sales executive:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              1
            </span>
            <span>
              Install or load the <strong>SLI WhatsApp Chrome Extension</strong> on the executive&apos;s computer.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              2
            </span>
            <span>
              Copy the executive&apos;s <strong>Extension Pass Key</strong> from the table below.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-bold">
              3
            </span>
            <span>
              Open <strong>web.whatsapp.com</strong>, paste the Pass Key in the SLI sidebar, and turn <strong>Auto Sync [ON]</strong>!
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Executive Sync Management Table */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-600" />
              Executive WhatsApp Sync Roster
            </div>
            <Badge variant="outline" className="text-xs">
              {configs.filter((c) => c.active).length} Active Executives
            </Badge>
          </CardTitle>
          <CardDescription>
            Manage WhatsApp phone numbers, sync modes, and extension pass keys for all sales executives.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-y border-border text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Executive</th>
                  <th className="px-4 py-3">WhatsApp Number</th>
                  <th className="px-4 py-3">Sync Mode</th>
                  <th className="px-4 py-3">Extension Pass Key</th>
                  <th className="px-4 py-3">Last Sync / Total</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {configs.map((exec) => {
                  const isCopied = copiedId === exec.id;
                  const isSaving = savingId === exec.id;

                  return (
                    <tr key={exec.id} className="hover:bg-muted/30 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-emerald-600/10 text-emerald-600 font-semibold text-xs">
                              {exec.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold text-foreground flex items-center gap-1.5">
                              {exec.name}
                            </div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {exec.userId ? `ID: ${exec.userId.slice(0, 8)}...` : ''}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* WhatsApp Phone */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground font-mono">+</span>
                          <Input
                            defaultValue={exec.phone}
                            onBlur={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              if (val && val !== exec.phone) {
                                handleUpdate(exec.id, { phone: val });
                              }
                            }}
                            className="w-36 h-8 text-xs font-mono bg-background"
                            placeholder="919786390479"
                          />
                        </div>
                      </td>

                      {/* Sync Mode */}
                      <td className="px-4 py-3.5">
                        <Select
                          value={exec.syncMode}
                          onValueChange={(val) => {
                            if (val === 'leads_only' || val === 'all') {
                              handleUpdate(exec.id, { syncMode: val });
                            }
                          }}
                        >
                          <SelectTrigger className="w-44 h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="leads_only">
                              <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                Sync CRM Leads Only
                              </span>
                            </SelectItem>
                            <SelectItem value="all">
                              <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-blue-500" />
                                Sync All Chats
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Extension Pass Key */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <code className="px-2 py-1 bg-muted rounded text-[11px] font-mono text-muted-foreground max-w-[170px] truncate select-all">
                            {exec.passKey}
                          </code>
                          <Button
                            variant="outline"
                            size="icon"
                            className="size-7 shrink-0"
                            onClick={() => copyPassKey(exec.id, exec.passKey, exec.name)}
                            title="Copy Pass Key"
                          >
                            {isCopied ? (
                              <Check className="size-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="size-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => handleRegenerateKey(exec.id, exec.name)}
                            title="Regenerate Pass Key"
                          >
                            <RefreshCw className="size-3" />
                          </Button>
                        </div>
                      </td>

                      {/* Last Sync / Synced Count */}
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="text-xs font-medium text-foreground">
                            {fmtLastSync(exec.lastSyncAt)}
                          </div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] font-mono">
                              {exec.syncedMessagesCount || 0} msgs
                            </Badge>
                          </div>
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSaving && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                          <Switch
                            checked={exec.active}
                            onCheckedChange={(checked) =>
                              handleUpdate(exec.id, { active: checked })
                            }
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
