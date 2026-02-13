/**
 * Cache Cluster Manager
 * Manages distributed cache clusters
 */

import { EventEmitter } from 'events';

import type { CacheAdapter } from '../core/interfaces';

export interface ClusterNode {
  id: string;
  host: string;
  port: number;
  weight?: number;
  status?: 'active' | 'inactive' | 'maintenance';
}

export interface ClusterOptions {
  consistentHashing?: boolean;
  replicationFactor?: number;
  healthCheckInterval?: number;
  failoverTimeout?: number;
}

export interface ClusterConfig {
  nodes: ClusterNode[];
  options?: ClusterOptions;
}

export class CacheClusterManager extends EventEmitter {
  private nodes: Map<string, ClusterNode>;
  private options: ClusterOptions;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: ClusterConfig) {
    super();
    this.nodes = new Map();
    this.options = {
      consistentHashing: config.options?.consistentHashing ?? true,
      replicationFactor: config.options?.replicationFactor ?? 2,
      healthCheckInterval: config.options?.healthCheckInterval ?? 30000,
      failoverTimeout: config.options?.failoverTimeout ?? 5000,
    };

    // Initialize nodes
    for (const node of config.nodes) {
      this.nodes.set(node.id, {
        ...node,
        status: node.status || 'active',
      });
    }

    this.startHealthChecks();
  }

  /**
   * Wrap an adapter with cluster functionality
   */
  async wrapAdapter(adapter: CacheAdapter, _name: string): Promise<CacheAdapter> {
    // In a real implementation, this would create a cluster-aware adapter
    // For now, return the original adapter
    return adapter;
  }

  /**
   * Get cluster health status
   */
  getHealth(): { status: string; activeNodes: number; totalNodes: number } {
    const totalNodes = this.nodes.size;
    const activeNodes = Array.from(this.nodes.values())
      .filter(node => node.status === 'active').length;

    const status = activeNodes === 0 ? 'unhealthy' : 
                  activeNodes < totalNodes / 2 ? 'degraded' : 'healthy';

    return {
      status,
      activeNodes,
      totalNodes,
    };
  }

  /**
   * Add a node to the cluster
   */
  addNode(node: ClusterNode): void {
    this.nodes.set(node.id, {
      ...node,
      status: node.status || 'active',
    });

    this.emit('cluster:event', {
      type: 'node:added',
      nodeId: node.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Remove a node from the cluster
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      this.nodes.delete(nodeId);
      
      this.emit('cluster:event', {
        type: 'node:removed',
        nodeId,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Update node status
   */
  updateNodeStatus(nodeId: string, status: 'active' | 'inactive' | 'maintenance'): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      const oldStatus = node.status;
      node.status = status;
      
      this.emit('cluster:event', {
        type: 'node:status_changed',
        nodeId,
        oldStatus,
        newStatus: status,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Get node for a given key (consistent hashing)
   */
  getNodeForKey(key: string): ClusterNode | null {
    const activeNodes = Array.from(this.nodes.values())
      .filter(node => node.status === 'active');

    if (activeNodes.length === 0) return null;

    if (!this.options.consistentHashing) {
      // Simple round-robin or random selection
      const index = this.hashKey(key) % activeNodes.length;
      return activeNodes[index] || null;
    }

    // Simplified consistent hashing
    const hash = this.hashKey(key);
    const sortedNodes = activeNodes.sort((a, b) => 
      this.hashKey(a.id) - this.hashKey(b.id)
    );

    for (const node of sortedNodes) {
      if (this.hashKey(node.id) >= hash) {
        return node;
      }
    }

    // Wrap around to first node
    return sortedNodes[0] || null;
  }

  /**
   * Get all active nodes
   */
  getActiveNodes(): ClusterNode[] {
    return Array.from(this.nodes.values())
      .filter(node => node.status === 'active');
  }

  /**
   * Start health checks for all nodes
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) return;

    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform health checks on all nodes
   */
  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.nodes.values()).map(async (node) => {
      try {
        // In a real implementation, you'd ping the node
        const isHealthy = await this.pingNode(node);
        
        if (!isHealthy && node.status === 'active') {
          this.updateNodeStatus(node.id, 'inactive');
        } else if (isHealthy && node.status === 'inactive') {
          this.updateNodeStatus(node.id, 'active');
        }
      } catch (error) {
        if (node.status === 'active') {
          this.updateNodeStatus(node.id, 'inactive');
        }
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Ping a node to check if it's healthy
   */
  private async pingNode(_node: ClusterNode): Promise<boolean> {
    // In a real implementation, you'd make an HTTP request or TCP connection
    // For now, simulate a health check
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate 95% uptime
        resolve(Math.random() > 0.05);
      }, 100);
    });
  }

  /**
   * Simple hash function for keys
   */
  private hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Shutdown the cluster manager
   */
  async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null as any;
    }

    this.emit('cluster:event', {
      type: 'cluster:shutdown',
      timestamp: Date.now(),
    });
  }
}


