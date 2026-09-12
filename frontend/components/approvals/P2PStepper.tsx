import React from 'react';
import { FileText, Truck, FileText as InvoiceIcon, DollarSign, CheckCircle, ChevronRight } from 'lucide-react';

interface Stage {
  id: string;
  label: string;
  icon: React.ElementType;
  color: string;
}

const STAGES: Stage[] = [
  { id: 'REQUISITION', label: 'Requisition', icon: FileText, color: '#6366f1' },
  { id: 'PURCHASE_ORDER', label: 'PO', icon: Truck, color: '#0ea5e9' },
  { id: 'INVOICE', label: 'Invoice', icon: InvoiceIcon, color: '#f59e0b' },
  { id: 'PAYMENT', label: 'Payment', icon: DollarSign, color: '#22c55e' },
];

interface P2PStepperProps {
  currentStage: string;
  stages?: Stage[];
  className?: string;
  showLabels?: boolean;
  compact?: boolean;
}

export const P2PStepper: React.FC<P2PStepperProps> = ({
  currentStage,
  stages = STAGES,
  className = '',
  showLabels = true,
  compact = false,
}) => {
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  
  return (
    <div className={`flex items-center gap-1 ${className}`} role="progressbar" aria-valuenow={currentIndex + 1} aria-valuemin={1} aria-valuemax={stages.length}>
      {stages.map((stage, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        
        const Icon = stage.icon;
        
        return (
          <React.Fragment key={stage.id}>
            <div className="flex items-center">
              <div className="relative flex items-center">
                {/* Connecting line */}
                {index < stages.length - 1 && (
                  <div
                    className={`absolute left-full top-1/2 -translate-y-1/2 w-8 h-0.5 ${index < currentIndex ? 'bg-green-500' : 'bg-gray-700'}`}
                    style={{ zIndex: 0 }}
                  />
                )}
                
                {/* Step circle */}
                <div
                  className={`relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500' 
                      : isCurrent 
                        ? `bg-${stage.color.replace('#', '')} border-${stage.color.replace('#', '')} ring-4 ring-${stage.color.replace('#', '')}/30` 
                        : 'bg-gray-800 border-gray-700'
                  }`}
                  style={{ zIndex: 1 }}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : (
                    <Icon className={`w-5 h-5 ${isCurrent ? 'text-white' : 'text-gray-500'}`} />
                  )}
                </div>
              </div>
              
              {showLabels && !compact && (
                <div className="ml-2 whitespace-nowrap">
                  <p className={`text-xs font-bold ${isCurrent ? 'text-white' : 'text-gray-500'}`}>{stage.label}</p>
                  <p className="text-xs text-gray-500">
                    {isCompleted ? 'Completed' : isCurrent ? 'Current' : 'Pending'}
                  </p>
                </div>
              )}
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

interface StageItemProps {
  completed?: boolean;
  current?: boolean;
  pending?: boolean;
  timestamp?: string;
  actor?: string;
  children?: React.ReactNode;
}

export const StageItem: React.FC<StageItemProps> = ({
  completed = false,
  current = false,
  pending = false,
  timestamp,
  actor,
  children,
}) => {
  return (
    <div className="flex items-start gap-4">
      <div className="relative flex-shrink-0">
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${completed ? 'bg-green-500 border-green-500' : current ? 'bg-brand-primary border-brand-primary ring-4 ring-brand-primary/30' : 'bg-gray-800 border-gray-700'}`}>
          {completed && <CheckCircle className="w-3 h-3 text-white" />}
        </div>
        {!pending && <div className="absolute left-1/2 top-4 w-0.5 h-full bg-gray-700" /> }
      </div>
      <div className="flex-1 min-w-0 pt-1">
        {children}
        {(timestamp || actor) && (
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            {actor && <span className="font-medium text-gray-400">{actor}</span>}
            {timestamp && <span>{new Date(timestamp).toLocaleString()}</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default P2PStepper;