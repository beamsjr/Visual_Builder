import { ClassicPreset } from 'rete';
import { DBTNodeData, DBTMaterializationType } from '../types/dbt';
import { SourceNode, ModelNode, TransformNode, Socket } from '../types/editor';
import { TextControl, TextAreaControl, SelectControl } from '../components/CustomControls';

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
      new TextAreaControl(
        data.sql || '',
        (value) => {
          data.sql = value;
        },
        'Enter SQL...',
        'SQL Query',
        8
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
      new TextAreaControl(
        data.sql || '',
        (value) => {
          data.sql = value;
        },
        'Enter transformation SQL...',
        'SQL Transformation',
        10
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
}
