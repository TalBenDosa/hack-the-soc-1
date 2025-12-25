import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Award, Loader2, TrendingUp, TrendingDown, CheckCircle, AlertCircle, Download } from "lucide-react";
import { User } from '@/entities/all';
import { awardPoints } from '../utils/gamificationService';
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import jsPDF from 'jspdf';

export default function CompleteInvestigationModal({ 
    isOpen, 
    onClose, 
    onConfirm, 
    investigation, 
    isLoading,
    feedback,
    scoreBreakdown 
}) {
    
    const generatePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 20;
        let yPos = 20;

        // Title
        doc.setFontSize(24);
        doc.setFont(undefined, 'bold');
        doc.text('Investigation Report', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        // Score
        doc.setFontSize(48);
        doc.setTextColor(20, 184, 166);
        doc.text(`${feedback.overall_score}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Out of 100', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        doc.setTextColor(0, 0, 0);

        // Score Breakdown
        if (scoreBreakdown && Object.keys(scoreBreakdown).length > 0) {
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Score Breakdown', margin, yPos);
            yPos += 8;
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');

            Object.entries(scoreBreakdown).forEach(([category, data]) => {
                doc.text(`${category}: ${data.score}/100 (${data.weight})`, margin, yPos);
                yPos += 6;
            });
            yPos += 8;
        }

        // Strengths
        if (feedback.strengths && feedback.strengths.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(34, 197, 94);
            doc.text('✓ Strengths', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            feedback.strengths.forEach(strength => {
                const lines = doc.splitTextToSize(`• ${strength}`, pageWidth - 2 * margin);
                lines.forEach(line => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, margin, yPos);
                    yPos += 5;
                });
                yPos += 2;
            });
            yPos += 6;
        }

        // Areas for Improvement
        if (feedback.areas_for_improvement && feedback.areas_for_improvement.length > 0) {
            if (yPos > 240) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(234, 179, 8);
            doc.text('⚠ Areas for Improvement', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            feedback.areas_for_improvement.forEach(area => {
                const lines = doc.splitTextToSize(`• ${area}`, pageWidth - 2 * margin);
                lines.forEach(line => {
                    if (yPos > 280) {
                        doc.addPage();
                        yPos = 20;
                    }
                    doc.text(line, margin, yPos);
                    yPos += 5;
                });
                yPos += 2;
            });
            yPos += 6;
        }

        // Detailed Feedback
        if (feedback.detailed_feedback) {
            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.text('Detailed Feedback', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');

            const feedbackLines = doc.splitTextToSize(feedback.detailed_feedback, pageWidth - 2 * margin);
            feedbackLines.forEach(line => {
                if (yPos > 280) {
                    doc.addPage();
                    yPos = 20;
                }
                doc.text(line, margin, yPos);
                yPos += 5;
            });
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`,
                pageWidth / 2,
                doc.internal.pageSize.getHeight() - 10,
                { align: 'center' }
            );
        }

        doc.save(`Investigation_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };
    
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
                    investigation.score || 0
                );
                console.log('[InvestigationComplete] Points logic executed.');
            }
        } catch (error) {
            console.error('Failed to award points for scenario completion:', error);
        }
    };

    if (!isOpen) return null;

    // Show loading state while generating feedback
    if (isLoading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="w-16 h-16 text-teal-400 animate-spin mb-4" />
                        <h3 className="text-xl font-bold mb-2">Analyzing Your Investigation...</h3>
                        <p className="text-slate-400 text-center">Our AI is evaluating your work. This may take a moment.</p>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Show results when feedback is ready
    if (feedback && feedback.overall_score !== undefined) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-teal-500/20 mx-auto mb-4">
                            <Award className="w-8 h-8 text-teal-400" />
                        </div>
                        <DialogTitle className="text-center text-2xl">Investigation Complete!</DialogTitle>
                        <div className="text-center mt-4">
                            <div className="text-6xl font-bold text-teal-400 mb-2">
                                {feedback.overall_score}
                            </div>
                            <p className="text-slate-400">Out of 100</p>
                        </div>
                    </DialogHeader>

                    {/* Score Breakdown */}
                    {scoreBreakdown && Object.keys(scoreBreakdown).length > 0 && (
                        <div className="mt-6 space-y-3">
                            <h3 className="font-semibold text-white mb-3">Score Breakdown:</h3>
                            {Object.entries(scoreBreakdown).map(([category, data]) => (
                                <div key={category} className="bg-slate-700/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-300">{category}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-white">{data.score}/100</span>
                                            <Badge variant="outline" className="text-xs">{data.weight}</Badge>
                                        </div>
                                    </div>
                                    <Progress value={data.score} className="h-2" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Strengths */}
                    {feedback.strengths && feedback.strengths.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-green-400" />
                                Strengths
                            </h3>
                            <ul className="space-y-2">
                                {feedback.strengths.map((strength, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                                        <span>{strength}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Areas for Improvement */}
                    {feedback.areas_for_improvement && feedback.areas_for_improvement.length > 0 && (
                        <div className="mt-6">
                            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                                <TrendingDown className="w-5 h-5 text-yellow-400" />
                                Areas for Improvement
                            </h3>
                            <ul className="space-y-2">
                                {feedback.areas_for_improvement.map((area, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-slate-300 text-sm">
                                        <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                                        <span>{area}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Detailed Feedback */}
                    {feedback.detailed_feedback && (
                        <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                            <h3 className="font-semibold text-white mb-2">Detailed Feedback:</h3>
                            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                                {feedback.detailed_feedback}
                            </p>
                        </div>
                    )}

                    <DialogFooter className="mt-6 flex gap-3">
                        <Button 
                            variant="outline"
                            className="flex-1 border-slate-600 text-white hover:bg-slate-700"
                            onClick={generatePDF}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                        </Button>
                        <Button 
                            className="bg-teal-600 hover:bg-teal-700 flex-1"
                            onClick={handleConfirm}
                        >
                            Continue
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    // Initial confirmation dialog (shouldn't normally show since we generate feedback immediately)
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-teal-500/20 mx-auto mb-4">
                        <Award className="w-6 h-6 text-teal-400" />
                    </div>
                    <DialogTitle className="text-center text-xl">Complete Investigation</DialogTitle>
                    <DialogDescription className="text-center text-slate-400">
                        Are you sure you want to finalize and submit this investigation? Your performance will be scored.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="mt-4">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button 
                        className="bg-teal-600 hover:bg-teal-700"
                        onClick={handleConfirm}
                    >
                        Confirm & Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}