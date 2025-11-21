import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, Plus, X, Tag, MessageSquare, AlertTriangle } from "lucide-react";

// Language validation function
const isEnglish = (text) => {
    if (!text || text.trim() === '') return true;
    const nonEnglishRegex = /[\u0590-\u05FF\u0600-\u06FF\u0400-\u04FF\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF]/;
    return !nonEnglishRegex.test(text);
};

const LanguageError = () => (
    <div className="flex items-center gap-2 mt-1 p-2 bg-red-900/50 border border-red-500/50 rounded text-red-300 text-xs">
        <AlertTriangle className="w-3 h-3" />
        <span>❗ Only English input is supported. Please switch to English.</span>
    </div>
);

const TAGS = ["Detection", "Containment", "Eradication", "Recovery", "Key Finding"];

export default function TimelineComponent({ timelineEvents = [], onTimelineChange }) {
  const [showAddForm, setShowAddForm] = useState(false);
  
  const defaultTimestamp = new Date();
  defaultTimestamp.setSeconds(0);
  defaultTimestamp.setMilliseconds(0);

  const [newEvent, setNewEvent] = useState({
    timestamp: defaultTimestamp.toISOString().slice(0, 16),
    description: "",
    tag: "Key Finding",
  });

  // State to track language validation errors
  const [languageErrors, setLanguageErrors] = useState({});

  const getTagColor = (tag) => {
    switch(tag) {
        case "Detection": return "bg-blue-500/20 text-blue-300";
        case "Containment": return "bg-yellow-500/20 text-yellow-300";
        case "Eradication": return "bg-red-500/20 text-red-300";
        case "Recovery": return "bg-green-500/20 text-green-300";
        case "Key Finding": return "bg-purple-500/20 text-purple-300";
        default: return "bg-slate-600 text-slate-300";
    }
  };

  // Handles changes for existing timeline events
  const handleEventChange = (eventId, field, value) => {
      // Check language validation for text fields
      if (field === 'description' || field === 'tag') {
          const isValidLanguage = isEnglish(value);
          const errorKey = `${eventId}-${field}`;
          
          setLanguageErrors(prev => ({
              ...prev,
              [errorKey]: !isValidLanguage
          }));

          // If language is not valid, stop processing
          if (!isValidLanguage) return;
      }

      const updatedEvents = (timelineEvents || []).map(event => 
          event.id === eventId ? { ...event, [field]: value } : event
      );
      if (onTimelineChange) onTimelineChange(updatedEvents);
  };

  // Handles adding a new event from the form
  const handleAddEvent = () => {
    const isDescriptionEnglish = isEnglish(newEvent.description);
    
    // Set error for new event description field
    setLanguageErrors(prev => ({
        ...prev,
        'new-description': !isDescriptionEnglish
    }));

    if (newEvent.description && isDescriptionEnglish) {
      const updatedEvents = [...(timelineEvents || []), { ...newEvent, id: Date.now() }];
      if (onTimelineChange) onTimelineChange(updatedEvents);

      setNewEvent({
        timestamp: defaultTimestamp.toISOString().slice(0, 16),
        description: "",
        tag: "Key Finding",
      });
      setShowAddForm(false);
      // Clear new event specific error on successful add
      setLanguageErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['new-description'];
        return newErrors;
      });
    }
  };

  const handleRemoveEvent = (id) => {
    const updatedEvents = (timelineEvents || []).filter(event => event.id !== id);
    if (onTimelineChange) onTimelineChange(updatedEvents);

    // Clear associated language errors for the removed event
    setLanguageErrors(prev => {
        const newErrors = { ...prev };
        Object.keys(newErrors).forEach(key => {
            if (key.startsWith(`${id}-`)) {
                delete newErrors[key];
            }
        });
        return newErrors;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          Attack Timeline
        </h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowAddForm(!showAddForm)}
          className="text-blue-400 hover:text-blue-300"
        >
          <Plus className="w-5 h-5" />
        </Button>
      </div>
      
      {showAddForm && (
        <div className="space-y-3 mb-4 p-3 bg-slate-700/30 rounded-lg">
          <Input 
            type="datetime-local"
            value={newEvent.timestamp}
            onChange={(e) => setNewEvent({...newEvent, timestamp: e.target.value})}
            className="bg-slate-700 border-slate-600 text-white"
          />
          <div>
            <Textarea 
              placeholder="Event description..."
              value={newEvent.description}
              onChange={(e) => {
                setNewEvent({...newEvent, description: e.target.value});
                // Validate description for new event form
                const isValid = isEnglish(e.target.value);
                setLanguageErrors(prev => ({ ...prev, 'new-description': !isValid }));
              }}
              className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
            />
            {languageErrors['new-description'] && <LanguageError />}
          </div>
          <div className="flex flex-wrap gap-2">
            {TAGS.map(tag => (
                <Button key={tag} type="button" size="sm" variant="outline"
                  className={`border ${newEvent.tag === tag ? getTagColor(tag) + ' border-current' : 'border-slate-600 text-slate-400 hover:bg-slate-700'}`}
                  onClick={() => setNewEvent({...newEvent, tag})}
                >
                    {tag}
                </Button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleAddEvent} 
              className="bg-blue-600 hover:bg-blue-700 flex-1"
              disabled={!newEvent.description || languageErrors['new-description']}
            >
              Add Event
            </Button>
            <Button variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
        {timelineEvents.length === 0 ? (
           <div className="text-center py-6">
            <Clock className="w-12 h-12 text-slate-600 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">No timeline events added yet</p>
            <p className="text-slate-500 text-xs">Click + to map the attack sequence</p>
          </div>
        ) : (
            [...timelineEvents]
            .sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map((event, index) => (
                <div key={index} className="p-3 bg-slate-700/50 rounded-lg border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                        <Input 
                            type="datetime-local"
                            value={event.timestamp}
                            onChange={(e) => handleEventChange(event.id, 'timestamp', e.target.value)}
                            className="bg-slate-600 border-slate-500 text-white w-auto flex-1"
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 ml-2"
                            onClick={() => handleRemoveEvent(event.id)}
                        >
                            <X className="w-4 h-4 text-red-400" />
                        </Button>
                    </div>
                    
                    <div className="mb-2">
                        <Textarea
                            value={event.description || ""}
                            onChange={(e) => handleEventChange(event.id, 'description', e.target.value)}
                            placeholder="Describe what happened at this time"
                            className="bg-slate-600 border-slate-500 text-white"
                            rows={2}
                        />
                        {languageErrors[`${event.id}-description`] && <LanguageError />}
                    </div>

                    <div className="flex gap-3 items-center">
                        <div className="flex-1">
                            <Input
                                value={event.tag || ""}
                                onChange={(e) => handleEventChange(event.id, 'tag', e.target.value)}
                                placeholder="Event tag or category"
                                className="bg-slate-600 border-slate-500 text-white"
                            />
                            {languageErrors[`${event.id}-tag`] && <LanguageError />}
                        </div>
                    </div>
                </div>
            ))
        )}
      </div>
    </div>
  );
}