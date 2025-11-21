
import React, { useState } from 'react';
import { SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Code, Eye } from "lucide-react";
import JsonViewer from "./JsonViewer";

const LogDetail = ({ label, value }) => (
  <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-700">
    <dt className="text-sm font-medium text-slate-400">{label}</dt>
    <dd className="col-span-2 text-sm text-white break-all">{value || '-'}</dd>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-lg font-semibold text-teal-400 mt-4 mb-2">{children}</h3>
);

const ProcessDetailsSection = ({ process }) => {
  if (!process) return null;

  return (
    <>
      <SectionTitle>Process Details</SectionTitle>
      <LogDetail label="Process Name" value={process.name} />
      <LogDetail label="Process ID" value={process.pid} />
      <LogDetail label="Parent Process" value={process.parent_name} />
      <LogDetail label="Command Line" value={process.command_line ? <code className="text-sm text-yellow-300 bg-slate-700 p-1 rounded">{process.command_line}</code> : '-'} />
      <LogDetail label="SHA256 Hash" value={process.hash ? <span className="font-mono text-xs">{process.hash}</span> : '-'} />
    </>
  );
};

const renderEventDetails = (event) => {
  switch (event.source_type) {
    case "EDR":
      return (
        <>
          <SectionTitle>Endpoint Details</SectionTitle>
          <LogDetail label="Hostname" value={event.data?.hostname} />
          <LogDetail label="User" value={`${event.data?.user?.name || 'N/A'} (${event.data?.user?.role || 'N/A'})`} />
          <LogDetail label="Alert" value={event.rule?.description} />
          <ProcessDetailsSection process={event.data?.process} />
          <SectionTitle>Response</SectionTitle>
          <LogDetail label="Verdict" value={event.data?.verdict} />
          <LogDetail label="Detection Engine" value={event.data?.detection_engine} />
          <LogDetail label="Network Connection" value={event.data?.network_connection} />
        </>
      );
    case "Firewall":
      return (
        <>
          <SectionTitle>Connection Details</SectionTitle>
          <LogDetail label="Firewall" value={event.data?.['firewall.device']} />
          <LogDetail label="Source IP" value={event.data?.['source.ip']} />
          <LogDetail label="Destination IP" value={event.data?.['destination.ip']} />
          <LogDetail label="Protocol" value={event.data?.protocol} />
          <LogDetail label="Port" value={event.data?.port} />
          <LogDetail label="Application" value={event.data?.application} />
          <LogDetail label="Action" value={<Badge className={event.data?.action === 'Deny' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>{event.data?.action}</Badge>} />
          <SectionTitle>Traffic Volume</SectionTitle>
          <LogDetail label="Bytes In" value={event.data?.['bytes.in']} />
          <LogDetail label="Bytes Out" value={event.data?.['bytes.out']} />
        </>
      );
    case "Active Directory":
      return (
        <>
          <SectionTitle>Activity Details</SectionTitle>
          <LogDetail label="Event ID" value={event.data?.event?.id} />
          <LogDetail label="Event Type" value={event.data?.event?.type} />
          <LogDetail label="Outcome" value={event.data?.event?.outcome} />
          <LogDetail label="User" value={event.data?.user?.name} />
          <LogDetail label="User Role" value={event.data?.user?.role} />
          <LogDetail label="Source IP" value={event.data?.source?.ip} />
          <LogDetail label="Hostname" value={event.data?.host?.name} />
          <ProcessDetailsSection process={event.data?.process} />
        </>
      );
    case "Office 365":
      return (
        <>
          <SectionTitle>Activity Details</SectionTitle>
          <LogDetail label="User" value={event.data?.['user.name']} />
          <LogDetail label="Operation" value={event.data?.operation} />
          <LogDetail label="Outcome" value={event.data?.['event.outcome']} />
          <LogDetail label="Client IP" value={event.data?.['client.ip']} />
          <LogDetail label="Location" value={event.data?.['client.location']} />
          <LogDetail label="Application" value={event.data?.app} />
          <LogDetail label="MFA Status" value={event.data?.['mfa.status']} />
        </>
      );
    case "Windows":
       return (
        <>
          <SectionTitle>Event Details</SectionTitle>
          <LogDetail label="Event ID" value={event.data?.event?.id} />
          <LogDetail label="Type" value={event.data?.event?.type} />
          <LogDetail label="Outcome" value={event.data?.event?.outcome} />
          <LogDetail label="Severity" value={event.data?.severity} />
          <LogDetail label="Computer" value={event.data?.computer?.name} />
          <LogDetail label="User" value={event.data?.user?.name} />
          <ProcessDetailsSection process={event.data?.process} />
          {event.data?.service_name && <LogDetail label="Service Name" value={event.data.service_name} />}
          {event.data?.startup_type && <LogDetail label="Startup Type" value={event.data.startup_type} />}
          {event.data?.failure_reason && <LogDetail label="Failure Reason" value={event.data.failure_reason} />}
        </>
       );
    case "DNS":
        return (
         <>
           <SectionTitle>Query Details</SectionTitle>
           <LogDetail label="Queried Domain" value={event.data?.['query.name']} />
           <LogDetail label="Query Type" value={event.data?.['query.type']} />
           <LogDetail label="Source IP" value={event.data?.['source.ip']} />
           <LogDetail label="Response Code" value={event.data?.['response.code']} />
           <LogDetail label="Outcome" value={event.data?.['event.outcome']} />
         </>
        );
    default:
      return <p>No specific details available for this event type.</p>;
  }
};


export default function DetailedLogViewer({ event }) {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!event) return null;

  return (
    <div className="h-full flex flex-col">
      <SheetHeader className="p-4 border-b border-slate-700 bg-slate-800/50">
        <SheetTitle className="text-xl font-bold text-white flex items-center justify-between">
          <span>Log Details</span>
          <Badge variant="outline" className="border-teal-500/50 text-teal-400">
            {event.source_type}
          </Badge>
        </SheetTitle>
        <SheetDescription className="text-slate-400">
          {event.rule.description}
        </SheetDescription>
      </SheetHeader>
      
      <div className="flex-grow overflow-y-auto p-4">
        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRawJson(!showRawJson)}
            className="text-teal-400 border-teal-500/50 hover:bg-teal-500/10 hover:text-teal-300"
          >
            {showRawJson ? <Eye className="w-4 h-4 mr-2" /> : <Code className="w-4 h-4 mr-2" />}
            {showRawJson ? "View Details" : "View Raw JSON"}
          </Button>
        </div>

        {showRawJson ? (
          <JsonViewer data={event} />
        ) : (
          <dl>
            <SectionTitle>Event Metadata</SectionTitle>
            <LogDetail label="Timestamp" value={event.timestamp} />
            <LogDetail label="Agent Name" value={event.agent.name} />
            {event.agent.ip && <LogDetail label="Agent IP" value={event.agent.ip} />}
            <LogDetail label="Rule ID" value={event.rule.id} />
            <LogDetail label="Rule Level" value={event.rule.level} />
            {renderEventDetails(event)}
          </dl>
        )}
      </div>

      <div className="p-4 border-t border-slate-700 bg-slate-900/50">
        <Button className="w-full bg-teal-600 hover:bg-teal-700">Mark as Reviewed</Button>
      </div>
    </div>
  );
}
