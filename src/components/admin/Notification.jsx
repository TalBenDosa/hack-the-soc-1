import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-400" />,
  error: <XCircle className="w-5 h-5 text-red-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const Notification = ({ message, type = 'info', duration = 3000, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ ease: "easeInOut", duration: 0.3 }}
      className="fixed top-5 right-5 z-[200] p-4 rounded-lg shadow-2xl bg-slate-700 border border-slate-600 flex items-center gap-4"
    >
      {icons[type]}
      <p className="text-sm font-medium text-white">{message}</p>
      <button onClick={onDismiss} className="text-slate-400 hover:text-white transition-colors">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setNotification({ id: Date.now(), message, type, duration });
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const NotificationComponent = useCallback(() => (
    <AnimatePresence>
      {notification && (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          duration={notification.duration}
          onDismiss={dismissNotification}
        />
      )}
    </AnimatePresence>
  ), [notification, dismissNotification]);

  return [showNotification, NotificationComponent];
};