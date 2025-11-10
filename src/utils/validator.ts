import type { DBTNodeData } from '../types/dbt';

export interface ValidationIssue {
  nodeId: string;
  nodeName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  type: string;
}

export class DBTValidator {
  /**
   * Validate all nodes and connections
   */
  static validateProject(
    nodes: any[],
    connections: any[]
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];

    // Build connection maps for faster lookups
    const outgoingConnections = new Map<string, number>();
    const incomingConnections = new Map<string, number>();

    connections.forEach(conn => {
      outgoingConnections.set(conn.source, (outgoingConnections.get(conn.source) || 0) + 1);
      incomingConnections.set(conn.target, (incomingConnections.get(conn.target) || 0) + 1);
    });

    nodes.forEach(node => {
      const data: DBTNodeData = (node as any).data;
      const nodeId = node.id;
      const nodeName = data.name || 'Unnamed';

      // Check for missing SQL in model nodes
      if (data.type === 'model' && (!data.sql || data.sql.trim() === '')) {
        issues.push({
          nodeId,
          nodeName,
          severity: 'error',
          message: 'Model node is missing SQL query',
          type: 'missing_sql',
        });
      }

      // Check for missing descriptions
      if (!data.description || data.description.trim() === '') {
        issues.push({
          nodeId,
          nodeName,
          severity: 'info',
          message: 'Node is missing a description',
          type: 'missing_description',
        });
      }

      // Check for isolated nodes (no connections)
      const hasOutgoing = (outgoingConnections.get(nodeId) || 0) > 0;
      const hasIncoming = (incomingConnections.get(nodeId) || 0) > 0;

      if (!hasOutgoing && !hasIncoming && data.type !== 'source') {
        issues.push({
          nodeId,
          nodeName,
          severity: 'warning',
          message: 'Node is not connected to any other nodes',
          type: 'isolated_node',
        });
      }

      // Check for source nodes without outgoing connections
      if (data.type === 'source' && !hasOutgoing) {
        issues.push({
          nodeId,
          nodeName,
          severity: 'warning',
          message: 'Source node is not connected to any models',
          type: 'unused_source',
        });
      }

      // Check for models without incoming connections
      if ((data.type === 'model' || data.type === 'snapshot') && !hasIncoming) {
        issues.push({
          nodeId,
          nodeName,
          severity: 'info',
          message: 'Model has no upstream dependencies (might be a base model)',
          type: 'no_upstream',
        });
      }

      // Check for missing column definitions
      if ((data.type === 'model' || data.type === 'source') && (!data.columns || data.columns.length === 0)) {
        issues.push({
          nodeId,
          nodeName,
          severity: 'info',
          message: 'Node has no column definitions',
          type: 'missing_columns',
        });
      }

      // Check for snapshot without SQL
      if (data.type === 'snapshot' && (!data.sql || data.sql.trim() === '')) {
        issues.push({
          nodeId,
          nodeName,
          severity: 'error',
          message: 'Snapshot node is missing SQL query',
          type: 'missing_sql',
        });
      }
    });

    // Check for circular dependencies
    const circularDeps = this.detectCircularDependencies(nodes, connections);
    circularDeps.forEach(cycle => {
      cycle.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          const data: DBTNodeData = (node as any).data;
          issues.push({
            nodeId,
            nodeName: data.name || 'Unnamed',
            severity: 'error',
            message: `Part of circular dependency: ${cycle.join(' → ')}`,
            type: 'circular_dependency',
          });
        }
      });
    });

    return issues;
  }

  /**
   * Detect circular dependencies using DFS
   */
  private static detectCircularDependencies(
    nodes: any[],
    connections: any[]
  ): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const adjacencyList = new Map<string, string[]>();

    // Build adjacency list
    connections.forEach(conn => {
      if (!adjacencyList.has(conn.source)) {
        adjacencyList.set(conn.source, []);
      }
      adjacencyList.get(conn.source)!.push(conn.target);
    });

    const dfs = (nodeId: string, path: string[]): void => {
      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const neighbors = adjacencyList.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          dfs(neighbor, [...path]);
        } else if (recursionStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = path.indexOf(neighbor);
          const cycle = path.slice(cycleStart);
          cycles.push([...cycle, neighbor]);
        }
      }

      recursionStack.delete(nodeId);
    };

    nodes.forEach(node => {
      if (!visited.has(node.id)) {
        dfs(node.id, []);
      }
    });

    return cycles;
  }

  /**
   * Get count of issues by severity
   */
  static getIssueCounts(issues: ValidationIssue[]): { error: number; warning: number; info: number } {
    return {
      error: issues.filter(i => i.severity === 'error').length,
      warning: issues.filter(i => i.severity === 'warning').length,
      info: issues.filter(i => i.severity === 'info').length,
    };
  }
}
