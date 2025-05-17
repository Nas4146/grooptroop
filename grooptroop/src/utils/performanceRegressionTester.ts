import { SimplePerformance } from './simplePerformance';

type BenchmarkResult = {
  name: string;
  samples: number[];
  averageTime: number;
  medianTime: number;
  minTime: number;
  maxTime: number;
  p95Time: number; // 95th percentile
};

/**
 * Utility for performance regression testing
 */
export class PerformanceRegressionTester {
  private static benchmarks: Record<string, BenchmarkResult> = {};
  private static baselineData: Record<string, BenchmarkResult> = {};
  
  /**
   * Run a benchmark test multiple times
   */
  static async runBenchmark(
    name: string,
    testFn: () => Promise<void> | void,
    options: { iterations?: number; warmupRounds?: number } = {}
  ): Promise<BenchmarkResult> {
    const iterations = options.iterations || 5;
    const warmupRounds = options.warmupRounds || 2;
    
    SimplePerformance.logEvent('benchmark', `Starting benchmark: ${name} (${iterations} iterations)`);
    
    // Warmup rounds to stabilize performance
    for (let i = 0; i < warmupRounds; i++) {
      await testFn();
    }
    
    // Actual benchmark
    const samples: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await testFn();
      const end = performance.now();
      samples.push(end - start);
    }
    
    // Calculate statistics
    samples.sort((a, b) => a - b); // Sort for percentiles
    
    const result: BenchmarkResult = {
      name,
      samples,
      averageTime: samples.reduce((sum, time) => sum + time, 0) / samples.length,
      medianTime: samples[Math.floor(samples.length / 2)],
      minTime: samples[0],
      maxTime: samples[samples.length - 1],
      p95Time: samples[Math.floor(samples.length * 0.95)]
    };
    
    // Store result
    this.benchmarks[name] = result;
    
    SimplePerformance.logEvent('benchmark', 
      `Benchmark complete: ${name}, avg: ${result.averageTime.toFixed(2)}ms, median: ${result.medianTime.toFixed(2)}ms`);
    
    // Check against baseline if available
    this.compareWithBaseline(name, result);
    
    return result;
  }
  
  /**
   * Save current benchmarks as baseline
   */
  static saveAsBaseline(): void {
    this.baselineData = { ...this.benchmarks };
    SimplePerformance.logEvent('benchmark', `Saved ${Object.keys(this.benchmarks).length} benchmarks as baseline`);
  }
  
  /**
   * Compare benchmark with baseline
   */
  private static compareWithBaseline(name: string, current: BenchmarkResult): void {
    const baseline = this.baselineData[name];
    if (!baseline) return;
    
    const percentChange = ((current.averageTime - baseline.averageTime) / baseline.averageTime) * 100;
    const isRegression = percentChange > 10; // 10% slower is considered a regression
    
    SimplePerformance.logEvent(
      'benchmark', 
      `${name} vs baseline: ${percentChange.toFixed(2)}% ${percentChange >= 0 ? 'slower' : 'faster'}`,
      undefined,
      isRegression
    );
  }
  
  /**
   * Get all benchmark results
   */
  static getResults(): Record<string, BenchmarkResult> {
    return { ...this.benchmarks };
  }
}