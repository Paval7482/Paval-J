"use client";

import { useState } from "react";
import {
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  Send,
  Loader2,
  ShieldCheck,
  Layers,
  ArrowRight,
  Globe,
  Radio,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export function MetaLeadsPanel() {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [testingTamil, setTestingTamil] = useState(false);
  const [testingHindi, setTestingHindi] = useState(false);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/integrations/meta-leads`
      : "https://sli-crm-rho.vercel.app/api/integrations/meta-leads";

  const verifyToken = "sli_meta_leads_2026";

  const handleCopy = (text: string, isToken = false) => {
    navigator.clipboard.writeText(text);
    if (isToken) {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
    toast.success("Copied to clipboard!");
  };

  const handleSimulateLead = async (lang: "tamil" | "hindi") => {
    const isT = lang === "tamil";
    if (isT) setTestingTamil(true);
    else setTestingHindi(true);

    try {
      const payload = isT
        ? {
            test: true,
            name: `Tamil Customer (Sample)`,
            phone: `+919840${Math.floor(100000 + Math.random() * 900000)}`,
            campaign: "murukku machine tamil 09\\09/2026",
            formName: "Tamil Murukku Machine Instant Form",
            state: "Tamil Nadu",
            district: "Coimbatore",
            businessType: "Murukku Business",
            capacity: "100 - 200 Kg/Day",
            customAnswers: {
              "Machine Model": "Semi-Automatic Murukku Machine",
              "Plan to start": "Within 2 weeks",
            },
          }
        : {
            test: true,
            name: `Hindi Customer (Sample)`,
            phone: `+919810${Math.floor(100000 + Math.random() * 900000)}`,
            campaign: "Hindi update Campaign10/09/2026",
            formName: "Hindi Murukku Machine Instant Form",
            state: "Uttar Pradesh",
            district: "Varanasi",
            businessType: "Namkeen / Murukku",
            capacity: "200 - 500 Kg/Day",
            customAnswers: {
              "Machine Requirement": "Automatic Murukku Machine",
              "Delivery Timeline": "Immediate",
            },
          };

      const res = await fetch("/api/integrations/meta-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        toast.success(
          `🎉 ${isT ? "Tamil" : "Hindi"} Meta Lead created in Pipeline (${data.lead?.assignedExecutive || "Executive"})!`,
        );
      } else {
        toast.error("Failed to simulate lead: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      toast.error("Failed to connect to webhook API");
    } finally {
      if (isT) setTestingTamil(false);
      else setTestingHindi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">
              Meta Lead Ads Integration (Tamil & Hindi Campaigns)
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time webhook sync for Facebook & Instagram Instant Forms with automatic language routing.
            </p>
          </div>
        </div>
      </div>

      {/* Webhook Configuration Cards */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Meta Webhook Credentials
          </h3>
          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
            Active & Ready
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-1">
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Webhook Callback URL
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                readOnly
                value={webhookUrl}
                className="bg-muted font-mono text-xs text-foreground"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(webhookUrl)}
                className="shrink-0 gap-1.5"
              >
                {copiedUrl ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copiedUrl ? "Copied" : "Copy URL"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Paste this in <strong>Meta Developers Console &rarr; Webhooks &rarr; Page &rarr; Leadgen</strong>.
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Verify Token
            </Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                readOnly
                value={verifyToken}
                className="bg-muted font-mono text-xs text-foreground"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(verifyToken, true)}
                className="shrink-0 gap-1.5"
              >
                {copiedToken ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {copiedToken ? "Copied" : "Copy Token"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Active Campaigns & Language Routing */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          Active Campaigns & Smart Language Routing
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Tamil Campaign */}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                📥 Tamil Campaign
              </span>
              <Badge className="bg-blue-500/20 text-blue-600 border-0 text-[10px]">
                murukku machine tamil
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Form submit aana udane Tamil pesura executives-ku (Nallakaman, Bala, Satheesh, Subash, Baskar) auto-assign aagi Tamil welcome alert pogum.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={testingTamil}
                onClick={() => handleSimulateLead("tamil")}
                className="w-full text-xs gap-1.5 border-blue-500/30 hover:bg-blue-500/10 text-blue-600 dark:text-blue-400"
              >
                {testingTamil ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Simulate Tamil Test Lead
              </Button>
            </div>
          </div>

          {/* Hindi Campaign */}
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                📥 Hindi Campaign
              </span>
              <Badge className="bg-amber-500/20 text-amber-600 border-0 text-[10px]">
                Hindi update Campaign
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Form submit aana udane Hindi team executives-ku (Paval J, RK Prasad, Karthick, MD Sir) auto-assign aagi Hindi welcome alert pogum.
            </p>
            <div className="pt-2">
              <Button
                size="sm"
                variant="outline"
                disabled={testingHindi}
                onClick={() => handleSimulateLead("hindi")}
                className="w-full text-xs gap-1.5 border-amber-500/30 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400"
              >
                {testingHindi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Simulate Hindi Test Lead
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
