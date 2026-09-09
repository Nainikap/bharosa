import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://bharosa-api.onrender.com/api',
});

// Interceptor to add auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('bharosa_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // For demo purposes, if no token, just use a dummy one so the API at least receives something
    // A real app would redirect to login.
    config.headers.Authorization = `Bearer demo-token`;
  }
  return config;
});
