import React from 'react';
import LegalDocumentViewer from '../components/legal/LegalDocumentViewer';

export default function PrivacyPolicy() {
  return (
    <LegalDocumentViewer 
      documentType="privacy_policy" 
      language="he" 
    />
  );
}