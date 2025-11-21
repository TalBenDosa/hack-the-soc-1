import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Shield, Target, Clock, Trophy, Star } from "lucide-react";

const defaultAchievements = [
  {
    name: "First Investigation",
    description: "Complete your first scenario",
    icon: "Target",
    earned_date: "2024-01-10T10:00:00Z"
  },
  {
    name: "Quick Learner",
    description: "Complete 5 scenarios in one day",
    icon: "Clock",
    earned_date: "2024-01-12T15:30:00Z"
  },
  {
    name: "Perfect Score",
    description: "Achieve 100% in any scenario",
    icon: "Star",
    earned_date: null
  },
  {
    name: "Malware Hunter",
    description: "Complete 10 malware scenarios",
    icon: "Shield",
    earned_date: null
  },
  {
    name: "SOC Expert",
    description: "Complete 50 scenarios",
    icon: "Trophy",
    earned_date: null
  }
];

export default function AchievementsBadges({ achievements }) {
  const displayAchievements = achievements.length > 0 ? achievements : defaultAchievements;

  const getIcon = (iconName) => {
    switch (iconName) {
      case "Target": return <Target className="w-5 h-5" />;
      case "Clock": return <Clock className="w-5 h-5" />;
      case "Star": return <Star className="w-5 h-5" />;
      case "Shield": return <Shield className="w-5 h-5" />;
      case "Trophy": return <Trophy className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Award className="w-5 h-5 text-yellow-400" />
          Achievements
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayAchievements.map((achievement, index) => (
            <div 
              key={index} 
              className={`p-3 rounded-lg border transition-all ${
                achievement.earned_date 
                  ? 'bg-teal-500/10 border-teal-500/30' 
                  : 'bg-slate-700/30 border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  achievement.earned_date 
                    ? 'bg-teal-500/20 text-teal-400' 
                    : 'bg-slate-600/50 text-slate-400'
                }`}>
                  {getIcon(achievement.icon)}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${
                    achievement.earned_date ? 'text-white' : 'text-slate-400'
                  }`}>
                    {achievement.name}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {achievement.description}
                  </p>
                  {achievement.earned_date && (
                    <p className="text-xs text-teal-400 mt-1">
                      Earned: {new Date(achievement.earned_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                {achievement.earned_date && (
                  <Badge className="bg-teal-500/20 text-teal-400 border-teal-500/30">
                    Earned
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}