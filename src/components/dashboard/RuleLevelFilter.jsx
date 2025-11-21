import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter } from 'lucide-react';

const RuleLevelFilter = ({ onFilterChange }) => {
  const [operator, setOperator] = useState('is');
  const [value, setValue] = useState('');

  const handleFilter = () => {
    onFilterChange({ operator, value });
  };

  const handleValueChange = (e) => {
    setValue(e.target.value);
    // instant filtering on value change
    onFilterChange({ operator, value: e.target.value });
  };
  
  const handleOperatorChange = (op) => {
    setOperator(op);
    onFilterChange({ operator: op, value });
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2 text-slate-300">
        <Filter className="w-4 h-4" />
        <span className="font-medium">Filter by rule.level:</span>
      </div>
      <Select value={operator} onValueChange={handleOperatorChange}>
        <SelectTrigger className="w-28 bg-slate-700 border-slate-600 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-slate-700 border-slate-600">
          <SelectItem value="is">is</SelectItem>
          <SelectItem value="is_not">is not</SelectItem>
          <SelectItem value="gt">greater than</SelectItem>
          <SelectItem value="lt">less than</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="text"
        placeholder="Level (0-10)"
        value={value}
        onChange={handleValueChange}
        className="w-40 bg-slate-700 border-slate-600 text-white placeholder-slate-400"
      />
      <div className="text-xs text-slate-500">
        Rule levels: 1-3 (Low), 4-6 (Medium), 7-10 (High)
      </div>
    </div>
  );
};

export default RuleLevelFilter;