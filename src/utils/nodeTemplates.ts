import type { DBTNodeData, DBTMaterializationType } from '../types/dbt';

export interface NodeTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'source' | 'model' | 'transform' | 'snapshot' | 'seed' | 'test' | 'macro';
  data: Partial<DBTNodeData>;
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  // Source Templates
  {
    id: 'raw_source',
    name: 'Raw Data Source',
    description: 'Raw data from external system',
    icon: '📦',
    category: 'source',
    data: {
      type: 'source',
      schema: 'raw',
      description: 'Raw data source from external system',
      group: 'raw',
    },
  },
  {
    id: 'api_source',
    name: 'API Data Source',
    description: 'Data from API integration',
    icon: '🔌',
    category: 'source',
    data: {
      type: 'source',
      schema: 'api',
      description: 'Data ingested from API',
      group: 'raw',
      tags: ['api', 'external'],
    },
  },

  // Model Templates
  {
    id: 'staging_model',
    name: 'Staging Model',
    description: 'Staging layer transformation',
    icon: '🔄',
    category: 'model',
    data: {
      type: 'model',
      materialization: 'view' as DBTMaterializationType,
      description: 'Staging model - light transformations and renaming',
      group: 'staging',
      tags: ['staging'],
      sql: '-- Staging model: Clean and standardize raw data\nSELECT\n    id,\n    created_at,\n    updated_at\nFROM {{ source(\'raw\', \'table_name\') }}',
    },
  },
  {
    id: 'intermediate_model',
    name: 'Intermediate Model',
    description: 'Intermediate transformation',
    icon: '⚙️',
    category: 'model',
    data: {
      type: 'model',
      materialization: 'ephemeral' as DBTMaterializationType,
      description: 'Intermediate model - business logic transformations',
      group: 'intermediate',
      tags: ['intermediate'],
      sql: '-- Intermediate model: Business logic\nSELECT\n    id,\n    -- Add transformations here\nFROM {{ ref(\'stg_model\') }}',
    },
  },
  {
    id: 'mart_model',
    name: 'Data Mart',
    description: 'Final analytics layer',
    icon: '📊',
    category: 'model',
    data: {
      type: 'model',
      materialization: 'table' as DBTMaterializationType,
      description: 'Data mart - final analytics-ready model',
      group: 'mart',
      tags: ['mart', 'analytics'],
      sql: '-- Mart model: Analytics-ready data\nSELECT\n    id,\n    -- Business metrics\nFROM {{ ref(\'int_model\') }}',
    },
  },
  {
    id: 'incremental_model',
    name: 'Incremental Model',
    description: 'Incremental load pattern',
    icon: '⚡',
    category: 'model',
    data: {
      type: 'model',
      materialization: 'incremental' as DBTMaterializationType,
      description: 'Incremental model - processes only new/changed records',
      group: 'mart',
      tags: ['incremental'],
      sql: `-- Incremental model: Only process new records
SELECT
    id,
    created_at,
    updated_at
FROM {{ source('raw', 'table_name') }}

{% if is_incremental() %}
    WHERE updated_at > (SELECT MAX(updated_at) FROM {{ this }})
{% endif %}`,
    },
  },

  // Transform Templates
  {
    id: 'aggregate_transform',
    name: 'Aggregate Transform',
    description: 'Aggregation pattern',
    icon: '📈',
    category: 'transform',
    data: {
      type: 'model',
      materialization: 'ephemeral' as DBTMaterializationType,
      description: 'Aggregate and summarize data',
      group: 'intermediate',
      tags: ['aggregation'],
      sql: '-- Aggregation transform\nSELECT\n    dimension_col,\n    COUNT(*) as row_count,\n    SUM(metric) as total_metric\nFROM {{ ref(\'upstream_model\') }}\nGROUP BY 1',
    },
  },
  {
    id: 'join_transform',
    name: 'Join Transform',
    description: 'Multi-table join pattern',
    icon: '🔗',
    category: 'transform',
    data: {
      type: 'model',
      materialization: 'ephemeral' as DBTMaterializationType,
      description: 'Join multiple upstream models',
      group: 'intermediate',
      tags: ['join'],
      sql: '-- Join transform\nSELECT\n    a.*,\n    b.additional_field\nFROM {{ ref(\'model_a\') }} a\nLEFT JOIN {{ ref(\'model_b\') }} b\n    ON a.id = b.id',
    },
  },

  // Snapshot Template
  {
    id: 'scd_snapshot',
    name: 'SCD Type 2 Snapshot',
    description: 'Slowly changing dimension',
    icon: '📸',
    category: 'snapshot',
    data: {
      type: 'snapshot',
      description: 'Type 2 slowly changing dimension snapshot',
      group: 'snapshots',
      tags: ['scd', 'snapshot'],
      sql: `-- SCD Type 2 Snapshot
{% snapshot snapshot_name %}

{{
    config(
      target_schema='snapshots',
      unique_key='id',
      strategy='timestamp',
      updated_at='updated_at',
    )
}}

SELECT * FROM {{ source('raw', 'table_name') }}

{% endsnapshot %}`,
    },
  },

  // Test Template
  {
    id: 'data_quality_test',
    name: 'Data Quality Test',
    description: 'Custom data quality test',
    icon: '✅',
    category: 'test',
    data: {
      type: 'test',
      description: 'Custom data quality test',
      group: 'tests',
      tags: ['quality', 'test'],
      sql: '-- Data quality test\nSELECT *\nFROM {{ ref(\'model_name\') }}\nWHERE invalid_condition = true',
    },
  },

  // Seed Template
  {
    id: 'lookup_seed',
    name: 'Lookup Table',
    description: 'Reference/lookup data',
    icon: '📋',
    category: 'seed',
    data: {
      type: 'seed',
      description: 'Lookup table for reference data',
      group: 'seeds',
      tags: ['reference', 'lookup'],
    },
  },

  // Macro Template
  {
    id: 'utility_macro',
    name: 'Utility Macro',
    description: 'Reusable SQL macro',
    icon: '🔧',
    category: 'macro',
    data: {
      type: 'model',
      materialization: 'ephemeral' as DBTMaterializationType,
      description: 'Reusable utility macro',
      group: 'macros',
      tags: ['macro', 'utility'],
      sql: '{% macro macro_name(arg1, arg2) %}\n    -- Macro logic here\n    {{ arg1 }} AS {{ arg2 }}\n{% endmacro %}',
    },
  },
];

export class NodeTemplateManager {
  /**
   * Get all templates
   */
  static getAllTemplates(): NodeTemplate[] {
    return NODE_TEMPLATES;
  }

  /**
   * Get templates by category
   */
  static getTemplatesByCategory(category: string): NodeTemplate[] {
    return NODE_TEMPLATES.filter(t => t.category === category);
  }

  /**
   * Get template by ID
   */
  static getTemplateById(id: string): NodeTemplate | undefined {
    return NODE_TEMPLATES.find(t => t.id === id);
  }

  /**
   * Get template categories
   */
  static getCategories(): string[] {
    return [...new Set(NODE_TEMPLATES.map(t => t.category))];
  }
}
