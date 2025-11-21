import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Cookie, Settings } from 'lucide-react';
import { UserConsent } from '@/entities/all';

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true, // Always true
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    // Check if user has already given consent
    const checkConsent = async () => {
      try {
        const existingConsent = await UserConsent.filter({
          user_id: getSessionId(),
          consent_type: 'cookies_essential'
        });
        
        if (existingConsent.length === 0) {
          // Show banner after a short delay
          setTimeout(() => setShowBanner(true), 2000);
        }
      } catch (error) {
        console.log('Could not check consent, showing banner');
        setTimeout(() => setShowBanner(true), 2000);
      }
    };

    checkConsent();
  }, []);

  const getSessionId = () => {
    let sessionId = localStorage.getItem('session_id');
    if (!sessionId) {
      sessionId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
      localStorage.setItem('session_id', sessionId);
    }
    return sessionId;
  };

  const handleAcceptAll = async () => {
    await saveConsent(true, true, true);
    setShowBanner(false);
  };

  const handleAcceptEssential = async () => {
    await saveConsent(true, false, false);
    setShowBanner(false);
  };

  const handleSavePreferences = async () => {
    await saveConsent(preferences.essential, preferences.analytics, preferences.marketing);
    setShowBanner(false);
    setShowDetails(false);
  };

  const saveConsent = async (essential, analytics, marketing) => {
    const sessionId = getSessionId();
    const timestamp = new Date().toISOString();

    try {
      // Save each consent type
      const consentTypes = [
        { type: 'cookies_essential', value: essential },
        { type: 'cookies_analytics', value: analytics },
        { type: 'cookies_marketing', value: marketing }
      ];

      for (const consent of consentTypes) {
        await UserConsent.create({
          user_id: sessionId,
          consent_type: consent.type,
          consent_given: consent.value,
          consent_date: timestamp,
          ip_address: 'N/A',
          user_agent: navigator.userAgent || 'Unknown',
          version: '1.0'
        });
      }
    } catch (error) {
      console.error('Failed to save consent:', error);
    }
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Mobile-optimized Cookie Banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 md:bottom-4 md:left-4 md:right-auto md:max-w-sm md:rounded-lg md:border">
        <Card className="bg-slate-800 border-slate-700 p-4">
          <div className="flex items-start gap-3">
            <Cookie className="w-6 h-6 text-teal-400 flex-shrink-0 mt-1" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-white mb-2">Our Use of Cookies</h3>
              <p className="text-xs text-slate-300 mb-3 leading-relaxed">
                We use cookies to enhance your learning experience. Essential cookies are required for the platform to function properly.
              </p>
              
              {/* Mobile-optimized buttons */}
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Button 
                    onClick={handleAcceptAll}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white text-xs h-8"
                  >
                    Accept All
                  </Button>
                  <Button 
                    onClick={handleAcceptEssential}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs h-8"
                  >
                    Essential Only
                  </Button>
                </div>
                
                <Button 
                  onClick={() => setShowDetails(!showDetails)}
                  variant="ghost"
                  className="w-full text-slate-400 hover:text-slate-200 text-xs h-8"
                >
                  <Settings className="w-3 h-3 mr-1" />
                  Customize
                </Button>
              </div>
            </div>
            
            <Button
              onClick={() => setShowBanner(false)}
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-slate-200 p-1 h-auto flex-shrink-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Collapsible preferences */}
          {showDetails && (
            <div className="mt-4 pt-3 border-t border-slate-700 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Essential Cookies</span>
                  <div className="bg-green-600 text-white text-xs px-2 py-1 rounded">Required</div>
                </div>
                <p className="text-xs text-slate-400">
                  Necessary for the website to function and cannot be switched off.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Analytics Cookies</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences(prev => ({...prev, analytics: e.target.checked}))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-400">
                  Help us understand how you use our platform to improve your experience.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Marketing Cookies</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences(prev => ({...prev, marketing: e.target.checked}))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
                <p className="text-xs text-slate-400">
                  Used to deliver personalized content and track campaign performance.
                </p>
              </div>

              <Button 
                onClick={handleSavePreferences}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 mt-3"
              >
                Save Preferences
              </Button>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}