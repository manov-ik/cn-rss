import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

const env = import.meta.env;

const BASE_URL = env.VITE_API_URL || "/api";

axios.defaults.baseURL = BASE_URL;

export const createInstance = (config: AxiosRequestConfig): AxiosInstance => {
  axios.defaults.baseURL = BASE_URL;
  return axios.create(config);
};

export const get = (url: string, config?: AxiosRequestConfig) => {
  const _instance = createInstance(config || {});

  return _instance.get(url, config).then((res: AxiosResponse) => {
    return res;
  });
};

export const post = (url: string, data: any, config?: AxiosRequestConfig) => {
  const _instance = createInstance(config || {});

  return _instance.post(url, data, config).then((res: AxiosResponse) => {
    return res;
  });
};

export const put = (url: string, data: any, config?: AxiosRequestConfig) => {
  const _instance = createInstance(config || {});

  return _instance.put(url, data, config).then((res: AxiosResponse) => {
    return res;
  });
};

export const _delete = (url: string, config?: AxiosRequestConfig) => {
  const _instance = createInstance(config || {});

  return _instance.delete(url, config).then((res: AxiosResponse) => {
    return res;
  });
};

export const request = {
  get,
  post,
  put,
  delete: _delete,
};

export const fetcher = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, init).then((res) => res.json());
