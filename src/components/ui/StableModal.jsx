import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function StableModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  maxWidth = "2xl",
  footer 
}) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md", 
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl"
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${maxWidthClasses[maxWidth]} max-h-[95vh] overflow-y-auto bg-slate-800 border-slate-700 text-white`}
        style={{ zIndex: 50 }} // Make sure modal has proper z-index
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {children}
        </div>
        
        {footer && (
          <div className="border-t border-slate-700 pt-4">
            {footer}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}