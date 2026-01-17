import { PerformanceCache, SkillCache, ResourceTracker } from '../../src/core/performance-cache';

describe('PerformanceCache', () => {
  let cache: PerformanceCache<string, any>;

  beforeEach(() => {
    cache = new PerformanceCache({
      maxSize: 10,
      defaultTtl: 1000,
      cleanupInterval: 100,
      enableStats: true
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return undefined for non-existent keys', () => {
      expect(cache.get('non-existent')).toBeUndefined();
    });

    it('should check if key exists', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should delete keys', () => {
      cache.set('key1', 'value1');
      expect(cache.delete('key1')).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.delete('non-existent')).toBe(false);
    });

    it('should clear all entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.size()).toBe(0);
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('TTL functionality', () => {
    it('should expire entries after TTL', (done) => {
      cache.set('key1', 'value1', 50); // 50ms TTL
      
      setTimeout(() => {
        expect(cache.get('key1')).toBeUndefined();
        done();
      }, 100);
    });

    it('should use default TTL when not specified', (done) => {
      cache.set('key1', 'value1'); // Uses default 1000ms TTL
      
      setTimeout(() => {
        expect(cache.get('key1')).toBe('value1');
        done();
      }, 50);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used items when at capacity', () => {
      // Fill cache to capacity
      for (let i = 0; i < 10; i++) {
        cache.set(`key${i}`, `value${i}`);
      }
      
      // Access key0 to make it recently used
      cache.get('key0');
      
      // Add one more item to trigger eviction
      cache.set('key10', 'value10');
      
      // key0 should still exist (recently accessed)
      expect(cache.get('key0')).toBe('value0');
      
      // key1 should be evicted (least recently used)
      expect(cache.get('key1')).toBeUndefined();
    });
  });

  describe('statistics', () => {
    it('should track cache statistics', () => {
      cache.set('key1', 'value1');
      cache.get('key1'); // hit
      cache.get('non-existent'); // miss
      
      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.size).toBe(1);
    });
  });
});

describe('SkillCache', () => {
  let skillCache: SkillCache;

  beforeEach(() => {
    skillCache = new SkillCache(100, 5000);
  });

  afterEach(() => {
    skillCache.destroy();
  });

  it('should cache skills with longer TTL', () => {
    const skill = { id: 'test-skill', name: 'Test Skill' };
    skillCache.cacheSkill('skill-id', skill);
    
    expect(skillCache.get('skill-id')).toEqual(skill);
  });

  it('should cache queries with shorter TTL', () => {
    const results = [{ id: 'skill1' }, { id: 'skill2' }];
    skillCache.cacheQuery('query-key', results);
    
    expect(skillCache.get('query-key')).toEqual(results);
  });

  it('should cache and retrieve validation results', () => {
    const validation = { valid: true, errors: [], warnings: [] };
    skillCache.cacheValidation('skill-id', validation);
    
    expect(skillCache.getCachedValidation('skill-id')).toEqual(validation);
  });

  it('should generate consistent query keys', () => {
    const query1 = { name: 'test', layer: 1 };
    const query2 = { name: 'test', layer: 1 };
    const query3 = { name: 'test', layer: 2 };
    
    const key1 = SkillCache.generateQueryKey(query1);
    const key2 = SkillCache.generateQueryKey(query2);
    const key3 = SkillCache.generateQueryKey(query3);
    
    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3);
  });
});

describe('ResourceTracker', () => {
  let tracker: ResourceTracker;

  beforeEach(() => {
    tracker = new ResourceTracker();
  });

  it('should track performance checkpoints', (done) => {
    tracker.checkpoint('start');
    
    setTimeout(() => {
      tracker.checkpoint('middle');
      
      setTimeout(() => {
        tracker.checkpoint('end');
        
        const report = tracker.getReport();
        
        expect(report.checkpoints).toHaveLength(3);
        expect(report.checkpoints[0].name).toBe('start');
        expect(report.checkpoints[1].name).toBe('middle');
        expect(report.checkpoints[2].name).toBe('end');
        
        expect(report.totalDuration).toBeGreaterThan(0);
        expect(report.checkpoints[0].duration).toBeGreaterThanOrEqual(0);
        
        done();
      }, 10);
    }, 10);
  });

  it('should calculate memory deltas', () => {
    const report = tracker.getReport();
    
    expect(typeof report.memoryDelta).toBe('number');
    expect(report.checkpoints.every(cp => typeof cp.memoryDelta === 'number')).toBe(true);
  });
});