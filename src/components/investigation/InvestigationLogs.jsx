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
    return "bg-slate-700/50 text-slate-300 border-slate-600";
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

  const getRuleLevel = (log) => {
    if (log.rule?.level) return log.rule.level;
    if (log.raw_log_data?.rule?.level) return log.raw_log_data.rule.level;
    if (log.severity) return log.severity;
    return 5;
  };

  const getRuleLevelColor = (level) => {
    if (level <= 3) return "text-green-400 bg-green-400/10 border-green-400/30";
    if (level <= 5) return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
    if (level <= 7) return "text-orange-400 bg-orange-400/10 border-orange-400/30";
    return "text-red-400 bg-red-400/10 border-red-400/30";
  };

  const getRuleLevelText = (level) => {
    if (level <= 3) return "Event";
    if (level <= 5) return "Alert";
    if (level <= 7) return "Warning";
    return "Incident";
  };

  return (
    <Card className="bg-slate-800/30 border border-slate-700/50 h-full backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <div className="w-2 h-2 bg-teal-400 rounded-full animate-pulse"></div>
            SIEM Events
          </CardTitle>
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="text-green-400">1 Event</span>
            <span>→</span>
            <span className="text-red-400">10 Incident</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-slate-300 font-mono text-xs">Timestamp</TableHead>
                <TableHead className="text-slate-300 text-xs">Agent Name</TableHead>
                <TableHead className="text-slate-300 text-xs">Source Type</TableHead>
                <TableHead className="text-slate-300 text-xs">Rule Description</TableHead>
                <TableHead className="text-slate-300 text-xs text-center">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.map((log) => {
                const ruleLevel = getRuleLevel(log);
                return (
                  <React.Fragment key={log.id}>
                    {/* Main log row */}
                    <TableRow
                      onClick={() => onSelectLog(log)}
                      className={cn(
                        "cursor-pointer border-b-slate-800 hover:bg-slate-700/30 transition-colors",
                        selectedLogId === log.id && "bg-slate-700/50"
                      )}
                    >
                      <TableCell>
                        {selectedLogId === log.id ? (
                          <ChevronDown className="w-4 h-4 text-teal-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-500" />
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString('en-GB', { 
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit', 
                          minute: '2-digit', 
                          second: '2-digit',
                          hour12: false 
                        })}
                      </TableCell>
                      <TableCell className="text-white text-sm">
                        {log.hostname || log.agent?.name || 'Unknown Agent'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs bg-slate-700/30 text-slate-300 border-slate-600">
                          {log.source_type || 'Unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-200 text-sm max-w-md">
                        {getLogDescription(log)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={`text-xs font-bold px-2 py-1 ${getRuleLevelColor(ruleLevel)}`}
                        >
                          <span className="mr-1">{ruleLevel}</span>
                          <span className="text-[10px] opacity-75">{getRuleLevelText(ruleLevel)}</span>
                        </Badge>
                      </TableCell>
                    </TableRow>

                    {/* Expanded log detail viewer row */}
                    {selectedLogId === log.id && (
                      <TableRow className="border-b-slate-800 bg-slate-900/50">
                        <TableCell colSpan={6} className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-teal-400 text-sm font-semibold">
                              <div className="w-1 h-4 bg-teal-400"></div>
                              Raw Event Data
                            </div>
                            <pre className="text-xs text-slate-300 bg-slate-950/70 p-4 rounded-lg overflow-auto max-h-96 border border-slate-800 font-mono">
                              {JSON.stringify(log.raw_log_data || log, null, 2)}
                            </pre>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}