import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { 
  Accessibility, 
  ZoomIn, 
  ZoomOut, 
  Eye, 
  Contrast,
  Keyboard,
  X,
  Languages,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

const WIDGET_TEXTS = {
  he: {
    title: "הגדרות נגישות",
    open_widget: "פתח הגדרות נגישות",
    font_size: "גודל הטקסט",
    high_contrast: "ניגודיות גבוהה",
    invert_colors: "היפוך צבעים",
    reduced_motion: "הפחת אנימציות",
    keyboard_nav: "ניווט משופר במקלדת",
    reset: "איפוס הגדרות",
  },
  en: {
    title: "Accessibility Settings",
    open_widget: "Open Accessibility Settings",
    font_size: "Font Size",
    high_contrast: "High Contrast",
    invert_colors: "Invert Colors",
    reduced_motion: "Reduced Motion",
    keyboard_nav: "Enhanced Keyboard Nav",
    reset: "Reset Settings",
  }
};

export default function AccessibilityWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [widgetLang, setWidgetLang] = useState('he');
  const [settings, setSettings] = useState({
    fontSize: 100,
    highContrast: false,
    invertColors: false,
    reducedMotion: false,
    keyboardNavigation: true,
  });

  const texts = WIDGET_TEXTS[widgetLang];

  useEffect(() => {
    const saved = localStorage.getItem('accessibility-settings');
    if (saved) {
      setSettings(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    applySettings();
    localStorage.setItem('accessibility-settings', JSON.stringify(settings));
  }, [settings]);

  const applySettings = () => {
    const root = document.documentElement;
    const body = document.body;
    
    root.style.fontSize = `${settings.fontSize}%`;
    body.classList.toggle('theme-high-contrast', settings.highContrast);
    body.classList.toggle('theme-inverted', settings.invertColors);
    body.classList.toggle('reduced-motion', settings.reducedMotion);
    body.classList.toggle('enhanced-keyboard-nav', settings.keyboardNavigation);
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const increaseFontSize = () => {
    updateSetting('fontSize', Math.min(settings.fontSize + 10, 150));
  };

  const decreaseFontSize = () => {
    updateSetting('fontSize', Math.max(settings.fontSize - 10, 80));
  };

  const resetSettings = () => {
    setSettings({
      fontSize: 100,
      highContrast: false,
      invertColors: false,
      reducedMotion: false,
      keyboardNavigation: true,
    });
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-teal-600 hover:bg-teal-700 text-white rounded-full p-3 shadow-lg"
        aria-label={texts.open_widget}
        title={texts.open_widget}
      >
        <Accessibility className="w-6 h-6" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md max-h-[90vh] overflow-y-auto" dir={widgetLang === 'he' ? 'rtl' : 'ltr'}>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Accessibility className="w-6 h-6 text-teal-400" />
                  {texts.title}
                </h2>
                <div className="flex items-center gap-2">
                   <Button
                    onClick={() => setWidgetLang(prev => prev === 'he' ? 'en' : 'he')}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    <Languages className="w-5 h-5" />
                  </Button>
                  <Button
                    onClick={() => setIsOpen(false)}
                    variant="ghost"
                    size="sm"
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-5">
                {/* Font Size */}
                <div className="space-y-3 p-3 bg-slate-700/50 rounded-lg">
                  <h3 className="text-white font-semibold">{texts.font_size}</h3>
                  <div className="flex items-center gap-3">
                    <Button onClick={decreaseFontSize} variant="outline" size="sm" className="border-slate-600 text-slate-300" disabled={settings.fontSize <= 80}> <ZoomOut className="w-4 h-4" /> </Button>
                    <span className="text-slate-300 min-w-12 text-center">{settings.fontSize}%</span>
                    <Button onClick={increaseFontSize} variant="outline" size="sm" className="border-slate-600 text-slate-300" disabled={settings.fontSize >= 150}> <ZoomIn className="w-4 h-4" /> </Button>
                  </div>
                </div>

                {/* Toggles */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label htmlFor="highContrastSwitch" className="flex items-center gap-3 cursor-pointer">
                      <Contrast className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{texts.high_contrast}</span>
                    </label>
                    <Switch id="highContrastSwitch" checked={settings.highContrast} onCheckedChange={(checked) => updateSetting('highContrast', checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="invertColorsSwitch" className="flex items-center gap-3 cursor-pointer">
                      <Sparkles className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{texts.invert_colors}</span>
                    </label>
                    <Switch id="invertColorsSwitch" checked={settings.invertColors} onCheckedChange={(checked) => updateSetting('invertColors', checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="reducedMotionSwitch" className="flex items-center gap-3 cursor-pointer">
                      <Eye className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{texts.reduced_motion}</span>
                    </label>
                    <Switch id="reducedMotionSwitch" checked={settings.reducedMotion} onCheckedChange={(checked) => updateSetting('reducedMotion', checked)} />
                  </div>

                  <div className="flex items-center justify-between">
                    <label htmlFor="keyboardNavSwitch" className="flex items-center gap-3 cursor-pointer">
                      <Keyboard className="w-5 h-5 text-slate-400" />
                      <span className="text-white">{texts.keyboard_nav}</span>
                    </label>
                    <Switch id="keyboardNavSwitch" checked={settings.keyboardNavigation} onCheckedChange={(checked) => updateSetting('keyboardNavigation', checked)} />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <Button onClick={resetSettings} variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                    <RotateCcw className="w-4 h-4" style={{[widgetLang === 'he' ? 'marginLeft' : 'marginRight']: '0.5rem'}} />
                    {texts.reset}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <style jsx global>{`
        .reduced-motion *, .reduced-motion *::before, .reduced-motion *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
        
        .enhanced-keyboard-nav *:focus-visible {
          outline: 3px solid #3b82f6 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.5) !important;
        }
      `}</style>
    </>
  );
}