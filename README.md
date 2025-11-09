# DBT Visual Builder

A visual node-based editor for building DBT (Data Build Tool) models using Rete.js and React.

## Features

- **Visual Node Editor**: Build DBT models using an intuitive drag-and-drop interface
- **Node Types**:
  - **Source Nodes**: Define data sources from your warehouse
  - **Model Nodes**: Create DBT models with customizable SQL and materializations
  - **Transform Nodes**: Add transformation logic between models
- **SQL Editing**: Write SQL directly in node controls
- **Materialization Options**: Choose between table, view, incremental, and ephemeral
- **Auto-Arrange**: Automatically organize nodes for better visualization
- **Export**: Generate DBT-compatible SQL and YAML files

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

### Build

```bash
npm run build
```

## Usage

1. **Add Nodes**: Click the toolbar buttons to add Source, Model, or Transform nodes
2. **Connect Nodes**: Drag from output sockets (right side) to input sockets (left side)
3. **Edit Properties**: Click on nodes to edit their properties inline
4. **Write SQL**: Use the text areas to write your SQL queries
5. **Export**: Click "Export DBT" to generate DBT project files

## Technology Stack

- **React** + **TypeScript**: UI framework
- **Vite**: Build tool and dev server
- **Rete.js**: Visual node editor framework
- **Tailwind CSS**: Styling

## DBT Integration

The visual builder generates standard DBT files:

- `models/sources.yml`: Source definitions
- `models/schema.yml`: Model schemas and tests
- `models/*.sql`: Model SQL files with config blocks

Export the project and copy the generated files into your DBT project directory.

## License

MIT
