import type { DBTNodeData, DBTMaterializationType } from '../types/dbt';
import { SourceNode, ModelNode, TransformNode, SnapshotNode, SeedNode, TestNode, MacroNode } from '../types/editor';
import { TextControl, SelectControl, ColumnControl, MonacoControl } from '../components/CustomControls';

export class NodeFactory {
  static createSourceNode(name: string, schema: string, table: string): SourceNode {
    const data: DBTNodeData = {
      id: `source_${Date.now()}`,
      name,
      type: 'source',
      schema,
      database: '',
      description: '',
    };

    const node = new SourceNode(data);

    // Add controls
    node.addControl(
      'schema',
      new TextControl(schema, (value) => {
        data.schema = value;
      }, 'Schema name', 'Schema')
    );

    node.addControl(
      'table',
      new TextControl(table, (value) => {
        data.name = value;
      }, 'Table name', 'Table')
    );

    node.addControl(
      'description',
      new TextControl('', (value) => {
        data.description = value;
      }, 'Description', 'Description')
    );

    return node;
  }

  static createModelNode(name: string, materialization: DBTMaterializationType = 'table'): ModelNode {
    const data: DBTNodeData = {
      id: `model_${Date.now()}`,
      name,
      type: 'model',
      materialization,
      sql: '-- Write your SQL here\nSELECT * FROM {{ ref("source_table") }}',
      description: '',
      tags: [],
    };

    const node = new ModelNode(data);

    // Add controls
    node.addControl(
      'name',
      new TextControl(name, (value) => {
        data.name = value;
        node.label = value;
      }, 'Model name', 'Model Name')
    );

    node.addControl(
      'materialization',
      new SelectControl(
        materialization,
        (value) => {
          data.materialization = value as DBTMaterializationType;
        },
        [
          { value: 'table', label: 'Table' },
          { value: 'view', label: 'View' },
          { value: 'incremental', label: 'Incremental' },
          { value: 'ephemeral', label: 'Ephemeral' },
        ],
        'Materialization'
      )
    );

    node.addControl(
      'sql',
      new MonacoControl(
        data.sql || '',
        (value) => {
          data.sql = value;
        },
        'sql',
        'SQL Query',
        250
      )
    );

    node.addControl(
      'description',
      new TextControl('', (value) => {
        data.description = value;
      }, 'Description', 'Description')
    );

    // Add column editor
    node.addControl(
      'columns',
      new ColumnControl(data.columns || [], (columns) => {
        data.columns = columns;
      })
    );

    return node;
  }

  static createTransformNode(name: string): TransformNode {
    const data: DBTNodeData = {
      id: `transform_${Date.now()}`,
      name,
      type: 'model',
      materialization: 'ephemeral',
      sql: '-- Write your transformation SQL here\nSELECT \n  *,\n  -- Add your transformations\nFROM {{ ref("upstream_model") }}',
      description: '',
    };

    const node = new TransformNode(data);

    // Add controls
    node.addControl(
      'name',
      new TextControl(name, (value) => {
        data.name = value;
        node.label = value;
      }, 'Transform name', 'Transform Name')
    );

    node.addControl(
      'sql',
      new MonacoControl(
        data.sql || '',
        (value) => {
          data.sql = value;
        },
        'sql',
        'SQL Transformation',
        280
      )
    );

    node.addControl(
      'description',
      new TextControl('', (value) => {
        data.description = value;
      }, 'Description', 'Description')
    );

    return node;
  }

  static createSnapshotNode(name: string): SnapshotNode {
    const data: DBTNodeData = {
      id: `snapshot_${Date.now()}`,
      name,
      type: 'snapshot',
      sql: '-- Snapshot SQL\nSELECT * FROM {{ ref("source_model") }}',
      description: '',
    };

    const node = new SnapshotNode(data);

    node.addControl(
      'name',
      new TextControl(name, (value) => {
        data.name = value;
        node.label = value;
      }, 'Snapshot name', 'Snapshot Name')
    );

    node.addControl(
      'strategy',
      new SelectControl(
        'timestamp',
        (value) => {
          // Store strategy in description for now
          data.description = `Strategy: ${value}`;
        },
        [
          { value: 'timestamp', label: 'Timestamp' },
          { value: 'check', label: 'Check' },
        ],
        'Strategy'
      )
    );

    node.addControl(
      'sql',
      new MonacoControl(
        data.sql || '',
        (value) => {
          data.sql = value;
        },
        'sql',
        'SQL Query',
        220
      )
    );

    return node;
  }

  static createSeedNode(name: string): SeedNode {
    const data: DBTNodeData = {
      id: `seed_${Date.now()}`,
      name,
      type: 'seed',
      description: '',
    };

    const node = new SeedNode(data);

    node.addControl(
      'name',
      new TextControl(name, (value) => {
        data.name = value;
        node.label = value;
      }, 'Seed name', 'Seed Name')
    );

    node.addControl(
      'description',
      new TextControl('', (value) => {
        data.description = value;
      }, 'CSV file description', 'Description')
    );

    return node;
  }

  static createTestNode(name: string): TestNode {
    const data: DBTNodeData = {
      id: `test_${Date.now()}`,
      name,
      type: 'test',
      sql: '-- Test SQL\nSELECT * FROM {{ ref("model") }}\nWHERE condition_that_should_fail',
      description: '',
    };

    const node = new TestNode(data);

    node.addControl(
      'name',
      new TextControl(name, (value) => {
        data.name = value;
        node.label = value;
      }, 'Test name', 'Test Name')
    );

    node.addControl(
      'sql',
      new MonacoControl(
        data.sql || '',
        (value) => {
          data.sql = value;
        },
        'sql',
        'Test SQL',
        220
      )
    );

    node.addControl(
      'description',
      new TextControl('', (value) => {
        data.description = value;
      }, 'Test description', 'Description')
    );

    return node;
  }

  static createMacroNode(name: string): MacroNode {
    const data: DBTNodeData = {
      id: `macro_${Date.now()}`,
      name,
      type: 'model', // We'll use model type for now
      sql: '-- Macro definition\n{% macro ' + name + '() %}\n  -- Your macro logic here\n{% endmacro %}',
      description: '',
    };

    const node = new MacroNode(data);

    node.addControl(
      'name',
      new TextControl(name, (value) => {
        data.name = value;
        node.label = value;
      }, 'Macro name', 'Macro Name')
    );

    node.addControl(
      'sql',
      new MonacoControl(
        data.sql || '',
        (value) => {
          data.sql = value;
        },
        'sql',
        'Macro Code',
        250
      )
    );

    node.addControl(
      'description',
      new TextControl('', (value) => {
        data.description = value;
      }, 'Macro description', 'Description')
    );

    return node;
  }
}
