'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, Sparkles, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';
import { toast } from 'sonner';

interface MetaEmbeddedSignupProps {
  onSuccess: () => void;
  isConnected: boolean;
}

export function MetaEmbeddedSignup({ onSuccess, isConnected }: MetaEmbeddedSignupProps) {
  const [tokenInput, setTokenInput] = useState('');
  const [discovering, setDiscovering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discoveredPhones, setDiscoveredPhones] = useState<Array<{
    phoneNumberId: string;
    wabaId: string;
    displayPhoneNumber: string;
    verifiedName: string;
    qualityRating?: string;
  }>>([]);

  const handleSmartAutoDetect = async () => {
    if (!tokenInput.trim()) {
      toast.error('Please paste your Access Token');
      return;
    }

    try {
      setDiscovering(true);
      setDiscoveredPhones([]);

      const res = await fetch('/api/whatsapp/auto-discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: tokenInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not verify token with Meta');
      }

      if (!data.phones || data.phones.length === 0) {
        toast.error('Token verified, but no WhatsApp Business Phone Numbers were found.');
        return;
      }

      setDiscoveredPhones(data.phones);
      toast.success(`Found ${data.phones.length} WhatsApp Business Number(s)!`);

      // If exactly 1 phone number found, auto-connect immediately!
      if (data.phones.length === 1) {
        await handleSelectAndConnect(data.phones[0]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to auto-detect';
      toast.error(msg);
    } finally {
      setDiscovering(false);
    }
  };

  const handleSelectAndConnect = async (phone: {
    phoneNumberId: string;
    wabaId: string;
    displayPhoneNumber: string;
    verifiedName: string;
  }) => {
    try {
      setSaving(true);
      const res = await fetch('/api/whatsapp/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: phone.phoneNumberId,
          waba_id: phone.wabaId,
          access_token: tokenInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save configuration');
      }

      toast.success(`Connected ${phone.verifiedName} (${phone.displayPhoneNumber}) successfully!`);
      setTokenInput('');
      setDiscoveredPhones([]);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-emerald-500/40 bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-900 shadow-md overflow-hidden relative">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                ⚡ Smart 1-Step WhatsApp Connect
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Zero Technical Setup
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="size-4" /> Official Meta Cloud API
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            No need to configure complex Facebook Developer apps, IDs, or Webhooks. Just paste your <strong>Access Token</strong> below, and our system will automatically detect your WhatsApp numbers, verify with Meta, and connect in 1 second.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
            <div className="flex-1 relative">
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="Paste your Meta Access Token (EAAG...)"
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-all font-mono"
              />
            </div>
            <Button
              onClick={handleSmartAutoDetect}
              disabled={discovering || saving}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-6 py-5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 shrink-0 transition-all"
            >
              {discovering || saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Auto-Detecting & Connecting...
                </>
              ) : (
                <>
                  <Sparkles className="size-4 text-emerald-200" />
                  Auto-Detect & Connect Everything
                </>
              )}
            </Button>
          </div>

          {/* Discovered Phone Numbers List (if multiple numbers found) */}
          {discoveredPhones.length > 1 && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-200">
                Select which WhatsApp Number to connect:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {discoveredPhones.map((phone) => (
                  <button
                    key={phone.phoneNumberId}
                    onClick={() => handleSelectAndConnect(phone)}
                    disabled={saving}
                    className="p-3 rounded-xl bg-slate-800/80 hover:bg-emerald-950/40 border border-slate-700 hover:border-emerald-500/50 flex items-center justify-between text-left transition-all group"
                  >
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <PhoneCall className="size-3.5 text-emerald-400" />
                        {phone.displayPhoneNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {phone.verifiedName}
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
