import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { NodeEditor, ClassicPreset } from 'rete';
import { AreaPlugin, AreaExtensions } from 'rete-area-plugin';
import { ConnectionPlugin, Presets as ConnectionPresets } from 'rete-connection-plugin';
import { ReactPlugin, Presets } from 'rete-react-plugin';
import type { ReactArea2D } from 'rete-react-plugin';
import { AutoArrangePlugin, Presets as ArrangePresets } from 'rete-auto-arrange-plugin';
import { MinimapPlugin } from 'rete-minimap-plugin';
import type { MinimapExtra } from 'rete-minimap-plugin';
import {
  TextControlComponent,
  TextAreaControlComponent,
  SelectControlComponent,
  ColumnEditorComponent,
  MonacoControlComponent,
  TagControlComponent,
  GroupControlComponent,
  TextControl,
  TextAreaControl,
  SelectControl,
  ColumnControl,
  MonacoControl,
  TagControl,
  GroupControl
} from './CustomControls';
import { ContextMenu } from './ContextMenu';
import { NodeFactory } from '../nodes/NodeFactory';
import type { Schemes } from '../types/editor';
import { DBTGenerator } from '../utils/dbtGenerator';
import { DBTExporter } from '../utils/dbtExporter';
import { DBTImporter } from '../utils/dbtImporter';
import { HistoryManager } from '../utils/historyManager';
import type { DBTNodeData } from '../types/dbt';

type AreaExtra = ReactArea2D<Schemes> | MinimapExtra;

