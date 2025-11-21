import React, { useState } from 'react';
import { DataRequest } from '@/entities/DataRequest';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, CheckCircle, Languages } from 'lucide-react';

export default function DataRequestForm() {
  const [language, setLanguage] = useState('he');
  const [formData, setFormData] = useState({
    request_type: '',
    requester_name: '',
    requester_email: '',
    requester_phone: '',
    request_details: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const requestTypes = {
    he: [
      { value: 'access', label: 'עיון במידע אישי' },
      { value: 'rectification', label: 'תיקון מידע אישי' },
      { value: 'erasure', label: 'מחיקת מידע אישי' },
      { value: 'portability', label: 'ניידות מידע (העברת נתונים)' },
      { value: 'restriction', label: 'הגבלת עיבוד מידע' },
      { value: 'objection', label: 'התנגדות לעיבוד מידע' }
    ],
    en: [
      { value: 'access', label: 'Access to personal information' },
      { value: 'rectification', label: 'Rectification of personal information' },
      { value: 'erasure', label: 'Erasure of personal information' },
      { value: 'portability', label: 'Data portability (data transfer)' },
      { value: 'restriction', label: 'Restriction of information processing' },
      { value: 'objection', label: 'Objection to information processing' }
    ]
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await DataRequest.create({
        ...formData,
        verification_method: 'email_verification'
      });
      setIsSubmitted(true);
    } catch (error) {
      console.error('Error submitting request:', error);
      alert(language === 'he' ? 'שגיאה בשליחת הבקשה' : 'Error submitting request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'he' ? 'en' : 'he');
    // Reset form when switching languages
    setFormData({
      request_type: '',
      requester_name: '',
      requester_email: '',
      requester_phone: '',
      request_details: ''
    });
    setIsSubmitted(false);
  };

  const texts = {
    he: {
      title: 'טופס בקשת נתונים אישיים',
      subtitle: 'הגש בקשה לקבלת, תיקון או מחיקת המידע האישי שלך',
      name: 'שם מלא',
      email: 'כתובת דוא"ל',
      phone: 'מספר טלפון (אופציונלי)',
      requestType: 'סוג הבקשה',
      requestTypePlaceholder: 'בחר סוג בקשה',
      details: 'פירוט הבקשה',
      detailsPlaceholder: 'אנא פרט את בקשתך כמה שיותר מדויק...',
      submit: 'שלח בקשה',
      submitting: 'שולח...',
      successTitle: 'הבקשה נשלחה בהצלחה!',
      successMessage: 'תקבל מענה תוך 30 יום כנדרש בחוק.',
      newRequest: 'הגש בקשה חדשה'
    },
    en: {
      title: 'Personal Data Request Form',
      subtitle: 'Submit a request to access, correct, or delete your personal information',
      name: 'Full Name',
      email: 'Email Address',
      phone: 'Phone Number (Optional)',
      requestType: 'Request Type',
      requestTypePlaceholder: 'Select request type',
      details: 'Request Details',
      detailsPlaceholder: 'Please specify your request as accurately as possible...',
      submit: 'Submit Request',
      submitting: 'Submitting...',
      successTitle: 'Request Submitted Successfully!',
      successMessage: 'You will receive a response within 30 days as required by law.',
      newRequest: 'Submit New Request'
    }
  };

  const t = texts[language];

  if (isSubmitted) {
    return (
      <div className="p-4 md:p-8 bg-slate-900 min-h-screen" dir={language === 'he' ? 'rtl' : 'ltr'}>
        <div className="max-w-2xl mx-auto">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center p-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-4">{t.successTitle}</h2>
              <p className="text-slate-300 mb-6">{t.successMessage}</p>
              <Button 
                onClick={() => setIsSubmitted(false)}
                className="bg-teal-600 hover:bg-teal-700"
              >
                {t.newRequest}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white" dir={language === 'he' ? 'rtl' : 'ltr'}>
      <div className="max-w-2xl mx-auto">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 text-white">
                  <FileText className="w-8 h-8 text-teal-400" />
                  {t.title}
                </CardTitle>
                <p className="text-slate-400 mt-2">{t.subtitle}</p>
              </div>
              <Button
                onClick={toggleLanguage}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Languages className="w-4 h-4 mr-2" />
                {language === 'he' ? 'English' : 'עברית'}
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">{t.name} *</label>
                <Input
                  value={formData.requester_name}
                  onChange={(e) => handleInputChange('requester_name', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">{t.email} *</label>
                <Input
                  type="email"
                  value={formData.requester_email}
                  onChange={(e) => handleInputChange('requester_email', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">{t.phone}</label>
                <Input
                  type="tel"
                  value={formData.requester_phone}
                  onChange={(e) => handleInputChange('requester_phone', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">{t.requestType} *</label>
                <Select
                  value={formData.request_type}
                  onValueChange={(value) => handleInputChange('request_type', value)}
                  required
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder={t.requestTypePlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {requestTypes[language].map(type => (
                      <SelectItem key={type.value} value={type.value} className="text-white">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">{t.details} *</label>
                <Textarea
                  value={formData.request_details}
                  onChange={(e) => handleInputChange('request_details', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white h-32"
                  placeholder={t.detailsPlaceholder}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t.submitting}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    {t.submit}
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}