import axios from 'axios';
import type { CallSummary } from '../types';

const api = axios.create({
  baseURL: '/api'
});

const twilioTokenUrl = import.meta.env.VITE_TWILIO_TOKEN_URL;

export const requestAccessToken = async (identity: string) => {
  if (twilioTokenUrl) {
    const { data } = await axios.post<{ token: string }>(twilioTokenUrl, { identity });
    return data.token;
  }

  const { data } = await api.post<{ token: string }>('/token', { identity });
  return data.token;
};

export const registerCall = async (payload: { callSid: string; to: string; startedAt: string }) => {
  await api.post('/calls', payload);
};

export const hangupCall = async (callSid: string) => {
  await api.post(`/calls/${callSid}/hangup`);
};

export const toggleRecording = async (callSid: string, action: 'start' | 'stop') => {
  await api.post(`/calls/${callSid}/recording/${action}`);
};

export const fetchCallSummary = async (callSid: string) => {
  const { data } = await api.get<CallSummary>(`/calls/${callSid}/summary`);
  return data;
};

export const fetchRecentCalls = async () => {
  const { data } = await api.get<CallSummary[]>('/calls');
  return data;
};
