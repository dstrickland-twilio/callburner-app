import { useCallback, useEffect, useRef, useState } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { requestAccessToken } from '../services/api';
import type { CallPhase } from '../types';

interface UseTwilioDeviceOptions {
  identity: string;
  onIncomingCall?: (connection: Call) => void;
  onCallEnded?: (connection: Call) => void;
}

interface ConnectOptions {
  to: string;
  record: boolean;
}

export const useTwilioDevice = ({ identity, onIncomingCall, onCallEnded }: UseTwilioDeviceOptions) => {
  const deviceRef = useRef<Device | null>(null);
  const [phase, setPhase] = useState<CallPhase>('idle');
  const [activeConnection, setActiveConnection] = useState<Call | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createOrUpdateDevice = useCallback(async () => {
    try {
      setPhase('idle');
      setError(null);

      const token = await requestAccessToken(identity);

      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }

      const device = new Device(token, {
        codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
        closeProtection: true
      });

      device.on('registered', () => setPhase('ready'));
      device.on('error', (deviceError) => {
        setPhase('error');
        setError(deviceError.message);
      });
      device.on('incoming', (connection) => {
        onIncomingCall?.(connection);
      });
      device.on('unregistered', () => setPhase('idle'));

      await device.register();
      deviceRef.current = device;
    } catch (err) {
      console.error('Unable to initialize Twilio Device', err);
      setPhase('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [identity, onIncomingCall]);

  useEffect(() => {
    createOrUpdateDevice();

    return () => {
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, [createOrUpdateDevice]);

  const connect = useCallback(
    async ({ to, record }: ConnectOptions) => {
      if (!deviceRef.current) {
        await createOrUpdateDevice();
      }

      const device = deviceRef.current;
      if (!device) {
        throw new Error('Device is not ready');
      }

      setPhase('dialing');
      const connection = await device.connect({ params: { To: to, record: record ? 'true' : 'false' } });

      connection.on('accept', () => {
        setPhase(record ? 'recording' : 'in-call');
        setActiveConnection(connection);
      });

      connection.on('disconnect', () => {
        setPhase('ended');
        setActiveConnection(null);
        onCallEnded?.(connection);
      });

      connection.on('cancel', () => {
        setPhase('idle');
        setActiveConnection(null);
      });

      connection.on('error', (connectionError) => {
        setPhase('error');
        setError(connectionError.message);
      });

      return connection;
    },
    [createOrUpdateDevice, onCallEnded]
  );

  const disconnect = useCallback(() => {
    activeConnection?.disconnect();
  }, [activeConnection]);

  return {
    connect,
    disconnect,
    phase,
    activeConnection,
    error,
    isRecording: phase === 'recording'
  };
};
