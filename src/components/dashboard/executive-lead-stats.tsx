"use client"

import { UsersRound, Phone, Sparkles, CheckCircle2, TrendingUp, Clock, Award } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { ExecutiveLeadStatsBundle } from "@/lib/dashboard/types"

const LANGUAGE_FLAGS: Record<string, { label: string; flag: string }> = {
  ta: { label: "தமிழ்", flag: "🇮🇳" },
  en: { label: "English", flag: "🌐" },
  hi: { label: "हिंदी", flag: "🇮🇳" },
  kn: { label: "ಕನ್ನಡ", flag: "🇮🇳" },
  ml: { label: "മലയാളം", flag: "🇮🇳" },
  te: { label: "తెలుగు", flag: "🇮🇳" },
}

interface ExecutiveLeadStatsProps {
  data: ExecutiveLeadStatsBundle | null
  loading: boolean
}

export function ExecutiveLeadStats({ data, loading }: ExecutiveLeadStatsProps) {
  if (loading || !data) {
    return (
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <UsersRound className="h-5 w-5 text-primary" />
            <div className="h-5 w-48 bg-muted animate-pulse rounded" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted/40 animate-pulse border border-border" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { executives, totalAssignedLeads, todayAssignedLeads } = data

  return (
    <Card className="border-primary/20 shadow-sm bg-gradient-to-b from-card to-muted/10">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-primary" />
              <CardTitle className="text-base font-semibold">
                Executive Lead Assignment & Performance Breakdown
              </CardTitle>
              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-medium">
                Live Lead Tracking
              </Badge>
            </div>
            <CardDescription className="text-xs mt-0.5">
              Real-time assigned leads breakdown for every sales executive across WhatsApp and Meta inbound inquiries.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs px-2.5 py-1 flex items-center gap-1.5 font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Today: <span className="text-primary font-bold">{todayAssignedLeads}</span> Leads
            </Badge>
            <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1 font-semibold">
              Total: {totalAssignedLeads} Leads
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {executives.map((exec) => (
            <div
              key={exec.id}
              className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                exec.active
                  ? "border-border bg-card hover:border-primary/40 hover:shadow-xs"
                  : "border-border/50 bg-muted/40 opacity-70"
              }`}
            >
              {/* Top Row: Executive Info & Status */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        exec.active
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {exec.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm text-foreground">{exec.name}</span>
                        {exec.tamilName && (
                          <span className="text-xs text-muted-foreground font-medium">({exec.tamilName})</span>
                        )}
                      </div>
                      <a
                        href={`https://wa.me/${exec.phone}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-emerald-600 transition-colors"
                      >
                        <Phone className="h-3 w-3 text-emerald-500" />
                        +{exec.phone}
                      </a>
                    </div>
                  </div>

                  {exec.active ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0 px-1.5 h-4 font-medium"
                    >
                      Active
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 py-0 px-1.5 h-4 font-medium"
                    >
                      On Leave
                    </Badge>
                  )}
                </div>

                {/* Spoken Language Badges */}
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {(exec.languages && exec.languages.length > 0 ? exec.languages : ["ta", "en"]).map((code) => {
                    const lObj = LANGUAGE_FLAGS[code] || { label: code, flag: "🌐" }
                    return (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60"
                      >
                        <span>{lObj.flag}</span>
                        <span>{lObj.label}</span>
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Stats Breakdown Grid */}
              <div className="mt-3.5 pt-3 border-t border-border space-y-2.5">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-primary/5 p-2 border border-primary/15">
                    <span className="text-[10px] text-muted-foreground block font-medium">Total Leads</span>
                    <span className="text-base font-bold text-primary">{exec.totalLeads}</span>
                  </div>

                  <div className="rounded-lg bg-emerald-500/5 p-2 border border-emerald-500/15">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Today</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                      +{exec.todayLeads}
                    </span>
                  </div>

                  <div className="rounded-lg bg-blue-500/5 p-2 border border-blue-500/15">
                    <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-medium">Follow-ups</span>
                    <span className="text-base font-bold text-blue-600 dark:text-blue-400">{exec.openLeads}</span>
                  </div>
                </div>

                {/* Lead Share Progress Bar */}
                <div className="space-y-1 pt-0.5">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Lead Distribution Share</span>
                    <span className="font-semibold text-foreground">{exec.percentage}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(exec.percentage, 4)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
