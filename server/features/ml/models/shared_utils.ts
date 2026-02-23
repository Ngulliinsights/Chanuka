// ============================================================================
// SHARED ML UTILITIES
// ============================================================================
// Common utilities used across ML models to reduce code duplication

/**
 * Text preprocessing utilities
 */
export class TextProcessor {
  private static readonly STOPWORDS = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'na', 'ya', 'wa', 'za', 'la', 'kwa', 'ni', 'si' // Swahili stopwords
  ]);

  /**
   * Normalize text for analysis
   */
  static normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/@\w+/g, '') // Remove mentions
      .replace(/#\w+/g, '') // Remove hashtags
      .replace(/[^\w\s]/g, ' ') // Remove special chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  /**
   * Tokenize text into words
   */
  static tokenize(text: string): string[] {
    return this.normalize(text).split(/\s+/).filter(w => w.length > 2);
  }

  /**
   * Remove stopwords from token array
   */
  static removeStopwords(tokens: string[]): string[] {
    return tokens.filter(token => !this.STOPWORDS.has(token));
  }

  /**
   * Calculate TF-IDF score for terms
   */
  static calculateTFIDF(term: string, document: string[], corpus: string[][]): number {
    const tf = document.filter(t => t === term).length / document.length;
    const df = corpus.filter(doc => doc.includes(term)).length;
    const idf = Math.log(corpus.length / (df + 1));
    return tf * idf;
  }

  /**
   * Extract n-grams from text
   */
  static extractNGrams(tokens: string[], n: number): string[] {
    const ngrams: string[] = [];
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(' '));
    }
    return ngrams;
  }

  /**
   * Calculate Jaccard similarity between two token sets
   */
  static jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
    const intersection = new Set(Array.from(set1).filter(x => set2.has(x)));
    const union = new Set([...Array.from(set1), ...Array.from(set2)]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Calculate cosine similarity between two token frequency maps
   */
  static cosineSimilarity(vec1: Map<string, number>, vec2: Map<string, number>): number {
    const allKeys = new Set([...Array.from(vec1.keys()), ...Array.from(vec2.keys())]);
    let dotProduct = 0;
    let mag1 = 0;
    let mag2 = 0;

    for (const key of Array.from(allKeys)) {
      const v1 = vec1.get(key) || 0;
      const v2 = vec2.get(key) || 0;
      dotProduct += v1 * v2;
      mag1 += v1 * v1;
      mag2 += v2 * v2;
    }

    const magnitude = Math.sqrt(mag1) * Math.sqrt(mag2);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
}

/**
 * Network graph utilities for influence mapping
 */
export class GraphAnalyzer {
  /**
   * Calculate betweenness centrality using Brandes' algorithm
   */
  static calculateBetweenness(nodeId: string, graph: Map<string, Set<string>>): number {
    const nodes = Array.from(graph.keys());
    let betweenness = 0;

    for (const s of nodes) {
      if (s === nodeId) continue;
      
      const stack: string[] = [];
      const paths: Map<string, string[][]> = new Map();
      const dist: Map<string, number> = new Map();
      const sigma: Map<string, number> = new Map();
      
      nodes.forEach(v => {
        paths.set(v, []);
        dist.set(v, Infinity);
        sigma.set(v, 0);
      });
      
      dist.set(s, 0);
      sigma.set(s, 1);
      
      const queue: string[] = [s];
      
      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);
        
        const neighbors = graph.get(v) || new Set();
        for (const w of Array.from(neighbors)) {
          const distW = dist.get(w)!;
          const distV = dist.get(v)!;
          
          if (distW === Infinity) {
            dist.set(w, distV + 1);
            queue.push(w);
          }
          
          if (distW === distV + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            paths.get(w)!.push([v]);
          }
        }
      }
      
      const delta: Map<string, number> = new Map();
      nodes.forEach(v => delta.set(v, 0));
      
      while (stack.length > 0) {
        const w = stack.pop()!;
        const pathsW = paths.get(w)!;
        
        for (const vPath of pathsW) {
          for (const v of vPath) {
            const coeff = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
            delta.set(v, delta.get(v)! + coeff);
          }
        }
        
        if (w !== s && w === nodeId) {
          betweenness += delta.get(w)!;
        }
      }
    }

    const n = nodes.length;
    return n > 2 ? betweenness / ((n - 1) * (n - 2)) : 0;
  }

  /**
   * Calculate closeness centrality
   */
  static calculateCloseness(nodeId: string, graph: Map<string, Set<string>>): number {
    const distances = this.bfsDistances(nodeId, graph);
    const totalDistance = Array.from(distances.values())
      .filter(d => d !== Infinity)
      .reduce((sum, d) => sum + d, 0);
    
    return totalDistance === 0 ? 0 : (distances.size - 1) / totalDistance;
  }

  /**
   * Calculate eigenvector centrality using power iteration
   */
  static calculateEigenvector(nodeId: string, graph: Map<string, Set<string>>, iterations: number = 100): number {
    const nodes = Array.from(graph.keys());
    const scores = new Map<string, number>();
    
    // Initialize scores
    nodes.forEach(node => scores.set(node, 1 / nodes.length));
    
    // Power iteration
    for (let i = 0; i < iterations; i++) {
      const newScores = new Map<string, number>();
      
      for (const node of nodes) {
        let score = 0;
        const neighbors = graph.get(node) || new Set();
        
        for (const neighbor of Array.from(neighbors)) {
          score += scores.get(neighbor) || 0;
        }
        
        newScores.set(node, score);
      }
      
      // Normalize
      const sum = Array.from(newScores.values()).reduce((a, b) => a + b, 0);
      if (sum > 0) {
        newScores.forEach((score, node) => newScores.set(node, score / sum));
      }
      
      scores.clear();
      newScores.forEach((score, node) => scores.set(node, score));
    }
    
    return scores.get(nodeId) || 0;
  }

  /**
   * BFS to calculate distances from a node
   */
  private static bfsDistances(startNode: string, graph: Map<string, Set<string>>): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: Array<{ node: string; dist: number }> = [{ node: startNode, dist: 0 }];
    const visited = new Set<string>([startNode]);
    
    distances.set(startNode, 0);
    
    while (queue.length > 0) {
      const { node, dist } = queue.shift()!;
      const neighbors = graph.get(node) || new Set();
      
      for (const neighbor of Array.from(neighbors)) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          distances.set(neighbor, dist + 1);
          queue.push({ node: neighbor, dist: dist + 1 });
        }
      }
    }
    
    return distances;
  }

  /**
   * Find shortest paths between two nodes
   */
  static findShortestPaths(start: string, end: string, graph: Map<string, Set<string>>, maxPaths: number = 5): string[][] {
    const paths: string[][] = [];
    const queue: Array<{ node: string; path: string[] }> = [{ node: start, path: [start] }];
    const visited = new Map<string, number>();
    let shortestLength = Infinity;
    
    while (queue.length > 0 && paths.length < maxPaths) {
      const { node, path } = queue.shift()!;
      
      if (path.length > shortestLength) continue;
      
      if (node === end) {
        paths.push(path);
        shortestLength = Math.min(shortestLength, path.length);
        continue;
      }
      
      const visitCount = visited.get(node) || 0;
      if (visitCount > 3) continue; // Prevent cycles
      visited.set(node, visitCount + 1);
      
      const neighbors = graph.get(node) || new Set();
      for (const neighbor of Array.from(neighbors)) {
        if (!path.includes(neighbor)) {
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }
    
    return paths.filter(p => p.length === shortestLength);
  }
}

/**
 * Statistical utilities
 */
export class Statistics {
  /**
   * Calculate mean
   */
  static mean(numbers: number[]): number {
    return numbers.length === 0 ? 0 : numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  }

  /**
   * Calculate median
   */
  static median(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
  }

  /**
   * Calculate standard deviation
   */
  static stdDev(numbers: number[]): number {
    const avg = this.mean(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  /**
   * Calculate variance
   */
  static variance(numbers: number[]): number {
    const avg = this.mean(numbers);
    const squareDiffs = numbers.map(n => Math.pow(n - avg, 2));
    return this.mean(squareDiffs);
  }

  /**
   * Calculate percentile
   */
  static percentile(numbers: number[], p: number): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower]! * (1 - weight) + sorted[upper]! * weight;
  }

  /**
   * Normalize values to 0-1 range
   */
  static normalize(numbers: number[]): number[] {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const range = max - min;
    return range === 0 ? numbers.map(() => 0.5) : numbers.map(n => (n - min) / range);
  }

  /**
   * Calculate weighted average
   */
  static weightedAverage(values: number[], weights: number[]): number {
    if (values.length !== weights.length || values.length === 0) return 0;
    const weightedSum = values.reduce((sum, val, i) => sum + val * weights[i]!, 0);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    return totalWeight === 0 ? 0 : weightedSum / totalWeight;
  }
}

/**
 * Date utilities
 */
export class DateUtils {
  /**
   * Calculate days between two dates
   */
  static daysBetween(date1: Date | string, date2: Date | string): number {
    const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
    const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if date is within last N days
   */
  static isRecent(date: Date | string, days: number): boolean {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    return this.daysBetween(d, now) <= days;
  }

  /**
   * Get recency score (1.0 = today, decreases over time)
   */
  static recencyScore(date: Date | string, halfLifeDays: number = 30): number {
    const days = this.daysBetween(date, new Date());
    return Math.exp(-Math.log(2) * days / halfLifeDays);
  }
}

/**
 * Caching utilities for performance
 */
export class Cache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlSeconds: number = 3600) {
    this.ttl = ttlSeconds * 1000;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

/**
 * Batch processing utilities
 */
export class BatchProcessor {
  /**
   * Process items in batches
   */
  static async processBatch<T, R>(
    items: T[],
    batchSize: number,
    processor: (batch: T[]) => Promise<R[]>
  ): Promise<R[]> {
    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Process items in parallel with concurrency limit
   */
  static async processParallel<T, R>(
    items: T[],
    concurrency: number,
    processor: (item: T) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    const executing: Promise<void>[] = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item === undefined) continue;
      
      const promise = processor(item).then(result => {
        results[i] = result;
      });
      
      executing.push(promise);
      
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(executing.findIndex(p => p === promise), 1);
      }
    }
    
    await Promise.all(executing);
    return results;
  }
}
