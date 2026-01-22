import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { globalDeduplicator } from './resilience';

const BASE_URL = "/api/v1";

/**
 * Handles exponential backoff retry logic for failed requests.
 */
class RetryHandler {
  static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 300;
  private static readonly RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
  
  static shouldRetry(error: AxiosError, retryCount: number): boolean {
    if (retryCount >= this.MAX_RETRIES) return false;
    
    if (this.isCancellationError(error)) {
      return false;
    }
    
    if (error.response) {
      const { status } = error.response;
      if (status >= 400 && status < 500 && !this.RETRYABLE_STATUS_CODES.includes(status)) {
        return false;
      }
    }
    
    return !error.response || this.RETRYABLE_STATUS_CODES.includes(error.response.status);
  }
  
  static isCancellationError(error: AxiosError): boolean {
    return (
      axios.isCancel(error) ||
      error.code === 'ERR_CANCELED' ||
      error.code === 'ECONNABORTED' ||
      error.message?.includes('canceled') ||
      error.message?.includes('aborted') ||
      error.name === 'CanceledError' ||
      error.name === 'AbortError'
    );
  }
  
  static getRetryDelay(retryCount: number): number {
    const exponentialDelay = this.RETRY_DELAY_MS * Math.pow(2, retryCount);
    const jitter = Math.random() * 100;
    return exponentialDelay + jitter;
  }
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // Increased to 30s to handle backend cold starts (Neon)
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  validateStatus: (status) => status >= 200 && status < 400,
});

declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: { startTime: number };
    _retryCount?: number;
    _skipRetry?: boolean;
    _deduplicate?: boolean;
  }
}

api.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: Date.now() };
    console.log(`[API] → ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[API] Request Setup Error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response: AxiosResponse) => {
    const duration = Date.now() - (response.config.metadata?.startTime || 0);
    console.log(`[API] ✓ ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    return response;
  },
  async (error: AxiosError) => {
    const { config } = error;
    if (!config) return Promise.reject(error);

    const duration = Date.now() - (config.metadata?.startTime || 0);
    
    if (RetryHandler.isCancellationError(error)) {
       console.debug(`[API] ℹ Request canceled/aborted: ${config.method?.toUpperCase()} ${config.url} (${duration}ms)`);
       return Promise.reject(error);
    }
    
    console.error(
      `[API] ✗ ${error.response?.status || error.code} ${config.method?.toUpperCase()} ${config.url} (${duration}ms): ${error.message}`
    );

    if (config._skipRetry) {
      return Promise.reject(error);
    }

    config._retryCount = config._retryCount || 0;
    
    if (RetryHandler.shouldRetry(error, config._retryCount)) {
      config._retryCount++;
      const delay = RetryHandler.getRetryDelay(config._retryCount);
      console.warn(`[API] Retrying request (${config._retryCount}/${RetryHandler.MAX_RETRIES}) in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return api.request(config);
    }
    
    return Promise.reject(error);
  }
);

function getCacheKey(config: AxiosRequestConfig): string {
    const { method = 'get', url = '', data, params } = config;
    return `${method.toUpperCase()}:${url}:${JSON.stringify(data || {})}:${JSON.stringify(params || {})}`;
}

async function apiRequest<T = any>(
  config: AxiosRequestConfig,
  options: { deduplicate?: boolean } = {}
): Promise<AxiosResponse<T>> {
  const { deduplicate = true } = options;
  
  if (!deduplicate || config.method?.toUpperCase() !== 'GET') {
    return api.request<T>(config);
  }
  
  const cacheKey = getCacheKey(config);
  return globalDeduplicator.execute(cacheKey, () => api.request<T>(config));
}

export const apiClient = {
  get: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiRequest<T>({ method: 'GET', url, ...config });
    return response.data;
  },
  post: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiRequest<T>({ method: 'POST', url, data, ...config }, { deduplicate: false });
    return response.data;
  },
  put: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiRequest<T>({ method: 'PUT', url, data, ...config }, { deduplicate: false });
    return response.data;
  },
  patch: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiRequest<T>({ method: 'PATCH', url, data, ...config }, { deduplicate: false });
    return response.data;
  },
  delete: async <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const response = await apiRequest<T>({ method: 'DELETE', url, ...config }, { deduplicate: false });
    return response.data;
  },
};

export default api;