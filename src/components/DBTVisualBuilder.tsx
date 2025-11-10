import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NodeEditor, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, Presets } from 'rete-react-plugin';
import type { ReactArea2D } from 'rete-react-plugin';
import { AutoArrangePlugin, Presets as ArrangePresets } from 'rete-auto-arrange-plugin';
import {
  TextControlComponent,
  TextAreaControlComponent,
  SelectControlComponent,
  TextControl,
  TextAreaControl,
  SelectControl
} from './CustomControls';
import { NodeFactory } from '../nodes/NodeFactory';
import type { Schemes } from '../types/editor';
import { DBTGenerator } from '../utils/dbtGenerator';
import type { DBTNodeData } from '../types/dbt';

type AreaExtra = ReactArea2D<Schemes>;

export const DBTVisualBuilder: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<NodeEditor<Schemes> | null>(null);
  const areaInstanceRef = useRef<AreaPlugin<Schemes, AreaExtra> | null>(null);
  const arrangeInstanceRef = useRef<AutoArrangePlugin<Schemes> | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Search functionality - highlight matching nodes
  useEffect(() => {
    if (!editorInstanceRef.current || !areaInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const area = areaInstanceRef.current;

    nodes.forEach(node => {
      const nodeView = (area as any).nodeViews.get(node.id);
      if (!nodeView?.element) return;

      const label = node.label.toLowerCase();
      const data = (node as any).data;
      const matchesSearch = !searchTerm ||
        label.includes(searchTerm.toLowerCase()) ||
        (data.description && data.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (data.schema && data.schema.toLowerCase().includes(searchTerm.toLowerCase()));

      if (matchesSearch && searchTerm) {
        nodeView.element.style.opacity = '1';
        nodeView.element.style.transform = 'scale(1.05)';
        nodeView.element.style.boxShadow = '0 0 20px rgba(100, 108, 255, 0.6)';
      } else if (searchTerm) {
        nodeView.element.style.opacity = '0.3';
        nodeView.element.style.transform = 'scale(1)';
        nodeView.element.style.boxShadow = '';
      } else {
        nodeView.element.style.opacity = '1';
        nodeView.element.style.transform = 'scale(1)';
        nodeView.element.style.boxShadow = '';
      }
    });
  }, [searchTerm]);

  useEffect(() => {
    if (!editorRef.current) return;

    const initEditor = async () => {
      const editor = new NodeEditor<Schemes>();
      const area = new AreaPlugin<Schemes, AreaExtra>(editorRef.current!);
      const connection = new ConnectionPlugin<Schemes, AreaExtra>();
      const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot });

      // Setup connection plugin
      AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl(),
      });

      render.addPreset(
        Presets.classic.setup({
          customize: {
            control(data) {
              if (data.payload instanceof TextControl) {
                return TextControlComponent as any;
              }
              if (data.payload instanceof TextAreaControl) {
                return TextAreaControlComponent as any;
              }
              if (data.payload instanceof SelectControl) {
                return SelectControlComponent as any;
              }
              return null;
            },
          },
        })
      );

      connection.addPreset(ConnectionPresets.classic.setup());

      editor.use(area);
      area.use(connection);
      area.use(render);

      // Auto-arrange plugin
      const arrange = new AutoArrangePlugin<Schemes>();
      arrange.addPreset(ArrangePresets.classic.setup());
      area.use(arrange);

      // Enable zoom and translation
      AreaExtensions.simpleNodesOrder(area);
      AreaExtensions.showInputControl(area);

      // Store editor instance
      editorInstanceRef.current = editor;
      areaInstanceRef.current = area;
      arrangeInstanceRef.current = arrange;

      // Try to load saved state
      const loaded = loadFromLocalStorage(editor, area);

      // Add sample nodes if no saved state
      if (!loaded) {
        await addSampleNodes(editor, area, arrange);
      }

      // Setup keyboard shortcuts
      setupKeyboardShortcuts(editor, area);

      // Save state on changes
      editor.addPipe((context) => {
        if (context.type === 'nodecreated' || context.type === 'noderemoved' ||
            context.type === 'connectioncreated' || context.type === 'connectionremoved') {
          saveToLocalStorage(editor);
        }
        return context;
      });
    };

    initEditor();

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.clear();
      }
    };
  }, []);

  const addSampleNodes = async (
    editor: NodeEditor<Schemes>,
    area: AreaPlugin<Schemes, AreaExtra>,
    arrange: AutoArrangePlugin<Schemes>
  ) => {
    // Create sample source node
    const sourceNode = NodeFactory.createSourceNode('raw_customers', 'raw', 'customers');
    await editor.addNode(sourceNode);

    // Create sample model node
    const modelNode = NodeFactory.createModelNode('stg_customers', 'view');
    await editor.addNode(modelNode);

    // Create sample transform node
    const transformNode = NodeFactory.createTransformNode('customers_with_orders');
    await editor.addNode(transformNode);

    // Add connections
    const sourceOutput = sourceNode.outputs.value;
    const modelInput = modelNode.inputs.input;
    const modelOutput = modelNode.outputs.value;
    const transformInput = transformNode.inputs.input;

    if (sourceOutput && modelInput) {
      await editor.addConnection(
        new ClassicPreset.Connection(sourceNode as any, 'value' as never, modelNode as any, 'input' as never)
      );
    }

    if (modelOutput && transformInput) {
      await editor.addConnection(
        new ClassicPreset.Connection(modelNode as any, 'value' as never, transformNode as any, 'input' as never)
      );
    }

    // Auto-arrange nodes
    await arrange.layout();

    // Fit view to show all nodes
    AreaExtensions.zoomAt(area, editor.getNodes());
  };

  const addSourceNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createSourceNode('new_source', 'raw', 'table_name');
    await editorInstanceRef.current.addNode(node);
  };

  const addModelNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createModelNode('new_model', 'table');
    await editorInstanceRef.current.addNode(node);
  };

  const addTransformNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createTransformNode('new_transform');
    await editorInstanceRef.current.addNode(node);
  };

  const addSnapshotNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createSnapshotNode('new_snapshot');
    await editorInstanceRef.current.addNode(node);
  };

  const addSeedNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createSeedNode('new_seed');
    await editorInstanceRef.current.addNode(node);
  };

  const addTestNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createTestNode('new_test');
    await editorInstanceRef.current.addNode(node);
  };

  const addMacroNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createMacroNode('new_macro');
    await editorInstanceRef.current.addNode(node);
  };

  const saveToLocalStorage = (editor: NodeEditor<Schemes>) => {
    try {
      const nodes = editor.getNodes();
      const connections = editor.getConnections();

      const state = {
        nodes: nodes.map(node => ({
          id: node.id,
          label: node.label,
          data: (node as any).data,
          position: (node as any).position,
        })),
        connections: connections.map(conn => ({
          source: conn.source,
          target: conn.target,
          sourceOutput: conn.sourceOutput,
          targetInput: conn.targetInput,
        })),
      };

      localStorage.setItem('dbt-visual-builder-state', JSON.stringify(state));
      console.log('State saved to localStorage');
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  };

  const loadFromLocalStorage = (_editor: NodeEditor<Schemes>, _area: AreaPlugin<Schemes, AreaExtra>): boolean => {
    try {
      const saved = localStorage.getItem('dbt-visual-builder-state');
      if (!saved) return false;

      const state = JSON.parse(saved);

      // This is a simplified load - for production we'd need more robust deserialization
      console.log('Loaded state from localStorage:', state);
      return false; // For now, return false to use sample nodes
    } catch (error) {
      console.error('Failed to load state:', error);
      return false;
    }
  };

  const clearProject = () => {
    if (!editorInstanceRef.current) return;
    if (!confirm('Are you sure you want to clear all nodes?')) return;

    const nodes = editorInstanceRef.current.getNodes();
    nodes.forEach(node => {
      editorInstanceRef.current?.removeNode(node.id);
    });

    localStorage.removeItem('dbt-visual-builder-state');
  };

  const setupKeyboardShortcuts = (editor: NodeEditor<Schemes>, _area: AreaPlugin<Schemes, AreaExtra>) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete key - remove selected nodes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Simple deletion - would need selection tracking for better UX
        e.preventDefault();
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        saveToLocalStorage(editor);
        e.preventDefault();
      }

      // Ctrl/Cmd + A - Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Select all nodes logic would go here
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => window.removeEventListener('keydown', handleKeyDown);
  };

  const autoArrange = async () => {
    if (!arrangeInstanceRef.current || !areaInstanceRef.current || !editorInstanceRef.current) return;

    await arrangeInstanceRef.current.layout();
    AreaExtensions.zoomAt(areaInstanceRef.current, editorInstanceRef.current.getNodes());
  };

  const exportDBT = () => {
    if (!editorInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const nodeData: DBTNodeData[] = nodes.map(node => (node as any).data);

    // Generate DBT project structure
    const files = DBTGenerator.generateProjectStructure(nodeData);

    // Create a combined export with all files
    const exportData = {
      timestamp: new Date().toISOString(),
      nodeCount: nodes.length,
      files,
      metadata: {
        sourceNodes: nodeData.filter(n => n.type === 'source').length,
        modelNodes: nodeData.filter(n => n.type === 'model').length,
      }
    };

    console.log('DBT Export:', exportData);

    // Download as JSON with file structure
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dbt-project-export.json';
    a.click();
    URL.revokeObjectURL(url);

    // Also log individual files for easy viewing
    console.log('\n=== Generated DBT Files ===\n');
    Object.entries(files).forEach(([path, content]) => {
      console.log(`\n--- ${path} ---\n${content}\n`);
    });
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 p-3 shadow-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-white">DBT Visual Builder</h1>

          {/* Add Node Buttons */}
          <div className="flex gap-2 border-l border-gray-600 pl-3 flex-wrap">
            <button
              onClick={addSourceNode}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
              title="Add Source Node"
            >
              + Source
            </button>
            <button
              onClick={addModelNode}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
              title="Add Model Node"
            >
              + Model
            </button>
            <button
              onClick={addTransformNode}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
              title="Add Transform Node"
            >
              + Transform
            </button>
            <button
              onClick={addSnapshotNode}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium transition-colors"
              title="Add Snapshot Node"
            >
              + Snapshot
            </button>
            <button
              onClick={addSeedNode}
              className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-sm font-medium transition-colors"
              title="Add Seed Node"
            >
              + Seed
            </button>
            <button
              onClick={addTestNode}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
              title="Add Test Node"
            >
              + Test
            </button>
            <button
              onClick={addMacroNode}
              className="px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white rounded text-sm font-medium transition-colors"
              title="Add Macro Node"
            >
              + Macro
            </button>
          </div>

          {/* Layout Controls */}
          <div className="flex gap-2 border-l border-gray-600 pl-3">
            <button
              onClick={autoArrange}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors"
              title="Auto Arrange (Ctrl+L)"
            >
              🔄 Arrange
            </button>
          </div>

          {/* Search */}
          <div className="flex gap-2 border-l border-gray-600 pl-3">
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm placeholder-gray-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* File Operations */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => saveToLocalStorage(editorInstanceRef.current!)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium transition-colors"
              title="Save Project (Ctrl+S)"
            >
              💾 Save
            </button>
            <button
              onClick={clearProject}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors"
              title="Clear Project"
            >
              🗑️ Clear
            </button>
            <button
              onClick={exportDBT}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
              title="Export DBT Project"
            >
              📦 Export DBT
            </button>
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-2 text-xs text-gray-400 flex gap-4">
          <span>⌨️ Shortcuts:</span>
          <span>Del - Delete selected</span>
          <span>Ctrl+S - Save</span>
          <span>Esc - Deselect all</span>
        </div>
      </div>

      {/* Editor Canvas */}
      <div ref={editorRef} className="rete w-full h-full pt-28" />
    </div>
  );
};
