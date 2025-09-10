import axios, { AxiosInstance, AxiosError } from 'axios';
import { MondayApiResponse, MondayItem, ApiError, RetryConfig } from '../types';

// Service configuration type
type MondayApiServiceConfig = {
  apiToken: string;
  retryConfig?: Partial<RetryConfig>;
};

// Default retry configuration
const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

// Pure function to create axios client
const createAxiosClient = (apiToken: string): AxiosInstance => {
  return axios.create({
    baseURL: 'https://api.monday.com/v2',
    headers: {
      'Authorization': apiToken,
      'Content-Type': 'application/json',
      'API-Version': '2023-10',
    },
    timeout: 30000,
  });
};

// Pure function to handle API errors
const handleApiError = (error: AxiosError): ApiError => {
  const apiError = new Error(error.message) as ApiError;
  
  if (error.response) {
    apiError.statusCode = error.response.status;
    apiError.message = `Monday API Error ${error.response.status}: ${error.message}`;
  } else if (error.request) {
    apiError.statusCode = 503;
    apiError.message = 'Monday API is unreachable';
  } else {
    apiError.statusCode = 500;
    apiError.message = 'Unexpected error occurred';
  }
  
  apiError.isOperational = true;
  return apiError;
};

// Pure function for sleep
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Setup interceptors function
const setupInterceptors = (client: AxiosInstance): void => {
  // Request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      console.log(`[Monday API] ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[Monday API] Request error:', error.message);
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      console.error('[Monday API] Response error:', error.response?.status, error.message);
      return Promise.reject(handleApiError(error));
    }
  );
};

// Execute with retry function
const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  context: string,
  retryConfig: RetryConfig
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === retryConfig.maxRetries) {
        console.error(`[Monday API] ${context} failed after ${attempt + 1} attempts:`, lastError.message);
        throw lastError;
      }

      const delay = Math.min(
        retryConfig.baseDelay * Math.pow(retryConfig.backoffFactor, attempt),
        retryConfig.maxDelay
      );

      console.warn(`[Monday API] ${context} attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
      await sleep(delay);
    }
  }

  throw lastError!;
};

// Create Monday API service factory
const createMondayApiService = (config: MondayApiServiceConfig) => {
  const { apiToken, retryConfig = {} } = config;
  const finalRetryConfig = { ...defaultRetryConfig, ...retryConfig };
  const client = createAxiosClient(apiToken);
  
  setupInterceptors(client);

  // Get item function
  const getItem = async (itemId: string, boardId: string): Promise<MondayItem> => {
    const query = `
      query GetItem($itemId: ID!, $boardId: ID!) {
        items(ids: [$itemId]) {
          id
          name
          column_values {
            id
            text
            value
            type
          }
        }
      }
    `;

    const variables = { itemId, boardId };

    const response = await executeWithRetry(
      () => client.post<MondayApiResponse<{ items: MondayItem[] }>>('', {
        query,
        variables,
      }),
      `Get item ${itemId}`,
      finalRetryConfig
    );

    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(`Monday API Error: ${response.data.errors[0]?.message || 'Unknown error'}`);
    }

    if (!response.data.data.items || response.data.data.items.length === 0) {
      throw new Error(`Item ${itemId} not found`);
    }

    return response.data.data.items[0]!;
  };

  // Update column value function
  const updateColumnValue = async (
    itemId: string,
    columnId: string,
    value: string | number,
    boardId?: string
  ): Promise<boolean> => {
    const query = `
      mutation UpdateColumnValue($itemId: ID!, $columnId: String!, $value: JSON!, $boardId: ID!) {
        change_column_value(
          item_id: $itemId,
          column_id: $columnId,
          value: $value,
          board_id: $boardId
        ) {
          id
        }
      }
    `;

    const variables = {
      itemId,
      columnId,
      value: String(value),
      boardId: boardId || process.env.DEFAULT_BOARD_ID,
    };

    const response = await executeWithRetry(
      () => client.post<MondayApiResponse<{ change_column_value: { id: string } }>>('', {
        query,
        variables,
      }),
      `Update column ${columnId} for item ${itemId}`,
      finalRetryConfig
    );

    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(`Monday API Error: ${response.data.errors[0]?.message || 'Unknown error'}`);
    }

    return !!response.data.data.change_column_value;
  };

  // Get column value function
  const getColumnValue = async (itemId: string, columnId: string): Promise<string | null> => {
    const query = `
      query GetColumnValue($itemId: ID!, $columnId: String!) {
        items(ids: [$itemId]) {
          column_values(ids: [$columnId]) {
            text
            value
          }
        }
      }
    `;

    const variables = { itemId, columnId };

    const response = await executeWithRetry(
      () => client.post<MondayApiResponse<{ items: Array<{ column_values: Array<{ text: string; value: string }> }> }>>('', {
        query,
        variables,
      }),
      `Get column ${columnId} value for item ${itemId}`,
      finalRetryConfig
    );

    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(`Monday API Error: ${response.data.errors[0]?.message || 'Unknown error'}`);
    }

    if (!response.data.data.items || response.data.data.items.length === 0) {
      return null;
    }

    const columnValues = response.data.data.items[0]?.column_values;
    return columnValues && columnValues.length > 0 ? columnValues[0]?.text || null : null;
  };

  // Verify webhook function
  const verifyWebhook = async (webhookSecret: string, payload: string, signature: string): Promise<boolean> => {
    return webhookSecret === process.env.WEBHOOK_SECRET;
  };

  // Get board by ID function
  const getBoardById = async (boardId: string): Promise<any> => {
    const query = `
      query GetBoardById($boardId: ID!) {
        boards(ids: [$boardId]) {
          id
          name
          items_page {
            items {
              id
              name
              column_values {
                id
                text
                value
              }
            }
          }
        }
      }
    `;

    const variables = { boardId };

    const response = await executeWithRetry(
      () => client.post<MondayApiResponse<{ boards: Array<{ id: string; name: string; items_page: { items: Array<{ id: string; name: string; column_values: Array<{ id: string; text: string; value: string }> }> } }> }>>('', {
        query,
        variables,
      }),
      `Get board ${boardId}`,
      finalRetryConfig
    );

    if (response.data.errors && response.data.errors.length > 0) {
      throw new Error(`Monday API Error: ${response.data.errors[0]?.message || 'Unknown error'}`);
    }

    return response.data.data.boards[0];
  };

  // Return service object with all functions
  return {
    getItem,
    updateColumnValue,
    getColumnValue,
    verifyWebhook,
    getBoardById,
  };
};

// Export the factory function and types
export { createMondayApiService };
export type { MondayApiServiceConfig };