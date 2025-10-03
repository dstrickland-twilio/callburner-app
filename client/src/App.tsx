import { useEffect, useMemo, useRef, useState } from 'react';
import DialPad from './components/DialPad';
import CallControls from './components/CallControls';
import PhoneNumberInput from './components/PhoneNumberInput';
import TranscriptionPane from './components/TranscriptionPane';
import CallSummaryModal from './components/CallSummaryModal';
import { useTwilioDevice } from './hooks/useTwilioDevice';
import { useTwilioSync } from './hooks/useTwilioSync';
import { fetchCallSummary, fetchRecentCalls, hangupCall, registerCall, toggleRecording } from './services/api';
import type { CallPhase, CallSummary } from './types';

const DEFAULT_IDENTITY = 'callburner-operator';

const formatNumber = (value: string) => value.replace(/[^0-9#+*]/g, '');

function App() {
  const [identity] = useState(DEFAULT_IDENTITY);
  const [dialedDigits, setDialedDigits] = useState('');
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [callSid, setCallSid] = useState<string | undefined>();
  const callSidRef = useRef<string>();
  const [isAutoRecord, setIsAutoRecord] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [activeCallSummary, setActiveCallSummary] = useState<CallSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [recentCalls, setRecentCalls] = useState<CallSummary[]>([]);
  const [uiMessage, setUiMessage] = useState<string | null>(null);

  const { events, isConnected } = useTwilioSync(callSid);

  const refreshSummary = async (sid: string, dialedNumber: string) => {
    try {
      const summary = await fetchCallSummary(sid);
      setActiveCallSummary(
        summary ?? {
          callSid: sid,
          dialedNumber,
          startedAt: new Date().toISOString()
        }
      );
      setShowSummaryModal(true);
      const calls = await fetchRecentCalls();
      setRecentCalls(calls);
    } catch (err) {
      console.warn('Unable to fetch call summary', err);
    }
  };

  const { connect, disconnect, phase, error } = useTwilioDevice({
    identity,
    onCallEnded: () => {
      setCallPhase('ended');
      setIsRecording(false);
      setUiMessage('Call ended');
      const sid = callSidRef.current;
      if (sid) {
        void refreshSummary(sid, dialedDigits);
      }
    }
  });

  useEffect(() => {
    setCallPhase(phase);
    if (phase !== 'recording') {
      setIsRecording(false);
    }
  }, [phase]);

  useEffect(() => {
    if (error) {
      setUiMessage(error);
    }
  }, [error]);

  useEffect(() => {
    const loadRecentCalls = async () => {
      try {
        const calls = await fetchRecentCalls();
        setRecentCalls(calls);
      } catch (err) {
        console.warn('Unable to fetch recent calls', err);
      }
    };

    void loadRecentCalls();
  }, []);

  const canDial = useMemo(() => dialedDigits.length >= 3, [dialedDigits.length]);

  const updateNumber = (next: string) => {
    setDialedDigits(formatNumber(next));
  };

  const appendDigit = (digit: string) => {
    setDialedDigits((prev) => formatNumber(`${prev}${digit}`));
  };

  const removeLastDigit = () => {
    setDialedDigits((prev) => prev.slice(0, -1));
  };

  const handleDial = async () => {
    if (!canDial) {
      setUiMessage('Enter at least 3 digits');
      return;
    }

    setUiMessage(null);
    try {
      const connection = await connect({ to: dialedDigits, record: isAutoRecord });

      connection.on('accept', async () => {
        const sid = connection.parameters.CallSid;
        const startedAt = new Date().toISOString();
        setCallSid(sid);
        callSidRef.current = sid;
        setActiveCallSummary({
          callSid: sid,
          dialedNumber: dialedDigits,
          startedAt
        });
        await registerCall({ callSid: sid, to: dialedDigits, startedAt });
        setIsRecording(isAutoRecord);
        setUiMessage('Call connected');
      });

      connection.on('error', (connectionError) => {
        setUiMessage(connectionError.message);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to place call';
      setUiMessage(message);
    }
  };

  const handleHangup = async () => {
    disconnect();
    const sid = callSidRef.current;
    if (sid) {
      try {
        await hangupCall(sid);
      } catch (err) {
        console.warn('Unable to hang up via server', err);
      }
    }
  };

  const handleToggleRecording = async () => {
    const sid = callSidRef.current;
    if (!sid) {
      return;
    }

    const action = isRecording ? 'stop' : 'start';
    try {
      await toggleRecording(sid, action);
      setIsRecording(!isRecording);
      setUiMessage(action === 'start' ? 'Recording started' : 'Recording stopped');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to toggle recording';
      setUiMessage(message);
    }
  };

  return (
    <div className="app-shell">
      <header className="top-bar">
        <div>
          <h1>CallBurner</h1>
          <p className="subtitle">Twilio powered web dialer</p>
        </div>
        <div className="identity-chip">
          Signed in as <span>{identity}</span>
        </div>
      </header>

      <main className="layout">
        <section className="panel dialer-panel">
          <div className="number-entry">
            <PhoneNumberInput value={dialedDigits} onChange={updateNumber} disabled={callPhase === 'dialing'} />
            <label className="checkbox">
              <input type="checkbox" checked={isAutoRecord} onChange={(event) => setIsAutoRecord(event.target.checked)} />
              Auto-start recording
            </label>
          </div>

          <DialPad onInput={appendDigit} onBackspace={removeLastDigit} disabled={callPhase === 'dialing'} />

          <CallControls
            callPhase={callPhase}
            isRecording={isRecording}
            onDial={handleDial}
            onHangup={handleHangup}
            onToggleRecording={handleToggleRecording}
          />

          {uiMessage && <div className="banner">{uiMessage}</div>}

          <div className="recent-calls">
            <h2>Recent Calls</h2>
            {recentCalls.length === 0 && <p className="placeholder">No calls yet</p>}
            {recentCalls.map((call) => (
              <button key={call.callSid} className="recent-call" onClick={() => refreshSummary(call.callSid, call.dialedNumber)}>
                <span className="number">{call.dialedNumber}</span>
                <span className="meta">{new Date(call.startedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="panel transcription-panel">
          <TranscriptionPane events={events} isStreaming={callPhase === 'in-call' || callPhase === 'recording'} />
        </section>
      </main>

      <CallSummaryModal open={showSummaryModal} summary={activeCallSummary} onClose={() => setShowSummaryModal(false)} />
    </div>
  );
}

export default App;
