import React from "react";

const Select = ({ label, value, onChange, options, placeholder = "Select...", required }) => {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      <select value={value} onChange={(e) => onChange(e.target.value)} required={required}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>
            {opt.label ?? opt}
          </option>
        ))}
      </select>
    </div>
  );
};

export default Select;
