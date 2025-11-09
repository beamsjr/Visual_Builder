import React from 'react';
import { ClassicPreset } from 'rete';

export class TextControl extends ClassicPreset.Control {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;

  constructor(
    value: string,
    onChange: (value: string) => void,
    placeholder: string = '',
    label: string = ''
  ) {
    super();
    this.value = value;
    this.onChange = onChange;
    this.placeholder = placeholder;
    this.label = label;
  }
}

export class TextAreaControl extends ClassicPreset.Control {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  rows: number;

  constructor(
    value: string,
    onChange: (value: string) => void,
    placeholder: string = 'Enter SQL...',
    label: string = '',
    rows: number = 6
  ) {
    super();
    this.value = value;
    this.onChange = onChange;
    this.placeholder = placeholder;
    this.label = label;
    this.rows = rows;
  }
}

export class SelectControl extends ClassicPreset.Control {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;

  constructor(
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[],
    label: string = ''
  ) {
    super();
    this.value = value;
    this.onChange = onChange;
    this.options = options;
    this.label = label;
  }
}

// React components for rendering controls
export const TextControlComponent: React.FC<{ data: TextControl }> = ({ data }) => {
  return (
    <div className="control-wrapper">
      {data.label && <label className="control-label">{data.label}</label>}
      <input
        type="text"
        value={data.value}
        onChange={(e) => data.onChange(e.target.value)}
        placeholder={data.placeholder}
        className="control-input"
      />
    </div>
  );
};

export const TextAreaControlComponent: React.FC<{ data: TextAreaControl }> = ({ data }) => {
  return (
    <div className="control-wrapper">
      {data.label && <label className="control-label">{data.label}</label>}
      <textarea
        value={data.value}
        onChange={(e) => data.onChange(e.target.value)}
        placeholder={data.placeholder}
        rows={data.rows}
        className="control-textarea"
      />
    </div>
  );
};

export const SelectControlComponent: React.FC<{ data: SelectControl }> = ({ data }) => {
  return (
    <div className="control-wrapper">
      {data.label && <label className="control-label">{data.label}</label>}
      <select
        value={data.value}
        onChange={(e) => data.onChange(e.target.value)}
        className="control-select"
      >
        {data.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
