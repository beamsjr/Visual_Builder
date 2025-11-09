import type { DBTNodeData } from '../types/dbt';

export class DBTGenerator {
  static generateModelSQL(node: DBTNodeData): string {
    const config = this.generateConfig(node);
    const sql = node.sql || 'SELECT 1';

    return `${config}\n\n${sql}`;
  }

  static generateConfig(node: DBTNodeData): string {
    if (node.type === 'source') {
      return '';
    }

    const configParts: string[] = [];

    if (node.materialization) {
      configParts.push(`materialized='${node.materialization}'`);
    }

    if (node.schema) {
      configParts.push(`schema='${node.schema}'`);
    }

    if (node.tags && node.tags.length > 0) {
      configParts.push(`tags=${JSON.stringify(node.tags)}`);
    }

    if (configParts.length === 0) {
      return '';
    }

    return `{{
  config(
    ${configParts.join(',\n    ')}
  )
}}`;
  }

  static generateSourceYAML(nodes: DBTNodeData[]): string {
    const sourceNodes = nodes.filter(n => n.type === 'source');

    if (sourceNodes.length === 0) {
      return '';
    }

    // Group sources by schema
    const sourcesBySchema = sourceNodes.reduce((acc, node) => {
      const schema = node.schema || 'unknown';
      if (!acc[schema]) {
        acc[schema] = [];
      }
      acc[schema].push(node);
      return acc;
    }, {} as Record<string, DBTNodeData[]>);

    let yaml = 'version: 2\n\nsources:\n';

    Object.entries(sourcesBySchema).forEach(([schema, nodes]) => {
      yaml += `  - name: ${schema}\n`;
      if (nodes[0].database) {
        yaml += `    database: ${nodes[0].database}\n`;
      }
      yaml += `    schema: ${schema}\n`;
      yaml += `    tables:\n`;

      nodes.forEach(node => {
        yaml += `      - name: ${node.name}\n`;
        if (node.description) {
          yaml += `        description: "${node.description}"\n`;
        }
        if (node.columns && node.columns.length > 0) {
          yaml += `        columns:\n`;
          node.columns.forEach(col => {
            yaml += `          - name: ${col.name}\n`;
            if (col.description) {
              yaml += `            description: "${col.description}"\n`;
            }
            if (col.type) {
              yaml += `            data_type: ${col.type}\n`;
            }
          });
        }
      });
    });

    return yaml;
  }

  static generateModelYAML(nodes: DBTNodeData[]): string {
    const modelNodes = nodes.filter(n => n.type === 'model' || n.type === 'snapshot' || n.type === 'seed');

    if (modelNodes.length === 0) {
      return '';
    }

    let yaml = 'version: 2\n\nmodels:\n';

    modelNodes.forEach(node => {
      yaml += `  - name: ${node.name}\n`;
      if (node.description) {
        yaml += `    description: "${node.description}"\n`;
      }
      if (node.columns && node.columns.length > 0) {
        yaml += `    columns:\n`;
        node.columns.forEach(col => {
          yaml += `      - name: ${col.name}\n`;
          if (col.description) {
            yaml += `        description: "${col.description}"\n`;
          }
          if (col.type) {
            yaml += `        data_type: ${col.type}\n`;
          }
          if (col.tests && col.tests.length > 0) {
            yaml += `        tests:\n`;
            col.tests.forEach(test => {
              yaml += `          - ${test}\n`;
            });
          }
        });
      }
    });

    return yaml;
  }

  static generateProjectStructure(nodes: DBTNodeData[]): Record<string, string> {
    const files: Record<string, string> = {};

    // Generate source YAML
    const sourceYAML = this.generateSourceYAML(nodes);
    if (sourceYAML) {
      files['models/sources.yml'] = sourceYAML;
    }

    // Generate model YAML
    const modelYAML = this.generateModelYAML(nodes);
    if (modelYAML) {
      files['models/schema.yml'] = modelYAML;
    }

    // Generate SQL files for models
    nodes.forEach(node => {
      if (node.type === 'model' && node.sql) {
        const sql = this.generateModelSQL(node);
        files[`models/${node.name}.sql`] = sql;
      }
    });

    return files;
  }
}
