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
  selectedLogId,
  verdicts,
  logInvestigations,
  onLogInvestigationUpdate,
  addInvestigationStep,
  onSetVerdict
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

  const getVerdictText = (verdict) => {
    if (!verdict) return 'Not Set';
    return verdict.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <Card className="bg-slate-800/50 border border-slate-700 h-full">
      <CardHeader>
        <CardTitle className="text-white">Investigation Events</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-slate-700 hover:bg-slate-800/50">
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-slate-300">Verdict</TableHead>
                <TableHead className="text-slate-300">Time</TableHead>
                <TableHead className="text-slate-300">Agent Name</TableHead>
                <TableHead className="text-slate-300">Source</TableHead>
                <TableHead className="text-slate-300">Description</TableHead>
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
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      )}
                    </TableCell>
                    <TableCell>
                        <span className={cn(
                            "text-sm",
                            verdicts[log.id] ? "text-white" : "text-slate-500"
                        )}>
                            {getVerdictText(verdicts[log.id])}
                        </span>
                    </TableCell>
                    <TableCell className="text-white font-mono text-sm">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </TableCell>
                    <TableCell className="text-white">{log.hostname || log.agent?.name || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getSourceTypeColor(log.source_type)} text-xs`}>
                        {log.source_type || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-sm max-w-xs truncate">
                      {getLogDescription(log)}
                    </TableCell>
                  </TableRow>

                  {/* Expanded analysis viewer row - appears immediately after the selected log */}
                  {selectedLogId === log.id && (
                    <TableRow className="border-b-slate-800">
                      <TableCell colSpan={6} className="p-0">
                        <div className="bg-slate-900/70 border-t border-slate-700">
                          <LogAnalysisViewer
                            log={log}
                            logId={log.id}
                            logInvestigation={logInvestigations[log.id] || {}}
                            onLogInvestigationUpdate={onLogInvestigationUpdate}
                            addInvestigationStep={addInvestigationStep}
                            onSetVerdict={onSetVerdict}
                          />
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