import clsx from 'clsx';

interface DialPadProps {
  onInput: (value: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

const keys = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', '']
];

export const DialPad = ({ onInput, onBackspace, disabled }: DialPadProps) => {
  return (
    <div className="dialpad">
      {keys.map(([digit, letters]) => (
        <button
          key={digit}
          className={clsx('dialpad-key', disabled && 'disabled')}
          disabled={disabled}
          onClick={() => onInput(digit)}
        >
          <span className="digit">{digit}</span>
          {letters && <span className="letters">{letters}</span>}
        </button>
      ))}
      <button className="dialpad-key backspace" onClick={onBackspace} disabled={disabled}>
        ⌫
      </button>
    </div>
  );
};

export default DialPad;