export const DBTVisualBuilder: React.FC = () => {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorInstanceRef = useRef<NodeEditor<Schemes> | null>(null);
  const areaInstanceRef = useRef<AreaPlugin<Schemes, AreaExtra> | null>(null);
  const arrangeInstanceRef = useRef<AutoArrangePlugin<Schemes> | null>(null);
  const historyManagerRef = useRef<HistoryManager>(new HistoryManager());
  const isRestoringRef = useRef(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [copiedNode, setCopiedNode] = useState<any>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showDependencies, setShowDependencies] = useState(true);

  // Search, tag, and group filtering functionality - highlight matching nodes
  useEffect(() => {
    if (!editorInstanceRef.current || !areaInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const area = areaInstanceRef.current;

    nodes.forEach(node => {
      const nodeView = (area as any).nodeViews.get(node.id);
      if (!nodeView?.element) return;

      const label = node.label.toLowerCase();
      const data = (node as any).data;

      // Search term matching
      const matchesSearch = !searchTerm ||
        label.includes(searchTerm.toLowerCase()) ||
        (data.description && data.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (data.schema && data.schema.toLowerCase().includes(searchTerm.toLowerCase()));

      // Tag filtering
      const matchesTag = !selectedTag || (data.tags && data.tags.includes(selectedTag));

      // Group filtering
      const matchesGroup = !selectedGroup || (data.group === selectedGroup);

      const matches = matchesSearch && matchesTag && matchesGroup;
      const hasFilter = searchTerm || selectedTag || selectedGroup;

      if (matches && hasFilter) {
        nodeView.element.style.opacity = '1';
        nodeView.element.style.transform = 'scale(1.05)';
        nodeView.element.style.boxShadow = '0 0 20px rgba(100, 108, 255, 0.6)';
      } else if (hasFilter) {
        nodeView.element.style.opacity = '0.3';
        nodeView.element.style.transform = 'scale(1)';
        nodeView.element.style.boxShadow = '';
      } else {
        nodeView.element.style.opacity = '1';
        nodeView.element.style.transform = 'scale(1)';
        nodeView.element.style.boxShadow = '';
      }
    });
  }, [searchTerm, selectedTag, selectedGroup]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showExportMenu && !(e.target as HTMLElement).closest('.relative')) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showExportMenu]);

  // Visual grouping - apply background colors based on group
  useEffect(() => {
    if (!editorInstanceRef.current || !areaInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const area = areaInstanceRef.current;

    // Function to generate consistent color from string
    const stringToColor = (str: string): string => {
      if (!str) return '';
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      const hue = hash % 360;
      return `hsla(${hue}, 45%, 25%, 0.3)`;
    };

    nodes.forEach(node => {
      const nodeView = (area as any).nodeViews.get(node.id);
      if (!nodeView?.element) return;

      const data = (node as any).data;
      if (data.group && data.group.trim()) {
        const bgColor = stringToColor(data.group);
        nodeView.element.style.backgroundColor = bgColor;
      } else {
        // Reset to default if no group
        nodeView.element.style.backgroundColor = '';
      }
    });
  }, [editorInstanceRef.current?.getNodes().length]); // Re-run when nodes change

  // Dependency visualization - highlight upstream/downstream nodes
  useEffect(() => {
    if (!editorInstanceRef.current || !areaInstanceRef.current || !showDependencies) return;

    const editor = editorInstanceRef.current;
    const area = areaInstanceRef.current;
    const nodes = editor.getNodes();
    const connections = editor.getConnections();

    // Clear all highlights first
    nodes.forEach(node => {
      const nodeView = (area as any).nodeViews.get(node.id);
      if (!nodeView?.element) return;

      nodeView.element.classList.remove('node-selected', 'node-upstream', 'node-downstream');
    });

    // Clear connection highlights
    connections.forEach(conn => {
      const connView = (area as any).connectionViews.get(conn.id);
      if (!connView?.element) return;

      connView.element.classList.remove('connection-highlighted-upstream', 'connection-highlighted-downstream');
    });

    if (!selectedNodeId) return;

    // Find upstream and downstream nodes
    const upstream = new Set<string>();
    const downstream = new Set<string>();

    const findUpstream = (nodeId: string) => {
      connections.forEach(conn => {
        if (conn.target === nodeId && !upstream.has(conn.source)) {
          upstream.add(conn.source);
          findUpstream(conn.source);
        }
      });
    };

    const findDownstream = (nodeId: string) => {
      connections.forEach(conn => {
        if (conn.source === nodeId && !downstream.has(conn.target)) {
          downstream.add(conn.target);
          findDownstream(conn.target);
        }
      });
    };

    findUpstream(selectedNodeId);
    findDownstream(selectedNodeId);

    // Apply visual highlights
    nodes.forEach(node => {
      const nodeView = (area as any).nodeViews.get(node.id);
      if (!nodeView?.element) return;

      if (node.id === selectedNodeId) {
        nodeView.element.classList.add('node-selected');
      } else if (upstream.has(node.id)) {
        nodeView.element.classList.add('node-upstream');
      } else if (downstream.has(node.id)) {
        nodeView.element.classList.add('node-downstream');
      }
    });

    // Highlight connections
    connections.forEach(conn => {
      const connView = (area as any).connectionViews.get(conn.id);
      if (!connView?.element) return;

      if (conn.target === selectedNodeId || (upstream.has(conn.target) && upstream.has(conn.source))) {
        connView.element.classList.add('connection-highlighted-upstream');
      } else if (conn.source === selectedNodeId || (downstream.has(conn.source) && downstream.has(conn.target))) {
        connView.element.classList.add('connection-highlighted-downstream');
      }
    });
  }, [selectedNodeId, showDependencies]);

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
              if (data.payload instanceof ColumnControl) {
                return ColumnEditorComponent as any;
              }
              if (data.payload instanceof MonacoControl) {
                return MonacoControlComponent as any;
              }
              if (data.payload instanceof TagControl) {
                return TagControlComponent as any;
              }
              if (data.payload instanceof GroupControl) {
                return GroupControlComponent as any;
              }
              return null;
            },
          },
        })
      );

      // Add minimap render preset
      render.addPreset(Presets.minimap.setup({ size: 200 }));

      connection.addPreset(ConnectionPresets.classic.setup());

      editor.use(area);
      area.use(connection);
      area.use(render);

      // Minimap plugin - factory function pattern
      const minimap = new MinimapPlugin<Schemes>();
      area.use(minimap);

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

      // Capture initial state for undo/redo
      setTimeout(() => {
        captureState();
      }, 100);

      // Setup keyboard shortcuts
      setupKeyboardShortcuts(editor, area);

      // Setup node click for dependency visualization
      setupNodeClickHandler(area);

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
    captureState();
  };

  const addModelNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createModelNode('new_model', 'table');
    await editorInstanceRef.current.addNode(node);
    captureState();
  };

  const addTransformNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createTransformNode('new_transform');
    await editorInstanceRef.current.addNode(node);
    captureState();
  };

  const addSnapshotNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createSnapshotNode('new_snapshot');
    await editorInstanceRef.current.addNode(node);
    captureState();
  };

  const addSeedNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createSeedNode('new_seed');
    await editorInstanceRef.current.addNode(node);
    captureState();
  };

  const addTestNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createTestNode('new_test');
    await editorInstanceRef.current.addNode(node);
    captureState();
  };

  const addMacroNode = async () => {
    if (!editorInstanceRef.current) return;

    const node = NodeFactory.createMacroNode('new_macro');
    await editorInstanceRef.current.addNode(node);
    captureState();
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

  const captureState = () => {
    if (!editorInstanceRef.current || isRestoringRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const connections = editorInstanceRef.current.getConnections();

    const state = {
      nodes: nodes.map(node => ({
        id: node.id,
        label: node.label,
        data: JSON.parse(JSON.stringify((node as any).data)),
        position: (node as any).position,
      })),
      connections: connections.map(conn => ({
        source: conn.source,
        target: conn.target,
        sourceOutput: conn.sourceOutput,
        targetInput: conn.targetInput,
      })),
    };

    historyManagerRef.current.push(state);
    updateHistoryButtons();
  };

  const updateHistoryButtons = () => {
    setCanUndo(historyManagerRef.current.canUndo());
    setCanRedo(historyManagerRef.current.canRedo());
  };

  const undo = async () => {
    const state = historyManagerRef.current.undo();
    if (state) {
      await restoreState(state);
      updateHistoryButtons();
    }
  };

  const redo = async () => {
    const state = historyManagerRef.current.redo();
    if (state) {
      await restoreState(state);
      updateHistoryButtons();
    }
  };

  const restoreState = async (state: any) => {
    if (!editorInstanceRef.current || !areaInstanceRef.current) return;

    const editor = editorInstanceRef.current;
    const area = areaInstanceRef.current;

    // Set flag to prevent state capture during restoration
    isRestoringRef.current = true;

    try {
      const currentNodes = editor.getNodes();
      const currentConnections = editor.getConnections();

      // Clear all existing nodes and connections
      currentConnections.forEach(conn => {
        editor.removeConnection(conn.id);
      });
      currentNodes.forEach(node => {
        editor.removeNode(node.id);
      });

      // Map to store created nodes by their saved ID
      const nodeMap = new Map<string, any>();

      // Recreate nodes
      for (const savedNode of state.nodes) {
        const data = savedNode.data;
        let newNode;

        // Create node based on type
        switch (data.type) {
          case 'source':
            newNode = NodeFactory.createSourceNode(
              data.name,
              data.schema || '',
              data.name || ''
            );
            break;
          case 'model':
            if (data.materialization === 'ephemeral') {
              newNode = NodeFactory.createTransformNode(data.name);
            } else {
              newNode = NodeFactory.createModelNode(data.name, data.materialization);
            }
            break;
          case 'snapshot':
            newNode = NodeFactory.createSnapshotNode(data.name);
            break;
          case 'seed':
            newNode = NodeFactory.createSeedNode(data.name);
            break;
          case 'test':
            newNode = NodeFactory.createTestNode(data.name);
            break;
          default:
            newNode = NodeFactory.createTransformNode(data.name);
        }

        if (newNode) {
          // Override with saved data
          newNode.id = savedNode.id;
          newNode.label = savedNode.label;
          (newNode as any).data = { ...data };

          // Add to editor
          await editor.addNode(newNode);

          // Set position if available
          if (savedNode.position) {
            await area.translate(newNode.id, savedNode.position);
          }

          nodeMap.set(savedNode.id, newNode);
        }
      }

      // Recreate connections
      for (const savedConn of state.connections) {
        const sourceNode = nodeMap.get(savedConn.source);
        const targetNode = nodeMap.get(savedConn.target);

        if (sourceNode && targetNode) {
          try {
            await editor.addConnection(
              new ClassicPreset.Connection(
                sourceNode as any,
                savedConn.sourceOutput as never,
                targetNode as any,
                savedConn.targetInput as never
              )
            );
          } catch (error) {
            console.warn('Failed to restore connection:', error);
          }
        }
      }

      console.log('State restored successfully');
    } catch (error) {
      console.error('Failed to restore state:', error);
    } finally {
      // Reset flag after restoration completes
      isRestoringRef.current = false;
    }
  };

  const copyNode = (nodeId: string) => {
    if (!editorInstanceRef.current) return;

    const node = editorInstanceRef.current.getNode(nodeId);
    if (node) {
      setCopiedNode({
        data: JSON.parse(JSON.stringify((node as any).data)),
        label: node.label,
      });
      console.log('Node copied');
    }
  };

  const pasteNode = async () => {
    if (!copiedNode || !editorInstanceRef.current) return;

    const nodeType = copiedNode.data.type;
    const newName = `${copiedNode.data.name}_copy`;

    let newNode;
    switch (nodeType) {
      case 'source':
        newNode = NodeFactory.createSourceNode(newName, copiedNode.data.schema || '', copiedNode.data.name || '');
        break;
      case 'model':
        newNode = NodeFactory.createModelNode(newName, copiedNode.data.materialization);
        break;
      case 'snapshot':
        newNode = NodeFactory.createSnapshotNode(newName);
        break;
      case 'seed':
        newNode = NodeFactory.createSeedNode(newName);
        break;
      case 'test':
        newNode = NodeFactory.createTestNode(newName);
        break;
      default:
        newNode = NodeFactory.createTransformNode(newName);
    }

    if (newNode) {
      await editorInstanceRef.current.addNode(newNode);
      captureState();
      console.log('Node pasted');
    }
  };

  const duplicateNode = async (nodeId: string) => {
    copyNode(nodeId);
    await pasteNode();
  };

  const deleteNode = (nodeId: string) => {
    if (!editorInstanceRef.current) return;
    editorInstanceRef.current.removeNode(nodeId);
    captureState();
  };

  const setupKeyboardShortcuts = (editor: NodeEditor<Schemes>, _area: AreaPlugin<Schemes, AreaExtra>) => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        undo();
        e.preventDefault();
        return;
      }

      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        redo();
        e.preventDefault();
        return;
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && contextMenu) {
        copyNode(contextMenu.nodeId);
        e.preventDefault();
        return;
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        pasteNode();
        e.preventDefault();
        return;
      }

      // Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && contextMenu) {
        duplicateNode(contextMenu.nodeId);
        e.preventDefault();
        return;
      }

      // Delete key - remove selected nodes
      if ((e.key === 'Delete' || e.key === 'Backspace') && contextMenu) {
        deleteNode(contextMenu.nodeId);
        setContextMenu(null);
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        saveToLocalStorage(editor);
        e.preventDefault();
        return;
      }

      // Ctrl/Cmd + A - Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        // Select all nodes logic would go here
        e.preventDefault();
        return;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeElement = target.closest('.node');

      if (nodeElement) {
        e.preventDefault();
        const nodeId = (nodeElement as any).__node?.id;
        if (nodeId) {
          setContextMenu({ x: e.clientX, y: e.clientY, nodeId });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    editorRef.current?.addEventListener('contextmenu', handleContextMenu as any);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      editorRef.current?.removeEventListener('contextmenu', handleContextMenu as any);
    };
  };

  const setupNodeClickHandler = (_area: AreaPlugin<Schemes, AreaExtra>) => {
    const handleNodeClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeElement = target.closest('.node');

      if (nodeElement) {
        const nodeId = (nodeElement as any).__node?.id;
        if (nodeId) {
          // Toggle selection - click again to deselect
          setSelectedNodeId(prev => prev === nodeId ? null : nodeId);
        }
      } else {
        // Click on empty canvas to deselect
        setSelectedNodeId(null);
      }
    };

    editorRef.current?.addEventListener('click', handleNodeClick as any);

    // Cleanup on unmount
    return () => {
      editorRef.current?.removeEventListener('click', handleNodeClick as any);
    };
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

  const exportAsZip = async () => {
    if (!editorInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const nodeData: DBTNodeData[] = nodes.map(node => (node as any).data);

    try {
      await DBTExporter.exportAsZip(nodeData);
      console.log('DBT project exported as zip successfully');
    } catch (error) {
      console.error('Failed to export DBT project:', error);
      alert('Failed to export project. Check console for details.');
    }
  };

  const downloadFile = (content: string, filename: string, contentType: string = 'text/plain') => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportNodesByType = (type: string) => {
    if (!editorInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const nodeData: DBTNodeData[] = nodes
      .map(node => (node as any).data)
      .filter((data: DBTNodeData) => data.type === type);

    if (nodeData.length === 0) {
      alert(`No ${type} nodes found to export.`);
      return;
    }

    const files = DBTGenerator.generateProjectStructure(nodeData);
    const exportData = {
      timestamp: new Date().toISOString(),
      type,
      nodeCount: nodeData.length,
      files,
    };

    downloadFile(
      JSON.stringify(exportData, null, 2),
      `dbt-${type}-export-${Date.now()}.json`,
      'application/json'
    );

    console.log(`Exported ${nodeData.length} ${type} nodes`);
  };

  const exportAllSQL = () => {
    if (!editorInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const nodeData: DBTNodeData[] = nodes.map(node => (node as any).data);

    const files = DBTGenerator.generateProjectStructure(nodeData);

    // Download each SQL file individually
    let count = 0;
    Object.entries(files).forEach(([path, content]) => {
      if (path.endsWith('.sql')) {
        const filename = path.split('/').pop() || 'model.sql';
        downloadFile(content, filename, 'text/sql');
        count++;
      }
    });

    if (count === 0) {
      alert('No SQL files found to export.');
    } else {
      console.log(`Downloaded ${count} SQL files`);
    }
  };

  const exportAllYAML = () => {
    if (!editorInstanceRef.current) return;

    const nodes = editorInstanceRef.current.getNodes();
    const nodeData: DBTNodeData[] = nodes.map(node => (node as any).data);

    const files = DBTGenerator.generateProjectStructure(nodeData);

    // Download each YAML file individually
    let count = 0;
    Object.entries(files).forEach(([path, content]) => {
      if (path.endsWith('.yml')) {
        const filename = path.split('/').pop() || 'config.yml';
        downloadFile(content, filename, 'text/yaml');
        count++;
      }
    });

    if (count === 0) {
      alert('No YAML files found to export.');
    } else {
      console.log(`Downloaded ${count} YAML files`);
    }
  };

  const getAllTags = (): string[] => {
    if (!editorInstanceRef.current) return [];

    const nodes = editorInstanceRef.current.getNodes();
    const tagsSet = new Set<string>();

    nodes.forEach(node => {
      const data = (node as any).data;
      if (data.tags && Array.isArray(data.tags)) {
        data.tags.forEach((tag: string) => tagsSet.add(tag));
      }
    });

    return Array.from(tagsSet).sort();
  };

  const getAllGroups = (): string[] => {
    if (!editorInstanceRef.current) return [];

    const nodes = editorInstanceRef.current.getNodes();
    const groupsSet = new Set<string>();

    nodes.forEach(node => {
      const data = (node as any).data;
      if (data.group && data.group.trim()) {
        groupsSet.add(data.group);
      }
    });

    return Array.from(groupsSet).sort();
  };

  const handleImportFiles = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !editorInstanceRef.current || !areaInstanceRef.current) return;

    try {
      const importedNodes = await DBTImporter.importFiles(event.target.files);

      if (importedNodes.length === 0) {
        alert('No valid DBT files found to import.');
        return;
      }

      // Create nodes from imported data
      let createdCount = 0;
      for (const imported of importedNodes) {
        let newNode;

        switch (imported.type) {
          case 'source':
            newNode = NodeFactory.createSourceNode(
              imported.name,
              imported.data.schema || '',
              imported.name
            );
            break;
          case 'model':
            newNode = NodeFactory.createModelNode(
              imported.name,
              imported.data.materialization || 'table'
            );
            // Set SQL if available
            if (imported.sql) {
              (newNode as any).data.sql = imported.sql;
            }
            break;
          case 'snapshot':
            newNode = NodeFactory.createSnapshotNode(imported.name);
            break;
          case 'seed':
            newNode = NodeFactory.createSeedNode(imported.name);
            break;
          case 'test':
            newNode = NodeFactory.createTestNode(imported.name);
            break;
          default:
            continue;
        }

        // Apply imported data
        if (newNode) {
          const nodeData = (newNode as any).data;
          if (imported.data.description) nodeData.description = imported.data.description;
          if (imported.data.tags) nodeData.tags = imported.data.tags;
          if (imported.data.columns) nodeData.columns = imported.data.columns;
          if (imported.data.database) nodeData.database = imported.data.database;

          await editorInstanceRef.current.addNode(newNode);
          createdCount++;
        }
      }

      // Auto-arrange imported nodes
      if (arrangeInstanceRef.current && areaInstanceRef.current) {
        await arrangeInstanceRef.current.layout();
        AreaExtensions.zoomAt(areaInstanceRef.current, editorInstanceRef.current.getNodes());
      }

      captureState();
      alert(`Successfully imported ${createdCount} nodes from ${event.target.files.length} file(s).`);

      // Reset file input
      event.target.value = '';
    } catch (error) {
      console.error('Error importing files:', error);
      alert('Error importing files. Check console for details.');
    }
  };

  return (
    <div className="relative w-full h-screen bg-gray-900">
      {/* Hidden file input for importing */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".yml,.yaml,.sql"
        onChange={handleImportFiles}
        style={{ display: 'none' }}
      />

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onDelete={() => deleteNode(contextMenu.nodeId)}
          onDuplicate={() => duplicateNode(contextMenu.nodeId)}
          onCopy={() => copyNode(contextMenu.nodeId)}
        />
      )}

      {/* Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gray-800 border-b border-gray-700 p-3 shadow-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold text-white">DBT Visual Builder</h1>

          {/* Undo/Redo */}
          <div className="flex gap-2 border-l border-gray-600 pl-3">
            <button
              onClick={undo}
              disabled={!canUndo}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Undo (Ctrl+Z)"
            >
              ↶ Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo}
              className="px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="Redo (Ctrl+Y)"
            >
              ↷ Redo
            </button>
          </div>

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
            <button
              onClick={() => setShowDependencies(!showDependencies)}
              className={`px-3 py-1.5 text-white rounded text-sm font-medium transition-colors ${
                showDependencies
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-gray-600 hover:bg-gray-700'
              }`}
              title="Toggle dependency visualization (click nodes to see lineage)"
            >
              {showDependencies ? '🔗 Deps: ON' : '🔗 Deps: OFF'}
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
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              title="Filter by Tag"
            >
              <option value="">All Tags</option>
              {getAllTags().map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
              title="Filter by Group"
            >
              <option value="">All Groups</option>
              {getAllGroups().map(group => (
                <option key={group} value={group}>{group}</option>
              ))}
            </select>
          </div>

          {/* File Operations */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors"
              title="Import DBT Files (.yml, .yaml, .sql)"
            >
              📥 Import
            </button>
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
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors flex items-center gap-1"
                title="Export Options"
              >
                📦 Export ▾
              </button>
              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-56 bg-gray-800 border border-gray-700 rounded shadow-lg z-50">
                  <button
                    onClick={() => { exportAsZip(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700"
                  >
                    📦 Complete ZIP Project
                  </button>
                  <button
                    onClick={() => { exportDBT(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700"
                  >
                    📄 JSON Export (Debug)
                  </button>
                  <button
                    onClick={() => { exportAllSQL(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700"
                  >
                    📝 All SQL Files
                  </button>
                  <button
                    onClick={() => { exportAllYAML(); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700"
                  >
                    📋 All YAML Files
                  </button>
                  <button
                    onClick={() => { exportNodesByType('model'); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm border-b border-gray-700"
                  >
                    🔷 Models Only
                  </button>
                  <button
                    onClick={() => { exportNodesByType('source'); setShowExportMenu(false); }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-700 text-white text-sm"
                  >
                    🔶 Sources Only
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Info */}
        <div className="mt-2 text-xs text-gray-400 flex gap-4 flex-wrap">
          <span>⌨️ Shortcuts:</span>
          <span>Ctrl+Z/Y - Undo/Redo</span>
          <span>Ctrl+C/V - Copy/Paste</span>
          <span>Ctrl+D - Duplicate</span>
          <span>Del - Delete</span>
          <span>Ctrl+S - Save</span>
          <span>Right-click - Context menu</span>
        </div>

        {/* Dependency Visualization Legend */}
        {showDependencies && (
          <div className="mt-1 text-xs flex gap-4 flex-wrap items-center">
            <span className="text-gray-400">🔗 Lineage:</span>
            <span className="text-blue-400">● Selected node (click to select)</span>
            <span className="text-purple-400">● Upstream dependencies</span>
            <span className="text-green-400">● Downstream consumers</span>
          </div>
        )}
      </div>

      {/* Editor Canvas */}
      <div ref={editorRef} className="rete w-full h-full pt-28" />
    </div>
  );
};
