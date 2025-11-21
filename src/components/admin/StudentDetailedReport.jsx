
import React, { useState, useEffect, useCallback } from 'react';
import { UserProgress, StudentActivityLog, User, QuizAttempt } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
    TrendingUp, 
    Trophy, 
    Target, 
    Clock, 
    BookOpen, 
    Brain,
    Download,
    ArrowLeft,
    Star,
    AlertTriangle,
    CheckCircle2,
    BarChart3,
    Zap,
    Award,
    Calendar,
    Users,
    FileText,
    Loader2,
    Lightbulb
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export default function StudentDetailedReport() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const studentId = searchParams.get('studentId');
    
    const [studentData, setStudentData] = useState(null);
    const [progressData, setProgressData] = useState(null);
    const [activities, setActivities] = useState([]);
    const [quizAttempts, setQuizAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [generatingPDF, setGeneratingPDF] = useState(false);

    const loadStudentData = useCallback(async () => {
        if (!studentId) return;
        
        setLoading(true);
        try {
            // Load student basic info
            const userDetails = await User.filter({ id: studentId });
            if (userDetails.length > 0) {
                setStudentData(userDetails[0]);
            }

            // Load progress data
            const progressRecords = await UserProgress.filter({ user_id: studentId });
            if (progressRecords.length > 0) {
                setProgressData(progressRecords[0]);
            }

            // Load recent activities (last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const activityRecords = await StudentActivityLog.filter(
                { user_id: studentId }, 
                '-created_date', 
                100
            );
            setActivities(activityRecords);

            // Load quiz attempts
            const quizData = await QuizAttempt.filter({ user_id: studentId }, '-start_time', 50);
            setQuizAttempts(quizData);

        } catch (error) {
            console.error('Error loading student data:', error);
        } finally {
            setLoading(false);
        }
    }, [studentId]);

    useEffect(() => {
        loadStudentData();
    }, [loadStudentData]);

    const generatePDF = async () => {
        setGeneratingPDF(true);
        try {
            // Create a comprehensive HTML report with embedded CSS that preserves all styling
            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Student Performance Report - ${studentData?.full_name || 'Student'}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #1f2937; 
            background: #f8fafc;
            padding: 20px;
        }
        .report-container { max-width: 210mm; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            border-bottom: 3px solid #14b8a6; 
            padding-bottom: 30px;
        }
        .header h1 { 
            font-size: 32px; 
            color: #14b8a6; 
            margin-bottom: 10px;
            font-weight: 700;
        }
        .header .subtitle { 
            font-size: 18px; 
            color: #6b7280; 
            margin-bottom: 5px;
        }
        .header .date { 
            font-size: 14px; 
            color: #9ca3af;
        }
        .student-name {
            font-size: 24px;
            font-weight: 700;
            color: #1f2937;
            margin-top: 15px;
            margin-bottom: 5px;
        }
        
        .section { 
            margin-bottom: 35px; 
            page-break-inside: avoid;
        }
        .section-title { 
            font-size: 24px; 
            font-weight: 600; 
            color: #1f2937; 
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .section-icon { 
            width: 28px; 
            height: 28px; 
            background: #14b8a6; 
            border-radius: 50%; 
            display: inline-flex; 
            align-items: center; 
            justify-content: center;
            color: white;
            font-size: 16px;
        }

        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 20px; 
            margin: 25px 0;
        }
        .metric-card { 
            background: linear-gradient(135deg, #f0fdfa 0%, #ecfdf5 100%);
            border: 2px solid #a7f3d0; 
            padding: 25px 20px; 
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .metric-icon { 
            width: 48px; 
            height: 48px; 
            background: #14b8a6; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            color: white;
            font-size: 20px;
        }
        .metric-value { 
            font-size: 36px; 
            font-weight: 700; 
            color: #14b8a6; 
            margin-bottom: 8px;
            line-height: 1;
        }
        .metric-label { 
            font-size: 14px; 
            color: #6b7280; 
            font-weight: 500;
        }

        .info-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 30px; 
            margin: 25px 0;
        }
        .info-card { 
            background: #f8fafc; 
            border: 1px solid #e2e8f0; 
            padding: 25px; 
            border-radius: 8px;
        }
        .info-title { 
            font-size: 16px; 
            font-weight: 600; 
            color: #374151; 
            margin-bottom: 15px;
        }
        .info-item { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 12px; 
            padding-bottom: 8px;
            border-bottom: 1px solid #e5e7eb;
        }
        .info-item:last-child { 
            border-bottom: none; 
            margin-bottom: 0;
        }
        .info-label { 
            color: #6b7280; 
            font-weight: 500;
        }
        .info-value { 
            color: #1f2937; 
            font-weight: 600;
        }

        .progress-section {
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
            padding: 25px;
            border-radius: 12px;
            border: 2px solid #bae6fd;
            margin: 20px 0;
        }
        .progress-bar-container { 
            background: #e5e7eb; 
            height: 12px; 
            border-radius: 6px; 
            overflow: hidden;
            margin: 10px 0 5px;
        }
        .progress-bar { 
            background: linear-gradient(90deg, #14b8a6, #06b6d4); 
            height: 100%; 
            border-radius: 6px;
            transition: width 0.3s ease;
        }
        .progress-text { 
            font-size: 14px; 
            color: #6b7280; 
            text-align: right;
            font-weight: 500;
        }

        .badge { 
            display: inline-block;
            padding: 6px 12px; 
            border-radius: 20px; 
            font-size: 12px; 
            font-weight: 600;
            margin: 2px 4px;
        }
        .badge-excellent { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .badge-good { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
        .badge-needs-improvement { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .badge-critical { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

        /* New badge styles for HTML report */
        .badge-positive { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; padding: 4px 8px; border-radius: 4px; display: inline-block; }
        .badge-warning { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 4px 8px; border-radius: 4px; display: inline-block; }
        .badge-danger { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 4px; display: inline-block; }

        .activity-list { margin-top: 20px; }
        .activity-item { 
            display: flex; 
            align-items: center; 
            gap: 15px;
            padding: 15px; 
            background: #f8fafc; 
            border-left: 4px solid #14b8a6;
            margin-bottom: 12px;
            border-radius: 0 8px 8px 0;
        }
        .activity-icon { 
            width: 36px; 
            height: 36px; 
            background: #14b8a6; 
            border-radius: 50%; 
            display: flex; 
            align-items: center; 
            justify-content: center;
            color: white;
            font-size: 14px;
            flex-shrink: 0;
        }
        .activity-content { flex-grow: 1; }
        .activity-title { 
            font-weight: 600; 
            color: #1f2937; 
            margin-bottom: 4px;
        }
        .activity-details { 
            font-size: 14px; 
            color: #6b7280;
        }
        .activity-score { 
            font-size: 18px; 
            font-weight: 700; 
            color: #14b8a6;
        }

        .recommendations { 
            background: linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%);
            border: 2px solid #fdba74;
            padding: 25px; 
            border-radius: 12px; 
            margin-top: 20px;
        }
        .recommendations h4 { 
            color: #9a3412; 
            font-size: 18px; 
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .recommendations ul { 
            list-style: none; 
            padding-left: 0;
        }
        .recommendations li { 
            padding: 8px 0 8px 25px; 
            position: relative;
            color: #7c2d12;
            font-weight: 500;
        }
        .recommendations li:before { 
            content: "💡"; 
            position: absolute; 
            left: 0;
            font-size: 16px;
        }
        .recommendations.success {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border-color: #86efac;
        }
        .recommendations.success h4 {
            color: #166534;
        }
        .recommendations.success li {
            color: #166534;
        }

        .footer { 
            margin-top: 50px; 
            padding-top: 30px; 
            border-top: 2px solid #e5e7eb; 
            text-align: center; 
            color: #6b7280;
        }
        .footer-logo { 
            font-size: 24px; 
            font-weight: 700; 
            color: #14b8a6; 
            margin-bottom: 10px;
        }

        /* Styles for the new table */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        th, td {
            border: 1px solid #e2e8f0;
            padding: 12px 15px;
            text-align: left;
            font-size: 14px;
        }
        th {
            background-color: #f1f5f9;
            font-weight: 600;
            color: #334155;
            white-space: nowrap; /* Prevent headers from wrapping too much */
        }
        tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }


        @media print {
            body { margin: 0; padding: 0; background: white; }
            .report-container { box-shadow: none; padding: 20px; }
            .section { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <h1>🎓 Student Performance Report</h1>
            <div class="subtitle">Comprehensive Learning Analytics & Assessment</div>
            <div class="student-name">${studentData?.full_name || 'Student Name'}</div>
            <div class="date">Generated on ${new Date().toLocaleDateString()}</div>
        </div>

        ${studentData ? `
        <div class="section">
            <div class="section-title">
                <div class="section-icon">👤</div>
                Student Overview
            </div>
            <div class="info-grid">
                <div class="info-card">
                    <div class="info-title">Basic Information</div>
                    <div class="info-item">
                        <span class="info-label">Full Name:</span>
                        <span class="info-value">${studentData.full_name || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Email:</span>
                        <span class="info-value">${studentData.email || 'N/A'}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Current Level:</span>
                        <span class="info-value">Level ${progressData?.level || 1}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Subscription:</span>
                        <span class="info-value">${studentData.subscription_tier || 'Basic'}</span>
                    </div>
                </div>
                
                <div class="info-card">
                    <div class="info-title">Performance Summary</div>
                    <div class="info-item">
                        <span class="info-label">Overall Performance:</span>
                        <span class="info-value badge-positive">Good</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Total Points:</span>
                        <span class="info-value">${progressData?.points || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Scenarios Completed:</span>
                        <span class="info-value">${progressData?.total_scenarios_completed || 0}</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Average Score:</span>
                        <span class="info-value">${progressData?.average_score || 0}%</span>
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <div class="section-title">
                <div class="section-icon">🏆</div>
                Gamification Metrics
            </div>
            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon">🎯</div>
                    <div class="metric-value">${progressData?.points || 0}</div>
                    <div class="metric-label">Total gamification points</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">📊</div>
                    <div class="metric-value">
                        ${progressData?.total_scenarios_attempted > 0 
                            ? Math.round((progressData.total_scenarios_completed / progressData.total_scenarios_attempted) * 100)
                            : 0}%
                    </div>
                    <div class="metric-label">Scenarios completed successfully</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">📈</div>
                    <div class="metric-value">${progressData?.average_score || 0}%</div>
                    <div class="metric-label">Across all activities</div>
                </div>
                <div class="metric-card">
                    <div class="metric-icon">⏱️</div>
                    <div class="metric-value">
                        ${Math.round((progressData?.total_time_spent || 0) / 60)}h
                    </div>
                    <div class="metric-label">Total learning time</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">
                <div class="section-icon">📚</div>
                Level Progress
            </div>
            <div class="progress-section">
                <h4>Current Level: ${progressData?.level || 1}</h4>
                <div class="progress-bar-container">
                    <div class="progress-bar" style="width: ${Math.min(((progressData?.points || 0) % 100), 100)}%"></div>
                </div>
                <div class="progress-text">
                    ${(progressData?.points || 0) % 100}/100 points to next level
                </div>
                <p style="margin-top: 15px; color: #6b7280; font-size: 14px;">
                    Points needed for next level: ${100 - ((progressData?.points || 0) % 100)} points
                </p>
            </div>
        </div>

        ${activities.length > 0 ? `
        <div class="section">
            <div class="section-title">
                <div class="section-icon">📋</div>
                Recent Learning Activities
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Activity</th>
                        <th>Score</th>
                        <th>Date</th>
                        <th>Analysis</th>
                        <th>Correct Answer</th>
                    </tr>
                </thead>
                <tbody>
                    ${activities.slice(0, 8).map(activity => `
                        <tr>
                            <td>${activity.task_title || (activity.activity_type ? activity.activity_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Learning Activity')}</td>
                            <td>${activity.performance_metrics?.score || 'N/A'}%</td>
                            <td>${new Date(activity.created_date).toLocaleDateString()}</td>
                            <td style="max-width: 120px; font-size: 12px;">
                                ${activity.performance_metrics?.score >= 80 ? 
                                    '<span class="badge-positive">Excellent work</span>' : 
                                    activity.performance_metrics?.score >= 60 ? 
                                    '<span class="badge-warning">Needs practice</span>' : 
                                    '<span class="badge-danger">Requires review</span>'
                                }
                            </td>
                            <td style="font-size: 12px; color: #059669; font-weight: 600;">
                                ${activity.performance_metrics?.correct_classification || 
                                  activity.performance_metrics?.expected_answer || 
                                  'True Positive'}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}

        ${activities.length > 0 ? `
        <div class="section">
            <div class="section-title">
                <div class="section-icon">💡</div>
                Performance Analysis & Recommendations
            </div>
            <div class="recommendations">
                <h4>🎯 Areas for Improvement</h4>
                <ul>
                    ${(progressData?.average_score || 0) < 70 ? 
                        '<li>Focus on foundational concepts - current average score needs improvement</li>' : ''}
                    ${(progressData?.current_streak || 0) < 3 ? 
                        '<li>Build consistent learning habits - try to practice daily</li>' : ''}
                    ${(progressData?.total_scenarios_completed || 0) < 5 ? 
                        '<li>Complete more practical scenarios to build hands-on experience</li>' : ''}
                    ${activities.filter(a => (a.performance_metrics?.score || 0) < 60).length > 2 ? 
                        '<li>Review challenging topics where scores were below 60%</li>' : ''}
                    <li>Continue engaging with interactive exercises and real-world scenarios.</li>
                    <li>Set daily learning goals to maintain momentum.</li>
                </ul>
            </div>
            <div class="recommendations success">
                <h4>🌟 Strengths & Achievements</h4>
                <ul>
                    ${(progressData?.average_score || 0) >= 80 ? 
                        '<li>Excellent overall performance with high average scores.</li>' : ''}
                    ${(progressData?.current_streak || 0) >= 7 ? 
                        '<li>Outstanding consistency with a strong learning streak.</li>' : ''}
                    ${(progressData?.total_scenarios_completed || 0) >= 10 ? 
                        '<li>Great practical experience with multiple scenarios completed.</li>' : ''}
                    <li>Actively engaged in the learning platform.</li>
                    <li>Shows commitment to cybersecurity skill development.</li>
                </ul>
            </div>
        </div>` : ''}

        <div class="footer">
            <div class="footer-logo">🛡️ Hack The SOC Training Platform</div>
            <p>Comprehensive cybersecurity training with AI-powered feedback</p>
            <p style="font-size: 12px; margin-top: 10px;">
                Report generated automatically based on student activity data and gamification metrics
            </p>
        </div>
    </div>
</body>
</html>`;

            // Create and download the HTML file as PDF
            const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${studentData?.full_name || 'Student'}_Performance_Report_${new Date().toISOString().split('T')[0]}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Show success message
            alert('Report downloaded successfully! The HTML file contains all styling and can be easily converted to PDF by printing it to PDF from your browser.');

        } catch (error) {
            console.error('Error generating report:', error);
            alert('Failed to generate report. Please try again.');
        } finally {
            setGeneratingPDF(false);
        }
    };

    const getPerformanceLevel = (score) => {
        if (score >= 90) return { level: 'Excellent', color: 'text-green-400', bgColor: 'bg-green-500/20' };
        if (score >= 80) return { level: 'Good', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
        if (score >= 70) return { level: 'Fair', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' };
        return { level: 'Needs Improvement', color: 'text-red-400', bgColor: 'bg-red-500/20' };
    };

    const getActivityIcon = (activityType) => {
        switch (activityType) {
            case 'scenario_completion': return <Target className="w-4 h-4" />;
            case 'quiz_completion': return <Brain className="w-4 h-4" />;
            case 'lesson_completion': return <BookOpen className="w-4 h-4" />;
            case 'exercise_completion': return <Zap className="w-4 h-4" />;
            case 'investigation_completion': return <Target className="w-4 h-4" />;
            default: return <FileText className="w-4 h-4" />;
        }
    };

    const generateRecommendations = () => {
        if (!progressData || !activities.length) return [];
        
        const recommendations = [];
        const avgScore = progressData.average_score || 0;
        const completedScenarios = progressData.total_scenarios_completed || 0;
        const recentActivities = activities.filter(a => {
            const activityDate = new Date(a.created_date);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return activityDate >= weekAgo;
        });

        if (avgScore < 70) {
            recommendations.push({
                type: 'improvement',
                title: 'Focus on Fundamentals',
                description: 'Consider reviewing basic cybersecurity concepts and taking foundational lessons before attempting advanced scenarios.',
                priority: 'high'
            });
        }

        if (recentActivities.length < 2) {
            recommendations.push({
                type: 'engagement',
                title: 'Increase Learning Frequency',
                description: 'Try to engage with the platform more regularly. Consistent practice leads to better retention and skill development.',
                priority: 'medium'
            });
        }

        if (completedScenarios >= 10 && avgScore >= 80) {
            recommendations.push({
                type: 'advancement',
                title: 'Ready for Advanced Challenges',
                description: 'Your performance indicates readiness for more complex scenarios and advanced certification paths.',
                priority: 'low'
            });
        }

        return recommendations;
    };

    if (loading) {
        return (
            <div className="p-8 bg-slate-900 min-h-screen text-white flex justify-center items-center">
                <div className="flex items-center gap-3">
                    <Loader2 className="w-8 h-8 text-teal-400 animate-spin" />
                    <span className="text-xl">Loading student report...</span>
                </div>
            </div>
        );
    }

    if (!studentData) {
        return (
            <div className="p-8 bg-slate-900 min-h-screen text-white">
                <div className="text-center">
                    <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2">Student Not Found</h2>
                    <p className="text-slate-400 mb-4">Unable to load student data.</p>
                    <Button onClick={() => navigate(-1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </div>
            </div>
        );
    }

    const performance = getPerformanceLevel(progressData?.average_score || 0);
    const recommendations = generateRecommendations();

    return (
        <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <Button 
                            variant="ghost" 
                            onClick={() => navigate(-1)}
                            className="text-slate-400 hover:text-white mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Back to Admin Panel
                        </Button>
                        <h1 className="text-3xl font-bold text-white mb-2">Student Performance Report</h1>
                        <p className="text-slate-400">Comprehensive analysis and recommendations</p>
                    </div>
                    <Button 
                        onClick={generatePDF}
                        disabled={generatingPDF}
                        className="bg-teal-600 hover:bg-teal-700"
                    >
                        {generatingPDF ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4 mr-2" />
                        )}
                        {generatingPDF ? 'Generating Report...' : 'Download Report'}
                    </Button>
                </div>

                {/* The main content for the React component (not directly used for PDF generation anymore) */}
                <div>
                    {/* Student Overview */}
                    <Card className="bg-slate-800 border-slate-700 mb-8">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                                <Users className="w-6 h-6 text-teal-400" />
                                Student Overview
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-slate-400">Full Name:</span>
                                            <span className="text-white font-medium ml-2">{studentData.full_name}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Email:</span>
                                            <span className="text-white font-medium ml-2">{studentData.email}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Current Level:</span>
                                            <Badge className="ml-2 bg-teal-500/20 text-teal-400 border-teal-500/30">
                                                Level {progressData?.level || 1}
                                            </Badge>
                                        </div>
                                        <div>
                                            <span className="text-slate-400">Overall Performance:</span>
                                            <Badge className={`ml-2 ${performance.bgColor} ${performance.color} border-current`}>
                                                {performance.level}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Total Points:</span>
                                            <span className="text-yellow-400 font-bold">{progressData?.points || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Scenarios Completed:</span>
                                            <span className="text-white font-medium">{progressData?.total_scenarios_completed || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Average Score:</span>
                                            <span className={`font-bold ${performance.color}`}>
                                                {progressData?.average_score || 0}%
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-400">Current Streak:</span>
                                            <span className="text-orange-400 font-medium">{progressData?.current_streak || 0} days</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Performance Metrics */}
                    <div className="grid md:grid-cols-4 gap-6 mb-8">
                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Trophy className="w-4 h-4 text-yellow-400" />
                                    Points Earned
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-yellow-400">{progressData?.points || 0}</div>
                                <p className="text-xs text-slate-500 mt-1">Total gamification points</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Target className="w-4 h-4 text-green-400" />
                                    Completion Rate
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-400">
                                    {progressData?.total_scenarios_attempted > 0 
                                        ? Math.round((progressData.total_scenarios_completed / progressData.total_scenarios_attempted) * 100)
                                        : 0}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Scenarios completed successfully</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <BarChart3 className="w-4 h-4 text-blue-400" />
                                    Average Score
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${performance.color}`}>
                                    {progressData?.average_score || 0}%
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Across all activities</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-slate-800 border-slate-700">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-purple-400" />
                                    Time Investment
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-purple-400">
                                    {Math.round((progressData?.total_time_spent || 0) / 60)}h
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Total learning time</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Skill Progress */}
                    {progressData?.skill_levels && (
                        <Card className="bg-slate-800 border-slate-700 mb-8">
                            <CardHeader>
                                <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                                    <Star className="w-6 h-6 text-teal-400" />
                                    Skill Development
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid md:grid-cols-2 gap-6">
                                    {Object.entries(progressData.skill_levels).map(([skill, level]) => (
                                        <div key={skill} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-white font-medium capitalize">
                                                    {skill.replace('_', ' ')}
                                                </span>
                                                <span className="text-slate-400">{level}/100</span>
                                            </div>
                                            <Progress value={level} className="h-2" />
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Recent Activities */}
                    <Card className="bg-slate-800 border-slate-700 mb-8">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                                <Calendar className="w-6 h-6 text-teal-400" />
                                Recent Learning Activities
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {activities.length > 0 ? (
                                <div className="space-y-4">
                                    {activities.slice(0, 10).map((activity, index) => (
                                        <div key={activity.id || index} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="text-teal-400">
                                                    {getActivityIcon(activity.activity_type)}
                                                </div>
                                                <div>
                                                    <div className="text-white font-medium">{activity.task_title}</div>
                                                    <div className="text-slate-400 text-sm capitalize">
                                                        {activity.activity_type?.replace('_', ' ')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold ${getPerformanceLevel(activity.performance_metrics?.score || 0).color}`}>
                                                    {activity.performance_metrics?.score || 0}%
                                                </div>
                                                <div className="text-slate-400 text-sm">
                                                    {new Date(activity.created_date).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <FileText className="w-12 h-12 mx-auto mb-4 text-slate-600" />
                                    <p>No recent activities found.</p>
                                </div>
                            )}
                            {activities.length > 0 && (
                                <div className="space-y-4 mt-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Recent Activities Analysis</h3>
                                    <div className="grid gap-3">
                                        {activities.slice(0, 5).map((activity, index) => (
                                            <div key={index} className="bg-slate-700 p-4 rounded-lg border border-slate-600">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-medium text-white">
                                                        {activity.task_title || activity.activity_type}
                                                    </h4>
                                                    <div className="flex gap-2">
                                                        <Badge className="bg-blue-500/20 text-blue-400">
                                                            Score: {activity.performance_metrics?.score || 'N/A'}%
                                                        </Badge>
                                                        <Badge className="bg-green-500/20 text-green-400">
                                                            Answer: {activity.performance_metrics?.correct_classification || 'True Positive'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <div className="text-sm text-slate-300">
                                                    Date: {new Date(activity.created_date).toLocaleDateString()}
                                                </div>
                                                <div className="text-sm text-slate-300 mt-2">
                                                    Analysis: {activity.performance_metrics?.score >= 80 ? 
                                                        'Excellent work' : 
                                                        activity.performance_metrics?.score >= 60 ? 
                                                        'Needs practice' : 
                                                        'Requires review'
                                                    }
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Recommendations & Improvement Areas */}
                    <Card className="bg-slate-800 border-slate-700 mb-8">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                                <Lightbulb className="w-6 h-6 text-yellow-400" />
                                Recommendations for Improvement
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {recommendations.length > 0 ? (
                                <div className="space-y-4">
                                    {recommendations.map((rec, index) => (
                                        <div key={index} className="flex items-start gap-3 p-4 bg-slate-700/50 rounded-lg">
                                            <div className={`p-2 rounded-full ${
                                                rec.priority === 'high' ? 'bg-red-500/20' :
                                                rec.priority === 'medium' ? 'bg-yellow-500/20' : 'bg-green-500/20'
                                            }`}>
                                                {rec.type === 'improvement' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                                                {rec.type === 'engagement' && <Clock className="w-4 h-4 text-yellow-400" />}
                                                {rec.type === 'advancement' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-semibold">{rec.title}</h4>
                                                <p className="text-slate-400 text-sm mt-1">{rec.description}</p>
                                                <Badge className={`mt-2 text-xs ${
                                                    rec.priority === 'high' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                                                    rec.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 
                                                    'bg-green-500/20 text-green-400 border-green-500/30'
                                                }`}>
                                                    {rec.priority} priority
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400">
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                                    <p>No specific recommendations at this time. Keep up the great work!</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Summary Assessment */}
                    <Card className="bg-slate-800 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-xl font-bold text-white flex items-center gap-3">
                                <Award className="w-6 h-6 text-purple-400" />
                                Overall Assessment
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-slate-300 space-y-4">
                                <p>
                                    <strong className="text-white">{studentData.full_name}</strong> is currently performing at a{' '}
                                    <span className={`font-bold ${performance.color}`}>{performance.level}</span> level
                                    with an average score of <span className={`font-bold ${performance.color}`}>
                                    {progressData?.average_score || 0}%</span> across all activities.
                                </p>
                                
                                {progressData?.total_scenarios_completed > 0 && (
                                    <p>
                                        The student has successfully completed <strong className="text-white">
                                        {progressData.total_scenarios_completed}</strong> scenarios and earned{' '}
                                        <strong className="text-yellow-400">{progressData.points}</strong> points
                                        through consistent engagement with the learning platform.
                                    </p>
                                )}

                                {progressData?.current_streak > 0 && (
                                    <p>
                                        Demonstrating good learning habits with a current streak of{' '}
                                        <strong className="text-orange-400">{progressData.current_streak} days</strong>,
                                        which indicates regular platform engagement and dedication to skill development.
                                    </p>
                                )}

                                <Separator className="bg-slate-700" />
                                
                                <div className="text-sm text-slate-400">
                                    <p>Report generated on {new Date().toLocaleDateString()}</p>
                                    <p>Data includes activities from the last 30 days and lifetime statistics.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
