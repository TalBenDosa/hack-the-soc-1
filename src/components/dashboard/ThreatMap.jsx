import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, MapPin, Zap, AlertTriangle } from "lucide-react";

const threatLocations = [
  { country: "Russia", attacks: 23, severity: "High", lat: 55.7558, lng: 37.6173 },
  { country: "China", attacks: 18, severity: "Medium", lat: 39.9042, lng: 116.4074 },
  { country: "North Korea", attacks: 12, severity: "High", lat: 39.0392, lng: 125.7625 },
  { country: "Iran", attacks: 8, severity: "Medium", lat: 35.6892, lng: 51.3890 },
  { country: "Unknown", attacks: 34, severity: "Low", lat: 0, lng: 0 }
];

const recentAttacks = [
  { time: "14:23", type: "Brute Force", source: "185.220.101.42", target: "Web Server" },
  { time: "14:21", type: "Malware", source: "192.168.1.100", target: "Workstation" },
  { time: "14:19", type: "Port Scan", source: "203.0.113.45", target: "Network" },
  { time: "14:17", type: "SQL Injection", source: "198.51.100.23", target: "Database" },
];

export default function ThreatMap() {
  const [selectedThreat, setSelectedThreat] = useState(null);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "High": return "text-red-400 bg-red-400/20";
      case "Medium": return "text-yellow-400 bg-yellow-400/20";
      case "Low": return "text-green-400 bg-green-400/20";
      default: return "text-gray-400 bg-gray-400/20";
    }
  };

  const getAttackTypeColor = (type) => {
    switch (type) {
      case "Brute Force": return "text-red-400";
      case "Malware": return "text-orange-400";
      case "Port Scan": return "text-yellow-400";
      case "SQL Injection": return "text-purple-400";
      default: return "text-gray-400";
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Globe className="w-5 h-5 text-teal-400" />
          Global Threat Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Threat Sources */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Threat Origins</h3>
            <div className="space-y-2">
              {threatLocations.map((location, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-slate-700/50 rounded hover:bg-slate-700/70 transition-colors cursor-pointer"
                  onClick={() => setSelectedThreat(location)}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-white">{location.country}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-300">{location.attacks}</span>
                    <Badge className={`${getSeverityColor(location.severity)} text-xs`}>
                      {location.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Attacks */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Recent Attacks</h3>
            <div className="space-y-2">
              {recentAttacks.map((attack, index) => (
                <div key={index} className="p-2 bg-slate-700/50 rounded">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm font-medium ${getAttackTypeColor(attack.type)}`}>
                      {attack.type}
                    </span>
                    <span className="text-xs text-slate-400">{attack.time}</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">From:</span> {attack.source}
                  </div>
                  <div className="text-xs text-slate-300">
                    <span className="text-slate-400">Target:</span> {attack.target}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Threat Intelligence Summary */}
        <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-medium text-white">Threat Intelligence</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">{threatLocations.reduce((sum, l) => sum + l.attacks, 0)}</div>
              <div className="text-xs text-slate-400">Total Attacks</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-400">
                {threatLocations.filter(l => l.severity === 'High').length}
              </div>
              <div className="text-xs text-slate-400">High Severity</div>
            </div>
            <div>
              <div className="text-lg font-bold text-teal-400">95%</div>
              <div className="text-xs text-slate-400">Blocked</div>
            </div>
            <div>
              <div className="text-lg font-bold text-yellow-400">24/7</div>
              <div className="text-xs text-slate-400">Monitoring</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}