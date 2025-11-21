
import React, { useState, useEffect } from 'react';
import { LegalDocument } from '@/entities/LegalDocument';
import { InvokeLLM } from '@/integrations/Core'; // Added import for InvokeLLM
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // This is the Shadcn UI Calendar component
import {
  FileText,
  Edit,
  Save,
  Plus,
  Globe,
  Shield,
  Cookie,
  Calendar as CalendarIcon, // This is the lucide-react Calendar icon
  Eye,
  ToggleLeft,
  AlertTriangle,
  Languages, // Added import for Languages icon
} from 'lucide-react';
import { useNotification } from './Notification'; // Assuming you have a notification hook

export default function LegalDocumentManager() {
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: '',
    content: '',
    language: 'he',
    is_active: true,
    last_updated: new Date(), // Initialize with current date
    metadata: {
      cookie_banner_enabled: true,
      show_on_footer: true,
      requires_consent: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoTranslate, setAutoTranslate] = useState(true); // New state for translation toggle
  const [showNotification, NotificationComponent] = useNotification(); // Corrected destructuring

  const documentTypes = [
    {
      id: 'privacy_policy',
      name: 'מדיניות פרטיות',
      icon: Shield,
      defaultTitle: 'מדיניות פרטיות',
      defaultContent: getDefaultPrivacyPolicyContent
    },
    {
      id: 'cookie_policy',
      name: 'מדיניות עוגיות',
      icon: Cookie,
      defaultTitle: 'מדיניות עוגיות',
      defaultContent: getDefaultCookiePolicyContent
    },
    {
      id: 'accessibility_statement',
      name: 'הצהרת נגישות',
      icon: Globe,
      defaultTitle: 'הצהרת נגישות',
      defaultContent: getDefaultAccessibilityContent
    },
    {
      id: 'data_request_form',
      name: 'טופס בקשת מידע',
      icon: FileText,
      defaultTitle: 'טופס בקשת נתונים אישיים',
      defaultContent: 'תוכן הוראות טופס בקשת מידע...'
    },
    {
      id: 'security_breach_template',
      name: 'תבנית הודעת אירוע אבטחה',
      icon: AlertTriangle,
      defaultTitle: 'הודעה על אירוע אבטחת מידע',
      defaultContent: getDefaultBreachNoticeContent
    }
  ];

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await LegalDocument.list();
      setDocuments(docs || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      showNotification('שגיאה בטעינת המסמכים', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getDocumentByType = (type, language = 'he') => {
    return documents.find(doc =>
      doc.document_type === type &&
      doc.language === language
    );
  };

  const startEditing = (documentType, language = 'he') => {
    const existingDoc = getDocumentByType(documentType, language);
    const docTypeInfo = documentTypes.find(dt => dt.id === documentType);

    if (existingDoc) {
      // Convert HTML back to plain text for editing
      const plainTextContent = existingDoc.content ? existingDoc.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim() : '';
      
      setEditForm({
        id: existingDoc.id,
        title: existingDoc.title,
        content: plainTextContent,
        language: existingDoc.language,
        is_active: existingDoc.is_active,
        last_updated: existingDoc.last_updated ? new Date(existingDoc.last_updated) : new Date(),
        metadata: existingDoc.metadata || {
          cookie_banner_enabled: true,
          show_on_footer: true,
          requires_consent: false
        }
      });
    } else {
      // For new documents, provide clean plain text templates
      let defaultContent = '';
      if (typeof docTypeInfo?.defaultContent === 'function') {
        const htmlContent = docTypeInfo.defaultContent(language);
        defaultContent = htmlContent.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
      }
      
      setEditForm({
        title: docTypeInfo?.defaultTitle || '',
        content: defaultContent,
        language: language,
        is_active: true,
        last_updated: new Date(),
        metadata: {
          cookie_banner_enabled: documentType === 'cookie_policy',
          show_on_footer: true,
          requires_consent: false
        }
      });
    }

    setSelectedDocument(documentType);
    setIsEditing(true);
  };

  // Convert plain text to simple HTML formatting
  const formatPlainTextToHtml = (text) => {
    if (!text) return '';
    
    return text
      .split('\n\n') // Split by double newlines for paragraphs
      .map(paragraph => paragraph.trim())
      .filter(paragraph => paragraph.length > 0)
      .map(paragraph => {
        // Check if it looks like a heading (starts with number or is short and doesn't end with period)
        if (paragraph.match(/^\d+\.\s/) || (paragraph.length < 80 && !paragraph.endsWith('.'))) {
          return `<h3 class="text-white font-semibold text-lg mb-3 mt-6">${paragraph}</h3>`;
        }
        // Regular paragraph
        return `<p class="text-slate-300 mb-4 leading-relaxed">${paragraph}</p>`;
      })
      .join('');
  };

  const saveDocument = async () => {
    try {
      setSaving(true);
      showNotification('שומר מסמך...', 'info');

      // 1. Save the currently edited document
      const htmlContent = formatPlainTextToHtml(editForm.content);
      const documentData = {
        document_type: selectedDocument,
        language: editForm.language,
        title: editForm.title,
        content: htmlContent,
        is_active: editForm.is_active,
        version: generateVersion(),
        last_updated: editForm.last_updated.toISOString(), // Use the date from the form
        metadata: editForm.metadata
      };

      let savedDoc;
      if (editForm.id) {
        savedDoc = await LegalDocument.update(editForm.id, documentData);
      } else {
        savedDoc = await LegalDocument.create(documentData);
      }
      showNotification('המסמך נשמר בהצלחה!', 'success');

      // 2. If auto-translate is on, translate and save the other version
      if (autoTranslate) {
        await handleAutoTranslation(savedDoc, documentData);
      }

      await loadDocuments();
      setIsEditing(false);
      setSelectedDocument(null);

    } catch (error) {
      console.error('Error saving document:', error);
      showNotification('שגיאה בשמירת המסמך', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAutoTranslation = async (savedDoc, sourceData) => {
    try {
      showNotification('מתרגם לגרסה השנייה...', 'info');
      const sourceLang = sourceData.language;
      const targetLang = sourceLang === 'he' ? 'en' : 'he';
      
      const sourceLangName = sourceLang === 'he' ? 'עברית' : 'אנגלית';
      const targetLangName = targetLang === 'he' ? 'עברית' : 'אנגלית';

      // Translate content
      const contentPrompt = `Translate the following legal/policy document content from ${sourceLangName} to ${targetLangName}. Maintain the structure, meaning, and professional tone. Only return the translated text.\n\n${editForm.content}`;
      const translatedContentText = await InvokeLLM({ prompt: contentPrompt });
      const translatedContentHtml = formatPlainTextToHtml(translatedContentText);

      // Translate title
      const titlePrompt = `Translate the following legal/policy document title from ${sourceLangName} to ${targetLangName}. Only return the translated title.\n\n${sourceData.title}`;
      const translatedTitle = await InvokeLLM({ prompt: titlePrompt });

      const targetData = {
        ...sourceData,
        language: targetLang,
        title: translatedTitle,
        content: translatedContentHtml,
        // The version should also be updated or re-generated for the translated doc
        version: generateVersion(),
        last_updated: new Date().toISOString(), // Update last_updated for the translated document
      };
      
      const [targetDoc] = await LegalDocument.filter({ document_type: selectedDocument, language: targetLang });

      if (targetDoc) {
        await LegalDocument.update(targetDoc.id, targetData);
      } else {
        await LegalDocument.create(targetData);
      }
      showNotification('התרגום בוצע בהצלחה!', 'success');

    } catch (err) {
      console.error("Auto-translation failed:", err);
      showNotification("התרגום האוטומטי נכשל. אנא עדכן את הגרסה השנייה ידנית.", "error");
    }
  };

  const generateVersion = () => {
    return `v${new Date().getFullYear()}.${(new Date().getMonth() + 1).toString().padStart(2, '0')}.${new Date().getDate().toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const DocumentCard = ({ docType }) => {
    const docHe = getDocumentByType(docType.id, 'he');
    const docEn = getDocumentByType(docType.id, 'en');
    const Icon = docType.icon;

    return (
      <Card className="bg-slate-800 border-slate-700 hover:border-teal-500/50 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="w-6 h-6 text-teal-400" />
              <CardTitle className="text-lg text-white">{docType.name}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {(docHe?.is_active || docEn?.is_active) && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  פעיל
                </Badge>
              )}
              {docHe?.metadata?.cookie_banner_enabled && docType.id === 'cookie_policy' && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  באנר מופעל
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Hebrew Version */}
            <div className="border border-slate-600 rounded p-3">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                🇮🇱 עברית
              </h4>
              {docHe ? (
                <div className="space-y-2">
                  <div className="text-sm text-slate-300">
                    <p><strong>גרסה:</strong> {docHe.version}</p>
                    <p><strong>עדכון:</strong> {formatDate(docHe.last_updated)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startEditing(docType.id, 'he')}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      עריכה
                    </Button>
                    <Button
                      onClick={() => window.open(`/legal/${docType.id}/he`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      תצוגה מקדימה
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => startEditing(docType.id, 'he')}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  יצירה
                </Button>
              )}
            </div>

            {/* English Version */}
            <div className="border border-slate-600 rounded p-3">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                🇺🇸 English
              </h4>
              {docEn ? (
                <div className="space-y-2">
                  <div className="text-sm text-slate-300">
                    <p><strong>Version:</strong> {docEn.version}</p>
                    <p><strong>Updated:</strong> {formatDate(docEn.last_updated)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => startEditing(docType.id, 'en')}
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      onClick={() => window.open(`/legal/${docType.id}/en`, '_blank')}
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  onClick={() => startEditing(docType.id, 'en')}
                  size="sm"
                  className="bg-teal-600 hover:bg-teal-700"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Create
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto"></div>
        <p className="text-white mt-4">טוען מסמכים משפטיים...</p>
      </div>
    );
  }

  return (
    <>
      <NotificationComponent /> {/* Render the notification component */}
      <div className="space-y-6" dir="rtl">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-teal-400" />
              ניהול מסמכים משפטיים ונגישות
            </CardTitle>
            <p className="text-slate-400">
              נהלו את מדיניות הפרטיות, הצהרת הנגישות, מדיניות העוגיות וטפסי הבקשות של האתר
            </p>
          </CardHeader>
        </Card>

        {!isEditing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentTypes.map((docType) => (
              <DocumentCard key={docType.id} docType={docType} />
            ))}
          </div>
        ) : (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl text-white">
                  עריכת {documentTypes.find(dt => dt.id === selectedDocument)?.name}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsEditing(false)}
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                  >
                    ביטול
                  </Button>
                  <Button
                    onClick={saveDocument}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    {saving ? 'שומר...' : 'שמור'}
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2 lg:col-span-2">
                  <label className="text-sm font-semibold text-white">כותרת המסמך</label>
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({...editForm, title: e.target.value})}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">שפה</label>
                  <Select
                    value={editForm.language}
                    onValueChange={(value) => setEditForm({...editForm, language: value})}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="he">עברית</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">סטטוס</label>
                  <div className="flex items-center gap-2 p-2 h-10">
                    <Switch
                      checked={editForm.is_active}
                      onCheckedChange={(checked) => setEditForm({...editForm, is_active: checked})}
                    />
                    <span className="text-white text-sm">
                      {editForm.is_active ? 'פעיל' : 'לא פעיל'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white">תאריך עדכון אחרון</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className="w-full justify-start text-left font-normal bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:text-white"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {editForm.last_updated ? format(new Date(editForm.last_updated), "PPP") : <span>בחר תאריך</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-600 text-white" align="start">
                      <Calendar
                        mode="single"
                        selected={editForm.last_updated ? new Date(editForm.last_updated) : null}
                        onSelect={(date) => setEditForm({ ...editForm, last_updated: date })}
                        initialFocus
                        classNames={{
                          months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 p-4',
                          month: 'space-y-4',
                          caption: 'flex justify-center pt-1 relative items-center',
                          caption_label: 'text-sm font-medium text-white',
                          nav: 'space-x-1 flex items-center',
                          nav_button: 'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white',
                          nav_button_previous: 'absolute left-1',
                          nav_button_next: 'absolute right-1',
                          table: 'w-full border-collapse space-y-1',
                          head_row: 'flex',
                          head_cell: 'text-slate-400 rounded-md w-9 font-normal text-[0.8rem]',
                          row: 'flex w-full mt-2',
                          cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-slate-600 rounded-md focus-within:relative focus-within:z-20',
                          day: 'h-9 w-9 p-0 font-normal aria-selected:opacity-100 text-white hover:bg-slate-700 rounded-md',
                          day_selected: 'bg-teal-600 text-white hover:bg-teal-600 focus:bg-teal-600',
                          day_today: 'bg-slate-700 text-white rounded-md',
                          day_outside: 'text-slate-500 opacity-50',
                          day_disabled: 'text-slate-500 opacity-50',
                          day_hidden: 'invisible',
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Special Settings for Cookie Policy */}
              {selectedDocument === 'cookie_policy' && (
                <div className="bg-slate-700/30 p-4 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">הגדרות מיוחדות - מדיניות עוגיות</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">הצג באנר הסכמה לעוגיות</span>
                      <Switch
                        checked={editForm.metadata.cookie_banner_enabled}
                        onCheckedChange={(checked) => setEditForm({
                          ...editForm,
                          metadata: {...editForm.metadata, cookie_banner_enabled: checked}
                        })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">הצג קישור בפוטר</span>
                      <Switch
                        checked={editForm.metadata.show_on_footer}
                        onCheckedChange={(checked) => setEditForm({
                          ...editForm,
                          metadata: {...editForm.metadata, show_on_footer: checked}
                        })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Auto-translate toggle */}
              <div className="bg-slate-700/30 p-4 rounded-lg space-y-3">
                <h3 className="text-white font-semibold">הגדרות סנכרון</h3>
                <div className="flex items-center justify-between">
                  <label htmlFor="auto-translate" className="text-slate-300 flex items-center gap-2">
                    <Languages className="w-4 h-4" />
                    סנכרן ותרגם אוטומטית לגרסה השנייה
                  </label>
                  <Switch
                    id="auto-translate"
                    checked={autoTranslate}
                    onCheckedChange={setAutoTranslate}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">תוכן המסמך</label>
                <Textarea
                  value={editForm.content}
                  onChange={(e) => setEditForm({...editForm, content: e.target.value})}
                  className="bg-slate-700 border-slate-600 text-white h-96 text-sm leading-relaxed"
                  placeholder="הזינו את תוכן המסמך כטקסט רגיל.
                  
דוגמה לעיצוב:

1. כותרת ראשית
תוכן הפסקה הראשונה.

2. כותרת שנייה  
תוכן הפסקה השנייה.

השאירו שורה ריקה בין פסקאות לעיצוב טוב יותר."
                />
                <p className="text-slate-400 text-xs">
                  כתבו טקסט רגיל. כותרות יזוהו אוטומטית (שורות קצרות או שמתחילות במספר). השאירו שורה ריקה בין פסקאות.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

// Default content functions
function getDefaultPrivacyPolicyContent(lang = 'he') {
  const platformName = "Hack The SOC";
  if (lang === 'en') {
    return `Privacy Policy - ${platformName} Cybersecurity Learning Platform

1. General
The ${platformName} platform (hereinafter: "the Platform") operates to provide online cybersecurity courses, content, and training services to users in Israel and abroad. Protecting the privacy of our users' personal information is a core value for us, and we operate in accordance with the Israeli Privacy Protection Law, 1981, the Privacy Protection (Data Security) Regulations, 2017, the provisions of the new amendment (Amendment 13 - 2025), and, where relevant, the GDPR.

2. Types of Information We Collect

2.1 Personal Information Provided by the User
Full name, email address, phone number, country, password, payment details (without storing full credit card numbers).

2.2 Platform Activity Information
Course history, lessons viewed, tests, achievements, comments, forum posts.

2.3 Technical and Analytical Information
IP address, browser type, operating system, Cookies data, device identifiers, login times, pages viewed.

2.4 Third-Party Information
If the user registers via an external account (Google / Facebook / LinkedIn), we receive basic profile details according to the granted permissions.

3. Purposes of Using Information

3.1 To operate the Platform and provide services to users.
3.2 To manage user accounts, payments, and support.
3.3 To personalize content, recommendations, and services.
3.4 To send updates, notifications, and marketing information – subject to user consent.
3.5 To comply with legal requirements, prevent fraud, and ensure data security.

4. Sharing Information with Third Parties

4.1 Infrastructure, storage, payment processing, mailing, and analytics providers.
4.2 Competent authorities – if required by law.
4.3 Training and content partners – with explicit consent only.

5. Data Retention
Information is retained for the period necessary to provide the services or to comply with legal obligations.

6. Data Security
We implement physical, technological, and organizational security measures, including encryption, access control management, periodic penetration testing, real-time monitoring, encrypted backups, and a strong password policy.

7. User Rights
Right to access your information.
Right to correct or delete information.
Right to object to data processing.
Right to data portability (in the case of GDPR).

For inquiries, please contact: support@hackthesoc.com`;
  }
  
  return `מדיניות פרטיות - פלטפורמת ${platformName} להדרכות סייבר

1. כללי
פלטפורמת ${platformName} (להלן: "הפלטפורמה") פועלת לספק קורסים, תכנים ושירותי הדרכה בתחום הסייבר, באופן מקוון, לגולשים בישראל ובחו"ל. שמירה על פרטיות המידע האישי של המשתמשים היא ערך יסוד עבורנו, ואנו פועלים בהתאם לחוק הגנת הפרטיות, התשמ"א–1981, תקנות הגנת הפרטיות (אבטחת מידע), התשע"ז–2017, הוראות התיקון החדש (תיקון 13 – 2025), ובמקרים הרלוונטיים גם בהתאם ל-GDPR.

2. סוגי המידע שאנו אוספים

2.1 מידע אישי שמוסר המשתמש
שם מלא, כתובת דוא"ל, מספר טלפון, מדינה, סיסמה, פרטי תשלום (ללא שמירת נתוני כרטיס אשראי מלאים).

2.2 מידע על פעילות בפלטפורמה
היסטוריית קורסים, שיעורים שנצפו, מבחנים, הישגים, תגובות, הודעות בפורומים.

2.3 מידע טכני ואנליטי
כתובת IP, סוג דפדפן, מערכת הפעלה, נתוני Cookies, מזהי מכשיר, זמני התחברות, דפים שנצפו.

2.4 מידע מצד שלישי
במידה והמשתמש נרשם באמצעות חשבון חיצוני (Google / Facebook / LinkedIn) אנו מקבלים פרטי פרופיל בסיסיים בהתאם להרשאות שניתנו.

3. מטרות השימוש במידע

3.1 הפעלת הפלטפורמה ומתן השירותים למשתמשים.
3.2 ניהול חשבונות משתמשים, תשלומים ותמיכה.
3.3 התאמה אישית של תכנים, המלצות ושירותים.
3.4 שליחת עדכונים, התראות ומידע שיווקי – בכפוף להסכמת המשתמש.
3.5 עמידה בהוראות דין, מניעת הונאות ואבטחת מידע.

4. שיתוף מידע עם צדדים שלישיים

4.1 ספקי תשתית, אחסון, סליקה, שליחת דיוור ואנליטיקה.
4.2 רשויות מוסמכות – במידה ונדרש על פי דין.
4.3 שותפי הדרכה ותוכן – בהסכמה מפורשת בלבד.

5. שמירת מידע
המידע נשמר למשך הזמן הנדרש לצורך מתן השירותים או לעמידה בחובות משפטיות.

6. אבטחת מידע
אנו נוקטים באמצעי הגנה פיזיים, טכנולוגיים וארגוניים, לרבות הצפנה, ניהול הרשאות, בדיקות חדירה תקופתיות, ניטור בזמן אמת, גיבויים מוצפנים ומדיניות סיסמאות חזקה.

7. זכויות המשתמש
זכות עיון במידע.
זכות לתקן או למחוק מידע.
זכות להתנגד לעיבוד מידע.
זכות לניידות מידע (במקרה של GDPR).

פניות ניתן לשלוח לכתובת: support@hackthesoc.com`;
}

function getDefaultCookiePolicyContent(lang = 'he') {
  const platformName = "Hack The SOC";
  if (lang === 'en') {
    return `Cookie Policy - ${platformName}

1. What Are Cookies?
Cookies are small text files stored on your browser that allow us to enhance your user experience on the ${platformName} platform.

2. Types of Cookies We Use

Essential Cookies
Enable basic platform functionality (login, navigation, saving settings).

Analytics Cookies
Help us understand how users interact with the site and improve the service.

Marketing Cookies
Used to tailor offers and courses, subject to consent.

3. Managing Cookies
You can change your cookie settings at any time via the "Manage Cookie Preferences" link at the bottom of the site.`;
  }
  
  return `מדיניות Cookies - ${platformName}

1. מהם Cookies?
Cookies הם קבצי טקסט קטנים הנשמרים בדפדפן שלך ומאפשרים לנו לשפר את חוויית השימוש בפלטפורמת ${platformName}.

2. סוגי Cookies בהם אנו משתמשים

חיוניות (Essential)
מאפשרות שימוש בסיסי בפלטפורמה (התחברות, ניווט, שמירת הגדרות).

אנליטיות (Analytics)
מסייעות להבין כיצד המשתמשים פועלים באתר ולשפר את השירות.

שיווקיות (Marketing)
משמשות להתאמת הצעות וקורסים, בכפוף להסכמה.

3. ניהול Cookies
באפשרותך לשנות את הגדרות ה-Cookies בכל עת באמצעות קישור "ניהול העדפות Cookies" בתחתית האתר.`;
}

function getDefaultAccessibilityContent(lang = 'he') {
  const platformName = "Hack The SOC";
  if (lang === 'en') {
    return `Accessibility Statement - ${platformName}

1. Commitment to Accessibility
The ${platformName} platform is committed to enabling all individuals, including people with disabilities, to have full access to its online services. We act in accordance with the provisions of the Equal Rights for Persons with Disabilities Law, 1998, and accessibility regulations, specifically the Israeli Standard 5568 based on WCAG 2.0 Level AA.

2. Adjustments Made
Support for screen readers (NVDA, JAWS).
Full keyboard navigation.
Proper contrast ratio between text and background.
Alternative text for all images.
Option to enlarge text.
Transcripts for video tutorials.

3. Accessibility Inquiries
For accessibility issues, please contact us:
Email: Tal14997@gmail.com`;
  }
  
  return `הצהרת נגישות - ${platformName}

1. מחויבות לנגישות
פלטפורמת ${platformName} מחויבת לאפשר לכל אדם, לרבות אנשים עם מוגבלויות, גישה מלאה לשירותיה המקוונים. אנו פועלים בהתאם להוראות חוק שוויון זכויות לאנשים עם מוגבלות, התשנ"ח–1998, ותקנות הנגישות, ובפרט תקן ישראלי 5568 המבוסס על WCAG 2.0 רמה AA.

2. התאמות שבוצעו
תמיכה בקוראי מסך (NVDA, JAWS).
ניווט באמצעות מקלדת בלבד.
יחס ניגודיות תקין בין טקסט לרקע.
טקסט חלופי לכל התמונות.
אפשרות להגדלת טקסט.
תמלול לסרטוני וידאו.

3. פניות בנושא נגישות
אימייל: Tal14997@gmail.com`;
}

function getDefaultBreachNoticeContent() {
  return `
הודעה על אירוע אבטחת מידע - Hack The SOC

הודעה חשובה למשתמשי פלטפורמת Hack The SOC

תאריך האירוע: [תאריך]
תאריך הגילוי: [תאריך]
תאריך ההודעה: [תאריך]

מה קרה?
בתאריך [תאריך] התגלה כי התרחש אירוע אבטחת מידע במערכות פלטפורמת Hack The SOC. כפלטפורמה המתמחה בהדרכות סייבר ואבטחה, אנו נוקטים בפרוטוקולי אבטחה מתקדמים ופעלנו מיידית בגילוי האירוע.

איזה מידע הושפע?
* [סוג המידע שנפגע - נתוני משתמשים, התקדמות בקורסים וכו']
* [פרטים נוספים על המידע]
* [היקף הפגיעה במערכת הלמידה]

מה אנחנו עושים?
* חקירה מיידית: הפעלנו צוות מומחי סייבר לחקירה מקיפה
* סגירת הפרצה: אטמנו את הפרצה וחיזקנו מערכות האבטחה
* דיווח לרשויות: דיווחנו לרשות להגנת הפרטיות ורשויות הסייבר
* שיתוף פעולה: אנו משתפים פעולה מלאה עם הרשויות והמומחים
* שיפור אבטחה: מיישמים שכבות אבטחה נוספות בפלטפורמה

מה אתם צריכים לעשות?
* החלף סיסמאות: החליפו את סיסמת חשבון Hack The SOC מיידית
* עקבו אחר חשבונותיכם: בדקו באופן קבוע את פעילות החשבונות
* היזהרו מהונאות: היו זהירים מהודעות חשודות או ניסיונות התחזות
* פנו אלינו: דווחו על כל פעילות חשודה
* עדכנו אמצעי אבטחה: כמשתמשי פלטפורמת סייבר, וודאו שגם המערכות שלכם מאובטחות

יצירת קשר
לשאלות נוספות או דיווח על פעילות חשודה:
* הוטליין חירום: 1-800-HACK-SOC
* דוא"ל: security@hackthesoc.com
* זמינות: 24/7 עד לסיום הטיפול באירוע

הודעה זו נשלחה בהתאם לחוק הגנת הפרטיות ותקנות אבטחת המידע
Hack The SOC - פלטפורמת למידה מתקדמת בתחום הסייבר והאבטחה
עודכן לאחרונה: [תאריך ושעה]
  `.trim();
}
