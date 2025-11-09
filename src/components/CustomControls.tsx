import React from 'react';
import { ClassicPreset } from 'rete';
import { DBTMaterializationType } from '../types/dbt';

export class TextControl extends ClassicPreset.Control {
  constructor(
    public value: string,
    public onChange: (value: string) => void,
    public placeholder: string = '',
    public label: string = ''
  ) {
    super();
  }
}

export class TextAreaControl extends ClassicPreset.Control {
  constructor(
    public value: string,
    public onChange: (value: string) => void,
    public placeholder: string = 'Enter SQL...',
    public label: string = '',
    public rows: number = 6
  ) {
    super();
  }
}

export class SelectControl extends ClassicPreset.Control {
  constructor(
    public value: string,
    public onChange: (value: string) => void,
    public options: { value: string; label: string }[],
    public label: string = ''
  ) {
    super();
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
