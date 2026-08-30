import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://bharosa-api.onrender.com/api';

export const apiClient = axios.create({
  baseURL: API_BASE,
});

let accessToken: string | null = null;

apiClient.interceptors.request.use(async (config) => {
  if (!accessToken && config.url !== '/auth/device/login' && config.url !== '/auth/device/register') {
    // Auto-login for development
    try {
      const { data } = await axios.post(`${API_BASE}/auth/device/login`, {
        deviceId: 'dev-supervisor-123',
        pin: '1234',
      });
      accessToken = data.accessToken;
    } catch (err: any) {
      if (err.response?.status === 404) {
        // Register it
        const { data } = await axios.post(`${API_BASE}/auth/device/register`, {
          deviceId: 'dev-supervisor-123',
          role: 'supervisor',
          workerId: 'worker-sup-1',
          facilityId: 'fac-1',
          pin: '1234',
        });
        accessToken = data.accessToken;
      }
    }
  }

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});
