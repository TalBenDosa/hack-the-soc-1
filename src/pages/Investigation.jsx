import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Scenario, Investigation, User, TenantUser, StudentActivityLog } from "@/entities/all";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  Shield,
  Activity,
  AlertTriangle,
  Target,
  FileText,
  UserCheck,
  Trophy,
  Loader2,
  ChevronLeft,
  CheckCircle,
} from "lucide-react";

import InvestigationLogs from "../components/investigation/InvestigationLogs";
import CompleteInvestigationModal from "../components/investigation/CompleteInvestigationModal";
import CertificateGenerator from "../components/investigation/CertificateGenerator";
import IOCTracker from "../components/investigation/IOCTracker";
import { Textarea } from "@/components/ui/textarea";
import { InvokeLLM } from "@/integrations/Core";

export default function InvestigationPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const scenarioId = searchParams.get('scenario');

  const [currentScenario, setCurrentScenario] = useState(null);
  const [investigation, setInvestigation] = useState(null);
  const [investigationSteps, setInvestigationSteps] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timer, setTimer] = useState(0);
  const [scenarioReport, setScenarioReport] = useState({
    scenario_findings: '',
    attack_narrative: '',
    iocs: [],
    timeline_events: [],
    final_verdict: ''
  });
  const [sessionId, setSessionId] = useState(null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [aiFeedback, setAiFeedback] = useState(null);
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
  const [showCertificate, setShowCertificate] = useState(false);
  const [finalScore, setFinalScore] = useState(0);
  const [scoreBreakdown, setScoreBreakdown] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);

  const debounceTimeout = useRef(null);
  const timerIntervalRef = useRef(null);

  const startTimer = useCallback((initialInvestigationStartTime) => {
    if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
    }

    const initialElapsedSeconds = initialInvestigationStartTime
        ? Math.floor((Date.now() - new Date(initialInvestigationStartTime).getTime()) / 1000)
        : 0;
    
    setTimer(initialElapsedSeconds);

    const timerStartBase = Date.now() - (initialElapsedSeconds * 1000);

    timerIntervalRef.current = setInterval(() => {
        setTimer(Math.floor((Date.now() - timerStartBase) / 1000));
    }, 1000);
  }, []);

  const addInvestigationStep = useCallback((step) => {
    setInvestigationSteps((prev) => [...prev, { ...step, timestamp: new Date().toISOString() }]);
  }, []);

  const handleSelectLog = useCallback((log) => {
      setSelectedLog(prevSelectedLog => {
        // If the clicked log is already selected, deselect it to close the viewer.
        if (log && prevSelectedLog && log.id === prevSelectedLog.id) {
          addInvestigationStep({
            action_type: "Log Viewer Closed",
            details: `Closed details for log: ${log.rule_description}`,
          });
          return null;
        }
        // Otherwise, select the new log.
        if (log) {
          addInvestigationStep({
            action_type: "Log Viewed",
            details: `Viewing details for log: ${log.rule_description}`,
          });
        }
        return log;
      });
  }, [addInvestigationStep]);

  useEffect(() => {
    const startOrResumeInvestigation = async () => {
      if (!scenarioId) {
        navigate(createPageUrl("Scenarios"));
        return;
      }
      setIsLoading(true);
      try {
        const [scenarioData, user] = await Promise.all([
            Scenario.get(scenarioId),
            User.me()
        ]);
        setCurrentScenario(scenarioData);
        setCurrentUser(user);

        const existingInvestigations = await Investigation.filter({
          scenario_id: scenarioId,
          created_by: user.email,
          status: 'active'
        });

        let currentInvestigation;
        if (existingInvestigations.length > 0) {
          currentInvestigation = existingInvestigations[0];
          setInvestigation(currentInvestigation);
          setSessionId(currentInvestigation.session_id);
          if (currentInvestigation.findings && currentInvestigation.findings.scenario_report) {
            setScenarioReport(currentInvestigation.findings.scenario_report);
          }
          addInvestigationStep({
            action_type: "Investigation Resumed",
            details: `Resumed investigation for scenario: ${scenarioData.title}`,
          });
          startTimer(currentInvestigation.start_time);
          setSaveStatus('saved');
        } else {
          currentInvestigation = await Investigation.create({
            scenario_id: scenarioId,
            start_time: new Date().toISOString(),
            session_id: crypto.randomUUID(),
            status: 'active',
          });
          setInvestigation(currentInvestigation);
          setSessionId(currentInvestigation.session_id);
          addInvestigationStep({
            action_type: "Scenario Started",
            details: `Started investigation for scenario: ${scenarioData.title}`,
          });
          startTimer(currentInvestigation.start_time);
          setSaveStatus('saved');
        }

        if (scenarioData && scenarioData.initial_events && scenarioData.initial_events.length > 0) {
            handleSelectLog(scenarioData.initial_events[0]);
        }
      } catch (error) {
        console.error("Failed to start or resume investigation:", error);
        navigate(createPageUrl("Scenarios"));
      } finally {
        setIsLoading(false);
      }
    };
    startOrResumeInvestigation();

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [scenarioId, navigate, startTimer, addInvestigationStep, handleSelectLog]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const getInvestigationProgress = useCallback(() => {
    const hasFindings = scenarioReport.scenario_findings && scenarioReport.scenario_findings.trim().length > 50;
    const hasNarrative = scenarioReport.attack_narrative && scenarioReport.attack_narrative.trim().length > 50;
    const hasVerdict = !!scenarioReport.final_verdict;
    const hasIOCs = scenarioReport.iocs && scenarioReport.iocs.length > 0;
    
    const completedItems = [hasFindings, hasNarrative, hasVerdict, hasIOCs].filter(Boolean).length;
    return { completed: completedItems, total: 4 };
  }, [scenarioReport]);

  const autoSaveProgress = useCallback(async (currentReport) => {
    if (!investigation) {
      setSaveStatus('error');
      return;
    }
    setSaveStatus('saving');
    try {
        const { total, completed } = getInvestigationProgress();
        const completionPercentage = total > 0 ? (completed / total) * 100 : 0;

        await Investigation.update(investigation.id, {
            findings: { scenario_report: currentReport },
            completion_percentage: completionPercentage,
        });
        setSaveStatus('saved');
    } catch (error) {
        console.error("Auto-save failed:", error);
        setSaveStatus('error');
    }
  }, [investigation, getInvestigationProgress]);

  const handleReportUpdate = (field, value) => {
    const newReport = {
        ...scenarioReport,
        [field]: value
    };
    setScenarioReport(newReport);
    
    if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
    }
    setSaveStatus('idle');
    debounceTimeout.current = setTimeout(() => {
        autoSaveProgress(newReport);
    }, 2000);
  };

  const calculateProfessionalScore = async (report, scenario) => {
    try {
        const evaluationResult = await InvokeLLM({
          prompt: `As an expert SOC analyst trainer, evaluate this student's complete investigation of a security scenario.

**SCENARIO DETAILS:**
Title: ${scenario.title}
Description: ${scenario.description}
Difficulty: ${scenario.difficulty}
Total Logs: ${scenario.initial_events?.length || 0}

**STUDENT'S COMPLETE INVESTIGATION:**

**Attack Narrative:**
"${report.attack_narrative || 'No narrative provided'}"

**Overall Findings:**
"${report.scenario_findings || 'No findings provided'}"

**Final Verdict:** ${report.final_verdict || 'No verdict provided'}

**IOCs Identified:** ${report.iocs?.length || 0} IOCs
${report.iocs?.map(ioc => `- ${ioc.type}: ${ioc.value}`).join('\n') || 'None'}

**Timeline Events:** ${report.timeline_events?.length || 0} events

━━━━━━━━━━━━━━━━━━━━━━
**EVALUATION CRITERIA:**
━━━━━━━━━━━━━━━━━━━━━━

**1. Attack Narrative Understanding (30%):**
- Did they correctly identify the attack type and sequence?
- Did they understand the full attack chain from initial access to final impact?
- Did they correctly correlate events across multiple logs?

**2. Technical Analysis (25%):**
- Did they identify key technical indicators?
- Did they understand the significance of the evidence?
- Did they demonstrate proper SOC analysis methodology?

**3. IOC Identification (20%):**
- Did they extract all critical IOCs (IPs, domains, hashes, usernames)?
- Did they prioritize IOCs correctly?
- Did they understand the significance of each IOC?

**4. Final Verdict (20%):**
- Is the verdict appropriate for the scenario?
- Did they justify their verdict properly?
- Did they demonstrate sound judgment?

**5. Completeness (5%):**
- Did they address all aspects of the scenario?
- Is the investigation thorough and well-documented?

Please respond with this exact JSON structure:
{
  "narrative_score": [0-100 number],
  "narrative_feedback": "[Detailed feedback on attack narrative]",
  "technical_analysis_score": [0-100 number],
  "technical_feedback": "[Detailed feedback on technical analysis]",
  "ioc_score": [0-100 number],
  "ioc_feedback": "[Feedback on IOC identification]",
  "expected_iocs": [
    {"type": "ip", "value": "example", "description": "why this IOC matters"}
  ],
  "verdict_score": [0-100 number],
  "correct_verdict": "[True Positive/False Positive/Escalate to TIER 2]",
  "verdict_feedback": "[Detailed explanation of why verdict is correct/incorrect]",
  "completeness_score": [0-100 number],
  "overall_feedback": "[Comprehensive feedback on entire investigation]",
  "strengths": ["strength 1", "strength 2"],
  "areas_for_improvement": ["area 1", "area 2"],
  "suggested_approach": "[How a professional SOC analyst would have approached this]",
  "total_score": [calculated total score 0-100]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              narrative_score: { type: "number" },
              narrative_feedback: { type: "string" },
              technical_analysis_score: { type: "number" },
              technical_feedback: { type: "string" },
              ioc_score: { type: "number" },
              ioc_feedback: { type: "string" },
              expected_iocs: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    value: { type: "string" },
                    description: { type: "string" }
                  }
                }
              },
              verdict_score: { type: "number" },
              correct_verdict: { type: "string" },
              verdict_feedback: { type: "string" },
              completeness_score: { type: "number" },
              overall_feedback: { type: "string" },
              strengths: { type: "array", items: { type: "string" } },
              areas_for_improvement: { type: "array", items: { type: "string" } },
              suggested_approach: { type: "string" },
              total_score: { type: "number" }
            }
          }
        });

        const totalScore = (
          (evaluationResult.narrative_score * 0.30) + 
          (evaluationResult.technical_analysis_score * 0.25) + 
          (evaluationResult.ioc_score * 0.20) + 
          (evaluationResult.verdict_score * 0.20) + 
          (evaluationResult.completeness_score * 0.05)
        );

        return {
          overall_score: Math.round(totalScore),
          evaluation_details: evaluationResult,
          score_breakdown: {
            "Attack Narrative": { score: evaluationResult.narrative_score, weight: "30%" },
            "Technical Analysis": { score: evaluationResult.technical_analysis_score, weight: "25%" },
            "IOC Identification": { score: evaluationResult.ioc_score, weight: "20%" },
            "Final Verdict": { score: evaluationResult.verdict_score, weight: "20%" },
            "Completeness": { score: evaluationResult.completeness_score, weight: "5%" }
          }
        };
      } catch (error) {
        console.error("Error evaluating scenario:", error);
        return {
          overall_score: 0,
          evaluation_details: {
            narrative_score: 0,
            narrative_feedback: "System error during evaluation",
            technical_analysis_score: 0,
            technical_feedback: "System error during evaluation",
            ioc_score: 0,
            ioc_feedback: "System error during evaluation",
            verdict_score: 0,
            correct_verdict: "Unable to determine",
            verdict_feedback: "System error during evaluation",
            completeness_score: 0,
            overall_feedback: "An error occurred. Please try again.",
            strengths: [],
            areas_for_improvement: [],
            suggested_approach: "",
            total_score: 0
          },
          score_breakdown: {}
        };
      }
  };
  
  const handleCompleteEntireInvestigation = async () => {
    setShowCompleteModal(true);
    setIsGeneratingFeedback(true);
    try {
        if (!currentUser || !currentScenario || !investigation) {
          throw new Error("Missing user, scenario, or investigation data for completion.");
        }

        const evaluationResults = await calculateProfessionalScore(scenarioReport, currentScenario);
        const calculatedFinalScore = evaluationResults.overall_score;
        setFinalScore(calculatedFinalScore);
        setScoreBreakdown(evaluationResults.score_breakdown);

        const aiFeedbackForDB = {
            overall_score: calculatedFinalScore,
            strengths: evaluationResults.evaluation_details.strengths || [],
            areas_for_improvement: evaluationResults.evaluation_details.areas_for_improvement || [],
            detailed_feedback: evaluationResults.evaluation_details.overall_feedback,
            evaluation_details: evaluationResults.evaluation_details,
            score_breakdown: evaluationResults.score_breakdown
        };

        setAiFeedback(aiFeedbackForDB);

        const updatedInvestigation = await Investigation.update(investigation.id, {
            end_time: new Date().toISOString(),
            score: calculatedFinalScore,
            ai_feedback: aiFeedbackForDB,
            completion_percentage: 100,
            status: 'completed',
            findings: { scenario_report: scenarioReport }
        });
        setInvestigation(updatedInvestigation);

        try {
          let tenantId = null;
          const tenantUsers = await TenantUser.filter({ user_id: currentUser.id, status: 'active' });
          if (tenantUsers.length > 0) {
            tenantId = tenantUsers[0].tenant_id;
          }

          const startTimeDate = new Date(investigation.start_time);
          const durationMinutes = Math.round((Date.now() - startTimeDate.getTime()) / (1000 * 60));

          const strengthsFromFeedback = aiFeedbackForDB.detailed_feedback.includes("did well") ? ["Identified key threats"] : []; 
          const weaknessesFromFeedback = aiFeedbackForDB.detailed_feedback.includes("can improve") ? ["Missed some IOCs"] : [];

          const activityData = {
            user_id: currentUser.id,
            tenant_id: tenantId,
            activity_type: 'investigation_completion',
            task_id: currentScenario.id,
            task_title: currentScenario.title,
            session_data: {
              start_time: investigation.start_time,
              completion_time: new Date().toISOString(),
              duration_minutes: durationMinutes,
              attempts_count: 1
            },
            performance_metrics: {
              score: calculatedFinalScore,
              errors_detected: weaknessesFromFeedback, 
              strengths: strengthsFromFeedback,       
              weaknesses: weaknessesFromFeedback,     
              next_steps: aiFeedbackForDB.detailed_feedback.length > 0 ? [`Review overall feedback`] : [] 
            },
            ai_feedback: {
              detailed_feedback: aiFeedbackForDB.detailed_feedback,
              difficulty_assessment: calculatedFinalScore >= 85 ? 'appropriate' : calculatedFinalScore >= 60 ? 'challenging' : 'too_hard',
              engagement_level: scenarioReport.scenario_findings.length > 100 ? 'high' : 'medium'
            },
            learning_analytics: {
              concepts_mastered: calculatedFinalScore >= 70 ? [currentScenario.category || "General SOC Skills"] : [],
              concepts_struggling: calculatedFinalScore < 70 ? [currentScenario.category || "General SOC Skills"] : [],
              learning_path_status: calculatedFinalScore >= 70 ? 'on_track' : 'needs_support',
              predicted_success_rate: Math.max(20, calculatedFinalScore - 10)
            },
            submission_content: {
              scenario_report: scenarioReport,
              final_score: calculatedFinalScore,
              investigation_data: updatedInvestigation
            }
          };

          console.log('[INVESTIGATION] Recording activity:', activityData);
          await StudentActivityLog.create(activityData);
          console.log('[INVESTIGATION] Activity recorded successfully');

        } catch (activityError) {
          console.error('[INVESTIGATION] Failed to record student activity log:', activityError);
        }

    } catch (error) {
        console.error("Error during evaluation or saving investigation:", error);
        setAiFeedback({
          overall_score: 0,
          strengths: [],
          areas_for_improvement: [],
          detailed_feedback: "An error occurred during evaluation. Please try again or contact support.",
          detailed_log_scores: {},
          score_breakdown: {}
        });
        setFinalScore(0);
        setScoreBreakdown({});
    } finally {
        setIsGeneratingFeedback(false);
    }
  };

  const handleFinalize = () => {
    setShowCompleteModal(false);
    const MINIMUM_PASSING_SCORE = 85;
    if (finalScore >= MINIMUM_PASSING_SCORE) {
      setShowCertificate(true);
    } else {
      navigate(createPageUrl("Scenarios"));
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy": return "text-green-400 bg-green-400/20";
      case "Medium": return "text-yellow-400 bg-yellow-400/20";
      case "Hard": return "text-red-400 bg-red-400/20";
      case "Advanced": return "text-purple-400 bg-purple-400/20";
      default: return "text-gray-400 bg-gray-400/20";
    }
  };

  if (isLoading || !currentScenario) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto" />
            <p className="mt-4 text-white">Loading Investigation...</p>
        </div>
      </div>
    );
  }

  const { completed: completedItems, total: totalItems } = getInvestigationProgress();
  const investigationComplete = completedItems >= 3;

  if (showCertificate) {
    return (
      <CertificateGenerator
        score={finalScore}
        scoreBreakdown={scoreBreakdown}
        scenario={currentScenario}
        investigation={investigation}
        onClose={() => navigate(createPageUrl("Scenarios"))}
      />
    );
  }

  const SaveStatusIndicator = () => {
    switch (saveStatus) {
        case 'saving':
            return <div className="flex items-center gap-2 text-xs text-yellow-400"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</div>;
        case 'saved':
            return <div className="flex items-center gap-2 text-xs text-green-400"><CheckCircle className="w-3 h-3" /> All changes saved</div>;
        case 'error':
            return <div className="flex items-center gap-2 text-xs text-red-400"><AlertTriangle className="w-3 h-3" /> Save failed</div>;
        default:
            return <div className="flex items-center gap-2 text-xs text-slate-400"></div>;
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-900 min-h-screen text-white">
      <style>{`
        .custom-progress-bar > div {
          background-image: linear-gradient(to right, #9333ea, #0d9488);
        }
      `}</style>
      <div className="max-w-8xl mx-auto">
        <div className="mb-6">
            <Link to={createPageUrl("Scenarios")} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-4">
                <ChevronLeft className="w-4 h-4" />
                Back to Scenarios
            </Link>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{currentScenario.title}</h1>
                <p className="text-slate-400 mt-1">{currentScenario.description}</p>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-sm self-start md:self-center">
                  <Badge variant="outline" className={`${
                      currentScenario.difficulty === 'Easy' ? 'border-green-500/50 text-green-400'
                      : currentScenario.difficulty === 'Medium' ? 'border-yellow-500/50 text-yellow-400'
                      : currentScenario.difficulty === 'Hard' ? 'border-red-500/50 text-red-400'
                      : 'border-purple-500/50 text-purple-400'
                  } text-sm`}>
                      {currentScenario.difficulty}
                  </Badge>
                  <div className="flex items-center gap-2 text-slate-300">
                      <Clock className="w-4 h-4 text-teal-400"/>
                      <span>Time: {formatTime(timer)}</span>
                  </div>
                  <SaveStatusIndicator />
              </div>
            </div>
        </div>
        
        <Card className="bg-slate-800/50 border border-slate-700 mb-6">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                    <Target className="w-5 h-5 text-purple-400" />
                    Learning Objectives
                </CardTitle>
            </CardHeader>
            <CardContent>
                <ul className="list-disc list-inside space-y-2 text-slate-300">
                   {(currentScenario.learning_objectives || currentScenario.tags || []).map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>
            </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div>
                <InvestigationLogs
                  logs={currentScenario.initial_events}
                  onSelectLog={handleSelectLog}
                  selectedLogId={selectedLog ? selectedLog.id : null}
                />
            </div>
            <div>
                <Card className="bg-slate-800/50 border-slate-700 h-full">
                    <CardHeader>
                        <CardTitle className="text-white">Scenario Investigation Report</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Tabs defaultValue="narrative" className="w-full">
                            <TabsList className="grid w-full grid-cols-4 bg-slate-900/70 mb-4">
                                <TabsTrigger value="narrative">Narrative</TabsTrigger>
                                <TabsTrigger value="findings">Findings</TabsTrigger>
                                <TabsTrigger value="iocs">IOCs</TabsTrigger>
                                <TabsTrigger value="verdict">Verdict</TabsTrigger>
                            </TabsList>
                            
                            <TabsContent value="narrative">
                                <h4 className="text-sm font-semibold text-white mb-2">Attack Narrative</h4>
                                <p className="text-xs text-slate-400 mb-3">Tell the complete story of the attack from beginning to end</p>
                                <Textarea
                                    placeholder="Describe the full attack chain, from initial access to final impact..."
                                    className="bg-slate-700 border-slate-600 text-white min-h-[200px]"
                                    value={scenarioReport.attack_narrative}
                                    onChange={(e) => handleReportUpdate('attack_narrative', e.target.value)}
                                />
                            </TabsContent>
                            
                            <TabsContent value="findings">
                                <h4 className="text-sm font-semibold text-white mb-2">Technical Findings</h4>
                                <p className="text-xs text-slate-400 mb-3">Document your technical analysis and key evidence</p>
                                <Textarea
                                    placeholder="What did you discover? What evidence supports your conclusions?"
                                    className="bg-slate-700 border-slate-600 text-white min-h-[200px]"
                                    value={scenarioReport.scenario_findings}
                                    onChange={(e) => handleReportUpdate('scenario_findings', e.target.value)}
                                />
                            </TabsContent>
                            
                            <TabsContent value="iocs">
                                <IOCTracker 
                                    iocs={scenarioReport.iocs || []}
                                    onUpdate={(newIocs) => handleReportUpdate('iocs', newIocs)}
                                />
                            </TabsContent>
                            
                            <TabsContent value="verdict">
                                <h4 className="text-sm font-semibold text-white mb-2">Final Verdict</h4>
                                <p className="text-xs text-slate-400 mb-3">Based on your complete investigation, classify this scenario</p>
                                <div className="flex flex-col gap-3">
                                    {['True Positive', 'False Positive', 'Escalate to TIER 2'].map(v => (
                                        <Button 
                                            key={v}
                                            variant={scenarioReport.final_verdict === v ? 'default' : 'outline'}
                                            onClick={() => handleReportUpdate('final_verdict', v)}
                                            className={`w-full ${scenarioReport.final_verdict === v ? 'bg-teal-600 hover:bg-teal-700' : 'border-slate-600 hover:bg-slate-700'}`}
                                        >
                                            {v}
                                        </Button>
                                    ))}
                                </div>
                            </TabsContent>
                        </Tabs>
                    </CardContent>
                </Card>
            </div>
        </div>
        
        <div className="mt-6 mb-6 p-6 bg-slate-800/50 border border-slate-700 rounded-lg flex flex-col items-center text-center">
            <Trophy className="w-8 h-8 text-yellow-400 mb-3" />
            <h3 className="text-xl font-bold text-white mb-2">Complete Investigation</h3>
            <p className="text-slate-400 mb-4">
                Investigation progress: <span className="font-bold text-teal-400">{completedItems}</span> out of <span className="font-bold text-white">{totalItems}</span> sections completed.
            </p>
            <Progress value={totalItems > 0 ? (completedItems / totalItems) * 100 : 0} className="w-full max-w-sm mb-4 custom-progress-bar" />
            <Button 
              onClick={handleCompleteEntireInvestigation}
              disabled={!investigationComplete || isGeneratingFeedback}
              className="bg-gradient-to-r from-purple-600 to-teal-600 text-white disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed"
            >
              {isGeneratingFeedback ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                'Finalize & Evaluate Investigation'
              )}
            </Button>
            {!investigationComplete && (
              <p className="text-xs text-slate-500 mt-2">
                Complete at least 3 sections (narrative, findings, verdict) to finalize the investigation.
              </p>
            )}
        </div>
      </div>

      <CompleteInvestigationModal 
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        feedback={aiFeedback}
        isGeneratingFeedback={isGeneratingFeedback}
        onFinalize={handleFinalize}
        scenario={currentScenario}
        investigation={investigation}
        scoreBreakdown={scoreBreakdown}
        createPageUrl={createPageUrl}
      />

    </div>
  );
}