import Axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import httpClient from './http';

export const customInstance = <T>(
  config: AxiosRequestConfig | string,
  options?: any
): Promise<T> => {
  const finalConfig: any = typeof config === 'string' 
    ? { url: config, ...options } 
    : { ...config, ...options };

  if (finalConfig.body && !finalConfig.data) {
    try {
      finalConfig.data = JSON.parse(finalConfig.body);
    } catch (e) {
      finalConfig.data = finalConfig.body;
    }
    delete finalConfig.body;
  }

  return httpClient(finalConfig) as unknown as Promise<T>;
};
