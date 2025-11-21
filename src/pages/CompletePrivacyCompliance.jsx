import React, { useState, useEffect } from 'react';
import { Shield, Mail, Phone, User, Clock, Lock, Eye, Type, RotateCcw, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function CompletePrivacyCompliance() {
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [showCookieBanner, setShowCookieBanner] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    requestType: '',
    details: '',
    verification: false
  });
  const [formErrors, setFormErrors] = useState({});
  const [formStatus, setFormStatus] = useState('');

  const lastUpdated = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  useEffect(() => {
    // Load accessibility preferences
    const savedHighContrast = localStorage.getItem('high-contrast') === 'true';
    const savedLargeText = localStorage.getItem('large-text') === 'true';
    const cookiesAccepted = localStorage.getItem('cookiesAccepted');
    const privacySeen = localStorage.getItem('privacySeen');

    setHighContrast(savedHighContrast);
    setLargeText(savedLargeText);
    
    if (!cookiesAccepted) {
      setShowCookieBanner(true);
    }
    
    if (!privacySeen) {
      setShowPrivacyPopup(true);
    }

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showPrivacyPopup) {
        setShowPrivacyPopup(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showPrivacyPopup]);

  const toggleHighContrast = () => {
    const newValue = !highContrast;
    setHighContrast(newValue);
    localStorage.setItem('high-contrast', newValue.toString());
    announceToScreenReader(newValue ? 'High contrast mode enabled' : 'High contrast mode disabled');
  };

  const toggleLargeText = () => {
    const newValue = !largeText;
    setLargeText(newValue);
    localStorage.setItem('large-text', newValue.toString());
    announceToScreenReader(newValue ? 'Large text mode enabled' : 'Large text mode disabled');
  };

  const resetAccessibility = () => {
    setHighContrast(false);
    setLargeText(false);
    localStorage.removeItem('high-contrast');
    localStorage.removeItem('large-text');
    announceToScreenReader('Accessibility settings reset to default');
  };

  const announceToScreenReader = (message) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  const acceptCookies = () => {
    setShowCookieBanner(false);
    localStorage.setItem('cookiesAccepted', 'all');
    announceToScreenReader('All cookies accepted');
  };

  const rejectCookies = () => {
    setShowCookieBanner(false);
    localStorage.setItem('cookiesAccepted', 'essential');
    announceToScreenReader('Only essential cookies accepted');
  };

  const closePrivacyPopup = () => {
    setShowPrivacyPopup(false);
    localStorage.setItem('privacySeen', 'true');
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.fullName.trim()) {
      errors.fullName = 'Full name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!formData.requestType) {
      errors.requestType = 'Please select a request type';
    }
    
    if (!formData.details.trim()) {
      errors.details = 'Request details are required';
    }
    
    if (!formData.verification) {
      errors.verification = 'Verification is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      setFormStatus('Thank you for your request. We will respond within 30 days.');
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        requestType: '',
        details: '',
        verification: false
      });
      announceToScreenReader('Form submitted successfully');
    } else {
      announceToScreenReader('Please correct the errors in the form');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const baseClasses = `min-h-screen transition-all duration-300 ${
    highContrast 
      ? 'bg-black text-white' 
      : 'bg-slate-50 text-slate-900'
  } ${largeText ? 'text-lg' : 'text-base'}`;

  const cardClasses = `${
    highContrast 
      ? 'bg-black border-white text-white' 
      : 'bg-white border-slate-200'
  }`;

  const linkClasses = `${
    highContrast 
      ? 'text-cyan-400 hover:text-cyan-300' 
      : 'text-blue-600 hover:text-blue-800'
  } underline focus:outline-2 focus:outline-teal-500 focus:outline-offset-2`;

  return (
    <div className={baseClasses}>
      {/* Skip Links */}
      <div className="sr-only focus-within:not-sr-only">
        <a 
          href="#main-content" 
          className="absolute top-0 left-0 bg-black text-white p-2 z-50 focus:relative"
        >
          Skip to main content
        </a>
      </div>

      {/* Accessibility Controls */}
      <Card className={`fixed top-4 left-4 z-40 ${cardClasses} max-w-xs`}>
        <CardHeader className="pb-2">
          <CardTitle className={`text-sm ${largeText ? 'text-base' : ''}`}>
            Accessibility Options
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={toggleHighContrast}
              aria-label="Toggle high contrast mode"
              className={highContrast ? 'bg-white text-black' : ''}
            >
              <Eye className="w-3 h-3 mr-1" />
              Contrast
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={toggleLargeText}
              aria-label="Toggle large text mode"
              className={highContrast ? 'bg-white text-black' : ''}
            >
              <Type className="w-3 h-3 mr-1" />
              Text Size
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={resetAccessibility}
              aria-label="Reset accessibility settings"
              className={highContrast ? 'bg-white text-black' : ''}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Popup */}
      <Dialog open={showPrivacyPopup} onOpenChange={setShowPrivacyPopup}>
        <DialogContent className={`${cardClasses} max-w-2xl`} aria-labelledby="popup-title">
          <DialogHeader>
            <DialogTitle id="popup-title" className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-teal-500" />
              Privacy Policy & Accessibility Notice
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              We collect personal information (contact forms, IP addresses, cookies) to improve user experience and respond to your inquiries.
            </p>
            <p>
              This website is compliant with WCAG 2.1 AA accessibility standards, featuring keyboard navigation, accessible colors, and screen reader support.
            </p>
            <div className="flex gap-3">
              <Button onClick={closePrivacyPopup} className="bg-teal-600 hover:bg-teal-700">
                Read Full Policy Below
              </Button>
              <Button variant="outline" onClick={closePrivacyPopup}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cookie Banner */}
      {showCookieBanner && (
        <div 
          className={`fixed bottom-0 left-0 right-0 z-50 p-4 ${
            highContrast ? 'bg-black border-t-2 border-white' : 'bg-slate-900 text-white'
          }`}
          role="region"
          aria-label="Cookie consent banner"
          aria-live="polite"
        >
          <div className="max-w-6xl mx-auto">
            <p className="mb-3 text-center">
              We use cookies to improve your browsing experience. Clicking 'Accept' consents to non-essential cookies.{' '}
              <a href="#cookiePolicy" className="text-teal-400 underline">
                Learn more
              </a>
            </p>
            <div className="flex justify-center gap-3">
              <Button 
                onClick={acceptCookies}
                className="bg-teal-600 hover:bg-teal-700"
                aria-describedby="cookie-description"
              >
                Accept All Cookies
              </Button>
              <Button 
                variant="outline"
                onClick={rejectCookies}
                className="border-white text-white hover:bg-white hover:text-black"
              >
                Essential Only
              </Button>
            </div>
            <div id="cookie-description" className="sr-only">
              Accept all cookies including analytics and marketing, or use essential cookies only for basic website functionality.
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={`${highContrast ? 'bg-black border-b-2 border-white' : 'bg-slate-900'} text-white py-8`} role="banner">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className={`font-bold text-teal-400 mb-2 ${largeText ? 'text-5xl' : 'text-4xl'}`}>
            Hack The SOC
          </h1>
          <p className={largeText ? 'text-xl' : 'text-lg'}>
            Comprehensive Privacy Policy & Accessibility Statement
          </p>
        </div>
      </header>

      {/* Navigation */}
      <nav 
        className="bg-slate-100 py-4 sticky top-0 z-30"
        role="navigation" 
        aria-label="Main navigation"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { href: '#privacyPolicy', text: 'Privacy Policy' },
              { href: '#cookiePolicy', text: 'Cookie Policy' },
              { href: '#accessibilityStatement', text: 'Accessibility Statement' },
              { href: '#dataRequest', text: 'Data Request Form' }
            ].map((link) => (
              <a 
                key={link.href}
                href={link.href} 
                className={linkClasses}
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                {link.text}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" className="max-w-6xl mx-auto px-4 py-8" role="main">
        
        {/* Welcome Section */}
        <section className="mb-12" aria-labelledby="welcome-heading">
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle id="welcome-heading" className={`${largeText ? 'text-3xl' : 'text-2xl'} text-teal-600`}>
                Welcome to Our Privacy & Accessibility Center
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg">
                Your privacy and website accessibility are important to us. This page contains our complete privacy policy, 
                cookie usage information, accessibility statement, and tools for managing your personal data.
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Privacy Policy Section */}
        <section id="privacyPolicy" className="mb-12" aria-labelledby="privacy-heading">
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle id="privacy-heading" className={`${largeText ? 'text-3xl' : 'text-2xl'} flex items-center gap-2`}>
                <Shield className="w-6 h-6 text-teal-600" />
                Privacy Policy
              </CardTitle>
              <p className="text-sm text-slate-600">Last Updated: {lastUpdated}</p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  1. Information We Collect
                </h3>
                <p className="mb-4">We collect the following types of personal information:</p>
                <ul className="space-y-2 ml-6 list-disc">
                  <li><strong>Personal Information You Provide:</strong> Name, email address, phone number, and any information you submit through contact forms or registration.</li>
                  <li><strong>Automatically Collected Information:</strong> IP address, browser type, device information, and usage data through cookies and similar technologies.</li>
                  <li><strong>Technical Data:</strong> Log files, page views, time spent on site, and interaction patterns for analytics purposes.</li>
                </ul>
              </div>

              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  2. How We Use Your Information
                </h3>
                <ul className="space-y-2 ml-6 list-disc">
                  <li>Provide and improve our cybersecurity training services</li>
                  <li>Communicate with you about your account and our services</li>
                  <li>Send educational content and platform updates (with your consent)</li>
                  <li>Analyze website usage to enhance user experience</li>
                  <li>Ensure platform security and prevent fraud</li>
                  <li>Comply with legal obligations and protect our rights</li>
                </ul>
              </div>

              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  3. Information Sharing
                </h3>
                <p className="mb-3">We may share your information with:</p>
                <ul className="space-y-2 ml-6 list-disc">
                  <li><strong>Service Providers:</strong> Cloud hosting, email delivery, payment processing, and analytics services</li>
                  <li><strong>Analytics Partners:</strong> Google Analytics and similar services (anonymized data)</li>
                  <li><strong>Legal Compliance:</strong> When required by law, court order, or to protect our legal rights</li>
                  <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                </ul>
              </div>

              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  4. Data Security
                </h3>
                <p className="mb-3">We implement comprehensive security measures including:</p>
                <ul className="space-y-2 ml-6 list-disc">
                  <li>SSL/TLS encryption for data transmission</li>
                  <li>Secure server infrastructure with regular updates</li>
                  <li>Access controls and authentication systems</li>
                  <li>Regular security audits and vulnerability assessments</li>
                  <li>Employee training on data protection practices</li>
                </ul>
              </div>

              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  5. Your Rights
                </h3>
                <p className="mb-3">Under applicable privacy laws, you have the right to:</p>
                <ul className="space-y-2 ml-6 list-disc">
                  <li><strong>Access:</strong> Request a copy of personal data we hold about you</li>
                  <li><strong>Rectification:</strong> Correct inaccurate or incomplete information</li>
                  <li><strong>Erasure:</strong> Request deletion of your personal data</li>
                  <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format</li>
                  <li><strong>Object:</strong> Opt-out of certain processing activities</li>
                  <li><strong>Withdraw Consent:</strong> Remove consent for marketing communications</li>
                </ul>
              </div>

              <div className={`p-4 rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-slate-100'}`}>
                <h4 className="font-semibold mb-2">Contact Information</h4>
                <p className="mb-2">For privacy-related inquiries, contact our Data Protection Officer:</p>
                <div className="space-y-1">
                  <p>Email: <a href="mailto:privacy@hackthesoc.com" className={linkClasses}>privacy@hackthesoc.com</a></p>
                  <p>Phone: <a href="tel:+1-555-123-4567" className={linkClasses}>+1 (555) 123-4567</a></p>
                  <p>Response Time: Within 30 days of receipt</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cookie Policy Section */}
        <section id="cookiePolicy" className="mb-12" aria-labelledby="cookie-heading">
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle id="cookie-heading" className={`${largeText ? 'text-3xl' : 'text-2xl'} text-teal-600`}>
                Cookie Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  What Are Cookies?
                </h3>
                <p>
                  Cookies are small text files stored on your device when you visit our website. They help us provide you with a better experience by remembering your preferences and analyzing site usage.
                </p>
              </div>

              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  Types of Cookies We Use
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Essential Cookies (Always Active)</h4>
                    <p>Required for basic website functionality, security, and user authentication. These cannot be disabled.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Analytics Cookies (Optional)</h4>
                    <p>Help us understand how visitors use our site through Google Analytics and similar tools. Data is anonymized.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Functional Cookies (Optional)</h4>
                    <p>Remember your preferences, language settings, and customization options.</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg mb-2">Marketing Cookies (Optional)</h4>
                    <p>Used to deliver relevant advertisements and measure campaign effectiveness.</p>
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-l-4 border-yellow-500 ${highContrast ? 'bg-gray-900' : 'bg-yellow-50'}`}>
                <p className="font-semibold">Note:</p>
                <p>Disabling certain cookies may affect website functionality and your user experience.</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Accessibility Statement Section */}
        <section id="accessibilityStatement" className="mb-12" aria-labelledby="accessibility-heading">
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle id="accessibility-heading" className={`${largeText ? 'text-3xl' : 'text-2xl'} text-teal-600`}>
                Accessibility Statement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  Our Commitment
                </h3>
                <p>
                  Hack The SOC is committed to ensuring digital accessibility for people with disabilities. We continually improve user experience for everyone and apply relevant accessibility standards.
                </p>
              </div>

              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  Conformance Status
                </h3>
                <p>
                  This website conforms to <abbr title="Web Content Accessibility Guidelines">WCAG</abbr> 2.1 Level AA standards. 
                  These guidelines explain how to make web content accessible to people with disabilities.
                </p>
              </div>

              <div>
                <h3 className={`${largeText ? 'text-2xl' : 'text-xl'} font-semibold mb-3 text-teal-600`}>
                  Accessibility Features
                </h3>
                <ul className="space-y-2 ml-6 list-disc">
                  <li><strong>Keyboard Navigation:</strong> Full website functionality available via keyboard</li>
                  <li><strong>Screen Reader Support:</strong> Compatible with NVDA, JAWS, VoiceOver, and TalkBack</li>
                  <li><strong>High Contrast Mode:</strong> Available through accessibility controls</li>
                  <li><strong>Scalable Text:</strong> Text can be enlarged up to 200% without loss of functionality</li>
                  <li><strong>Alternative Text:</strong> All images include descriptive alt text</li>
                  <li><strong>Form Labels:</strong> All form elements properly labeled and described</li>
                  <li><strong>Heading Structure:</strong> Logical heading hierarchy for navigation</li>
                  <li><strong>Focus Indicators:</strong> Visible focus indicators for all interactive elements</li>
                </ul>
              </div>

              <div className={`p-4 rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-slate-100'}`}>
                <h4 className="font-semibold mb-2">Feedback and Contact</h4>
                <p className="mb-2">We welcome feedback on accessibility. If you encounter barriers or have suggestions:</p>
                <div className="space-y-1">
                  <p>Email: <a href="mailto:accessibility@hackthesoc.com" className={linkClasses}>accessibility@hackthesoc.com</a></p>
                  <p>Phone: <a href="tel:+1-555-123-4568" className={linkClasses}>+1 (555) 123-4568</a></p>
                  <p>Expected Response: Within 2 business days</p>
                </div>
              </div>

              <p><strong>Last Updated:</strong> {lastUpdated}</p>
            </CardContent>
          </Card>
        </section>

        {/* Data Request Form Section */}
        <section id="dataRequest" className="mb-12" aria-labelledby="data-request-heading">
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle id="data-request-heading" className={`${largeText ? 'text-3xl' : 'text-2xl'} flex items-center gap-2`}>
                <User className="w-6 h-6 text-teal-600" />
                Data Subject Request Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-6">
                Use this form to exercise your privacy rights regarding your personal data.
              </p>
              
              {formStatus && (
                <div className={`p-4 rounded-lg mb-6 border ${
                  highContrast ? 'bg-green-900 border-green-400 text-green-100' : 'bg-green-50 border-green-200 text-green-800'
                }`} role="status">
                  {formStatus}
                </div>
              )}
              
              <form onSubmit={handleSubmit} noValidate className="space-y-6">
                <fieldset className="space-y-4">
                  <legend className={`${largeText ? 'text-xl' : 'text-lg'} font-semibold mb-4`}>
                    Personal Information
                  </legend>
                  
                  <div>
                    <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => handleInputChange('fullName', e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={formErrors.fullName ? 'true' : 'false'}
                      aria-describedby={formErrors.fullName ? 'fullName-error' : undefined}
                      className={highContrast ? 'bg-black border-white text-white' : ''}
                    />
                    {formErrors.fullName && (
                      <div id="fullName-error" className="text-red-500 text-sm mt-1" role="alert">
                        {formErrors.fullName}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={formErrors.email ? 'true' : 'false'}
                      aria-describedby="email-help"
                      className={highContrast ? 'bg-black border-white text-white' : ''}
                    />
                    <div id="email-help" className="text-sm text-slate-600 mt-1">
                      We'll use this email to respond to your request
                    </div>
                    {formErrors.email && (
                      <div id="email-error" className="text-red-500 text-sm mt-1" role="alert">
                        {formErrors.email}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium mb-1">
                      Phone Number (Optional)
                    </label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      aria-describedby="phone-help"
                      className={highContrast ? 'bg-black border-white text-white' : ''}
                    />
                    <div id="phone-help" className="text-sm text-slate-600 mt-1">
                      Include country code for international numbers
                    </div>
                  </div>
                </fieldset>

                <fieldset className="space-y-4">
                  <legend className={`${largeText ? 'text-xl' : 'text-lg'} font-semibold mb-4`}>
                    Request Details
                  </legend>

                  <div>
                    <label htmlFor="requestType" className="block text-sm font-medium mb-1">
                      Type of Request <span className="text-red-500">*</span>
                    </label>
                    <Select 
                      value={formData.requestType} 
                      onValueChange={(value) => handleInputChange('requestType', value)}
                    >
                      <SelectTrigger 
                        className={highContrast ? 'bg-black border-white text-white' : ''}
                        aria-invalid={formErrors.requestType ? 'true' : 'false'}
                      >
                        <SelectValue placeholder="Please select a request type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="access">Access - Request copy of my data</SelectItem>
                        <SelectItem value="rectification">Rectification - Correct my information</SelectItem>
                        <SelectItem value="erasure">Erasure - Delete my data</SelectItem>
                        <SelectItem value="portability">Portability - Transfer my data</SelectItem>
                        <SelectItem value="object">Object - Stop processing my data</SelectItem>
                        <SelectItem value="restrict">Restrict - Limit how you use my data</SelectItem>
                      </SelectContent>
                    </Select>
                    {formErrors.requestType && (
                      <div className="text-red-500 text-sm mt-1" role="alert">
                        {formErrors.requestType}
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="details" className="block text-sm font-medium mb-1">
                      Request Details <span className="text-red-500">*</span>
                    </label>
                    <Textarea
                      id="details"
                      value={formData.details}
                      onChange={(e) => handleInputChange('details', e.target.value)}
                      required
                      aria-required="true"
                      aria-invalid={formErrors.details ? 'true' : 'false'}
                      aria-describedby="details-help"
                      placeholder="Please provide specific details about your request..."
                      className={`min-h-32 ${highContrast ? 'bg-black border-white text-white' : ''}`}
                    />
                    <div id="details-help" className="text-sm text-slate-600 mt-1">
                      Provide as much detail as possible to help us process your request efficiently
                    </div>
                    {formErrors.details && (
                      <div className="text-red-500 text-sm mt-1" role="alert">
                        {formErrors.details}
                      </div>
                    )}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className={`${largeText ? 'text-xl' : 'text-lg'} font-semibold mb-4`}>
                    Verification
                  </legend>
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="verification"
                      checked={formData.verification}
                      onCheckedChange={(checked) => handleInputChange('verification', checked)}
                      required
                      aria-required="true"
                      aria-invalid={formErrors.verification ? 'true' : 'false'}
                    />
                    <label htmlFor="verification" className="text-sm leading-5">
                      I confirm that I am the data subject or authorized to make this request on behalf of the data subject <span className="text-red-500">*</span>
                    </label>
                  </div>
                  {formErrors.verification && (
                    <div className="text-red-500 text-sm mt-1" role="alert">
                      {formErrors.verification}
                    </div>
                  )}
                </fieldset>

                <div className="flex gap-4">
                  <Button 
                    type="submit" 
                    className="bg-teal-600 hover:bg-teal-700"
                    aria-describedby="submit-help"
                  >
                    Submit Request
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        fullName: '',
                        email: '',
                        phone: '',
                        requestType: '',
                        details: '',
                        verification: false
                      });
                      setFormErrors({});
                      setFormStatus('');
                    }}
                  >
                    Clear Form
                  </Button>
                </div>
                <div id="submit-help" className="text-sm text-slate-600">
                  We will respond to your request within 30 days
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        {/* Data Breach Notice Section */}
        <section id="dataBreachNotice" className="mb-12" aria-labelledby="breach-heading">
          <Card className={cardClasses}>
            <CardHeader>
              <CardTitle id="breach-heading" className={`${largeText ? 'text-3xl' : 'text-2xl'} flex items-center gap-2`}>
                <AlertTriangle className="w-6 h-6 text-red-500" />
                Data Breach Notification Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`p-6 rounded-lg border-l-4 border-red-500 ${
                highContrast ? 'bg-red-900 text-red-100' : 'bg-red-50'
              }`} role="alert">
                <h3 className="text-xl font-semibold mb-4">Data Security Incident Notice</h3>
                
                <div className="space-y-4">
                  <div>
                    <p><strong>Date of Notice:</strong> [Date]</p>
                    <p><strong>Incident Discovery:</strong> [Date and Time]</p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">What Happened</h4>
                    <p>
                      We experienced a data security incident that may have affected some of your personal information. 
                      We discovered [brief description of incident] and immediately took steps to secure our systems.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">Information Involved</h4>
                    <p className="mb-2">The incident may have involved the following types of information:</p>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>[List specific data types affected]</li>
                      <li>Names and contact information</li>
                      <li>Account credentials (encrypted)</li>
                      <li>Usage and activity data</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">What We Are Doing</h4>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Immediately secured the affected systems</li>
                      <li>Launched comprehensive investigation with cybersecurity experts</li>
                      <li>Notified law enforcement and regulatory authorities</li>
                      <li>Implemented additional security measures</li>
                      <li>Offering credit monitoring services (if applicable)</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-lg mb-2">What You Should Do</h4>
                    <ul className="list-disc ml-6 space-y-1">
                      <li>Change your account password immediately</li>
                      <li>Monitor your accounts for suspicious activity</li>
                      <li>Consider placing fraud alerts on credit reports</li>
                      <li>Report any suspicious activity to us immediately</li>
                    </ul>
                  </div>

                  <div className={`p-4 rounded-lg ${highContrast ? 'bg-gray-900 border border-white' : 'bg-slate-100'}`}>
                    <h4 className="font-semibold mb-2">Contact Information</h4>
                    <p className="mb-2">For questions or concerns about this incident:</p>
                    <div className="space-y-1">
                      <p>Email: <a href="mailto:security@hackthesoc.com" className={linkClasses}>security@hackthesoc.com</a></p>
                      <p>Phone: <a href="tel:+1-555-123-4569" className={linkClasses}>+1 (555) 123-4569</a></p>
                      <p>Available: 24/7 for incident-related inquiries</p>
                    </div>
                  </div>

                  <p>
                    We sincerely apologize for this incident and any inconvenience it may cause. Your trust is important to us, 
                    and we are committed to preventing similar incidents in the future.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className={`${highContrast ? 'bg-black border-t-2 border-white' : 'bg-slate-900'} text-white py-8 mt-12`} role="contentinfo">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex flex-wrap justify-center gap-6 mb-6" role="navigation" aria-label="Footer navigation">
            {[
              { href: '#privacyPolicy', text: 'Privacy Policy' },
              { href: '#cookiePolicy', text: 'Cookie Policy' },
              { href: '#accessibilityStatement', text: 'Accessibility Statement' },
              { href: '#dataRequest', text: 'Data Request Form' },
              { href: 'mailto:legal@hackthesoc.com', text: 'Legal Contact' }
            ].map((link) => (
              <a 
                key={link.href}
                href={link.href} 
                className="text-teal-400 hover:text-teal-300 font-medium"
                onClick={link.href.startsWith('#') ? (e) => {
                  e.preventDefault();
                  document.querySelector(link.href)?.scrollIntoView({ behavior: 'smooth' });
                } : undefined}
              >
                {link.text}
              </a>
            ))}
          </nav>
          <div className="text-center text-slate-400">
            <p>&copy; 2025 Hack The SOC. All rights reserved.</p>
            <p>Last Updated: {lastUpdated}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}