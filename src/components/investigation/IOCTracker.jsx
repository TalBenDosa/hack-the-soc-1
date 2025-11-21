
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield,
  Plus,
  X,
  AlertTriangle, // Added for language validation error icon
  Eye,
  Hash
} from "lucide-react";

// Language validation function
const isEnglish = (text) => {
    // If text is empty or only whitespace, consider it valid (no language constraint)
    if (!text || text.trim() === '') return true;
    // Regular expression to detect common non-English characters:
    // Hebrew (\u0590-\u05FF), Arabic (\u0600-\u06FF), Cyrillic (\u0400-\u04FF),
    // CJK Unified Ideographs (Chinese, Japanese, Korean) (\u4E00-\u9FFF),
    // Hiragana (\u3040-\u309F), Katakana (\u30A0-\u30FF)
    // This list can be expanded if more specific non-English scripts need to be disallowed.
    const nonEnglishRegex = /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
    return !nonEnglishRegex.test(text);
};

// Language error display component
const LanguageError = () => (
    <div className="flex items-center gap-2 mt-1 p-2 bg-red-900/50 border border-red-500/50 rounded text-red-300 text-xs">
        <AlertTriangle className="w-3 h-3" />
        <span>❗ Only English input is supported. Please switch to English.</span>
    </div>
);

const IOC_TYPES = [
  "IP Address",
  "Domain",
  "URL",
  "File Hash (MD5)",
  "File Hash (SHA1)",
  "File Hash (SHA256)",
  "Email Address",
  "User Account",
  "Registry Key",
  "Process Name"
];

const CONFIDENCE_LEVELS = [
  "High",
  "Medium",
  "Low"
];

const RELEVANCE_LEVELS = [
  "High",
  "Medium",
  "Low"
];

