import React from 'react';
import LegalDocumentViewer from '../components/legal/LegalDocumentViewer';

export default function DataBreachNotice() {
  return (
    <LegalDocumentViewer 
      documentType="security_breach_template" 
      language="he" 
    />
  );
}