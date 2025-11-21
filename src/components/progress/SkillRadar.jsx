import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Target, Shield, Search, Activity } from "lucide-react";

const skillIcons = {
  malware_detection: Shield,
  network_analysis: Activity,
  incident_response: Target,
  threat_hunting: Search,
};

const skillNames = {
  malware_detection: "Malware Detection",
  network_analysis: "Network Analysis", 
  incident_response: "Incident Response",
  threat_hunting: "Threat Hunting",
};

export default function SkillRadar({ skillLevels }) {
  const defaultSkills = {
    malware_detection: 65,
    network_analysis: 45,
    incident_response: 78,
    threat_hunting: 32,
  };

  const skills = Object.keys(skillLevels).length > 0 ? skillLevels : defaultSkills;

  const getSkillLevel = (score) => {
    if (score >= 80) return { level: "Expert", color: "text-green-400" };
    if (score >= 60) return { level: "Advanced", color: "text-teal-400" };
    if (score >= 40) return { level: "Intermediate", color: "text-yellow-400" };
    return { level: "Beginner", color: "text-red-400" };
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-teal-400" />
          Skill Levels
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {Object.entries(skills).map(([skillKey, score]) => {
            const Icon = skillIcons[skillKey];
            const skillName = skillNames[skillKey];
            const { level, color } = getSkillLevel(score);
            
            return (
              <div key={skillKey} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span className="text-sm font-medium text-slate-300">{skillName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${color}`}>{level}</span>
                    <span className="text-sm text-white">{score}%</span>
                  </div>
                </div>
                <Progress value={score} className="h-2" />
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-3 bg-slate-700/30 rounded-lg">
          <h4 className="text-sm font-medium text-white mb-2">Next Milestone</h4>
          <p className="text-xs text-slate-400">
            Complete 3 more network analysis scenarios to reach Advanced level
          </p>
        </div>
      </CardContent>
    </Card>
  );
}