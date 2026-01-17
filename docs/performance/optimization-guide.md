# Performance Optimization Guide

## Overview

This guide provides comprehensive strategies for optimizing the Universal Skills Architecture system performance across all layers and components.

## Table of Contents

1. [Caching Strategies](#caching-strategies)
2. [Resource Management](#resource-management)
3. [Query Optimization](#query-optimization)
4. [Execution Performance](#execution-performance)
5. [Memory Management](#memory-management)
6. [Network Optimization](#network-optimization)
7. [Monitoring and Metrics](#monitoring-and-metrics)
8. [Best Practices](#best-practices)

## Caching Strategies

### Skill Registry Caching

The skill registry implements intelligent caching to improve query performance:

```typescript
import { InMemorySkillRegistry } from 'universal-skills-architecture';

const registry = new InMemorySkillRegistry();

// Cache configuration is automatic, but you can optimize usage:

// 1. Preload frequently used skills
await registry.preloadSkills([
  'file-reader-v1',
  'data-validator-v1',
  'json-processor-v1'
]);

// 2. Monitor cache performance
const metrics = registry.getPerformanceMetrics();
console.log('Cache hit rate:', metrics.cache.hitRate);
console.log('Average query time:', metrics.averageQueryTime);

// 3. Optimize when performance degrades
if (metrics.cache.hitRate < 0.8) {
  registry.optimize(); // Cleanup expired entries
}
```

### Cache Configuration

```typescript
// Custom cache configuration
const cache = new SkillCache(
  2000,           // Max 2000 entries
  10 * 60 * 1000  // 10 minutes TTL
);

// Different TTL for different data types
cache.cacheSkill('skill-id', skill);           // 15 minutes
cache.cacheQuery('query-key', results);        // 2 minutes  
cache.cacheValidation('skill-id', validation); // 5 minutes
```

### Cache Invalidation Strategy

```typescript
// Automatic invalidation on skill changes
await registry.register(newSkill);    // Invalidates related query caches
await registry.update(skillId, skill); // Updates skill cache, invalidates queries
await registry.unregister(skillId);   // Removes from all caches
```

## Resource Management

### Execution Resource Limits

```typescript
import { LayeredExecutionEngine } from 'universal-skills-architecture';

const engine = new LayeredExecutionEngine(registry);

// Set appropriate resource limits
const result = await engine.execute('skill-id', params, {
  resourceLimits: {
    maxMemory: 512 * 1024 * 1024,  // 512MB
    maxDuration: 30000,            // 30 seconds
    maxNetworkRequests: 50,        // Limit API calls
    maxFileSize: 10 * 1024 * 1024  // 10MB max file size
  },
  timeout: 45000 // Overall timeout
});
```

### Resource Monitoring

```typescript
// Monitor resource usage
const resourceReport = result.metadata.resourceUsage;
console.log('Memory used:', resourceReport.memoryUsed);
console.log('CPU time:', resourceReport.cpuTime);
console.log('Network requests:', resourceReport.networkRequests);

// Track resource trends
const tracker = new ResourceTracker();
tracker.checkpoint('start');
// ... operations
tracker.checkpoint('complete');

const report = tracker.getReport();
console.log('Performance report:', report);
```

### Memory Management

```typescript
// Efficient memory usage patterns
class OptimizedSkillProcessor {
  private cache = new Map();
  
  async processSkills(skills: SkillDefinition[]) {
    // Process in batches to avoid memory spikes
    const batchSize = 10;
    const results = [];
    
    for (let i = 0; i < skills.length; i += batchSize) {
      const batch = skills.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map(skill => this.processSkill(skill))
      );
      results.push(...batchResults);
      
      // Cleanup after each batch
      if (global.gc) {
        global.gc();
      }
    }
    
    return results;
  }
  
  // Cleanup resources
  dispose() {
    this.cache.clear();
  }
}
```

## Query Optimization

### Efficient Query Patterns

```typescript
// 1. Use specific queries instead of broad searches
// ❌ Inefficient
const allSkills = await registry.discover({});
const filtered = allSkills.filter(skill => skill.category === 'file-operations');

// ✅ Efficient
const fileSkills = await registry.discover({ 
  category: 'file-operations',
  limit: 50  // Limit results
});

// 2. Use pagination for large result sets
const pagedResults = await registry.discover({
  category: 'data-processing',
  limit: 20,
  offset: 40
});

// 3. Combine filters to reduce result set
const specificSkills = await registry.discover({
  layer: 1,
  category: 'file-operations',
  tags: ['io', 'utility']
});
```

### Query Result Caching

```typescript
// Cache query results automatically
const cacheKey = SkillCache.generateQueryKey(query);
const cached = cache.get(cacheKey);

if (cached) {
  return cached; // Return cached results
}

// Execute query and cache results
const results = await executeQuery(query);
cache.cacheQuery(cacheKey, results);
return results;
```

## Execution Performance

### Layer-Specific Optimizations

#### Layer 1 (Function Calls)
```typescript
// Optimize function execution
const layer1Optimizations = {
  // Use connection pooling for database operations
  connectionPool: true,
  
  // Cache computed results
  resultCache: true,
  
  // Batch operations when possible
  batchSize: 100
};
```

#### Layer 2 (Sandbox Tools)
```typescript
// Optimize sandbox execution
const sandboxConfig = {
  // Reuse sandbox instances
  reuseInstances: true,
  
  // Limit concurrent sandboxes
  maxConcurrent: 5,
  
  // Optimize resource allocation
  resourceLimits: {
    maxMemory: 256 * 1024 * 1024,
    maxCpuTime: 10000
  }
};
```

#### Layer 3 (API Wrappers)
```typescript
// Optimize API execution
const apiOptimizations = {
  // Connection pooling
  keepAlive: true,
  maxSockets: 10,
  
  // Request batching
  batchRequests: true,
  batchSize: 5,
  
  // Response caching
  cacheResponses: true,
  cacheTTL: 300000 // 5 minutes
};
```

### Parallel Execution

```typescript
// Execute compatible skills in parallel
const parallelResults = await Promise.all([
  engine.execute('skill1', params1),
  engine.execute('skill2', params2),
  engine.execute('skill3', params3)
]);

// Limit concurrency to prevent resource exhaustion
const pLimit = require('p-limit');
const limit = pLimit(3); // Max 3 concurrent executions

const results = await Promise.all(
  skillIds.map(skillId => 
    limit(() => engine.execute(skillId, params))
  )
);
```

## Network Optimization

### Connection Management

```typescript
// Configure HTTP client for optimal performance
const httpConfig = {
  // Connection pooling
  keepAlive: true,
  maxSockets: 15,
  maxFreeSockets: 10,
  
  // Timeouts
  timeout: 30000,
  
  // Compression
  gzip: true,
  
  // Retry configuration
  retry: {
    retries: 3,
    retryDelay: 1000
  }
};
```

### Request Batching

```typescript
// Batch API requests to reduce network overhead
class RequestBatcher {
  private batch: any[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  
  addRequest(request: any) {
    this.batch.push(request);
    
    if (this.batch.length >= 10) {
      this.flush();
    } else if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flush(), 100);
    }
  }
  
  private async flush() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    
    const requests = this.batch.splice(0);
    if (requests.length > 0) {
      await this.processBatch(requests);
    }
  }
}
```

## Monitoring and Metrics

### Performance Metrics Collection

```typescript
// Comprehensive performance monitoring
class PerformanceMonitor {
  private metrics = {
    executionTimes: new Map<string, number[]>(),
    memoryUsage: new Map<string, number[]>(),
    cacheHitRates: new Map<string, number>(),
    errorRates: new Map<string, number>()
  };
  
  recordExecution(skillId: string, duration: number, memoryUsed: number) {
    // Record execution time
    if (!this.metrics.executionTimes.has(skillId)) {
      this.metrics.executionTimes.set(skillId, []);
    }
    this.metrics.executionTimes.get(skillId)!.push(duration);
    
    // Record memory usage
    if (!this.metrics.memoryUsage.has(skillId)) {
      this.metrics.memoryUsage.set(skillId, []);
    }
    this.metrics.memoryUsage.get(skillId)!.push(memoryUsed);
  }
  
  getAverageExecutionTime(skillId: string): number {
    const times = this.metrics.executionTimes.get(skillId) || [];
    return times.reduce((sum, time) => sum + time, 0) / times.length;
  }
  
  getPerformanceReport() {
    const report = {
      slowestSkills: this.getSlowestSkills(),
      memoryHeavySkills: this.getMemoryHeavySkills(),
      cachePerformance: this.getCachePerformance(),
      recommendations: this.getRecommendations()
    };
    
    return report;
  }
}
```

### Real-time Monitoring

```typescript
// Set up performance monitoring
const monitor = new PerformanceMonitor();

// Monitor all executions
engine.on('execution-start', (skillId, executionId) => {
  monitor.startTracking(skillId, executionId);
});

engine.on('execution-complete', (skillId, executionId, result) => {
  monitor.recordExecution(skillId, result.metadata.duration, result.metadata.resourceUsage.memoryUsed);
});

// Generate periodic reports
setInterval(() => {
  const report = monitor.getPerformanceReport();
  console.log('Performance Report:', report);
  
  // Alert on performance issues
  if (report.slowestSkills.length > 0) {
    console.warn('Slow skills detected:', report.slowestSkills);
  }
}, 60000); // Every minute
```

## Best Practices

### 1. Skill Design for Performance

```typescript
// ✅ Good: Efficient skill design
const efficientSkill = {
  id: 'efficient-processor',
  // Use streaming for large data
  streaming: true,
  // Specify resource requirements
  resourceRequirements: {
    memory: 'low',
    cpu: 'medium',
    network: 'none'
  },
  // Enable caching
  cacheable: true,
  cacheKey: 'input.hash'
};

// ❌ Bad: Inefficient skill design
const inefficientSkill = {
  id: 'inefficient-processor',
  // Loads everything into memory
  loadAllData: true,
  // No resource limits
  // No caching
};
```

### 2. Batch Processing

```typescript
// Process multiple items efficiently
async function processBatch(items: any[]) {
  const batchSize = 10;
  const results = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch in parallel
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );
    
    results.push(...batchResults);
    
    // Small delay to prevent overwhelming the system
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
  
  return results;
}
```

### 3. Error Handling and Recovery

```typescript
// Implement circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > 60000) { // 1 minute
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= 5) {
      this.state = 'open';
    }
  }
}
```

### 4. Resource Cleanup

```typescript
// Proper resource cleanup
class ResourceManager {
  private resources = new Set<any>();
  
  addResource(resource: any) {
    this.resources.add(resource);
  }
  
  async cleanup() {
    const cleanupPromises = Array.from(this.resources).map(resource => {
      if (resource.cleanup) {
        return resource.cleanup();
      }
      return Promise.resolve();
    });
    
    await Promise.all(cleanupPromises);
    this.resources.clear();
  }
}

// Use with automatic cleanup
async function executeWithCleanup(operation: () => Promise<any>) {
  const resourceManager = new ResourceManager();
  
  try {
    return await operation();
  } finally {
    await resourceManager.cleanup();
  }
}
```

## Performance Testing

### Load Testing

```typescript
// Load test skill execution
async function loadTest(skillId: string, concurrency: number, duration: number) {
  const startTime = Date.now();
  const results = [];
  let completed = 0;
  
  const workers = Array.from({ length: concurrency }, async () => {
    while (Date.now() - startTime < duration) {
      try {
        const start = Date.now();
        await engine.execute(skillId, testParams);
        const end = Date.now();
        
        results.push({
          duration: end - start,
          success: true,
          timestamp: end
        });
      } catch (error) {
        results.push({
          duration: 0,
          success: false,
          error: error.message,
          timestamp: Date.now()
        });
      }
      
      completed++;
    }
  });
  
  await Promise.all(workers);
  
  return {
    totalRequests: completed,
    successRate: results.filter(r => r.success).length / results.length,
    averageResponseTime: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    requestsPerSecond: completed / (duration / 1000)
  };
}
```

### Benchmark Testing

```typescript
// Benchmark different implementations
async function benchmark() {
  const implementations = [
    { name: 'cached', fn: () => cachedImplementation() },
    { name: 'uncached', fn: () => uncachedImplementation() },
    { name: 'optimized', fn: () => optimizedImplementation() }
  ];
  
  const results = {};
  
  for (const impl of implementations) {
    const times = [];
    
    // Warm up
    for (let i = 0; i < 10; i++) {
      await impl.fn();
    }
    
    // Measure
    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint();
      await impl.fn();
      const end = process.hrtime.bigint();
      
      times.push(Number(end - start) / 1000000); // Convert to milliseconds
    }
    
    results[impl.name] = {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: times.sort()[Math.floor(times.length * 0.95)]
    };
  }
  
  return results;
}
```

## Conclusion

Performance optimization in the Universal Skills Architecture requires attention to:

1. **Caching**: Implement intelligent caching at all levels
2. **Resource Management**: Set appropriate limits and monitor usage
3. **Query Optimization**: Use specific queries and pagination
4. **Parallel Processing**: Execute compatible operations concurrently
5. **Monitoring**: Continuously monitor and analyze performance metrics
6. **Testing**: Regular load testing and benchmarking

By following these guidelines and implementing the suggested optimizations, you can achieve significant performance improvements across all layers of the architecture.