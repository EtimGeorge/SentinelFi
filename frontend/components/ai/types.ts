export interface AIChatScope {
  page: string;
  entityType?: string;
  entityId?: string;
  projectId?: string;
  context?: Record<string, any>;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | RichContent;
  timestamp: Date;
  streaming?: boolean;
  metadata?: {
    source?: string;
    confidence?: number;
    relatedEntities?: string[];
  };
}

export type RichContent = 
  | { type: 'text'; value: string }
  | { type: 'chart'; data: ChartData; config: ChartConfig }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'actions'; chips: ActionChip[] }
  | { type: 'card'; title: string; content: string; metadata?: Record<string, any> }
  | { type: 'kpi'; label: string; value: string; trend?: number; accent: string };

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  borderColor?: string;
  backgroundColor?: string;
  fill?: boolean;
  tension?: number;
}

export interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie' | 'radar';
  title?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  responsive?: boolean;
}

export interface ActionChip {
  label: string;
  prompt: string;
  variant: 'primary' | 'secondary' | 'destructive';
  icon?: React.ReactNode;
}

export interface SuggestionChip {
  label: string;
  prompt: string;
  relevance: 'fresh' | 'contextual' | 'related';
  icon?: React.ReactNode;
}

export interface ProactiveInsight {
  id: string;
  type: 'variance' | 'forecast' | 'anomaly' | 'opportunity' | 'risk';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  actionPrompt?: string;
  dismissible: boolean;
  createdAt: Date;
}

export interface AIChatSession {
  id: string;
  tenantId: string;
  userId: string;
  scope: AIChatScope;
  messages: AIChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAssistantState {
  isOpen: boolean;
  isMinimized: boolean;
  messages: AIChatMessage[];
  scope: AIChatScope;
  isStreaming: boolean;
  inputValue: string;
  proactiveInsight: ProactiveInsight | null;
  unreadCount: number;
  sessionHistory: AIChatSession[];
}