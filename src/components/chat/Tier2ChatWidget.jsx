import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, User, Send, Loader2, BrainCircuit, MessageSquare, X } from 'lucide-react';
import { InvokeLLM } from '@/integrations/Core';
import ReactMarkdown from 'react-markdown';
import { AnimatePresence, motion } from 'framer-motion';

export default function Tier2ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Load chat from localStorage when component mounts
  useEffect(() => {
    const savedChat = localStorage.getItem('tier2_chat_session');
    if (savedChat) {
      try {
        const parsedChat = JSON.parse(savedChat);
        setMessages(parsedChat.messages || []);
        setSessionId(parsedChat.sessionId);
      } catch (error) {
        console.error('Failed to load saved chat:', error);
        resetChat();
      }
    } else {
      resetChat();
    }
  }, []);

  // Save chat to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const chatData = {
        messages,
        sessionId,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem('tier2_chat_session', JSON.stringify(chatData));
    }
  }, [messages, sessionId]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && messagesContainerRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  const resetChat = () => {
    const initialMessages = [
      {
        role: 'assistant',
        content: "Hello! I'm your Tier 2 AI assistant. I'm here to help analyze events and provide guidance. How can I assist you today? Please communicate only in English.",
      },
    ];
    setMessages(initialMessages);
    setSessionId(`tier2_${Date.now()}`);
    setInput('');
  };

  const clearChat = () => {
    localStorage.removeItem('tier2_chat_session');
    resetChat();
  };

  const systemPrompt = `You are "Talk with Tier 2", a specialized AI assistant for Tier 2 SOC Analysts. Your persona is that of a seasoned, highly competent, and professional senior security analyst.

Your primary goals are:
1. **Answer Technical Questions:** Provide accurate, in-depth answers about cybersecurity incidents, logs, IOCs, and security scenarios.
2. **Provide Guided Steps:** Offer clear, step-by-step guidance for troubleshooting, log analysis, incident investigation, and recommend actions. Your analysis should be advanced, suitable for a Tier 2 level.
3. **Explain in Detail:** Give detailed explanations with examples where possible, referencing log structures and data from the system (like Office365, DC, EDR logs).
4. **Ask Clarifying Questions:** Before providing a solution, ask probing questions to better understand the user's situation.
5. **Guide Data Collection:** If information is missing, suggest specific methods or queries to collect it.
6. **Use System Context:** Base your answers on known log structures, schemas, and IOCs.
7. **Maintain Professional Tone:** Be clear, professional, and focused, but approachable and educational. Structure your responses for readability.
8. **Classify Events:** When appropriate, help classify an event as a True Positive, False Positive, or requiring further escalation, and explain your reasoning.
9. **No Fabrication:** Do not invent information. If you don't know something, state it clearly.

**CRITICAL RULE: You MUST communicate exclusively in English.** If the user attempts to chat in any other language, you must politely inform them that this session can only be conducted in English and ask them to rephrase their query in English. Do not answer their question if it's not in English.`;

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const conversationHistory = newMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const promptWithHistory = `${systemPrompt}\n\nPrevious conversation:\n${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}\n\nPlease respond to the latest user message:`;

      const response = await InvokeLLM({
        prompt: promptWithHistory,
        add_context_from_internet: false
      });

      const assistantMessage = { role: 'assistant', content: response };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage = {
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
      };
      setMessages(prev => [...prev, errorMessage]);
    }

    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white shadow-lg h-14 px-6 rounded-full flex items-center gap-3"
        >
          <BrainCircuit className="w-6 h-6" />
          <span className="font-medium">Talk with Tier 2</span>
        </Button>
      </motion.div>

      {/* Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-800 border border-slate-700 rounded-lg shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden"
            >
              <CardHeader className="border-b border-slate-700 flex-shrink-0 bg-slate-800">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white flex items-center gap-3">
                    <BrainCircuit className="w-6 h-6 text-teal-400" />
                    Talk with Tier 2 AI Assistant
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearChat}
                      className="text-slate-400 hover:text-white text-xs"
                    >
                      Clear Chat
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsOpen(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Messages Area - Fixed height with scroll */}
                <div 
                  ref={messagesContainerRef}
                  className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900"
                  style={{ maxHeight: 'calc(80vh - 200px)' }}
                >
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-[75%] p-4 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-700 text-slate-100'
                        }`}
                      >
                        {message.role === 'assistant' ? (
                          <ReactMarkdown
                            className="prose prose-invert prose-sm max-w-none"
                            components={{
                              p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                              ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                              li: ({ children }) => <li className="mb-1">{children}</li>,
                              strong: ({ children }) => <strong className="font-semibold text-teal-300">{children}</strong>,
                              code: ({ children }) => <code className="bg-slate-800 px-1 py-0.5 rounded text-teal-300 text-sm">{children}</code>,
                              pre: ({ children }) => <pre className="bg-slate-800 p-3 rounded-lg overflow-x-auto text-sm mb-2">{children}</pre>,
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        ) : (
                          <p className="whitespace-pre-wrap">{message.content}</p>
                        )}
                      </div>
                      {message.role === 'user' && (
                        <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <User className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-3 justify-start">
                      <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-slate-700 p-4 rounded-lg">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Fixed position */}
                <div className="border-t border-slate-700 p-4 bg-slate-800 flex-shrink-0">
                  <div className="flex gap-3">
                    <Textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your question or paste log data..."
                      className="flex-1 bg-slate-900 border-slate-600 text-white placeholder-slate-400 resize-none"
                      rows={3}
                      style={{ maxHeight: '120px', overflowY: 'auto' }}
                      disabled={isLoading}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isLoading || input.trim() === ''}
                      className="bg-teal-600 hover:bg-teal-700 px-6 self-end"
                    >
                      {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Press Enter to send, Shift+Enter for new line. English only.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}