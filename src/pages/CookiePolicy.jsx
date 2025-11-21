import React from 'react';
import LegalDocumentViewer from '../components/legal/LegalDocumentViewer';

export default function CookiePolicy() {
  return (
    <LegalDocumentViewer 
      documentType="cookie_policy" 
      language="he" 
    />
  );
}