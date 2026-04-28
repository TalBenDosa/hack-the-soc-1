import React, { createContext, useContext, useState, useCallback } from "react";

const InvestigationContext = createContext(null);

export function InvestigationProvider({ children }) {
  const [steps, setSteps] = useState([]);

  const logStep = useCallback((type, details) => {
    setSteps(prev => [
      {
        id: Date.now() + Math.random(),
        type,
        details,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, []);

  const clearSteps = useCallback(() => setSteps([]), []);

  return (
    <InvestigationContext.Provider value={{ steps, logStep, clearSteps }}>
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation() {
  return useContext(InvestigationContext);
}