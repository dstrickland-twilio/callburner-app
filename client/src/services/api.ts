import axios from 'axios';
import type { CallSummary } from '../types';

// Use Twilio Functions for all API calls
const TWILIO_FUNCTIONS_URL = import.meta.env.VITE_TWILIO_FUNCTIONS_URL ||
  'https://callburner-functions-2333-dev.twil.io';

const api = axios.create({
  baseURL: TWILIO_FUNCTIONS_URL
});

const twilioTokenUrl = import.meta.env.VITE_TWILIO_TOKEN_URL || `${TWILIO_FUNCTIONS_URL}/token`;

export const requestAccessToken = async (identity: string) => {
  const { data } = await axios.post<{ token: string }>(twilioTokenUrl, { identity });
  return data.token;
};

export const registerCall = async (payload: { callSid: string; to: string; startedAt: string }) => {
  await api.post('/calls-register', payload);
};

export const hangupCall = async (callSid: string) => {
  await api.post('/calls-hangup', { callSid });
};

export const toggleRecording = async (callSid: string, action: 'start' | 'stop') => {
  await api.post('/calls-recording-toggle', { callSid, action });
};

export const fetchCallSummary = async (callSid: string) => {
  // Fetch from Twilio Sync instead
  // For now, return a mock response - we'll implement this with Sync later
  return {
    callSid,
    dialedNumber: '',
    startedAt: new Date().toISOString()
  } as CallSummary;
};

export const fetchRecentCalls = async () => {
  // Fetch from Twilio Sync instead
  // For now, return empty array - we'll implement this with Sync later
  return [] as CallSummary[];
};
