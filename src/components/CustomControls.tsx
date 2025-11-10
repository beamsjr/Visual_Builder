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

// Tag Control
export class TagControl extends ClassicPreset.Control {
  tags: string[];
  onChange: (tags: string[]) => void;
  label: string;

  constructor(
    tags: string[] = [],
    onChange: (tags: string[]) => void,
    label: string = 'Tags'
  ) {
    super();
    this.tags = tags;
    this.onChange = onChange;
    this.label = label;
  }
}

export const TagControlComponent: React.FC<{ data: TagControl }> = ({ data }) => {
  const [newTag, setNewTag] = useState('');
  const [localTags, setLocalTags] = useState(data.tags);

  const addTag = () => {
    if (newTag.trim() && !localTags.includes(newTag.trim())) {
      const updatedTags = [...localTags, newTag.trim()];
      setLocalTags(updatedTags);
      data.onChange(updatedTags);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const updatedTags = localTags.filter(tag => tag !== tagToRemove);
    setLocalTags(updatedTags);
    data.onChange(updatedTags);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="control-wrapper">
      {data.label && <label className="control-label">{data.label}</label>}
      <div className="flex flex-wrap gap-1 mb-2">
        {localTags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded"
          >
            {tag}
            <button
              onClick={() => removeTag(tag)}
              className="hover:text-red-300 font-bold"
              type="button"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-1">
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add tag..."
          className="control-input flex-1"
        />
        <button
          onClick={addTag}
          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
          type="button"
        >
          +
        </button>
      </div>
    </div>
  );
};

// Export ColumnControl from ColumnEditor
export { ColumnControl, ColumnEditorComponent } from './ColumnEditor';
