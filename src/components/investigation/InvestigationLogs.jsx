import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronDown, Code, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function InvestigationLogs({
  logs,
  onSelectLog,
  selectedLogId
}) {
  const [viewMode, setViewMode] = useState('formatted'); // 'raw' or 'formatted'
  
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
                        <div className="space-y-4">
                          {/* Header */}
                          <div className="flex items-center gap-2 text-teal-400 text-base font-semibold">
                            <div className="w-1 h-6 bg-teal-400 rounded-full"></div>
                            Log Analysis
                          </div>

                          {/* Basic Information Section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-300 text-sm">
                              <div className="w-1 h-5 bg-slate-500 rounded-full"></div>
                              Basic Information
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                              <div className="grid grid-cols-[180px_1fr] gap-3 text-sm">
                                <div className="text-slate-400">Rule Description:</div>
                                <div className="text-white">{getLogDescription(log)}</div>
                                
                                <div className="text-slate-400">Source Type:</div>
                                <div className="text-white">{log.source_type}</div>
                                
                                <div className="text-slate-400">Timestamp:</div>
                                <div className="text-white font-mono">{log.timestamp}</div>
                                
                                <div className="text-slate-400">Severity:</div>
                                <div className="text-white">{log.severity || log.rule?.level || 'N/A'}</div>
                                
                                {log.username && (
                                  <>
                                    <div className="text-slate-400">Username:</div>
                                    <div className="text-white">{log.username}</div>
                                  </>
                                )}
                                
                                <div className="text-slate-400">Hostname:</div>
                                <div className="text-white">{log.hostname || log.agent?.name || 'N/A'}</div>
                                
                                {log.ip_address && (
                                  <>
                                    <div className="text-slate-400">Ip Address:</div>
                                    <div className="text-white font-mono">{log.ip_address}</div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Detailed Log Data Section */}
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-slate-300 text-sm">
                                <div className="w-1 h-5 bg-slate-500 rounded-full"></div>
                                Detailed Log Data
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">Raw JSON</span>
                                <button
                                  onClick={() => setViewMode(viewMode === 'raw' ? 'formatted' : 'raw')}
                                  className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                                    viewMode === 'raw' ? 'bg-teal-600' : 'bg-slate-700'
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                      viewMode === 'raw' ? 'translate-x-6' : 'translate-x-1'
                                    )}
                                  />
                                </button>
                              </div>
                            </div>
                            
                            {viewMode === 'raw' ? (
                              <pre className="text-xs text-slate-300 bg-slate-800/50 p-4 rounded-lg overflow-auto max-h-96 border border-slate-700/50 font-mono">
                                {JSON.stringify(log.raw_log_data || log, null, 2)}
                              </pre>
                            ) : (
                              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700/50 max-h-96 overflow-auto">
                                <div className="grid grid-cols-[200px_1fr] gap-3 text-sm font-mono">
                                  {Object.entries(log.raw_log_data || log).map(([key, value]) => (
                                    <React.Fragment key={key}>
                                      <div className="text-slate-400">{key}:</div>
                                      <div className="text-white break-all">
                                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                      </div>
                                    </React.Fragment>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
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