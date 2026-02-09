import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface BreadcrumbContextType {
  labels: Record<string, string>;
  setLabel: (segment: string, label: string) => void;
  removeLabel: (segment: string) => void;
  clearLabels: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(undefined);

export const BreadcrumbProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [labels, setLabels] = useState<Record<string, string>>({});

  const setLabel = useCallback((segment: string, label: string) => {
    setLabels(prev => ({ ...prev, [segment]: label }));
  }, []);

  const removeLabel = useCallback((segment: string) => {
    setLabels(prev => {
      const next = { ...prev };
      delete next[segment];
      return next;
    });
  }, []);

  const clearLabels = useCallback(() => {
    setLabels({});
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ labels, setLabel, removeLabel, clearLabels }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumbs = () => {
  const context = useContext(BreadcrumbContext);
  if (context === undefined) {
    throw new Error('useBreadcrumbs must be used within a BreadcrumbProvider');
  }
  return context;
};
