import JSZip from 'jszip';
import type { DBTNodeData } from '../types/dbt';
import { DBTGenerator } from './dbtGenerator';

export class DBTExporter {
  static async exportAsZip(nodes: DBTNodeData[]): Promise<void> {
    const zip = new JSZip();

    // Generate all files
    const files = DBTGenerator.generateProjectStructure(nodes);

    // Add files to zip
    Object.entries(files).forEach(([path, content]) => {
      zip.file(path, content);
    });

    // Add dbt_project.yml
    const projectYml = this.generateDbtProjectYml();
    zip.file('dbt_project.yml', projectYml);

    // Add profiles.yml example
    const profilesYml = this.generateProfilesExample();
    zip.file('profiles.yml.example', profilesYml);

    // Add README
    const readme = this.generateReadme(nodes);
    zip.file('README.md', readme);

    // Generate zip and download
    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dbt-project-${new Date().toISOString().split('T')[0]}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  static generateDbtProjectYml(): string {
    return `name: 'visual_builder_project'
version: '1.0.0'
config-version: 2

profile: 'default'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

clean-targets:
  - "target"
  - "dbt_packages"

models:
  visual_builder_project:
    staging:
      +materialized: view
    marts:
      +materialized: table
`;
  }

  static generateProfilesExample(): string {
    return `default:
  target: dev
  outputs:
    dev:
      type: postgres  # or snowflake, bigquery, redshift, etc.
      host: localhost
      user: your_username
      password: your_password
      port: 5432
      dbname: your_database
      schema: analytics
      threads: 4
      keepalives_idle: 0
`;
  }

  static generateReadme(nodes: DBTNodeData[]): string {
    const sourceCount = nodes.filter(n => n.type === 'source').length;
    const modelCount = nodes.filter(n => n.type === 'model').length;
    const snapshotCount = nodes.filter(n => n.type === 'snapshot').length;
    const seedCount = nodes.filter(n => n.type === 'seed').length;
    const testCount = nodes.filter(n => n.type === 'test').length;

    return `# DBT Project - Visual Builder Export

This DBT project was generated using the DBT Visual Builder.

## Project Overview

- **Sources**: ${sourceCount}
- **Models**: ${modelCount}
- **Snapshots**: ${snapshotCount}
- **Seeds**: ${seedCount}
- **Tests**: ${testCount}
- **Generated**: ${new Date().toISOString()}

## Setup

1. Install DBT: \`pip install dbt-core dbt-<your-adapter>\`
2. Configure your \`profiles.yml\` (see \`profiles.yml.example\`)
3. Install dependencies: \`dbt deps\`
4. Run models: \`dbt run\`
5. Run tests: \`dbt test\`

## Project Structure

\`\`\`
.
├── dbt_project.yml       # DBT project configuration
├── models/
│   ├── sources.yml       # Source definitions
│   ├── schema.yml        # Model schemas
│   └── *.sql            # Model SQL files
├── snapshots/           # Snapshot definitions
├── seeds/               # CSV seed files
├── tests/               # Custom tests
└── macros/              # Jinja macros
\`\`\`

## Next Steps

1. Review and customize the generated SQL
2. Add column descriptions and tests
3. Configure materialization strategies
4. Set up data quality tests
5. Document your models

## Resources

- [DBT Documentation](https://docs.getdbt.com/)
- [DBT Best Practices](https://docs.getdbt.com/guides/best-practices)
- [DBT Discourse](https://discourse.getdbt.com/)
`;
  }
}
