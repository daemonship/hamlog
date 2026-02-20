import axios from 'axios';
import { getToken, clearToken } from './auth';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// On 401, clear stale token (don't redirect here — let the ProtectedRoute handle it)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearToken();
    }
    return Promise.reject(error);
  }
);

// ── Auth ─────────────────────────────────────────────────

export async function login(email, password) {
  // FastAPI-Users expects form-encoded data for the login endpoint
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);
  const response = await api.post('/auth/jwt/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data; // { access_token, token_type }
}

export async function register(email, password) {
  const response = await api.post('/auth/register', { email, password });
  return response.data;
}

// ── QSO ──────────────────────────────────────────────────

export async function listQSOs({ call, offset = 0, limit = 100 } = {}) {
  const params = { offset, limit };
  if (call) params.call = call;
  const response = await api.get('/qso', { params });
  return response.data; // { items, total }
}

export async function createQSO(payload) {
  const response = await api.post('/qso', payload);
  return response.data;
}

export async function deleteQSO(id) {
  await api.delete(`/qso/${id}`);
}

// ── NL Parse ─────────────────────────────────────────────

export async function parseQSO(text) {
  const response = await api.post('/parse', { text });
  return response.data; // { parsed, confidence, raw_text }
}

// ── Callsign Lookup ───────────────────────────────────────

export async function lookupCallsign(callsign) {
  const response = await api.get(`/callsign/${encodeURIComponent(callsign)}`);
  return response.data; // { callsign, name, qth, grid, dxcc, source }
}

export default api;
