export type DBTNodeType = 'source' | 'model' | 'snapshot' | 'seed' | 'test';

export type DBTMaterializationType = 'table' | 'view' | 'incremental' | 'ephemeral';

export interface DBTNodeData {
  id: string;
  name: string;
  type: DBTNodeType;
  sql?: string;
  materialization?: DBTMaterializationType;
  database?: string;
  schema?: string;
  description?: string;
  columns?: DBTColumn[];
  tags?: string[];
  group?: string;
}

export interface DBTColumn {
  name: string;
  description?: string;
  type?: string;
  tests?: string[];
}

export interface DBTSourceConfig {
  database?: string;
  schema: string;
  tables: DBTSourceTable[];
}

export interface DBTSourceTable {
  name: string;
  description?: string;
  columns?: DBTColumn[];
}

export interface DBTModelConfig {
  materialized: DBTMaterializationType;
  schema?: string;
  tags?: string[];
  enabled?: boolean;
}
