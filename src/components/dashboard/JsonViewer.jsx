import React from 'react';

const JsonViewer = ({ data }) => {
  const formatJson = (json) => {
    try {
      const parsed = typeof json === 'string' ? JSON.parse(json) : json;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return "Invalid JSON format";
    }
  };

  return (
    <pre className="bg-slate-900/50 p-4 rounded-md text-sm text-slate-300 whitespace-pre-wrap overflow-x-auto">
      <code>
        {formatJson(data)}
      </code>
    </pre>
  );
};

export default JsonViewer;