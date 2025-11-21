import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Investigation, Scenario } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Trophy, 
  Target, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Star,
  Award,
  TrendingUp,
  BookOpen,
  Lightbulb,
  Zap,
  Shield,
  Clock
} from "lucide-react";
import { createPageUrl } from "@/utils";

export default function InvestigationReportPage() {
  const { investigationId } = useParams();
  const navigate = useNavigate();
  const [investigation, setInvestigation] = useState(null);
  const [scenario, setScenario] = useState(null);
  const [selectedLogId, setSelectedLogId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        const investigationData = await Investigation.get(investigationId);
        const scenarioData = await Scenario.get(investigationData.scenario_id);
        
        setInvestigation(investigationData);
        setScenario(scenarioData);
        
        // Auto-select first log
        if (scenarioData.initial_events?.length > 0) {
          setSelectedLogId(scenarioData.initial_events[0].id);
        }
      } catch (error) {
        console.error("Failed to load investigation report:", error);
      }
      setIsLoading(false);
    };

    if (investigationId) {
      loadReportData();
    }
  }, [investigationId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading Investigation Report...</p>
        </div>
      </div>
    );
  }

  if (!investigation || !scenario) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <div className="text-center text-white">
          <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Report Not Found</h2>
          <p className="text-slate-400 mb-4">The investigation report could not be loaded.</p>
          <Link to={createPageUrl("Dashboard")}>
            <Button className="bg-teal-600 hover:bg-teal-700">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const detailedLogScores = investigation.ai_feedback?.detailed_log_scores || {};
  const logs = scenario.initial_events || [];
  const selectedLog = logs.find(log => log.id === selectedLogId);
  const selectedLogScore = detailedLogScores[selectedLogId];
  const userLogData = investigation.findings?.log_investigations_details?.[selectedLogId] || {};

  const getScoreColor = (score) => {
    if (score >= 90) return "text-emerald-400 bg-emerald-500/20 border-emerald-500/50";
    if (score >= 80) return "text-green-400 bg-green-500/20 border-green-500/50";
    if (score >= 70) return "text-yellow-400 bg-yellow-500/20 border-yellow-500/50";
    if (score >= 60) return "text-orange-400 bg-orange-500/20 border-orange-500/50";
    return "text-red-400 bg-red-500/20 border-red-500/50";
  };

  const getGradeIcon = (score) => {
    if (score >= 90) return <Trophy className="w-5 h-5" />;
    if (score >= 80) return <Award className="w-5 h-5" />;
    if (score >= 70) return <Star className="w-5 h-5" />;
    if (score >= 60) return <Target className="w-5 h-5" />;
    return <AlertTriangle className="w-5 h-5" />;
  };

  const currentLogIndex = logs.findIndex(log => log.id === selectedLogId);
  const canGoPrevious = currentLogIndex > 0;
  const canGoNext = currentLogIndex < logs.length - 1;

  const navigateLog = (direction) => {
    const newIndex = direction === 'prev' ? currentLogIndex - 1 : currentLogIndex + 1;
    if (newIndex >= 0 && newIndex < logs.length) {
      setSelectedLogId(logs[newIndex].id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/80 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div className="h-8 w-px bg-slate-600"></div>
              <div>
                <h1 className="text-xl font-bold text-white flex items-center gap-2">
                  <BookOpen className="w-6 h-6 text-teal-400" />
                  Investigation Report
                </h1>
                <p className="text-sm text-slate-400">{scenario.title}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{investigation.score || 0}%</div>
                <div className="text-xs text-slate-400">Final Score</div>
              </div>
              <Badge className={`${getScoreColor(investigation.score || 0)} border px-3 py-1`}>
                {getGradeIcon(investigation.score || 0)}
                <span className="ml-2 font-semibold">
                  {investigation.score >= 90 ? "EXCELLENT" : 
                   investigation.score >= 80 ? "GREAT" : 
                   investigation.score >= 70 ? "GOOD" : 
                   investigation.score >= 60 ? "FAIR" : "NEEDS IMPROVEMENT"}
                </span>
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 grid lg:grid-cols-4 gap-6">
        {/* Sidebar - Log Navigation */}
        <div className="lg:col-span-1">
          <Card className="bg-slate-800/60 backdrop-blur-sm border-slate-700/50 sticky top-24">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-teal-400" />
                Investigation Logs
                <Badge variant="outline" className="ml-auto text-xs">
                  {logs.length} Total
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {logs.map((log, index) => {
                const logScore = detailedLogScores[log.id]?.total_score || 0;
                const isSelected = selectedLogId === log.id;
                
                return (
                  <button
                    key={log.id}
                    onClick={() => setSelectedLogId(log.id)}
                    className={`w-full p-3 rounded-lg border transition-all duration-200 text-left ${
                      isSelected 
                        ? 'bg-teal-600/30 border-teal-500/50 shadow-lg shadow-teal-500/20' 
                        : 'bg-slate-700/30 border-slate-600/50 hover:bg-slate-700/50 hover:border-slate-500/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-white">
                        Log #{index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        {getGradeIcon(logScore)}
                        <span className={`text-sm font-bold ${getScoreColor(logScore).split(' ')[0]}`}>
                          {Math.round(logScore)}%
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 truncate mb-2">
                      {log.rule_description}
                    </div>
                    <Progress 
                      value={logScore} 
                      className="h-1.5" 
                      style={{
                        '--progress-background': logScore >= 80 ? '#10b981' : 
                                                logScore >= 60 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Detailed Report */}
        <div className="lg:col-span-3">
          {selectedLog && selectedLogScore ? (
            <div className="space-y-6">
              {/* Navigation Controls */}
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  onClick={() => navigateLog('prev')}
                  disabled={!canGoPrevious}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous Log
                </Button>
                
                <div className="text-center">
                  <div className="text-sm text-slate-400">
                    Log {currentLogIndex + 1} of {logs.length}
                  </div>
                  <div className="text-lg font-semibold text-white">
                    {selectedLog.rule_description}
                  </div>
                </div>

                <Button
                  variant="outline"
                  onClick={() => navigateLog('next')}
                  disabled={!canGoNext}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  Next Log
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              {/* Score Overview Card */}
              <Card className="bg-gradient-to-r from-slate-800/80 to-slate-700/80 backdrop-blur-sm border border-slate-600/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                      {getGradeIcon(selectedLogScore.total_score)}
                      <span>Performance Analysis</span>
                    </CardTitle>
                    <Badge className={`${getScoreColor(selectedLogScore.total_score)} border text-lg px-4 py-2`}>
                      {Math.round(selectedLogScore.total_score)}% Score
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="text-2xl font-bold text-teal-400">
                        {Math.round(selectedLogScore.findings_score || 0)}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Findings Analysis</div>
                      <div className="text-xs text-slate-500 mt-1">50% Weight</div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="text-2xl font-bold text-purple-400">
                        {Math.round(selectedLogScore.verdict_score || 0)}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Verdict Decision</div>
                      <div className="text-xs text-slate-500 mt-1">45% Weight</div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="text-2xl font-bold text-yellow-400">
                        {Math.round(selectedLogScore.ioc_score || 0)}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">IOC Detection</div>
                      <div className="text-xs text-slate-500 mt-1">2.5% Weight</div>
                    </div>
                    <div className="text-center p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                      <div className="text-2xl font-bold text-blue-400">
                        {Math.round(selectedLogScore.timeline_score || 0)}%
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Timeline Events</div>
                      <div className="text-xs text-slate-500 mt-1">2.5% Weight</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Your Response Section */}
              <Card className="bg-slate-800/60 backdrop-blur-sm border-slate-700/50">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-400" />
                    Your Investigation Response
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-teal-400" />
                        Your Findings
                      </h4>
                      <div className="text-sm text-slate-300 bg-slate-800/30 p-3 rounded border-l-4 border-teal-500/50">
                        {userLogData.findings || "No findings provided"}
                      </div>
                    </div>
                    <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
                      <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400" />
                        Your Verdict
                      </h4>
                      <Badge className={`${
                        userLogData.verdict === selectedLogScore.correct_verdict 
                          ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                          : 'bg-red-500/20 text-red-400 border-red-500/50'
                      } border text-sm px-3 py-1`}>
                        {userLogData.verdict || "No verdict selected"}
                        {userLogData.verdict === selectedLogScore.correct_verdict ? (
                          <CheckCircle2 className="w-4 h-4 ml-2" />
                        ) : (
                          <XCircle className="w-4 h-4 ml-2" />
                        )}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Expert Analysis */}
              <Card className="bg-gradient-to-br from-teal-900/30 to-slate-800/60 backdrop-blur-sm border border-teal-500/30">
                <CardHeader>
                  <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                    <Zap className="w-5 h-5 text-teal-400" />
                    AI Expert Analysis & Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Findings Analysis */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-teal-400" />
                      Findings Analysis
                      <Badge className={`${getScoreColor(selectedLogScore.findings_score)} border ml-2`}>
                        {Math.round(selectedLogScore.findings_score)}%
                      </Badge>
                    </h3>
                    
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                      <div className="text-sm text-slate-300 leading-relaxed">
                        {selectedLogScore.findings_feedback}
                      </div>
                    </div>

                    {selectedLogScore.suggested_findings && (
                      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 p-4 rounded-lg border border-emerald-500/30">
                        <h4 className="font-semibold text-emerald-300 mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          Expert Example - How to write professional findings:
                        </h4>
                        <div className="text-sm text-emerald-100 bg-emerald-900/20 p-3 rounded border-l-4 border-emerald-500/50">
                          {selectedLogScore.suggested_findings}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Verdict Analysis */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Shield className="w-5 h-5 text-purple-400" />
                      Verdict Analysis
                      <Badge className={`${getScoreColor(selectedLogScore.verdict_score)} border ml-2`}>
                        {Math.round(selectedLogScore.verdict_score)}%
                      </Badge>
                    </h3>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <h4 className="font-semibold text-white mb-2">Your Choice vs Correct Answer:</h4>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">Your verdict:</span>
                            <Badge className={`${
                              userLogData.verdict === selectedLogScore.correct_verdict 
                                ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                                : 'bg-red-500/20 text-red-400 border-red-500/50'
                            } border`}>
                              {userLogData.verdict || "None"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">Correct verdict:</span>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50 border">
                              {selectedLogScore.correct_verdict}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <h4 className="font-semibold text-white mb-2">Expert Reasoning:</h4>
                        <div className="text-sm text-slate-300">
                          {selectedLogScore.verdict_feedback}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* IOC & Timeline Analysis */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-yellow-400" />
                        IOC Detection
                        <Badge className={`${getScoreColor(selectedLogScore.ioc_score)} border ml-2`}>
                          {Math.round(selectedLogScore.ioc_score)}%
                        </Badge>
                      </h3>
                      
                      {selectedLogScore.expected_iocs && selectedLogScore.expected_iocs.length > 0 ? (
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                          <h4 className="font-semibold text-white mb-3">Expected IOCs for this log:</h4>
                          <div className="space-y-2">
                            {selectedLogScore.expected_iocs.map((ioc, index) => (
                              <div key={index} className="flex items-center gap-3 p-2 bg-yellow-900/20 rounded border border-yellow-500/30">
                                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-xs">
                                  {ioc.type.toUpperCase()}
                                </Badge>
                                <span className="text-sm font-mono text-white">{ioc.value}</span>
                                <span className="text-xs text-slate-400 ml-auto">{ioc.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                          <div className="text-sm text-slate-300">No specific IOCs expected for this log type.</div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        Timeline Events
                        <Badge className={`${getScoreColor(selectedLogScore.timeline_score)} border ml-2`}>
                          {Math.round(selectedLogScore.timeline_score)}%
                        </Badge>
                      </h3>
                      
                      <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
                        <div className="text-sm text-slate-300">
                          {selectedLogScore.timeline_feedback || "Timeline events help establish the sequence of security events. Consider adding relevant timestamps and event descriptions."}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Overall Feedback */}
                  {selectedLogScore.overall_feedback && (
                    <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 p-4 rounded-lg border border-blue-500/30">
                      <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
                        <Star className="w-5 h-5 text-blue-400" />
                        Overall Assessment
                      </h3>
                      <div className="text-sm text-blue-100 leading-relaxed">
                        {selectedLogScore.overall_feedback}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-slate-800/60 backdrop-blur-sm border-slate-700/50">
              <CardContent className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Analysis Available</h3>
                <p className="text-slate-400">Detailed analysis is not available for this log.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}