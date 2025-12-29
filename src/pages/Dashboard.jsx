import React, { useState, useEffect } from "react";
import { Investigation, Scenario, UserProgress, User, TenantUser } from "@/entities/all"; // Added User and TenantUser
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  AlertTriangle, 
  Shield, 
  Activity, 
  Clock, 
  Eye, 
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import LiveEventFeed from "../components/dashboard/LiveEventFeed";
import ThreatMap from "../components/dashboard/ThreatMap"; // Keep this import as it might be used elsewhere or in future changes

export default function Dashboard() {
  const [investigations, setInvestigations] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [userProgress, setUserProgress] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await User.me();
      console.log('[DASHBOARD] Current user:', currentUser.email, 'Role:', currentUser.role);

      let currentTenantId = null;

      // **ENHANCED**: Super Admin context detection
      if (currentUser.role === 'admin') {
        console.log('[DASHBOARD] Super Admin detected - checking for tenant context');
        
        // Check stored tenant context
        const storedTenantContext = sessionStorage.getItem('current_tenant_context');
        if (storedTenantContext) {
          try {
            const tenantInfo = JSON.parse(storedTenantContext);
            currentTenantId = tenantInfo.id;
            console.log('[DASHBOARD] Using stored tenant context:', currentTenantId);
          } catch (error) {
            console.error('[DASHBOARD] Error parsing stored tenant context:', error);
            // If parsing fails, treat as no stored context for safety
            currentTenantId = null; 
          }
        }
        
        // Check impersonation data if no tenant context found yet
        const impersonationData = sessionStorage.getItem('superadmin_impersonation');
        if (impersonationData && !currentTenantId) {
          try {
            const impersonation = JSON.parse(impersonationData);
            currentTenantId = impersonation.target_tenant_id;
            console.log('[DASHBOARD] Super Admin viewing tenant via impersonation:', currentTenantId);
          } catch (error) {
            console.error('[DASHBOARD] Error parsing impersonation data:', error);
            // If parsing fails, treat as no impersonation context for safety
            currentTenantId = null; 
          }
        }
      } else {
        // Regular user - try to get their tenant but don't fail if not found
        try {
          const tenantUsers = await TenantUser.filter({ user_id: currentUser.id, status: 'active' });
          currentTenantId = tenantUsers.length > 0 ? tenantUsers[0].tenant_id : null;
          console.log('[DASHBOARD] Regular user tenant:', currentTenantId);
        } catch (error) {
          console.log('[DASHBOARD] No tenant found for user, continuing without tenant context');
        }
      }

      // **SIMPLIFIED**: Load data with or without tenant
      let investigationsData = [];
      let scenariosData = [];
      let progressData = [];

      if (currentTenantId) {
        // Load tenant-specific data
        investigationsData = await Investigation.filter({ tenant_id: currentTenantId }, "-created_date", 10);
        scenariosData = await Scenario.filter({ tenant_id: currentTenantId }, null, 6);
        
        if (currentUser.role === 'admin') {
          progressData = await UserProgress.filter({ 
            user_id: currentUser.id,
            tenant_id: currentTenantId,
            is_super_admin_activity: true 
          });
        } else {
          progressData = await UserProgress.filter({ 
            user_id: currentUser.id,
            tenant_id: currentTenantId,
            is_super_admin_activity: false 
          });
        }
        
        console.log(`[DASHBOARD] Loaded tenant ${currentTenantId} data`);
      } else {
        // **NO TENANT**: Load all public data
        investigationsData = await Investigation.list("-created_date", 10);
        scenariosData = await Scenario.list(null, 6);
        progressData = await UserProgress.filter({ user_id: currentUser.id });
        
        console.log('[DASHBOARD] Loaded data without tenant context');
      }
      
      setInvestigations(investigationsData);
      setScenarios(scenariosData);
      setUserProgress(progressData[0] || null);
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError("A network error occurred. Please check your connection and try again.");
    }
    setIsLoading(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active": return "bg-yellow-500";
      case "completed": return "bg-green-500";
      case "failed": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy": return "text-green-400 bg-green-400/20";
      case "Medium": return "text-yellow-400 bg-yellow-400/20";
      case "Hard": return "text-red-400 bg-red-400/20";
      default: return "text-gray-400 bg-gray-400/20";
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">SOC Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time security operations center monitoring</p>
          </div>
          <div className="flex gap-3 self-start md:self-auto">
            <Link to={createPageUrl("Scenarios")}>
              <Button className="bg-teal-600 hover:bg-teal-700 text-white">
                <Target className="w-4 h-4 mr-2" />
                Start Training
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Card className="bg-red-900/50 border-red-500/50 text-red-300 p-4 mb-6 flex items-center gap-4">
            <AlertTriangle className="w-5 h-5"/>
            <div>
              <p className="font-bold">Failed to Load Data</p>
              <p>{error}</p>
              <Button onClick={loadDashboardData} variant="outline" className="mt-2 border-red-400 text-red-300 hover:bg-red-900">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Active Investigations</CardTitle>
              <Activity className="h-4 w-4 text-teal-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {investigations.filter(i => i.status === 'active').length}
              </div>
              <p className="text-xs text-slate-400">
                {investigations.filter(i => i.status === 'completed').length} completed today
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Threat Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-400">Medium</div>
              <p className="text-xs text-slate-400">
                +12% from last week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Scenarios Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {userProgress?.total_scenarios_completed || 0}
              </div>
              <p className="text-xs text-slate-400">
                {userProgress?.total_scenarios_attempted || 0} attempted
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Average Score</CardTitle>
              <TrendingUp className="h-4 w-4 text-teal-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {userProgress?.average_score || 0}%
              </div>
              <p className="text-xs text-slate-400">
                Current streak: {userProgress?.current_streak || 0}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
            <LiveEventFeed />
        </div>
      </div>
    </div>
  );
}