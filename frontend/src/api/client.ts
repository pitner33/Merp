import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
});

export async function get<T>(url: string) {
  const { data } = await api.get<T>(url);
  return data;
}

export async function put<T>(url: string, body: unknown) {
  const { data } = await api.put<T>(url, body);
  return data;
}

export async function patch<T>(url: string, body?: unknown) {
  const { data } = await api.patch<T>(url, body);
  return data;
}

export async function post<T>(url: string, body?: unknown) {
  const { data } = await api.post<T>(url, body);
  return data;
}

export async function del(url: string) {
  await api.delete(url);
}
