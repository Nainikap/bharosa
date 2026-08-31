import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://bharosa-api.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    const tryParse = (val: any) => {
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return val; }
      }
      return val;
    };

    const parsePromise = (p: any) => {
      if (!p || typeof p !== 'object') return p;
      // Only parse if it looks like a promise (has id and type)
      if (p.id && p.type) {
        return {
          ...p,
          description: tryParse(p.description),
          committedTo: tryParse(p.committedTo),
          committedBy: tryParse(p.committedBy),
          evidence: tryParse(p.evidence),
          ladder: tryParse(p.ladder),
        };
      }
      return p;
    };

    if (response.data) {
      if (Array.isArray(response.data.data)) {
        response.data.data = response.data.data.map(parsePromise);
      } else if (response.data.id && response.data.type) {
        response.data = parsePromise(response.data);
      }
    }
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('accessToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
