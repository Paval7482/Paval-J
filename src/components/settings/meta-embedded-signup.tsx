'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, CheckCircle2, AlertCircle, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: {
      init: (options: {
        appId: string;
        cookie?: boolean;
        xfbml?: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: {
          authResponse?: {
            code?: string;
            accessToken?: string;
            userID?: string;
            expiresIn?: number;
          };
          status?: string;
        }) => void,
        options: {
          config_id?: string;
          response_type?: string;
          override_default_response_type?: boolean;
          extras?: Record<string, unknown>;
        }
      ) => void;
    };
  }
}

interface MetaEmbeddedSignupProps {
  onSuccess: () => void;
  isConnected: boolean;
}

export function MetaEmbeddedSignup({ onSuccess, isConnected }: MetaEmbeddedSignupProps) {
  const [loading, setLoading] = useState(false);
  const [sdkReady, setSdkReady] = useState(false);
  const [customAppId, setCustomAppId] = useState('');
  const [configId, setConfigId] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  // Load Facebook JavaScript SDK
  useEffect(() => {
    const defaultAppId = process.env.NEXT_PUBLIC_META_APP_ID || '';
    if (defaultAppId) {
      setCustomAppId(defaultAppId);
    }
    const defaultConfigId = process.env.NEXT_PUBLIC_META_CONFIG_ID || '';
    if (defaultConfigId) {
      setConfigId(defaultConfigId);
    }

    if (window.FB) {
      setSdkReady(true);
      return;
    }

    window.fbAsyncInit = function () {
      if (window.FB && (defaultAppId || customAppId)) {
        window.FB.init({
          appId: defaultAppId || customAppId,
          cookie: true,
          xfbml: true,
          version: 'v21.0',
        });
        setSdkReady(true);
      }
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.FB && (defaultAppId || customAppId)) {
        window.FB.init({
          appId: defaultAppId || customAppId,
          cookie: true,
          xfbml: true,
          version: 'v21.0',
        });
        setSdkReady(true);
      }
    };
    document.body.appendChild(script);
  }, [customAppId]);

  // Handle message events from Meta Embedded Signup popup
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com') && !event.origin.endsWith('meta.com')) {
        return;
      }

      try {
        const rawData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (rawData.type === 'WA_EMBEDDED_SIGNUP') {
          if (rawData.event === 'FINISH') {
            const { phone_number_id, waba_id } = rawData.data || {};
            toast.success('Meta WhatsApp account details received!');
            // Exchange code or save if already received
            if (phone_number_id && waba_id) {
              await completeSignup({
                phoneNumberId: phone_number_id,
                wabaId: waba_id,
              });
            }
          } else if (rawData.event === 'CANCEL') {
            toast.info('Meta WhatsApp login was cancelled.');
            setLoading(false);
          } else if (rawData.event === 'ERROR') {
            toast.error(rawData.data?.error_message || 'Meta signup failed.');
            setLoading(false);
          }
        }
      } catch {
        // Non-JSON message from other extensions or windows
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const completeSignup = async (details: {
    code?: string;
    accessToken?: string;
    phoneNumberId?: string;
    wabaId?: string;
  }) => {
    try {
      setLoading(true);
      const res = await fetch('/api/whatsapp/embedded-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(details),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to complete Meta setup');
      }

      toast.success('WhatsApp Business API connected successfully via Meta 1-Click Login!');
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Meta connection failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunchMetaLogin = () => {
    const activeAppId = customAppId.trim() || process.env.NEXT_PUBLIC_META_APP_ID;

    if (!activeAppId) {
      setShowConfig(true);
      toast.info('Please enter your Meta App ID or ensure NEXT_PUBLIC_META_APP_ID is configured.');
      return;
    }

    if (!window.FB) {
      toast.error('Meta SDK is still loading. Please try again in 5 seconds.');
      return;
    }

    setLoading(true);

    try {
      window.FB.init({
        appId: activeAppId,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });

      const loginOptions: {
        config_id?: string;
        response_type: string;
        override_default_response_type: boolean;
        extras: Record<string, unknown>;
      } = {
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          feature: 'whatsapp_embedded_signup',
          sessionInfoVersion: '3',
        },
      };

      if (configId.trim()) {
        loginOptions.config_id = configId.trim();
      }

      window.FB.login((response) => {
        if (response.authResponse?.code) {
          completeSignup({
            code: response.authResponse.code,
          });
        } else if (response.authResponse?.accessToken) {
          completeSignup({
            accessToken: response.authResponse.accessToken,
          });
        } else {
          setLoading(false);
          toast.info('Login closed or cancelled.');
        }
      }, loginOptions);
    } catch (err) {
      console.error('FB.login error:', err);
      setLoading(false);
      toast.error('Could not open Meta Login popup.');
    }
  };

  return (
    <Card className="border-blue-500/30 bg-gradient-to-br from-blue-950/20 via-slate-900 to-slate-900 shadow-md overflow-hidden relative">
      <div className="absolute top-0 right-0 p-6 pointer-events-none opacity-10">
        <svg className="w-32 h-32 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      </div>

      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                1-Click Fast Connect with Meta
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Recommended
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              No need to copy-paste Phone Number ID, WABA ID, or Tokens. Simply log in with your Facebook / Meta account to automatically connect WhatsApp Business API in 30 seconds.
            </p>
            <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <ShieldCheck className="size-3.5" /> Official Meta Cloud API
              </span>
              <span>•</span>
              <span>Zero Technical Setup</span>
              <span>•</span>
              <span>Auto-Configures Webhooks</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <Button
              onClick={handleLaunchMetaLogin}
              disabled={loading}
              className="bg-[#1877F2] hover:bg-[#166fe5] text-white font-semibold text-xs px-5 py-5 rounded-xl shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Connecting with Meta...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Connect WhatsApp with Meta
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 h-10 px-3"
            >
              {showConfig ? 'Hide Config' : 'App Settings'}
            </Button>
          </div>
        </div>

        {/* Optional App ID / Config ID Dropdown */}
        {showConfig && (
          <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-950/40 p-3.5 rounded-xl">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Meta App ID <span className="text-slate-500">(Optional if set in .env)</span>
              </label>
              <input
                type="text"
                value={customAppId}
                onChange={(e) => setCustomAppId(e.target.value)}
                placeholder="e.g. 1064364232371497"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-400 mb-1 font-medium">
                Meta Configuration ID <span className="text-slate-500">(Embedded Signup Flow)</span>
              </label>
              <input
                type="text"
                value={configId}
                onChange={(e) => setConfigId(e.target.value)}
                placeholder="e.g. 123456789012345"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
