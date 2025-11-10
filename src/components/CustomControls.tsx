import React, { useState } from 'react';
import { ClassicPreset } from 'rete';
import Editor from '@monaco-editor/react';

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

export class MonacoControl extends ClassicPreset.Control {
  value: string;
  onChange: (value: string) => void;
  language: string;
  label: string;
  height: number;

  constructor(
    value: string,
    onChange: (value: string) => void,
    language: string = 'sql',
    label: string = '',
    height: number = 200
  ) {
    super();
    this.value = value;
    this.onChange = onChange;
    this.language = language;
    this.label = label;
    this.height = height;
  }
}

export const MonacoControlComponent: React.FC<{ data: MonacoControl }> = ({ data }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localValue, setLocalValue] = useState(data.value);

  const handleChange = (value: string | undefined) => {
    const newValue = value || '';
    setLocalValue(newValue);
    data.onChange(newValue);
  };

  return (
    <div className="control-wrapper">
      {data.label && (
        <div className="flex items-center justify-between mb-1">
          <label className="control-label">{data.label}</label>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-blue-400 hover:text-blue-300"
            type="button"
          >
            {isExpanded ? '▼ Collapse' : '► Expand'}
          </button>
        </div>
      )}
      {isExpanded && (
        <div className="monaco-editor-wrapper" style={{ height: data.height }}>
          <Editor
            height={data.height}
            defaultLanguage={data.language}
            value={localValue}
            onChange={handleChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              formatOnPaste: true,
              formatOnType: true,
            }}
          />
        </div>
      )}
      {!isExpanded && (
        <div className="text-xs text-gray-400 italic p-2 bg-gray-800 rounded border border-gray-700">
          Click "Expand" to edit SQL (syntax highlighting enabled)
        </div>
      )}
    </div>
  );
};

// Export ColumnControl from ColumnEditor
export { ColumnControl, ColumnEditorComponent } from './ColumnEditor';
