import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import LogAnalysisViewer from "./LogAnalysisViewer";

export default function InvestigationLogs({
  logs,
  onSelectLog,
  selectedLogId
}) {
  
  const getSourceTypeColor = (source) => {
    const colors = {
      'EDR': 'bg-blue-500/20 text-blue-300 border-blue-500/50',
      'Firewall': 'bg-red-500/20 text-red-300 border-red-500/50',
      'Active Directory': 'bg-purple-500/20 text-purple-300 border-purple-500/50',
      'Office 365': 'bg-orange-500/20 text-orange-300 border-orange-500/50',
      'Network IDS': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50',
      'Windows Security': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50',
      'DLP': 'bg-pink-500/20 text-pink-300 border-pink-500/50',
      'DC': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50',
      'Antivirus': 'bg-green-500/20 text-green-300 border-green-500/50',
      'WAF': 'bg-rose-500/20 text-rose-300 border-rose-500/50',
      'Proxy': 'bg-violet-500/20 text-violet-300 border-violet-500/50',
      'VPN': 'bg-lime-500/20 text-lime-300 border-lime-500/50',
    };
    return colors[source] || 'bg-slate-700/50 text-slate-300 border-slate-600';
  };

  const getRuleLevelColor = (level) => {
    if (level >= 12) return 'bg-red-600 text-white';
    if (level >= 7) return 'bg-orange-500 text-white';
    if (level >= 4) return 'bg-yellow-500 text-black';
    return 'bg-blue-500 text-white';
  };

  const getLogDescription = (log) => {
    if (log.story_context && log.story_context.trim() && log.story_context !== 'Generated Event') {
        return log.story_context;
    }
    if (log.raw_log_data?.rule?.description && log.raw_log_data.rule.description.trim() && log.raw_log_data.rule.description !== 'Generated Event') {
        return log.raw_log_data.rule.description;
    }
    return log.rule_description || 'Security Event';
  };

  const getVerdictText = (verdict) => {
    if (!verdict) return 'Not Set';
    return verdict.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="bg-slate-800/50 border border-slate-700 h-full">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="text-white font-semibold flex items-center gap-2">
          <div className="w-1 h-6 bg-teal-500"></div>
          Investigation Events
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-slate-300 font-semibold">Time</TableHead>
                <TableHead className="text-slate-300 font-semibold">Rule Level</TableHead>
                <TableHead className="text-slate-300 font-semibold">Agent Name</TableHead>
                <TableHead className="text-slate-300 font-semibold">Source</TableHead>
                <TableHead className="text-slate-300 font-semibold">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.map((log) => (
                <React.Fragment key={log.id}>
                  {/* Main log row */}
                  <TableRow
                    onClick={() => onSelectLog(log)}
                    className={cn(
                      "cursor-pointer border-b-slate-800 hover:bg-slate-700/50 transition-colors",
                      selectedLogId === log.id && "bg-slate-700"
                    )}
                  >
                    <TableCell>
                      {selectedLogId === log.id ? (
                        <ChevronDown className="w-4 h-4 text-teal-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-slate-200 font-mono text-xs">
                      {new Date(log.timestamp).toLocaleString([], { 
                        month: '2-digit', 
                        day: '2-digit',
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getRuleLevelColor(log.rule?.level || log.severity || 5)} text-xs font-bold px-2`}>
                        {log.rule?.level || log.severity || 5}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-200 font-medium text-sm">
                      {log.agent?.name || log.hostname || 'Unknown-Agent'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getSourceTypeColor(log.source_type)} text-xs font-medium`}>
                        {log.source_type || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-200 text-sm max-w-md truncate">
                      {getLogDescription(log)}
                    </TableCell>
                  </TableRow>

                  {/* Expanded log detail viewer row */}
                  {selectedLogId === log.id && (
                    <TableRow className="border-b-slate-800 bg-slate-900/90">
                      <TableCell colSpan={6} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                            <div className="w-1 h-6 bg-teal-500"></div>
                            <h4 className="text-sm font-semibold text-white">Event Details</h4>
                          </div>
                          <pre className="text-xs text-slate-300 bg-slate-950 p-4 rounded-md overflow-auto max-h-96 border border-slate-800 font-mono">
                            {JSON.stringify(log.raw_log_data || log, null, 2)}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}