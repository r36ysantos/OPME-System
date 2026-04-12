import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clean ALL auth state — storage + in-memory axios header
      localStorage.removeItem('opme_token');
      localStorage.removeItem('opme_user');
      localStorage.removeItem('opme_permissions');
      delete api.defaults.headers.common['Authorization'];

      // Only redirect if not already on the login page (avoids redirect loops)
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/OPME-System/login';
      }
    }
    return Promise.reject(error);
  }
);

const savedToken = localStorage.getItem('opme_token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export default api;
