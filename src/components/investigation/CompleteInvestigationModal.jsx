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
    scoreBreakdown,
    scenario,
    currentUser
}) {
    
    const generateComprehensivePDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPos = 20;

        const checkNewPage = (requiredSpace = 20) => {
            if (yPos + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPos = 20;
                return true;
            }
            return false;
        };

        // Header with Logo/Title
        doc.setFillColor(20, 184, 166);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('HACK THE SOC', pageWidth / 2, 18, { align: 'center' });
        doc.setFontSize(16);
        doc.text('Investigation Analysis Report', pageWidth / 2, 30, { align: 'center' });
        yPos = 55;

        doc.setTextColor(0, 0, 0);

        // Investigation Details
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Investigation Summary', margin, yPos);
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        
        if (investigation) {
            const startTime = new Date(investigation.start_time);
            const endTime = investigation.end_time ? new Date(investigation.end_time) : new Date();
            const durationMinutes = Math.round((endTime - startTime) / (1000 * 60));
            
            doc.text(`Date: ${startTime.toLocaleDateString()}`, margin, yPos);
            yPos += 6;
            doc.text(`Duration: ${durationMinutes} minutes`, margin, yPos);
            yPos += 6;
            doc.text(`Status: ${investigation.status || 'Completed'}`, margin, yPos);
            yPos += 6;
            if (currentUser?.full_name) {
                doc.text(`Analyst: ${currentUser.full_name}`, margin, yPos);
                yPos += 6;
            }
            yPos += 6;
        }

        // Scenario Context
        if (scenario) {
            checkNewPage(25);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(99, 102, 241);
            doc.text('📋 Scenario Context', margin, yPos);
            yPos += 8;
            doc.setFontSize(11);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(scenario.title || 'Untitled Scenario', margin, yPos);
            yPos += 6;
            doc.setFontSize(9);
            doc.setFont(undefined, 'normal');
            
            if (scenario.description) {
                const descLines = doc.splitTextToSize(scenario.description, pageWidth - 2 * margin);
                descLines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin, yPos);
                    yPos += 4;
                });
            }
            yPos += 8;
            
            if (scenario.category) {
                doc.setFont(undefined, 'bold');
                doc.text(`Category: ${scenario.category}`, margin, yPos);
                yPos += 5;
            }
            if (scenario.difficulty) {
                doc.text(`Difficulty: ${scenario.difficulty}`, margin, yPos);
                yPos += 5;
            }
            yPos += 8;
        }

        // Overall Score - Large and Prominent
        checkNewPage(40);
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 35, 3, 3, 'F');
        doc.setFontSize(48);
        doc.setFont(undefined, 'bold');
        
        const scoreColor = feedback.overall_score >= 85 ? [34, 197, 94] : 
                          feedback.overall_score >= 70 ? [234, 179, 8] : [239, 68, 68];
        doc.setTextColor(...scoreColor);
        doc.text(`${feedback.overall_score}`, pageWidth / 2, yPos + 22, { align: 'center' });
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Out of 100', pageWidth / 2, yPos + 30, { align: 'center' });
        yPos += 45;

        doc.setTextColor(0, 0, 0);

        // Score Breakdown with Visual Bars
        if (scoreBreakdown && Object.keys(scoreBreakdown).length > 0) {
            checkNewPage(50);
            doc.setFontSize(16);
            doc.setFont(undefined, 'bold');
            doc.text('Detailed Score Analysis', margin, yPos);
            yPos += 10;

            Object.entries(scoreBreakdown).forEach(([category, data]) => {
                checkNewPage(15);
                
                doc.setFontSize(11);
                doc.setFont(undefined, 'bold');
                doc.text(`${category}`, margin, yPos);
                doc.setFont(undefined, 'normal');
                doc.text(`${data.score}/100 (Weight: ${data.weight})`, pageWidth - margin - 50, yPos);
                yPos += 5;
                
                // Progress bar
                const barWidth = pageWidth - 2 * margin;
                const fillWidth = (data.score / 100) * barWidth;
                doc.setFillColor(220, 220, 220);
                doc.roundedRect(margin, yPos, barWidth, 4, 2, 2, 'F');
                doc.setFillColor(20, 184, 166);
                doc.roundedRect(margin, yPos, fillWidth, 4, 2, 2, 'F');
                yPos += 10;
            });
            yPos += 5;
        }

        // Investigation Content
        if (investigation?.findings?.scenario_report) {
            const report = investigation.findings.scenario_report;
            
            // Attack Narrative
            if (report.attack_narrative) {
                checkNewPage(30);
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(99, 102, 241);
                doc.text('📝 Attack Narrative', margin, yPos);
                yPos += 8;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
                
                const narrativeLines = doc.splitTextToSize(report.attack_narrative, pageWidth - 2 * margin);
                narrativeLines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin, yPos);
                    yPos += 5;
                });
                yPos += 8;
            }

            // Technical Findings
            if (report.scenario_findings) {
                checkNewPage(30);
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(168, 85, 247);
                doc.text('🔍 Technical Findings', margin, yPos);
                yPos += 8;
                doc.setFontSize(10);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
                
                const findingsLines = doc.splitTextToSize(report.scenario_findings, pageWidth - 2 * margin);
                findingsLines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin, yPos);
                    yPos += 5;
                });
                yPos += 8;
            }

            // IOCs
            if (report.iocs && report.iocs.length > 0) {
                checkNewPage(30);
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(239, 68, 68);
                doc.text(`🚨 Indicators of Compromise (${report.iocs.length})`, margin, yPos);
                yPos += 8;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(0, 0, 0);
                
                report.iocs.forEach((ioc, idx) => {
                    checkNewPage(12);
                    doc.setFont(undefined, 'bold');
                    doc.text(`${idx + 1}. ${ioc.type}`, margin, yPos);
                    yPos += 5;
                    doc.setFont(undefined, 'normal');
                    doc.text(`   Value: ${ioc.value}`, margin, yPos);
                    if (ioc.source) {
                        yPos += 4;
                        doc.text(`   Source: ${ioc.source}`, margin, yPos);
                    }
                    yPos += 6;
                });
                yPos += 5;
            }

            // Final Verdict
            if (report.final_verdict) {
                checkNewPage(20);
                doc.setFontSize(14);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(20, 184, 166);
                doc.text('⚖️ Final Verdict', margin, yPos);
                yPos += 8;
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(report.final_verdict, margin, yPos);
                yPos += 10;
            }
        }

        // AI Evaluation Details
        if (feedback.evaluation_details) {
            doc.addPage();
            yPos = 20;
            
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(99, 102, 241);
            doc.text('AI Expert Evaluation', margin, yPos);
            yPos += 12;
            doc.setTextColor(0, 0, 0);

            const evalDetails = feedback.evaluation_details;

            // Narrative Analysis
            if (evalDetails.narrative_feedback) {
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Attack Narrative Analysis', margin, yPos);
                yPos += 6;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                const narrativeLines = doc.splitTextToSize(evalDetails.narrative_feedback, pageWidth - 2 * margin);
                narrativeLines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin, yPos);
                    yPos += 4;
                });
                yPos += 8;
            }

            // Technical Analysis
            if (evalDetails.technical_feedback) {
                checkNewPage(20);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Technical Analysis Feedback', margin, yPos);
                yPos += 6;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                const techLines = doc.splitTextToSize(evalDetails.technical_feedback, pageWidth - 2 * margin);
                techLines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin, yPos);
                    yPos += 4;
                });
                yPos += 8;
            }

            // IOC Feedback
            if (evalDetails.ioc_feedback) {
                checkNewPage(20);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('IOC Identification Analysis', margin, yPos);
                yPos += 6;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                const iocLines = doc.splitTextToSize(evalDetails.ioc_feedback, pageWidth - 2 * margin);
                iocLines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin, yPos);
                    yPos += 4;
                });
                yPos += 8;
            }

            // Verdict Feedback
            if (evalDetails.verdict_feedback) {
                checkNewPage(20);
                doc.setFontSize(12);
                doc.setFont(undefined, 'bold');
                doc.text('Verdict Analysis', margin, yPos);
                yPos += 6;
                doc.setFontSize(9);
                doc.setFont(undefined, 'normal');
                const verdictLines = doc.splitTextToSize(evalDetails.verdict_feedback, pageWidth - 2 * margin);
                verdictLines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin, yPos);
                    yPos += 4;
                });
                yPos += 8;
            }
        }

        // Strengths Section
        if (feedback.strengths && feedback.strengths.length > 0) {
            checkNewPage(30);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(34, 197, 94);
            doc.text('✅ Key Strengths', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            feedback.strengths.forEach((strength, idx) => {
                checkNewPage(10);
                const lines = doc.splitTextToSize(`${idx + 1}. ${strength}`, pageWidth - 2 * margin - 5);
                lines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin + 5, yPos);
                    yPos += 5;
                });
                yPos += 2;
            });
            yPos += 6;
        }

        // Areas for Improvement
        if (feedback.areas_for_improvement && feedback.areas_for_improvement.length > 0) {
            checkNewPage(30);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(234, 179, 8);
            doc.text('⚠️ Areas for Improvement', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);

            feedback.areas_for_improvement.forEach((area, idx) => {
                checkNewPage(10);
                const lines = doc.splitTextToSize(`${idx + 1}. ${area}`, pageWidth - 2 * margin - 5);
                lines.forEach(line => {
                    checkNewPage();
                    doc.text(line, margin + 5, yPos);
                    yPos += 5;
                });
                yPos += 2;
            });
            yPos += 6;
        }

        // Suggested Professional Approach
        if (feedback.evaluation_details?.suggested_approach) {
            checkNewPage(30);
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(99, 102, 241);
            doc.text('💡 Professional Approach Recommendation', margin, yPos);
            yPos += 8;
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            
            const approachLines = doc.splitTextToSize(feedback.evaluation_details.suggested_approach, pageWidth - 2 * margin);
            approachLines.forEach(line => {
                checkNewPage();
                doc.text(line, margin, yPos);
                yPos += 5;
            });
        }

        // Footer on all pages
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150, 150, 150);
            doc.text(
                `HACK THE SOC - Comprehensive Investigation Report | Page ${i} of ${pageCount}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
            );
            doc.text(
                `Generated: ${new Date().toLocaleString()}`,
                pageWidth / 2,
                pageHeight - 5,
                { align: 'center' }
            );
        }

        doc.save(`Investigation_Report_Comprehensive_${new Date().toISOString().split('T')[0]}.pdf`);
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
                            onClick={generateComprehensivePDF}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Comprehensive Report
                        </Button>
                        <Button 
                            className="bg-slate-600 hover:bg-slate-700 flex-1"
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