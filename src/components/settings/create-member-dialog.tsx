"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
  UserPlus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CreateMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

type AccountRole = "admin" | "agent" | "viewer";

interface CreatedUserResult {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  role: AccountRole;
}

export function CreateMemberDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateMemberDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AccountRole>("agent");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CreatedUserResult | null>(null);
  const [copied, setCopied] = useState(false);

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
  }

  function handleReset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setRole("agent");
    setSubmitting(false);
    setResult(null);
    setCopied(false);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/account/members/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          role,
          phone: phone.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      toast.success("Executive created successfully! 🎉");
      setResult({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim(),
        role,
      });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setSubmitting(false);
    }
  }

  const loginUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : "https://sli-crm-rho.vercel.app/login";

  const displayUsername = result
    ? result.email.endsWith("@srilakshmiindustries.co.in")
      ? result.email.replace("@srilakshmiindustries.co.in", "")
      : result.email
    : "";

  const waShareText = result
    ? `*Welcome to Sri Lakshmi Industries CRM!* 🎉\n━━━━━━━━━━━━━━━━━━━━━━\n👤 *Name:* ${result.fullName}\n👑 *Role:* ${
        result.role === "admin"
          ? "Admin / Manager"
          : result.role === "agent"
          ? "Sales Executive"
          : "Viewer"
      }\n\n🌐 *Login Portal:* ${loginUrl}\n👤 *Username / Login ID:* ${displayUsername}\n🔑 *Password:* ${result.password}\n━━━━━━━━━━━━━━━━━━━━━━\n👉 Please log in and manage your assigned leads.`
    : "";

  const cleanSharePhone = result?.phone?.replace(/[^0-9]/g, "") || "";
  const waShareUrl = cleanSharePhone
    ? `https://wa.me/${cleanSharePhone.length === 10 ? "91" + cleanSharePhone : cleanSharePhone}?text=${encodeURIComponent(
        waShareText,
      )}`
    : `https://wa.me/?text=${encodeURIComponent(waShareText)}`;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleReset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {!result ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <UserPlus className="h-5 w-5 text-emerald-600" />
                Add New Sales Executive / Member
              </DialogTitle>
              <DialogDescription>
                Directly create login credentials for your sales team member.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="full_name" className="text-xs font-semibold">
                  Executive Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="full_name"
                    placeholder="e.g. Karthik (Tamil Sales)"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs font-semibold">
                    Username / Login ID *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="text"
                      placeholder="e.g. karthick or karthick@sli.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      autoCapitalize="none"
                      autoCorrect="off"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    WhatsApp Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="9994440905"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Login Password *
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-emerald-600 hover:text-emerald-700"
                    onClick={generateRandomPassword}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate
                  </Button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Set 6+ char password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold">
                  Role & Responsibilities
                </Label>
                <RadioGroup
                  value={role}
                  onValueChange={(v) => setRole(v as AccountRole)}
                  className="grid grid-cols-1 gap-2"
                >
                  <label
                    htmlFor="role-agent"
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      role === "agent"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="agent" id="role-agent" className="mt-1" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          🎯 Sales Executive (Agent)
                        </span>
                        <Badge variant="outline" className="text-xs font-normal">
                          Recommended
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Handles assigned WhatsApp chats, incoming call leads, moves pipeline stages (Enquiry ➡️ Booking).
                      </p>
                    </div>
                  </label>

                  <label
                    htmlFor="role-admin"
                    className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                      role === "admin"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <RadioGroupItem value="admin" id="role-admin" className="mt-1" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          👑 Admin / Sales Manager
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Full access to all leads, chat histories, member management, and CRM configurations.
                      </p>
                    </div>
                  </label>
                </RadioGroup>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating User...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Executive
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4 py-2">
            <DialogHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-2">
                <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <DialogTitle className="text-center text-xl font-bold">
                Executive Created Successfully! 🎉
              </DialogTitle>
              <DialogDescription className="text-center">
                Share these credentials with {result.fullName} so they can log in.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/60 dark:bg-emerald-950/30 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
                <span className="text-muted-foreground">Login URL:</span>
                <span className="font-mono font-semibold text-emerald-900 dark:text-emerald-200 truncate max-w-[240px]">
                  {loginUrl}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
                <span className="text-muted-foreground">Username / Login ID:</span>
                <span className="font-mono font-semibold text-foreground">
                  {displayUsername}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
                <span className="text-muted-foreground">Password:</span>
                <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-background/80 px-2 py-0.5 rounded">
                  {result.password}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Role:</span>
                <Badge variant="secondary" className="capitalize font-medium">
                  {result.role === "agent" ? "Sales Executive" : result.role}
                </Badge>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  navigator.clipboard.writeText(waShareText);
                  setCopied(true);
                  toast.success("Credentials copied to clipboard! 📋");
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? (
                  <Check className="mr-2 h-4 w-4 text-emerald-600" />
                ) : (
                  <Copy className="mr-2 h-4 w-4" />
                )}
                {copied ? "Copied!" : "Copy Details"}
              </Button>

              <Button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => window.open(waShareUrl, "_blank", "noopener,noreferrer")}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Send via WhatsApp
              </Button>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  handleReset();
                  onOpenChange(false);
                }}
              >
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
