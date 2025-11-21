import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Award, Loader2 } from "lucide-react";
import { User } from '@/entities/all';
import { awardPoints } from '../utils/gamificationService';

export default function CompleteInvestigationModal({ isOpen, onClose, onConfirm, investigation, isLoading }) {
    
    const handleConfirm = async () => {
        // First, call the original confirmation logic (e.g., to save the investigation)
        await onConfirm();

        // Then, award points using the new gamification service
        try {
            const user = await User.me();
            if (user && investigation) {
                console.log(`[InvestigationComplete] Awarding points for scenario ${investigation.scenario_id}`);
                await awardPoints(
                    user.id,
                    'scenario_completed',
                    investigation.scenario_id,
                    investigation.score || 0 // Use final score as bonus points
                );
                console.log('[InvestigationComplete] Points logic executed.');
            }
        } catch (error) {
            console.error('Failed to award points for scenario completion:', error);
            // Non-critical error, don't block the UI
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-500/20 mx-auto mb-4">
                        <Award className="w-6 h-6 text-teal-400" />
                    </div>
                    <DialogTitle className="text-center text-xl">Complete Investigation</DialogTitle>
                    <DialogDescription className="text-center text-slate-400">
                        Are you sure you want to finalize and submit this investigation? This action cannot be undone. Your performance will be scored.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={onClose} disabled={isLoading}>Cancel</Button>
                    <Button 
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Confirm & Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}