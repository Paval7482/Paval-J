"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Edit3,
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
import type { AccountRole } from "@/lib/auth/roles";

interface Member {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: AccountRole;
  joined_at: string;
  phone?: string | null;
}

interface EditMemberDialogProps {
  member: Member | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

interface UpdatedUserResult {
  fullName: string;
  email: string;
  password?: string;
  phone: string;
  role: AccountRole;
}

export function EditMemberDialog({
  member,
  open,
  onOpenChange,
  onUpdated,
}: EditMemberDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<AccountRole>("agent");
  const [submitting, setSubmitting] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [result, setResult] = useState<UpdatedUserResult | null>(null);
  const [copied, setCopied] = useState(false);

  // When member prop changes or dialog opens, initialize form
  useEffect(() => {
    if (member && open) {
      setFullName(member.full_name || "");
      setEmail(member.email || "");
      setRole(member.role || "agent");
      setPassword("");
      setShowPassword(false);
      setResult(null);
      setCopied(false);

      // Fetch fresh details including phone
      setFetchingDetails(true);
      fetch(`/api/account/members/${member.user_id}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.member) {
            if (data.member.full_name) setFullName(data.member.full_name);
            if (data.member.email) setEmail(data.member.email);
            if (data.member.role) setRole(data.member.role);
            if (data.member.phone) setPhone(data.member.phone);
          }
        })
        .catch(() => {})
        .finally(() => {
          setFetchingDetails(false);
        });
    }
  }, [member, open]);

  function generateRandomPassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(pass);
    setShowPassword(true);
  }

  function handleClose() {
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setSubmitting(false);
    setResult(null);
    setCopied(false);
    onOpenChange(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!member) return;

    if (!fullName.trim()) {
      toast.error("Full name is required");
      return;
    }

    if (!email.trim()) {
      toast.error("Username or email is required");
      return;
    }

    if (password && password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/account/members/${member.user_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          role,
          phone: phone.trim() || undefined,
          password: password ? password.trim() : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update member");
      }

      toast.success("Team member updated successfully! ✅");
      onUpdated();

      if (password) {
        // If password was changed, show credentials result card
        setResult({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password: password.trim(),
          phone: phone.trim(),
          role,
        });
      } else {
        handleClose();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update member");
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
    : email.endsWith("@srilakshmiindustries.co.in")
    ? email.replace("@srilakshmiindustries.co.in", "")
    : email;

  const waShareText = result
    ? `*Your Sri Lakshmi Industries CRM Login Details have been updated!* 🔐\n━━━━━━━━━━━━━━━━━━━━━━\n👤 *Name:* ${result.fullName}\n👑 *Role:* ${
        result.role === "admin"
          ? "Admin / Manager"
          : result.role === "agent"
          ? "Sales Executive"
          : "Viewer"
      }\n\n🌐 *Login Portal:* ${loginUrl}\n👤 *Username / Login ID:* ${displayUsername}${
        result.password ? `\n🔑 *New Password:* ${result.password}` : ""
      }\n━━━━━━━━━━━━━━━━━━━━━━\n👉 Please log in to manage your WhatsApp leads.`
    : "";

  const cleanSharePhone = (result?.phone || phone)?.replace(/[^0-9]/g, "") || "";
  const waShareUrl = cleanSharePhone
    ? `https://wa.me/${cleanSharePhone.length === 10 ? "91" + cleanSharePhone : cleanSharePhone}?text=${encodeURIComponent(
        waShareText,
      )}`
    : `https://wa.me/?text=${encodeURIComponent(waShareText)}`;

  const isOwner = member?.role === "owner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {!result ? (
          <form onSubmit={handleSave} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                <Edit3 className="h-5 w-5 text-primary" />
                Edit Team Member & Password
              </DialogTitle>
              <DialogDescription>
                Update profile details, role, or reset password for {member?.full_name || "member"}.
              </DialogDescription>
            </DialogHeader>

            {fetchingDetails && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Loading latest details...
              </div>
            )}

            <div className="space-y-3 py-1">
              <div className="space-y-1">
                <Label htmlFor="edit_full_name" className="text-xs font-semibold">
                  Full Name *
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit_full_name"
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
                  <Label htmlFor="edit_email" className="text-xs font-semibold">
                    Username / Login ID *
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit_email"
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
                  <Label htmlFor="edit_phone" className="text-xs font-semibold">
                    WhatsApp Phone Number
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="edit_phone"
                      type="tel"
                      placeholder="9994440905"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Password Change / Reset */}
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit_password" className="text-xs font-semibold flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5 text-primary" />
                    Change / Reset Password
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                    onClick={generateRandomPassword}
                  >
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate New
                  </Button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="edit_password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Leave blank to keep unchanged"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 pr-9 bg-background"
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
                <p className="text-[11px] text-muted-foreground">
                  Leave this field empty if you do not wish to change their password.
                </p>
              </div>

              {/* Role selection */}
              {!isOwner && (
                <div className="space-y-2 pt-1">
                  <Label className="text-xs font-semibold">
                    Account Role
                  </Label>
                  <RadioGroup
                    value={role}
                    onValueChange={(v) => setRole(v as AccountRole)}
                    className="grid grid-cols-1 gap-2"
                  >
                    <label
                      htmlFor="edit-role-agent"
                      className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        role === "agent"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value="agent" id="edit-role-agent" className="mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-xs text-foreground">
                          🎯 Sales Executive (Agent)
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Can chat, receive assigned leads, and update lead pipeline stages.
                        </p>
                      </div>
                    </label>

                    <label
                      htmlFor="edit-role-admin"
                      className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                        role === "admin"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <RadioGroupItem value="admin" id="edit-role-admin" className="mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold text-xs text-foreground">
                          👑 Admin / Sales Manager
                        </span>
                        <p className="text-[11px] text-muted-foreground">
                          Full management access to all chats, team members, and settings.
                        </p>
                      </div>
                    </label>
                  </RadioGroup>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-primary text-primary-foreground"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  "Save Changes"
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
                Password & Details Updated! 🎉
              </DialogTitle>
              <DialogDescription className="text-center">
                Share these updated credentials with {result.fullName}.
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
              {result.password && (
                <div className="flex items-center justify-between text-xs border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2">
                  <span className="text-muted-foreground">New Password:</span>
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-background/80 px-2 py-0.5 rounded">
                    {result.password}
                  </span>
                </div>
              )}
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
                  toast.success("Updated credentials copied! 📋");
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
                onClick={handleClose}
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
