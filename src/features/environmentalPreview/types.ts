export type RiskLevel = 'low' | 'medium' | 'high';

export interface MetricItem {
  label: string;
  value: string;
  trend?: string;
}

export interface ModuleCardItem {
  title: string;
  badge: string;
  description: string;
  status: string;
  cta: string;
}

export interface AlertItem {
  id: string;
  title: string;
  location: string;
  severity: RiskLevel;
  time: string;
}

export interface DataSourceItem {
  name: string;
  type: string;
  freshness: string;
  confidence: string;
}
