import React, { useEffect, useRef } from 'react';
import { NodeEditor, GetSchemes, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, Presets, ReactArea2D } from 'rete-react-plugin';
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
import { Schemes, SourceNode, ModelNode, TransformNode } from '../types/editor';
import { DBTGenerator } from '../utils/dbtGenerator';
import { DBTNodeData } from '../types/dbt';

type AreaExtra = ReactArea2D<Schemes>;

export const DBTVisualBuilder: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<NodeEditor<Schemes> | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const initEditor = async () => {
      const editor = new NodeEditor<Schemes>();
      const area = new AreaPlugin<Schemes, AreaExtra>(editorRef.current!);
      const connection = new ConnectionPlugin<Schemes, AreaExtra>();
      const render = new ReactPlugin<Schemes, AreaExtra>({ createRoot: (el) => el });

      // Setup connection plugin
      AreaExtensions.selectableNodes(area, AreaExtensions.selector(), {
        accumulating: AreaExtensions.accumulateOnCtrl(),
      });

      render.addPreset(
        Presets.classic.setup({
          customize: {
            control(data) {
              if (data.payload instanceof TextControl) {
                return TextControlComponent;
              }
              if (data.payload instanceof TextAreaControl) {
                return TextAreaControlComponent;
              }
              if (data.payload instanceof SelectControl) {
                return SelectControlComponent;
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

      // Add sample nodes to demonstrate
      await addSampleNodes(editor, area, arrange);
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
        new ClassicPreset.Connection(sourceNode, 'value' as never, modelNode, 'input' as never)
      );
    }

    if (modelOutput && transformInput) {
      await editor.addConnection(
        new ClassicPreset.Connection(modelNode, 'value' as never, transformNode, 'input' as never)
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
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 p-4 shadow-lg">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white">DBT Visual Builder</h1>
          <div className="flex gap-2">
            <button
              onClick={addSourceNode}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              + Source
            </button>
            <button
              onClick={addModelNode}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              + Model
            </button>
            <button
              onClick={addTransformNode}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              + Transform
            </button>
          </div>
          <div className="ml-auto">
            <button
              onClick={exportDBT}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              Export DBT
            </button>
          </div>
        </div>
      </div>

      {/* Editor Canvas */}
      <div ref={editorRef} className="rete w-full h-full pt-20" />
    </div>
  );
};
