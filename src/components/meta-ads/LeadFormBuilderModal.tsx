"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import {
  FileText,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Plus,
  Trash2,
  X,
  MessageCircle,
  PhoneCall,
  Globe,
  Settings,
  Check,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import type { MetaLeadForm, MetaLeadFormQuestion } from "@/lib/meta-ads/lead-forms";

interface LeadFormBuilderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormCreated: (form: MetaLeadForm) => void;
  pageName?: string;
}

export function LeadFormBuilderModal({
  open,
  onOpenChange,
  onFormCreated,
  pageName = "Sri Lakshmi Industries Phase II",
}: LeadFormBuilderModalProps) {
  // Navigation tabs (1 to 5 matching Meta screenshots)
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [previewPlatform, setPreviewPlatform] = useState<"facebook" | "instagram">("facebook");
  const [previewStep, setPreviewStep] = useState<1 | 2 | 3 | 4>(1);
  const [saving, setSaving] = useState(false);

  // Step 1: Form Type
  const [formName, setFormName] = useState(`Murukku Inquiry Form ${new Date().toLocaleDateString("en-IN")}`);
  const [formType, setFormType] = useState<"MORE_VOLUME" | "HIGHER_INTENT" | "RICH_CREATIVE">("MORE_VOLUME");
  const [flexibleDelivery, setFlexibleDelivery] = useState(true);

  // Step 2: Intro
  const [hasBackgroundImage, setHasBackgroundImage] = useState(true);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("/assets/murukku_machine_hero.jpg");
  const [hasGreeting, setHasGreeting] = useState(true);
  const [introHeadline, setIntroHeadline] = useState("Sri Lakshmi Industries - Automatic Murukku Machines");
  const [introDescription, setIntroDescription] = useState(
    "Direct manufacturer ex-factory quotation for 30–50 kg/hr & 60-100 kg/hr SS 304 food-grade automatic extruders with pan-India transport and live video support."
  );

  // Step 3: Questions
  const [contactUsageNotice, setContactUsageNotice] = useState(
    "We use your details solely to send machine catalog, videos, and ex-factory quotation."
  );
  const [contactFields, setContactFields] = useState({
    full_name: true,
    phone_number: true,
    email: true,
    city: true,
    state: true,
  });
  const [customQuestions, setCustomQuestions] = useState<MetaLeadFormQuestion[]>([
    {
      id: "q_cap",
      type: "MULTIPLE_CHOICE",
      question: "Required Output Capacity",
      options: ["30–50 kg/hr Commercial", "60–100 kg/hr Heavy Industrial", "Complete Snack Plant"],
    },
  ]);

  // Step 4: Privacy Policy
  const [privacyPolicyUrl, setPrivacyPolicyUrl] = useState("https://srilakshmiindustrial.com/privacy-policy");
  const [privacyPolicyLinkText, setPrivacyPolicyLinkText] = useState("Visit Sri Lakshmi Industries Phase II Privacy Policy");

  // Step 5: Ending / Thank You Screen
  const [endingHeadline, setEndingHeadline] = useState("Thanks, you're all set.");
  const [endingDescription, setEndingDescription] = useState(
    "Our engineering team will contact you via WhatsApp / Call within 15 minutes with complete machine specs & quotation."
  );
  const [endingButtonType, setEndingButtonType] = useState<"WHATSAPP" | "CALL" | "WEBSITE">("WHATSAPP");
  const [endingButtonText, setEndingButtonText] = useState("Chat on WhatsApp");
  const [endingActionUrl, setEndingActionUrl] = useState("https://wa.me/919842266366?text=Hi%20Sri%20Lakshmi%20Industries%2C%20I%20requested%20a%20Murukku%20Machine%20quotation.");

  // 1-Click Sri Lakshmi Factory Murukku Preset
  const handleApplyPreset = () => {
    setFormName(`Sri Lakshmi Murukku Machine Inquiry Form - ${new Date().toLocaleDateString("en-IN")}`);
    setFormType("MORE_VOLUME");
    setIntroHeadline("Sri Lakshmi Industries - Patented Murukku Machinery");
    setIntroDescription(
      "High-speed 30–50 kg/hr food-grade SS 304 extruders with raw motor sound and zero dough wastage. Get instant video demo and price list."
    );
    setContactFields({
      full_name: true,
      phone_number: true,
      email: true,
      city: true,
      state: true,
    });
    setCustomQuestions([
      {
        id: "q_cap",
        type: "MULTIPLE_CHOICE",
        question: "Select Machine Capacity Needed",
        options: ["30–50 kg/hr (Single Die)", "60–100 kg/hr (Double Die)", "150+ kg/hr (Industrial Line)"],
      },
      {
        id: "q_business",
        type: "MULTIPLE_CHOICE",
        question: "Your Business Stage",
        options: ["Starting New Murukku Business", "Replacing Manual Press", "Factory Expansion"],
      },
    ]);
    setPrivacyPolicyUrl("https://srilakshmiindustrial.com/privacy-policy");
    setPrivacyPolicyLinkText("Visit Sri Lakshmi Industries Phase II Privacy Policy");
    setEndingHeadline("Thanks, you're all set!");
    setEndingDescription("Our technical team is reviewing your requirement and will share complete quotation & video on WhatsApp.");
    setEndingButtonType("WHATSAPP");
    setEndingButtonText("Chat on WhatsApp");
    setEndingActionUrl("https://wa.me/919842266366?text=Hi%20Sri%20Lakshmi%20Industries%2C%20I%20requested%20a%20Murukku%20Machine%20quotation.");
    toast.success("Loaded Sri Lakshmi Patented Murukku Machine Preset!");
  };

  // Add custom question
  const handleAddQuestion = () => {
    setCustomQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        type: "MULTIPLE_CHOICE",
        question: "Additional Requirement",
        options: ["Option 1", "Option 2"],
      },
    ]);
  };

  // Remove custom question
  const handleRemoveQuestion = (id: string) => {
    setCustomQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  // Create & Publish
  const handleCreateForm = async () => {
    if (!formName.trim()) {
      toast.error("Please enter a Form Name");
      setActiveStep(1);
      return;
    }
    if (!privacyPolicyUrl.trim()) {
      toast.error("Privacy Policy URL is required by Meta");
      setActiveStep(4);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: formName,
        form_type: formType,
        flexible_delivery: flexibleDelivery,
        intro: {
          enabled: hasGreeting,
          headline: introHeadline,
          description: introDescription,
          background_image: hasBackgroundImage ? backgroundImageUrl : undefined,
        },
        questions: {
          description: contactUsageNotice,
          contact_fields: contactFields,
          custom_questions: customQuestions,
        },
        privacy_policy: {
          url: privacyPolicyUrl,
          link_text: privacyPolicyLinkText,
        },
        ending: {
          headline: endingHeadline,
          description: endingDescription,
          button_type: endingButtonType,
          button_text: endingButtonText,
          action_url: endingActionUrl,
        },
      };

      const res = await fetch("/api/meta-ads/lead-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create Lead Form");
      }

      toast.success(
        data.meta_synced
          ? "🎉 Meta Instant Form Created & Published to Meta Page!"
          : "✅ Lead Form Saved in CRM & Ready for Ad Launch!"
      );
      onFormCreated(data.form);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create lead form");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!fixed !top-1/2 !left-1/2 !-translate-x-1/2 !-translate-y-1/2 !w-[96vw] !max-w-[1240px] !h-[92vh] !max-h-[92vh] flex flex-col p-0 overflow-hidden bg-background border-border shadow-2xl rounded-2xl z-50">
        {/* Top Header */}
        <DialogHeader className="p-3.5 px-5 border-b border-border/80 bg-muted/40 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold flex items-center gap-2">
                Create form
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  Meta Instant Form Builder
                </Badge>
              </DialogTitle>
              <p className="text-[11px] text-muted-foreground">
                Customise your form depending on the goal of your lead generation campaign (Exact Meta Ads replica).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
              onClick={handleApplyPreset}
            >
              <Sparkles className="h-3.5 w-3.5" /> 🪄 Auto-Fill Sri Lakshmi Preset
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Two-Column Studio Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT COLUMN: Step Editor (60% width) */}
          <div className="flex-1 flex flex-col border-r border-border/70 overflow-hidden bg-card/60">
            {/* Step 1 to 5 Navigation Bar matching screenshots */}
            <div className="flex items-center border-b border-border/70 bg-muted/20 px-3 py-1.5 overflow-x-auto text-xs shrink-0 gap-1">
              {[
                { step: 1, label: "Form type" },
                { step: 2, label: "Intro" },
                { step: 3, label: "Questions" },
                { step: 4, label: "Privacy Policy" },
                { step: 5, label: "Ending" },
              ].map((s) => (
                <button
                  key={s.step}
                  type="button"
                  onClick={() => {
                    setActiveStep(s.step as any);
                    if (s.step <= 4) setPreviewStep(s.step as any);
                    else setPreviewStep(4);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all text-xs whitespace-nowrap ${
                    activeStep === s.step
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                      activeStep === s.step
                        ? "bg-primary-foreground text-primary font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.step}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>

            {/* Step Form Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* STEP 1: Form Type (Screenshot 1) */}
              {activeStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold">Form name</Label>
                    <p className="text-[11px] text-muted-foreground mb-1.5">
                      The name that you choose will only be seen in Ads Manager.
                    </p>
                    <Input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Label className="text-xs font-semibold">Form type</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Customise your form depending on the goal of your lead generation campaign. The options you select may affect the volume of submissions and cost per lead.
                    </p>

                    <div className="space-y-2.5 pt-1">
                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          formType === "MORE_VOLUME"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="formType"
                          checked={formType === "MORE_VOLUME"}
                          onChange={() => setFormType("MORE_VOLUME")}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-bold text-xs text-foreground">More volume (Recommended for Murukku Machines)</p>
                          <p className="text-[11px] text-muted-foreground">
                            Use a form that's quick to fill in and submit on a mobile device. Generates the highest number of calls & WhatsApp inquiries.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          formType === "HIGHER_INTENT"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="formType"
                          checked={formType === "HIGHER_INTENT"}
                          onChange={() => setFormType("HIGHER_INTENT")}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-bold text-xs text-foreground">Higher intent</p>
                          <p className="text-[11px] text-muted-foreground">
                            Add a review step that gives people a chance to confirm their info before submitting. Helps filter out casual window-shoppers.
                          </p>
                        </div>
                      </label>

                      <label
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          formType === "RICH_CREATIVE"
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="formType"
                          checked={formType === "RICH_CREATIVE"}
                          onChange={() => setFormType("RICH_CREATIVE")}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="font-bold text-xs text-foreground">Rich creative</p>
                          <p className="text-[11px] text-muted-foreground">
                            Hold your audience's attention with this form that integrates your company's images, product details and reviews.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-border/80 bg-muted/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-foreground">Flexible form delivery</p>
                        <p className="text-[11px] text-muted-foreground">
                          Allow Meta to adjust or remove form elements based on what people are most likely to respond to.
                        </p>
                      </div>
                      <Switch checked={flexibleDelivery} onCheckedChange={setFlexibleDelivery} />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Intro (Screenshot 2) */}
              {activeStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-muted/30">
                    <div>
                      <p className="text-xs font-semibold text-foreground">Background image • Optional</p>
                      <p className="text-[11px] text-muted-foreground">
                        The image you choose will be shown at the top of the screen and behind your form.
                      </p>
                    </div>
                    <Switch checked={hasBackgroundImage} onCheckedChange={setHasBackgroundImage} />
                  </div>

                  {hasBackgroundImage && (
                    <div>
                      <Label className="text-[11px]">Image URL</Label>
                      <Input
                        value={backgroundImageUrl}
                        onChange={(e) => setBackgroundImageUrl(e.target.value)}
                        className="text-xs font-mono mt-1"
                        placeholder="/assets/murukku_machine_hero.jpg"
                      />
                    </div>
                  )}

                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-foreground">Greeting • Optional</Label>
                      <Switch checked={hasGreeting} onCheckedChange={setHasGreeting} />
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Let people know any relevant details and why they should complete your form.
                    </p>

                    {hasGreeting && (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between items-center text-[11px]">
                            <Label className="text-[11px]">Headline</Label>
                            <span className={introHeadline.length > 60 ? "text-destructive font-bold" : "text-muted-foreground"}>
                              {introHeadline.length}/60
                            </span>
                          </div>
                          <Input
                            value={introHeadline}
                            maxLength={60}
                            onChange={(e) => setIntroHeadline(e.target.value)}
                            className="text-xs mt-1"
                            placeholder="Enter a short headline"
                          />
                        </div>

                        <div>
                          <Label className="text-[11px]">Description</Label>
                          <Textarea
                            rows={4}
                            value={introDescription}
                            onChange={(e) => setIntroDescription(e.target.value)}
                            className="text-xs mt-1"
                            placeholder="Include additional machinery details, warranty and output capacity"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 3: Questions (Screenshot 3) */}
              {activeStep === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Contact information</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Ask for contact information and additional personal details. This will be pre-filled from their Facebook/Instagram profile.
                    </p>
                  </div>

                  <div>
                    <Label className="text-[11px]">Description Notice</Label>
                    <Textarea
                      rows={2}
                      value={contactUsageNotice}
                      onChange={(e) => setContactUsageNotice(e.target.value)}
                      className="text-xs mt-1"
                      placeholder="Let people know how the information that they give you will be used."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase">
                      Prefill Profile Fields (Auto-Populated on Mobile)
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactFields.full_name}
                          onChange={(e) => setContactFields((s) => ({ ...s, full_name: e.target.checked }))}
                        />
                        <span className="font-medium">Full Name (Auto-fill)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactFields.phone_number}
                          onChange={(e) => setContactFields((s) => ({ ...s, phone_number: e.target.checked }))}
                        />
                        <span className="font-medium">Phone Number (WhatsApp)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactFields.email}
                          onChange={(e) => setContactFields((s) => ({ ...s, email: e.target.checked }))}
                        />
                        <span className="font-medium">Email Address</span>
                      </label>

                      <label className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/30 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contactFields.city}
                          onChange={(e) => setContactFields((s) => ({ ...s, city: e.target.checked }))}
                        />
                        <span className="font-medium">City / Town</span>
                      </label>
                    </div>
                  </div>

                  {/* Custom Questions Section */}
                  <div className="space-y-3 pt-2 border-t border-border/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-semibold text-foreground">Custom Qualification Questions</Label>
                        <p className="text-[11px] text-muted-foreground">
                          Filter buyers by machinery requirement or capacity.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={handleAddQuestion}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Question
                      </Button>
                    </div>

                    {customQuestions.map((q, idx) => (
                      <div key={q.id} className="p-3 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase text-primary">Question {idx + 1}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => handleRemoveQuestion(q.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input
                          value={q.question}
                          onChange={(e) => {
                            const val = e.target.value;
                            setCustomQuestions((prev) =>
                              prev.map((item) => (item.id === q.id ? { ...item, question: val } : item))
                            );
                          }}
                          className="text-xs"
                          placeholder="e.g. Required Murukku Production Capacity"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: Privacy Policy (Screenshot 4) */}
              {activeStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Privacy Policy</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Because you will be collecting customer information, you need to include a link to your company's Privacy Policy. Your link will appear with Facebook's default privacy disclaimer.
                    </p>
                  </div>

                  <div>
                    <Label className="text-[11px]">Link URL *</Label>
                    <Input
                      value={privacyPolicyUrl}
                      onChange={(e) => setPrivacyPolicyUrl(e.target.value)}
                      className="text-xs font-mono mt-1"
                      placeholder="https://srilakshmiindustrial.com/privacy-policy"
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Must provide a valid business Privacy Policy URL.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[11px]">
                      <Label className="text-[11px]">Link text • Optional</Label>
                      <span className="text-muted-foreground">{privacyPolicyLinkText.length}/70</span>
                    </div>
                    <Input
                      value={privacyPolicyLinkText}
                      maxLength={70}
                      onChange={(e) => setPrivacyPolicyLinkText(e.target.value)}
                      className="text-xs mt-1"
                      placeholder="Visit Sri Lakshmi Industries Phase II's Privacy Policy."
                    />
                  </div>
                </div>
              )}

              {/* STEP 5: Ending / Thank You Page (Screenshot 5) */}
              {activeStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Message for leads</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Let people know what happens next after they submit the form.
                    </p>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-[11px]">
                      <Label className="text-[11px]">Headline</Label>
                      <span className="text-muted-foreground">{endingHeadline.length}/60</span>
                    </div>
                    <Input
                      value={endingHeadline}
                      maxLength={60}
                      onChange={(e) => setEndingHeadline(e.target.value)}
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-[11px]">Description</Label>
                    <Textarea
                      rows={3}
                      value={endingDescription}
                      onChange={(e) => setEndingDescription(e.target.value)}
                      className="text-xs mt-1"
                    />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <Label className="text-xs font-semibold text-foreground">Additional Action</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <label
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          endingButtonType === "WHATSAPP"
                            ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-semibold"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="btnType"
                          checked={endingButtonType === "WHATSAPP"}
                          onChange={() => {
                            setEndingButtonType("WHATSAPP");
                            setEndingButtonText("Chat on WhatsApp");
                            setEndingActionUrl("https://wa.me/919842266366");
                          }}
                        />
                        <span>Chat on WhatsApp</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          endingButtonType === "CALL"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="btnType"
                          checked={endingButtonType === "CALL"}
                          onChange={() => {
                            setEndingButtonType("CALL");
                            setEndingButtonText("Call Business");
                            setEndingActionUrl("+919842266366");
                          }}
                        />
                        <span>Call Business</span>
                      </label>

                      <label
                        className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${
                          endingButtonType === "WEBSITE"
                            ? "border-primary bg-primary/10 text-primary font-semibold"
                            : "border-border hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="radio"
                          name="btnType"
                          checked={endingButtonType === "WEBSITE"}
                          onChange={() => {
                            setEndingButtonType("WEBSITE");
                            setEndingButtonText("View Website");
                            setEndingActionUrl("https://srilakshmiindustrial.com");
                          }}
                        />
                        <span>Go to website</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px]">Call to action button text</Label>
                      <Input
                        value={endingButtonText}
                        onChange={(e) => setEndingButtonText(e.target.value)}
                        className="text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Destination URL / Phone</Label>
                      <Input
                        value={endingActionUrl}
                        onChange={(e) => setEndingActionUrl(e.target.value)}
                        className="text-xs font-mono mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="p-3 px-5 border-t border-border/80 bg-muted/40 flex items-center justify-between shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  toast.info("Form configuration saved as draft!");
                }}
              >
                Save draft
              </Button>

              <div className="flex items-center gap-2">
                {activeStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => {
                      const prev = (activeStep - 1) as any;
                      setActiveStep(prev);
                      if (prev <= 4) setPreviewStep(prev);
                    }}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" /> Previous
                  </Button>
                )}

                {activeStep < 5 ? (
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 text-xs gap-1 bg-primary text-primary-foreground font-semibold"
                    onClick={() => {
                      const next = (activeStep + 1) as any;
                      setActiveStep(next);
                      if (next <= 4) setPreviewStep(next);
                      else setPreviewStep(4);
                    }}
                  >
                    Next <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    disabled={saving}
                    onClick={handleCreateForm}
                    className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {saving ? "Publishing Form to Meta..." : "Create Form"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Mobile Phone Preview (40% width, matching Meta screenshot preview) */}
          <div className="w-[380px] lg:w-[420px] flex flex-col bg-muted/10 p-4 overflow-y-auto shrink-0 border-l border-border/50">
            {/* Platform Toggle matching screenshot */}
            <div className="flex items-center justify-center gap-1 bg-background p-1 rounded-xl border border-border/80 shadow-sm shrink-0 mb-3">
              <Button
                type="button"
                variant={previewPlatform === "facebook" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs flex-1 gap-1.5 font-medium"
                onClick={() => setPreviewPlatform("facebook")}
              >
                <Globe className="h-3.5 w-3.5" /> Facebook
              </Button>
              <Button
                type="button"
                variant={previewPlatform === "instagram" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs flex-1 gap-1.5 font-medium"
                onClick={() => setPreviewPlatform("instagram")}
              >
                <Smartphone className="h-3.5 w-3.5" /> Instagram
              </Button>
            </div>

            {/* Mobile Phone Mockup */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-full max-w-[310px] h-[520px] rounded-3xl border-4 border-slate-700 bg-card shadow-2xl flex flex-col justify-between overflow-hidden relative text-xs">
                {/* Simulated Phone Notch & Status */}
                <div className="p-2.5 pb-1 bg-muted/40 border-b border-border/60 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <span className="font-bold text-foreground">9:41</span>
                  </div>
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </div>

                {/* Simulated Form Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col justify-between">
                  {/* SCREEN 1: Intro / Greeting Preview */}
                  {previewStep === 1 && (
                    <div className="space-y-4 my-auto text-center">
                      <div className="flex flex-col items-center">
                        <div className="h-12 w-12 rounded-full bg-primary font-bold text-primary-foreground flex items-center justify-center shadow-md text-sm mb-2 border-2 border-background">
                          SLI
                        </div>
                        <p className="font-bold text-xs text-foreground">{pageName}</p>
                      </div>

                      <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-1.5 text-left">
                        <p className="font-bold text-xs text-foreground leading-snug">
                          {introHeadline || "Headline text"}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-4">
                          {introDescription || "Description paragraph"}
                        </p>
                      </div>

                      <Button
                        type="button"
                        className="w-full h-8 text-xs font-bold bg-primary text-primary-foreground"
                        onClick={() => setPreviewStep(2)}
                      >
                        Continue &rarr;
                      </Button>
                    </div>
                  )}

                  {/* SCREEN 2: Contact Information & Questions Preview */}
                  {previewStep === 2 && (
                    <div className="space-y-3">
                      <div>
                        <p className="font-bold text-xs text-foreground">Contact information</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                          {contactUsageNotice}
                        </p>
                      </div>

                      <div className="space-y-2">
                        {contactFields.email && (
                          <div className="p-2 rounded bg-muted/40 border border-border/70 text-[11px]">
                            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Email</p>
                            <p className="font-medium text-foreground">customer@example.com</p>
                          </div>
                        )}
                        {contactFields.full_name && (
                          <div className="p-2 rounded bg-muted/40 border border-border/70 text-[11px]">
                            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Full name</p>
                            <p className="font-medium text-foreground">Murugan Swaminathan</p>
                          </div>
                        )}
                        {contactFields.phone_number && (
                          <div className="p-2 rounded bg-muted/40 border border-border/70 text-[11px]">
                            <p className="text-[9px] text-muted-foreground uppercase font-semibold">Phone number</p>
                            <p className="font-medium text-foreground">+91 98422 66366</p>
                          </div>
                        )}
                        {contactFields.city && (
                          <div className="p-2 rounded bg-muted/40 border border-border/70 text-[11px]">
                            <p className="text-[9px] text-muted-foreground uppercase font-semibold">City</p>
                            <p className="font-medium text-foreground">Madurai, Tamil Nadu</p>
                          </div>
                        )}
                      </div>

                      <Button
                        type="button"
                        className="w-full h-8 text-xs font-bold bg-primary text-primary-foreground mt-2"
                        onClick={() => setPreviewStep(3)}
                      >
                        Continue &rarr;
                      </Button>
                    </div>
                  )}

                  {/* SCREEN 3: Privacy Policy Review Preview */}
                  {previewStep === 3 && (
                    <div className="space-y-3 my-auto">
                      <div className="p-3 rounded-xl bg-muted/40 border border-border/70 space-y-2">
                        <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Privacy policy
                        </p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                          By clicking Submit, you agree to send your info to {pageName} who agrees to use it according to their privacy policy.
                        </p>
                        <p className="text-[10px] text-primary font-semibold underline truncate">
                          {privacyPolicyLinkText || "Visit Privacy Policy"}
                        </p>
                      </div>

                      <Button
                        type="button"
                        className="w-full h-8 text-xs font-bold bg-primary text-primary-foreground"
                        onClick={() => setPreviewStep(4)}
                      >
                        Submit
                      </Button>
                    </div>
                  )}

                  {/* SCREEN 4: Thank You / Ending Preview */}
                  {previewStep === 4 && (
                    <div className="space-y-4 my-auto text-center">
                      <div className="flex flex-col items-center">
                        <div className="h-10 w-10 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center mb-1.5">
                          <Check className="h-5 w-5" />
                        </div>
                        <p className="font-bold text-xs text-foreground">{endingHeadline}</p>
                      </div>

                      <p className="text-[11px] text-muted-foreground leading-relaxed px-2">
                        {endingDescription}
                      </p>

                      <Button
                        type="button"
                        className="w-full h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-1.5"
                        onClick={() => {
                          toast.info(`Simulated Action: Opens ${endingActionUrl}`);
                        }}
                      >
                        {endingButtonType === "WHATSAPP" && <MessageCircle className="h-3.5 w-3.5" />}
                        {endingButtonType === "CALL" && <PhoneCall className="h-3.5 w-3.5" />}
                        {endingButtonType === "WEBSITE" && <Globe className="h-3.5 w-3.5" />}
                        {endingButtonText}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Simulated Screen Steps Navigation in Phone Footer */}
                <div className="p-2 border-t border-border/60 bg-muted/30 flex items-center justify-between text-[10px] text-muted-foreground shrink-0">
                  <span>
                    {previewStep === 1
                      ? "Intro"
                      : previewStep === 2
                      ? "Prefill information"
                      : previewStep === 3
                      ? "Privacy review"
                      : "Message for leads"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={previewStep <= 1}
                      onClick={() => setPreviewStep((s) => (Math.max(1, s - 1) as any))}
                      className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronLeft className="h-3 w-3" />
                    </button>
                    <span>{previewStep} of 4</span>
                    <button
                      type="button"
                      disabled={previewStep >= 4}
                      onClick={() => setPreviewStep((s) => (Math.min(4, s + 1) as any))}
                      className="h-5 w-5 rounded flex items-center justify-center hover:bg-muted disabled:opacity-30"
                    >
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
