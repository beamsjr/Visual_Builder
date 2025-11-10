import React, { useState } from 'react';
import type { DBTColumn } from '../types/dbt';
import { ClassicPreset } from 'rete';

export class ColumnControl extends ClassicPreset.Control {
  columns: DBTColumn[];
  onChange: (columns: DBTColumn[]) => void;

  constructor(columns: DBTColumn[], onChange: (columns: DBTColumn[]) => void) {
    super();
    this.columns = columns;
    this.onChange = onChange;
  }
}

interface ColumnEditorProps {
  data: ColumnControl;
}

export const ColumnEditorComponent: React.FC<ColumnEditorProps> = ({ data }) => {
  const [columns, setColumns] = useState<DBTColumn[]>(data.columns);
  const [showEditor, setShowEditor] = useState(false);

  const addColumn = () => {
    const newColumn: DBTColumn = {
      name: 'new_column',
      type: 'string',
      description: '',
      tests: [],
    };
    const updated = [...columns, newColumn];
    setColumns(updated);
    data.onChange(updated);
  };

  const updateColumn = (index: number, field: keyof DBTColumn, value: any) => {
    const updated = [...columns];
    (updated[index] as any)[field] = value;
    setColumns(updated);
    data.onChange(updated);
  };

  const removeColumn = (index: number) => {
    const updated = columns.filter((_, i) => i !== index);
    setColumns(updated);
    data.onChange(updated);
  };

  const toggleTest = (columnIndex: number, test: string) => {
    const updated = [...columns];
    const tests = updated[columnIndex].tests || [];
    const testIndex = tests.indexOf(test);

    if (testIndex > -1) {
      tests.splice(testIndex, 1);
    } else {
      tests.push(test);
    }

    updated[columnIndex].tests = tests;
    setColumns(updated);
    data.onChange(updated);
  };

  return (
    <div className="column-editor">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-300">
          Columns ({columns.length})
        </label>
        <button
          onClick={() => setShowEditor(!showEditor)}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          {showEditor ? '▼ Hide' : '► Show'}
        </button>
      </div>

      {showEditor && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {columns.map((column, index) => (
            <div key={index} className="bg-gray-800 p-2 rounded border border-gray-700">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={column.name}
                  onChange={(e) => updateColumn(index, 'name', e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                  placeholder="Column name"
                />
                <select
                  value={column.type || 'string'}
                  onChange={(e) => updateColumn(index, 'type', e.target.value)}
                  className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                >
                  <option value="string">String</option>
                  <option value="integer">Integer</option>
                  <option value="float">Float</option>
                  <option value="boolean">Boolean</option>
                  <option value="timestamp">Timestamp</option>
                  <option value="date">Date</option>
                </select>
                <button
                  onClick={() => removeColumn(index)}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs"
                  title="Remove column"
                >
                  ×
                </button>
              </div>

              <input
                type="text"
                value={column.description || ''}
                onChange={(e) => updateColumn(index, 'description', e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-white text-xs mb-2"
                placeholder="Description (optional)"
              />

              <div className="flex gap-2 flex-wrap">
                {['unique', 'not_null', 'accepted_values'].map((test) => (
                  <label key={test} className="flex items-center gap-1 text-xs text-gray-400">
                    <input
                      type="checkbox"
                      checked={(column.tests || []).includes(test)}
                      onChange={() => toggleTest(index, test)}
                      className="rounded"
                    />
                    {test}
                  </label>
                ))}
              </div>
            </div>
          ))}

          <button
            onClick={addColumn}
            className="w-full px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium"
          >
            + Add Column
          </button>
        </div>
      )}
    </div>
  );
};
