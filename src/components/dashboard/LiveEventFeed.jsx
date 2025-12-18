
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Activity,
    Search,
    Download,
    RefreshCw,
    ChevronDown,
    ChevronRight,
    AlertCircle
} from 'lucide-react';
import { generateRealisticLogBatch, refreshTemplateCache } from '../utils/logGenerator';
import RuleLevelFilter from './RuleLevelFilter';
import DashboardLogDetail from './DashboardLogDetail';

const LiveEventFeed = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState({ operator: 'is', value: '' });
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [feedError, setFeedError] = useState(null);

  const loadInitialLogs = async () => {
    setFeedError(null); // Clear any previous errors
    try {
      const initialLogs = await generateRealisticLogBatch(20);
      if (Array.isArray(initialLogs)) {
        setLogs(initialLogs);
      }
    } catch (error) {
      console.error("Error loading initial logs for feed:", error);
      setFeedError("Could not load events. Please check your connection or try refreshing.");
      setLogs([]); // Clear logs on error
    }
  };

  const refreshFeed = () => {
    refreshTemplateCache();
    loadInitialLogs();
  };

  // Initial data load
  useEffect(() => {
    loadInitialLogs();
  }, []);

  // Interval for fetching new logs
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const newLogs = await generateRealisticLogBatch(Math.floor(Math.random() * 4) + 1); // Generates 1-4 logs
        if (Array.isArray(newLogs) && newLogs.length > 0) {
          setLogs(prevLogs => {
            const updatedLogs = [...newLogs, ...prevLogs.slice(0, 200 - newLogs.length)]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return updatedLogs;
          });
          setFeedError(null); // Clear error if new logs are fetched successfully
        }
      } catch (error) {
        console.error("Error fetching new logs:", error);
        // Optionally set a less intrusive error for ongoing updates
        // setFeedError("Failed to fetch new events. Displaying cached data.");
      }
    }, 120000); // 120 seconds (2 minutes)
    return () => clearInterval(interval);
  }, []);

  // Filtering logic
  useEffect(() => {
    let tempLogs = logs || [];

    if (searchTerm) {
      const lowerCaseSearch = searchTerm.toLowerCase();
      tempLogs = tempLogs.filter(log =>
        Object.values(log || {}).some(val =>
          String(val).toLowerCase().includes(lowerCaseSearch)
        ) ||
        (log.rule && Object.values(log.rule).some(val =>
          String(val).toLowerCase().includes(lowerCaseSearch)
        )) ||
        (log.agent && Object.values(log.agent).some(val =>
          String(val).toLowerCase().includes(lowerCaseSearch)
        ))
      );
    }

    if (levelFilter.value) {
      const filterValue = parseInt(levelFilter.value, 10);
      if (!isNaN(filterValue)) {
        tempLogs = tempLogs.filter(log => {
          // Use rule level for filtering if available, otherwise default to 0 for comparison
          const level = log.rule?.level ?? log.raw_log_data?.rule?.level ?? 0;
          
          switch (levelFilter.operator) {
            case 'is': return level === filterValue;
            case 'is_not': return level !== filterValue;
            case 'gt': return level > filterValue;
            case 'lt': return level < filterValue;
            default: return true;
          }
        });
      }
    }

    setFilteredLogs(tempLogs);
  }, [logs, searchTerm, levelFilter]);

  /**
   * Helper function to get the most descriptive text for a log entry
   * Priority: story_context > raw_log message > rule description > title
   */
  const getLogDescription = (log) => {
      // First priority: story_context (specific narrative description)
      if (log.story_context && log.story_context !== 'Generated Event') {
          return log.story_context;
      }
      
      // Second priority: raw log message (technical description)
      if (log.raw_log_data?.message && log.raw_log_data.message !== 'Generated Event') {
          return log.raw_log_data.message;
      }
      
      // Third priority: rule description from raw log
      if (log.raw_log_data?.rule?.description && log.raw_log_data.rule.description !== 'Generated Event') {
          return log.raw_log_data.rule.description;
      }
      
      // Fourth priority: rule description from normalized log
      if (log.rule?.description && log.rule.description !== 'Generated Event') {
          return log.rule.description;
      }
      
      // Fifth priority: analysis notes from raw log
      if (log.raw_log_data?.analysis_notes && log.raw_log_data.analysis_notes !== 'Generated Event') {
          return log.raw_log_data.analysis_notes;
      }
      
      // Sixth priority: event action description
      if (log.raw_log_data?.event?.action && log.raw_log_data.event.action !== 'Generated Event') {
          return log.raw_log_data.event.action;
      }
      
      // Last resort: description or title
      if (log.description && log.description !== 'Generated Event') {
          return log.description;
      }
      
      // Absolute fallback
      return log.title || 'Security Event Detected';
  };

  const getSourceColor = (source) => {
    return "bg-slate-700/50 text-slate-300 border-slate-600";
  };

  const getLevelColor = (level) => {
    // Convert level to number if it's a string
    const numLevel = typeof level === 'string' ? parseInt(level) : level;
    
    if (numLevel >= 9) return "bg-red-500/40 text-red-300 border-red-500/50";
    if (numLevel >= 7) return "bg-red-500/30 text-red-300 border-red-500/40";
    if (numLevel >= 5) return "bg-orange-500/30 text-orange-300 border-orange-500/40";
    if (numLevel >= 3) return "bg-yellow-500/30 text-yellow-300 border-yellow-500/40";
    return "bg-green-500/30 text-green-300 border-green-500/40";
  };

  const getDisplayLevel = (log) => {
    // Try to get numeric level from various possible fields
    let numericLevel = log.rule?.level || 
                         log.raw_log_data?.rule?.level || 
                         log.severity_level || 
                         log.level;
    
    // If we have a numeric level (1-10), display it
    if (typeof numericLevel === 'number' && numericLevel >= 1 && numericLevel <= 10) {
      return numericLevel.toString();
    }
    
    // If we have a string level, try to convert or map it
    if (typeof numericLevel === 'string') {
      const parsed = parseInt(numericLevel);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
        return parsed.toString();
      }
      
      // Map text levels to numeric equivalents
      const levelMap = {
        'low': '2',
        'medium': '5', 
        'high': '7',
        'critical': '9',
        'info': '1',
        'alert': '7',
        'error': '6',
        'warning': '4',
        'debug': '1',
        'notice': '3',
        'emergency': '10'
      };
      
      return levelMap[numericLevel.toLowerCase()] || '5';
    }
    
    // Default to medium level
    return '5';
  };

  const toggleExpand = (logId) => {
    setExpandedLogId(prevId => (prevId === logId ? null : logId));
  };
  
  return (
    <Card className="bg-slate-800 border-slate-700 w-full">
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-400 animate-pulse" />
            Live Event Feed
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 bg-slate-700 border-slate-600 text-white placeholder-slate-400 pl-9"
              />
            </div>
            <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-700">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="ghost" size="icon" className="text-white hover:bg-slate-700" onClick={refreshFeed}>
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="mt-4">
          <RuleLevelFilter onFilterChange={setLevelFilter} />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-800">
              <TableRow className="border-b-slate-700 hover:bg-slate-800">
                <TableHead className="w-12 text-white"></TableHead>
                <TableHead className="text-white">Time</TableHead>
                <TableHead className="text-white">Agent Name</TableHead>
                <TableHead className="text-white">Source</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="text-white text-center">Level</TableHead>
                <TableHead className="text-white">Rule ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feedError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-red-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                    <p>Error loading logs: {feedError}</p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshFeed}
                        className="mt-2 border-red-600 text-red-400 hover:bg-red-600/10"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </TableCell>
                </TableRow>
              ) : filteredLogs && filteredLogs.length > 0 ? filteredLogs.map((log) => (
                <React.Fragment key={log.id}>
                  <TableRow
                    className="border-b-slate-800 hover:bg-slate-700/50 transition-colors cursor-pointer"
                    onClick={() => toggleExpand(log.id)}
                  >
                    <TableCell className="text-white">
                      {expandedLogId === log.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </TableCell>
                    <TableCell className="text-white font-mono text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-white font-medium">{log.agent?.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`${getSourceColor(log.source_type || log.log_source)} text-xs`}>
                        {log.source_type || log.log_source}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white text-sm">
                      {getLogDescription(log)}
                      {(log.data?.event?.outcome === 'failure' || log.raw_log_data?.event?.outcome === 'failure') &&
                        <Badge variant="destructive" className="ml-2 text-xs">Failed Attempt</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${getLevelColor(getDisplayLevel(log))} text-xs font-bold border`}>
                        {getDisplayLevel(log)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white font-mono text-xs">
                      {log.rule?.id || log.rule_id || log.raw_log_data?.rule?.id || 'N/A'}
                    </TableCell>
                  </TableRow>

                  {/* Expanded row with detailed information */}
                  {expandedLogId === log.id && (
                    <TableRow className="border-b-slate-800">
                      <TableCell colSpan={7} className="bg-slate-900/50 p-0">
                        <DashboardLogDetail
                            log={log}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No events match your current filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveEventFeed;
