import React from 'react';
import LegalDocumentViewer from '../components/legal/LegalDocumentViewer';

export default function AccessibilityStatement() {
  return (
    <LegalDocumentViewer 
      documentType="accessibility_statement" 
      language="he" 
    />
  );
}