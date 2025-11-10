import type { DBTNodeData } from '../types/dbt';

export interface ProjectStatistics {
  totalNodes: number;
  nodesByType: {
    source: number;
    model: number;
    snapshot: number;
    seed: number;
    test: number;
  };
  nodesByMaterialization: {
    table: number;
    view: number;
    incremental: number;
    ephemeral: number;
  };
  totalConnections: number;
  totalTags: number;
  uniqueTags: string[];
  totalGroups: number;
  uniqueGroups: string[];
  totalColumns: number;
  nodesWithColumns: number;
  nodesWithDescription: number;
  nodesWithTags: number;
  nodesWithSQL: number;
  averageConnectionsPerNode: number;
  isolatedNodes: number;
  descriptionCoverage: number; // percentage
  columnCoverage: number; // percentage
  tagCoverage: number; // percentage
  sqlCoverage: number; // percentage (for models/snapshots)
}

export class ProjectStatsCalculator {
  /**
   * Calculate comprehensive project statistics
   */
  static calculateStats(nodes: any[], connections: any[]): ProjectStatistics {
    const nodesByType = {
      source: 0,
      model: 0,
      snapshot: 0,
      seed: 0,
      test: 0,
    };

    const nodesByMaterialization = {
      table: 0,
      view: 0,
      incremental: 0,
      ephemeral: 0,
    };

    const tagsSet = new Set<string>();
    const groupsSet = new Set<string>();

    let totalColumns = 0;
    let nodesWithColumns = 0;
    let nodesWithDescription = 0;
    let nodesWithTags = 0;
    let nodesWithSQL = 0;
    let modelsRequiringSQL = 0;
    let isolatedNodes = 0;

    // Build connection maps
    const nodeConnections = new Map<string, number>();
    connections.forEach(conn => {
      nodeConnections.set(conn.source, (nodeConnections.get(conn.source) || 0) + 1);
      nodeConnections.set(conn.target, (nodeConnections.get(conn.target) || 0) + 1);
    });

    nodes.forEach(node => {
      const data: DBTNodeData = (node as any).data;

      // Count by type
      if (data.type && data.type in nodesByType) {
        nodesByType[data.type as keyof typeof nodesByType]++;
      }

      // Count by materialization
      if (data.materialization && data.materialization in nodesByMaterialization) {
        nodesByMaterialization[data.materialization as keyof typeof nodesByMaterialization]++;
      }

      // Tags
      if (data.tags && data.tags.length > 0) {
        nodesWithTags++;
        data.tags.forEach(tag => tagsSet.add(tag));
      }

      // Groups
      if (data.group && data.group.trim()) {
        groupsSet.add(data.group);
      }

      // Columns
      if (data.columns && data.columns.length > 0) {
        nodesWithColumns++;
        totalColumns += data.columns.length;
      }

      // Description
      if (data.description && data.description.trim()) {
        nodesWithDescription++;
      }

      // SQL
      if (data.type === 'model' || data.type === 'snapshot') {
        modelsRequiringSQL++;
        if (data.sql && data.sql.trim()) {
          nodesWithSQL++;
        }
      }

      // Isolated nodes (excluding sources which naturally have no incoming)
      const connectionCount = nodeConnections.get(node.id) || 0;
      if (connectionCount === 0 && data.type !== 'source') {
        isolatedNodes++;
      }
    });

    const totalNodes = nodes.length;
    const averageConnectionsPerNode = totalNodes > 0
      ? connections.length * 2 / totalNodes // Each connection counts for 2 nodes
      : 0;

    const descriptionCoverage = totalNodes > 0
      ? (nodesWithDescription / totalNodes) * 100
      : 0;

    const columnCoverage = totalNodes > 0
      ? (nodesWithColumns / totalNodes) * 100
      : 0;

    const tagCoverage = totalNodes > 0
      ? (nodesWithTags / totalNodes) * 100
      : 0;

    const sqlCoverage = modelsRequiringSQL > 0
      ? (nodesWithSQL / modelsRequiringSQL) * 100
      : 100;

    return {
      totalNodes,
      nodesByType,
      nodesByMaterialization,
      totalConnections: connections.length,
      totalTags: tagsSet.size,
      uniqueTags: Array.from(tagsSet).sort(),
      totalGroups: groupsSet.size,
      uniqueGroups: Array.from(groupsSet).sort(),
      totalColumns,
      nodesWithColumns,
      nodesWithDescription,
      nodesWithTags,
      nodesWithSQL,
      averageConnectionsPerNode,
      isolatedNodes,
      descriptionCoverage,
      columnCoverage,
      tagCoverage,
      sqlCoverage,
    };
  }

  /**
   * Get health score (0-100) based on coverage metrics
   */
  static getHealthScore(stats: ProjectStatistics): number {
    const weights = {
      description: 0.3,
      sql: 0.4,
      columns: 0.2,
      tags: 0.1,
    };

    const score =
      stats.descriptionCoverage * weights.description +
      stats.sqlCoverage * weights.sql +
      stats.columnCoverage * weights.columns +
      stats.tagCoverage * weights.tags;

    return Math.round(score);
  }

  /**
   * Get health grade (A, B, C, D, F)
   */
  static getHealthGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
