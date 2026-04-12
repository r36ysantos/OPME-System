import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('opme_token');
      localStorage.removeItem('opme_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const savedToken = localStorage.getItem('opme_token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}
