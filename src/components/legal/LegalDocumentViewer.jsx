
import React, { useState, useEffect } from 'react';
import { LegalDocument } from '@/entities/LegalDocument';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, FileText, Globe, Calendar, Languages } from 'lucide-react';

export default function LegalDocumentViewer({ documentType, language = 'he' }) {
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentLanguage, setCurrentLanguage] = useState(language);

  useEffect(() => {
    loadDocument();
  }, [documentType, currentLanguage]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const documents = await LegalDocument.filter({
        document_type: documentType,
        language: currentLanguage,
        is_active: true
      });
      
      if (documents.length > 0) {
        setDocument(documents[0]);
      } else {
        setError(currentLanguage === 'he' ? 'מסמך לא נמצא' : 'Document not found');
      }
    } catch (err) {
      setError(currentLanguage === 'he' ? 'שגיאה בטעינת המסמך' : 'Error loading document');
      console.error('Error loading document:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return currentLanguage === 'he' ? 'לא צוין' : 'Not specified';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return currentLanguage === 'he' ? 'תאריך לא תקין' : 'Invalid date';
    }
    return date.toLocaleDateString(currentLanguage === 'he' ? 'he-IL' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDocumentIcon = () => {
    switch (documentType) {
      case 'privacy_policy':
        return <Shield className="w-8 h-8 text-teal-400" />;
      case 'accessibility_statement':
        return <Globe className="w-8 h-8 text-blue-400" />;
      case 'cookie_policy':
        return <FileText className="w-8 h-8 text-purple-400" />;
      default:
        return <FileText className="w-8 h-8 text-gray-400" />;
    }
  };

  const toggleLanguage = () => {
    const newLanguage = currentLanguage === 'he' ? 'en' : 'he';
    setCurrentLanguage(newLanguage);
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-slate-900 min-h-screen" dir={currentLanguage === 'he' ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mx-auto mb-4"></div>
            <p>{currentLanguage === 'he' ? 'טוען מסמך...' : 'Loading document...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="p-4 md:p-8 bg-slate-900 min-h-screen" dir={currentLanguage === 'he' ? 'rtl' : 'ltr'}>
        <div className="max-w-4xl mx-auto">
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center p-8">
              <div className="text-red-400 text-xl mb-4">{error}</div>
              <Button onClick={loadDocument} className="bg-teal-600 hover:bg-teal-700">
                {currentLanguage === 'he' ? 'נסה שוב' : 'Try Again'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white" dir={currentLanguage === 'he' ? 'rtl' : 'ltr'}>
      <div className="max-w-4xl mx-auto">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="text-center">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3 text-white">
                  {getDocumentIcon()}
                  {document.title}
                </CardTitle>
              </div>
              <Button
                onClick={toggleLanguage}
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                <Languages className="w-4 h-4 mr-2" />
                {currentLanguage === 'he' ? 'English' : 'עברית'}
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 text-slate-300 mt-2">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {currentLanguage === 'he' ? 'עדכון אחרון: ' : 'Last updated: '}
                  {formatDate(document.last_updated)}
                </span>
              </div>
              {document.version && (
                <div className="text-sm">
                  {currentLanguage === 'he' ? 'גרסה: ' : 'Version: '}
                  {document.version}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div
              className="prose prose-invert max-w-none [&_h3]:text-white [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mb-3 [&_h3]:mt-6 [&_p]:text-slate-300 [&_p]:mb-4 [&_p]:leading-relaxed [&_a]:text-teal-400 [&_a]:hover:text-teal-300"
              dir={currentLanguage === 'he' ? 'rtl' : 'ltr'}
              dangerouslySetInnerHTML={{ __html: document.content || '' }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
