import type { CallPhase } from '../types';

interface CallControlsProps {
  callPhase: CallPhase;
  isRecording: boolean;
  onDial: () => void;
  onHangup: () => void;
  onToggleRecording: () => void;
  disabled?: boolean;
}

export const CallControls = ({ callPhase, isRecording, onDial, onHangup, onToggleRecording, disabled }: CallControlsProps) => {
  const isDialingOrActive = callPhase === 'dialing' || callPhase === 'in-call' || callPhase === 'recording';

  return (
    <div className="call-controls">
      <button className="control-button primary" disabled={disabled || isDialingOrActive} onClick={onDial}>
        Dial
      </button>
      <button className="control-button danger" disabled={!isDialingOrActive} onClick={onHangup}>
        Hang Up
      </button>
      <button
        className="control-button secondary"
        disabled={callPhase !== 'in-call' && callPhase !== 'recording'}
        onClick={onToggleRecording}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>
  );
};

export default CallControls;
