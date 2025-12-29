import React, { useState, useEffect } from "react";
import { Scenario } from "@/entities/Scenario";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, Target, Play, RefreshCw, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ScenariosPage() {
  const [scenarios, setScenarios] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchScenarios = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('[Scenarios] Fetching active scenarios...');
      const activeScenarios = await Scenario.filter({ is_active: true });
      console.log('[Scenarios] Fetched scenarios:', activeScenarios.length);
      setScenarios(activeScenarios);
    } catch (err) {
      console.error("[Scenarios] Failed to fetch scenarios:", err);
      setError("Failed to load scenarios. Please check your network connection and try again.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Easy": return "text-green-400 bg-green-400/20 border-green-500/30";
      case "Medium": return "text-yellow-400 bg-yellow-400/20 border-yellow-500/30";
      case "Hard": return "text-red-400 bg-red-400/20 border-red-500/30";
      case "Advanced": return "text-purple-400 bg-purple-400/20 border-purple-500/30";
      default: return "text-gray-400 bg-gray-400/20 border-gray-500/30";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <div className="text-center">
            <Loader2 className="w-12 h-12 text-teal-400 animate-spin mx-auto" />
            <p className="mt-4 text-white">Loading Scenarios...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900">
        <Card className="bg-slate-800 border-slate-700 text-center p-8">
          <CardHeader>
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <CardTitle className="text-white text-xl">Error Loading Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-400 mb-6">{error}</p>
            <Button onClick={fetchScenarios} className="bg-teal-600 hover:bg-teal-700">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-900 min-h-screen text-white">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-teal-400" />
              Training Scenarios
            </h1>
            <p className="text-slate-400 mt-2">Select a scenario to begin your investigation training.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {scenarios.length > 0 ? (
              scenarios.map(scenario => (
                <Card key={scenario.id} className="bg-slate-800 border-slate-700 flex flex-col hover:border-teal-500/50 transition-colors">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg font-semibold text-white">{scenario.title}</CardTitle>
                      <Badge className={`${getDifficultyColor(scenario.difficulty)} border`}>{scenario.difficulty}</Badge>
                    </div>
                    <p className="text-sm text-slate-400 pt-2">{scenario.description}</p>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <div className="mb-4">
                      <h4 className="text-sm font-medium mb-2 text-slate-300 flex items-center gap-2">
                          <Target className="w-4 h-4 text-purple-400" />
                          Learning Topics
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(scenario.tags || []).map(tag => (
                          <Badge key={tag} variant="secondary" className="bg-slate-700 text-slate-300">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                  <div className="p-4 mt-auto">
                    <Link to={createPageUrl(`Investigation?scenario=${scenario.id}`)}>
                          <Button className="w-full bg-teal-600 hover:bg-teal-700">
                              <Play className="w-4 h-4 mr-2" />
                              Start Scenario
                          </Button>
                    </Link>
                  </div>
                </Card>
              ))
            ) : (
              <p className="col-span-full text-center text-slate-400">No active scenarios available at the moment.</p>
            )}
          </div>
        </div>
      </div>
  );
}