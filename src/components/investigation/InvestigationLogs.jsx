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
      'Azure': 'bg-blue-600/90 text-white border-blue-500',
      'AWS': 'bg-orange-600/90 text-white border-orange-500',
      'Office 365': 'bg-purple-600/90 text-white border-purple-500',
      'Active Directory': 'bg-teal-600/90 text-white border-teal-500',
      'EDR': 'bg-red-600/90 text-white border-red-500',
      'Firewall': 'bg-yellow-600/90 text-white border-yellow-500',
      'Network IDS': 'bg-pink-600/90 text-white border-pink-500',
      'Windows Security': 'bg-indigo-600/90 text-white border-indigo-500',
      'DLP': 'bg-green-600/90 text-white border-green-500',
      'DC': 'bg-cyan-600/90 text-white border-cyan-500',
    };
    return colors[source] || 'bg-slate-600/90 text-white border-slate-500';
  };

  const getSeverityColor = (severity) => {
    if (severity >= 8) return 'bg-red-600 text-white border-red-500';
    if (severity >= 5) return 'bg-orange-600 text-white border-orange-500';
    if (severity >= 3) return 'bg-yellow-600 text-white border-yellow-500';
    return 'bg-green-600 text-white border-green-500';
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

  return (
    <Card className="bg-slate-800/30 border border-slate-700/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg">Investigation Events</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-700/50 bg-slate-900/50">
                <TableHead className="w-8 text-slate-400 font-semibold"></TableHead>
                <TableHead className="text-slate-400 font-semibold">Time</TableHead>
                <TableHead className="text-slate-400 font-semibold">Agent Name</TableHead>
                <TableHead className="text-slate-400 font-semibold">Source</TableHead>
                <TableHead className="text-slate-400 font-semibold">Description</TableHead>
                <TableHead className="text-slate-400 font-semibold text-right">Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs && logs.map((log) => (
                <React.Fragment key={log.id}>
                  {/* Main log row */}
                  <TableRow
                    onClick={() => onSelectLog(log)}
                    className={cn(
                      "cursor-pointer border-b border-slate-800/50 hover:bg-slate-700/30 transition-colors",
                      selectedLogId === log.id && "bg-slate-700/40"
                    )}
                  >
                    <TableCell className="py-3">
                      {selectedLogId === log.id ? (
                        <ChevronDown className="w-4 h-4 text-teal-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      )}
                    </TableCell>
                    <TableCell className="text-white font-mono text-sm py-3">
                      {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).toUpperCase()}
                    </TableCell>
                    <TableCell className="text-white font-semibold py-3">{log.hostname || log.agent?.name || 'Unknown'}</TableCell>
                    <TableCell className="py-3">
                      <Badge className={`${getSourceTypeColor(log.source_type)} text-xs px-3 py-1 font-medium`}>
                        {log.source_type || 'Unknown'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-sm py-3">
                      {getLogDescription(log)}
                    </TableCell>
                    <TableCell className="text-right py-3">
                      <div className={cn(
                        "inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold text-base border-2",
                        getSeverityColor(log.severity || log.rule?.level || 5)
                      )}>
                        {log.severity || log.rule?.level || 5}
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Expanded log detail viewer row */}
                  {selectedLogId === log.id && (
                    <TableRow className="border-b border-slate-800/50">
                      <TableCell colSpan={6} className="p-6 bg-slate-900/80">
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-teal-400 mb-3">Log Details</h4>
                          <pre className="text-xs text-slate-300 bg-slate-800/50 p-4 rounded-lg overflow-auto max-h-96 border border-slate-700/50">
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