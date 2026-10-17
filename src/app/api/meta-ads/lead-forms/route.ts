import { NextRequest, NextResponse } from "next/server";
import { getCurrentAccount, toErrorResponse } from "@/lib/auth/account";
import { getLeadForms, addLeadForm, MetaLeadForm } from "@/lib/meta-ads/lead-forms";
import { getMetaAdsConfig } from "@/lib/meta-ads/config";

const GRAPH_BASE = "https://graph.facebook.com/v21.0";

export async function GET() {
  try {
    const forms = getLeadForms();
    return NextResponse.json({ success: true, forms });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getCurrentAccount();
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      return NextResponse.json({ error: "Only admins can create Meta Lead Forms" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: "Form name is required" }, { status: 400 });
    }

    if (!body.privacy_policy?.url) {
      return NextResponse.json({ error: "Privacy Policy URL is mandatory for Meta Lead Forms" }, { status: 400 });
    }

    // Try Meta Graph API creation if access token & page_id are configured
    const config = getMetaAdsConfig();
    let metaFormId: string | null = null;
    let metaError: string | null = null;

    if (config.access_token && config.access_token.length > 20 && config.page_id) {
      try {
        const questions: any[] = [];
        if (body.questions?.contact_fields?.full_name) questions.push({ type: "FULL_NAME", key: "full_name" });
        if (body.questions?.contact_fields?.phone_number) questions.push({ type: "PHONE", key: "phone_number" });
        if (body.questions?.contact_fields?.email) questions.push({ type: "EMAIL", key: "email" });
        if (body.questions?.contact_fields?.city) questions.push({ type: "CITY", key: "city" });

        // Add custom questions if any
        if (Array.isArray(body.questions?.custom_questions)) {
          body.questions.custom_questions.forEach((q: any) => {
            if (q.question) {
              if (q.type === "MULTIPLE_CHOICE" && Array.isArray(q.options) && q.options.length > 0) {
                questions.push({
                  type: "CUSTOM",
                  key: q.id || `q_${Date.now()}`,
                  label: q.question,
                  options: q.options.map((opt: string) => ({ value: opt, key: opt })),
                });
              } else {
                questions.push({
                  type: "CUSTOM",
                  key: q.id || `q_${Date.now()}`,
                  label: q.question,
                });
              }
            }
          });
        }

        const graphUrl = `${GRAPH_BASE}/${config.page_id}/leadgen_forms?access_token=${config.access_token}`;
        const graphPayload: any = {
          name: body.name,
          questions,
          privacy_policy: {
            url: body.privacy_policy.url,
            link_text: body.privacy_policy.link_text || "Privacy Policy",
          },
          thank_you_page: {
            title: body.ending?.headline || "Thanks, you're all set.",
            body: body.ending?.description || "Our team will contact you shortly.",
            button_type: "VIEW_WEBSITE",
            website_url: body.ending?.action_url || "https://srilakshmiindustrial.com",
            button_text: body.ending?.button_text || "Chat on WhatsApp",
          },
        };

        if (body.intro?.enabled && body.intro?.headline) {
          graphPayload.context_card = {
            title: body.intro.headline,
            content: body.intro.description ? [body.intro.description] : ["Sri Lakshmi Machinery"],
            style: "PARAGRAPH_STYLE",
          };
        }

        const metaRes = await fetch(graphUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(graphPayload),
        });

        const metaData = await metaRes.json();
        if (metaData.id) {
          metaFormId = metaData.id;
        } else if (metaData.error) {
          metaError = metaData.error.message;
          console.warn("[Meta LeadGen Form] Graph API warning:", metaData.error);
        }
      } catch (e: any) {
        metaError = e.message;
        console.warn("[Meta LeadGen Form] Graph API network call exception:", e);
      }
    }

    const newForm = addLeadForm({
      name: body.name,
      status: "ACTIVE",
      form_type: body.form_type || "MORE_VOLUME",
      flexible_delivery: body.flexible_delivery ?? true,
      intro: {
        enabled: body.intro?.enabled ?? true,
        headline: body.intro?.headline || "Sri Lakshmi Industries - Automatic Murukku Machines",
        description: body.intro?.description || "Direct factory prices and commercial catalogs.",
        background_image: body.intro?.background_image || "",
      },
      questions: {
        description: body.questions?.description || "We use your details to share machine quotes.",
        contact_fields: {
          full_name: body.questions?.contact_fields?.full_name ?? true,
          phone_number: body.questions?.contact_fields?.phone_number ?? true,
          email: body.questions?.contact_fields?.email ?? true,
          city: body.questions?.contact_fields?.city ?? true,
          state: body.questions?.contact_fields?.state ?? true,
        },
        custom_questions: body.questions?.custom_questions || [],
      },
      privacy_policy: {
        url: body.privacy_policy.url,
        link_text: body.privacy_policy.link_text || "Sri Lakshmi Industries Privacy Policy",
        custom_disclaimer: body.privacy_policy.custom_disclaimer,
      },
      ending: {
        headline: body.ending?.headline || "Thanks, you're all set.",
        description: body.ending?.description || "Our team will contact you shortly with full quote.",
        button_type: body.ending?.button_type || "WHATSAPP",
        button_text: body.ending?.button_text || "Chat on WhatsApp",
        action_url: body.ending?.action_url || "https://wa.me/919842266366",
      },
    });

    if (metaFormId) {
      newForm.id = metaFormId;
    }

    return NextResponse.json({
      success: true,
      form: newForm,
      meta_synced: !!metaFormId,
      meta_error: metaError,
    });
  } catch (err: any) {
    return toErrorResponse(err);
  }
}
