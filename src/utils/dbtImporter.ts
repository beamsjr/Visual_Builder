import yaml from 'js-yaml';
import type { DBTNodeData, DBTColumn } from '../types/dbt';

export interface ImportedNode {
  name: string;
  type: 'source' | 'model' | 'snapshot' | 'seed' | 'test';
  data: Partial<DBTNodeData>;
  sql?: string;
}

export class DBTImporter {
  /**
   * Parse a sources.yml file and extract source definitions
   */
  static parseSourcesYAML(yamlContent: string): ImportedNode[] {
    try {
      const parsed: any = yaml.load(yamlContent);
      const nodes: ImportedNode[] = [];

      if (parsed.sources && Array.isArray(parsed.sources)) {
        parsed.sources.forEach((source: any) => {
          const schema = source.name || '';
          const database = source.database || '';

          if (source.tables && Array.isArray(source.tables)) {
            source.tables.forEach((table: any) => {
              const columns: DBTColumn[] = [];

              if (table.columns && Array.isArray(table.columns)) {
                table.columns.forEach((col: any) => {
                  columns.push({
                    name: col.name || '',
                    type: col.data_type || 'string',
                    description: col.description || '',
                    tests: col.tests || [],
                  });
                });
              }

              nodes.push({
                name: table.name || 'unnamed_source',
                type: 'source',
                data: {
                  schema,
                  database,
                  description: table.description || '',
                  columns,
                },
              });
            });
          }
        });
      }

      return nodes;
    } catch (error) {
      console.error('Error parsing sources YAML:', error);
      return [];
    }
  }

  /**
   * Parse a schema.yml file and extract model definitions
   */
  static parseSchemaYAML(yamlContent: string): ImportedNode[] {
    try {
      const parsed: any = yaml.load(yamlContent);
      const nodes: ImportedNode[] = [];

      if (parsed.models && Array.isArray(parsed.models)) {
        parsed.models.forEach((model: any) => {
          const columns: DBTColumn[] = [];

          if (model.columns && Array.isArray(model.columns)) {
            model.columns.forEach((col: any) => {
              columns.push({
                name: col.name || '',
                type: col.data_type || 'string',
                description: col.description || '',
                tests: col.tests || [],
              });
            });
          }

          nodes.push({
            name: model.name || 'unnamed_model',
            type: 'model',
            data: {
              materialization: model.config?.materialized || 'table',
              description: model.description || '',
              tags: model.tags || [],
              columns,
            },
          });
        });
      }

      if (parsed.snapshots && Array.isArray(parsed.snapshots)) {
        parsed.snapshots.forEach((snapshot: any) => {
          nodes.push({
            name: snapshot.name || 'unnamed_snapshot',
            type: 'snapshot',
            data: {
              description: snapshot.description || '',
              tags: snapshot.tags || [],
            },
          });
        });
      }

      if (parsed.seeds && Array.isArray(parsed.seeds)) {
        parsed.seeds.forEach((seed: any) => {
          nodes.push({
            name: seed.name || 'unnamed_seed',
            type: 'seed',
            data: {
              description: seed.description || '',
              tags: seed.tags || [],
            },
          });
        });
      }

      return nodes;
    } catch (error) {
      console.error('Error parsing schema YAML:', error);
      return [];
    }
  }

  /**
   * Parse SQL file content and extract basic model info
   */
  static parseSQL(sqlContent: string, filename: string): ImportedNode {
    // Extract model name from filename (remove .sql extension)
    const name = filename.replace(/\.sql$/, '');

    // Try to extract config from SQL (basic pattern matching)
    let materialization: any = 'table';
    const configMatch = sqlContent.match(/config\s*\(\s*materialized\s*=\s*['"](\w+)['"]/i);
    if (configMatch) {
      materialization = configMatch[1];
    }

    // Try to extract tags
    const tags: string[] = [];
    const tagsMatch = sqlContent.match(/config\s*\(\s*tags\s*=\s*\[([^\]]+)\]/i);
    if (tagsMatch) {
      const tagStr = tagsMatch[1];
      tagStr.split(',').forEach(tag => {
        const cleaned = tag.trim().replace(/['"]/g, '');
        if (cleaned) tags.push(cleaned);
      });
    }

    return {
      name,
      type: 'model',
      data: {
        materialization,
        tags,
      },
      sql: sqlContent,
    };
  }

  /**
   * Import multiple files at once
   */
  static async importFiles(files: FileList): Promise<ImportedNode[]> {
    const allNodes: ImportedNode[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const content = await file.text();
      const filename = file.name.toLowerCase();

      if (filename.endsWith('.yml') || filename.endsWith('.yaml')) {
        // Determine if it's a sources file or schema file based on content
        if (content.includes('sources:')) {
          allNodes.push(...this.parseSourcesYAML(content));
        } else if (content.includes('models:') || content.includes('snapshots:') || content.includes('seeds:')) {
          allNodes.push(...this.parseSchemaYAML(content));
        }
      } else if (filename.endsWith('.sql')) {
        allNodes.push(this.parseSQL(content, file.name));
      }
    }

    return allNodes;
  }
}