// Changed initialIOCs prop to iocs, aligning with controlled component pattern
export default function IOCTracker({ iocs, onIOCsChange, useRelevance = false }) {
  // Removed internal `iocs` state and `useEffect` for `initialIOCs` synchronization.
  // `iocs` is now expected to be managed by the parent component and passed as a prop.
  const [showAddForm, setShowAddForm] = useState(false);
  const [newIOC, setNewIOC] = useState({
    type: "",
    value: "",
    source: "",
    confidence: "Medium",
    relevance: "Medium"
  });
  // New state to manage language validation errors for inputs
  const [languageErrors, setLanguageErrors] = useState({});

  // Function to handle adding a new IOC
  const handleAddIOC = () => {
    // Validate language for new IOC's value and source fields
    const isValueEnglish = isEnglish(newIOC.value);
    const isSourceEnglish = isEnglish(newIOC.source);

    // Update languageErrors state for the new IOC form inputs
    setLanguageErrors(prev => ({
        ...prev,
        'new-ioc-value': !isValueEnglish,
        'new-ioc-source': !isSourceEnglish
    }));

    // Prevent adding if any language validation fails
    if (!isValueEnglish || !isSourceEnglish) {
        return;
    }

    if (newIOC.type && newIOC.value) {
      // Create a new array to reflect the change, as `iocs` prop is immutable
      const updatedIocs = [...(iocs || []), { ...newIOC, id: Date.now(), timestamp: new Date().toISOString() }];
      // Notify parent component of the change
      if (onIOCsChange) onIOCsChange(updatedIocs);

      // Reset new IOC form fields
      setNewIOC({
        type: "",
        value: "",
        source: "",
        confidence: "Medium",
        relevance: "Medium"
      });
      setShowAddForm(false);
      // Clear all language errors after successful addition
      setLanguageErrors({});
    }
  };

  // Function to handle removing an existing IOC
  const handleRemoveIOC = (id) => {
    const updatedIocs = (iocs || []).filter(ioc => ioc.id !== id);
    // Notify parent component of the change
    if (onIOCsChange) onIOCsChange(updatedIocs);
  };

  // New function to handle changes to existing IOCs (making them editable)
  const handleIOCChange = (index, field, value) => {
      const isValidLanguage = isEnglish(value);
      const errorKey = `${index}-${field}`; // Unique key for error tracking per field per IOC

      // Update languageErrors state
      setLanguageErrors(prev => ({
          ...prev,
          [errorKey]: !isValidLanguage
      }));

      // Only update the IOC if the language validation passes
      if (isValidLanguage) {
          const updatedIocs = [...(iocs || [])]; // Create a mutable copy from props
          updatedIocs[index] = { ...updatedIocs[index], [field]: value };
          // Notify parent component of the updated IOCs array
          if (onIOCsChange) onIOCsChange(updatedIocs);
      }
      // If language is not valid, the IOC in the parent's state remains unchanged for that field,
      // and only the error message is displayed to the user.
  };

  const getIOCIcon = (type) => {
    if (type.includes("Hash")) return <Hash className="w-4 h-4" />;
    if (type === "IP Address") return <Shield className="w-4 h-4" />;
    return <AlertTriangle className="w-4 h-4" />;
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case "High": return "text-red-400 bg-red-400/20";
      case "Medium": return "text-yellow-400 bg-yellow-400/20";
      case "Low": return "text-green-400 bg-green-400/20";
      default: return "text-gray-400 bg-gray-400/20";
    }
  };

  const getRelevanceColor = (level) => {
    switch (level) {
      case "High": return "text-red-400 bg-red-400/20";
      case "Medium": return "text-yellow-400 bg-yellow-400/20";
      case "Low": return "text-green-400 bg-green-400/20";
      default: return "text-gray-400 bg-gray-400/20";
    }
  };

  // Use `iocs` prop directly, defensive check for null/undefined
  const currentIocs = iocs || [];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-400" />
          Manual IOC Collection
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-purple-400 hover:text-purple-300"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Add IOC Form */}
      {showAddForm && (
        <div className="space-y-3 mb-4 p-3 bg-slate-700/30 rounded-lg">
          <Select value={newIOC.type} onValueChange={(value) => setNewIOC({...newIOC, type: value})}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder="Select IOC Type" />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {IOC_TYPES.map((type) => (
                <SelectItem key={type} value={type} className="text-white">
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* IOC Value Input with Language Validation */}
          <div>
            <Input
              placeholder="IOC Value"
              value={newIOC.value}
              onChange={(e) => {
                setNewIOC({...newIOC, value: e.target.value});
                // Validate on change for immediate feedback
                setLanguageErrors(prev => ({...prev, 'new-ioc-value': !isEnglish(e.target.value)}));
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            {languageErrors['new-ioc-value'] && <LanguageError />}
          </div>

          {/* Source/Description Input with Language Validation */}
          <div>
            <Input
              placeholder="Source / Description (Optional)"
              value={newIOC.source}
              onChange={(e) => {
                setNewIOC({...newIOC, source: e.target.value});
                // Validate on change for immediate feedback
                setLanguageErrors(prev => ({...prev, 'new-ioc-source': !isEnglish(e.target.value)}));
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            {languageErrors['new-ioc-source'] && <LanguageError />}
          </div>

          <Select value={useRelevance ? newIOC.relevance : newIOC.confidence} onValueChange={(value) => setNewIOC({...newIOC, [useRelevance ? 'relevance' : 'confidence']: value})}>
            <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
              <SelectValue placeholder={useRelevance ? "Relevance Level" : "Confidence Level"} />
            </SelectTrigger>
            <SelectContent className="bg-slate-700 border-slate-600">
              {(useRelevance ? RELEVANCE_LEVELS : CONFIDENCE_LEVELS).map((level) => (
                <SelectItem key={level} value={level} className="text-white">
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button onClick={handleAddIOC} className="bg-teal-600 hover:bg-teal-700 flex-1">
              Add IOC
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* IOC List */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {currentIocs.length === 0 ? (
          <div className="text-center py-6">
            <Shield className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No IOCs collected yet</p>
            <p className="text-slate-500 text-xs">Click + to add indicators manually</p>
          </div>
        ) : (
          currentIocs.map((ioc, index) => ( // `index` is needed for `handleIOCChange` for specific IOC editing
            <div key={ioc.id} className="p-3 bg-slate-700/50 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-purple-400">
                    {getIOCIcon(ioc.type)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{ioc.type}</p>
                    <Badge className={useRelevance ? getRelevanceColor(ioc.relevance) : getConfidenceColor(ioc.confidence)}>
                      {useRelevance ? ioc.relevance : ioc.confidence} {useRelevance ? 'Relevance' : 'Confidence'}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveIOC(ioc.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                {/* Editable IOC Value Input */}
                <div>
                  <Input
                      value={ioc.value || ""}
                      onChange={(e) => handleIOCChange(index, 'value', e.target.value)}
                      placeholder="IOC Value"
                      className="bg-slate-600 border-slate-500 text-white text-sm font-mono break-all"
                  />
                  {languageErrors[`${index}-value`] && <LanguageError />}
                </div>

                {/* Editable Source Input */}
                <div>
                  <Input
                      value={ioc.source || ""}
                      onChange={(e) => handleIOCChange(index, 'source', e.target.value)}
                      placeholder="Source"
                      className="bg-slate-600 border-slate-500 text-white text-xs"
                  />
                  {languageErrors[`${index}-source`] && <LanguageError />}
                </div>

                <p className="text-xs text-slate-500">
                  Added: {new Date(ioc.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {currentIocs.length > 0 && (
        <div className="mt-4 p-3 bg-purple-500/10 rounded-lg">
          <div className="flex items-center gap-2 text-purple-400">
            <Eye className="w-4 h-4" />
            <span className="text-sm font-medium">
              {currentIocs.length} IOC{currentIocs.length !== 1 ? 's' : ''} Collected
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
