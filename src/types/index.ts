export interface MondayItem {
  id: string;
  name: string;
  column_values: MondayColumnValue[];
}

export interface MondayColumnValue {
  id: string;
  text: string;
  value: string;
  type: string;
}

export interface MondayWebhookPayload {
  event?: {
    app: string;
    type: string;
    triggerTime: string;
    subscriptionId: number;
    isRetry: boolean;
    userId: number;
    originalTriggerUuid: string | null;
    boardId: number;
    groupId: string;
    pulseId: number;
    pulseName: string;
    columnId: string;
    columnType: string;
    columnTitle: string;
    value: {
      value: number;
      unit: string | null;
    };
    previousValue: {
      value: number;
      unit: string | null;
    } | null;
    changedAt: number;
    isTopGroup: boolean;
    triggerUuid: string;
  };
}

export interface MondayApiResponse<T = any> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
    path?: string[];
  }>;
  account_id?: number;
}

export interface FactorDocument {
  _id: string;
  itemId: string;
  factor: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface HistoryDocument {
  _id: string;
  itemId: string;
  action: 'factor_updated' | 'recalculation' | 'webhook_triggered';
  oldValue?: number;
  newValue: number;
  inputValue?: number;
  resultValue?: number;
  triggeredBy: 'api' | 'webhook' | 'system';
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ApiError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}
