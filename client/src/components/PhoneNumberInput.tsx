interface PhoneNumberInputProps {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PhoneNumberInput = ({ value, onChange, placeholder = 'Enter number or search contact', disabled }: PhoneNumberInputProps) => {
  return (
    <div className="number-input-wrapper">
      <input
        className="number-input"
        type="tel"
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
};

export default PhoneNumberInput;
