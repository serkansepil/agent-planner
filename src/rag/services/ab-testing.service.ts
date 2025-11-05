import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ABTestVariant, RAGResponse } from '../interfaces/rag.interface';
import { createHash } from 'crypto';

export interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  startDate: Date;
  endDate?: Date;
  active: boolean;
}

export interface ABTestMetrics {
  variant: string;
  totalRequests: number;
  averageConfidence: number;
  averageLatency: number;
  successRate: number;
  userSatisfactionScore?: number;
}

@Injectable()
export class ABTestingService {
  private readonly logger = new Logger(ABTestingService.name);
  private readonly activeTests: Map<string, ABTestConfig> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Select variant for user using consistent hashing
   */
  selectVariant(testId: string, userId: string): ABTestVariant | null {
    const test = this.activeTests.get(testId);

    if (!test || !test.active) {
      return null;
    }

    // Check if test is within date range
    const now = new Date();
    if (now < test.startDate || (test.endDate && now > test.endDate)) {
      return null;
    }

    // Use consistent hashing to assign variant
    const hash = this.hashUserId(userId, testId);
    const variantIndex = this.selectVariantIndex(hash, test.variants);

    return test.variants[variantIndex];
  }

  /**
   * Record test result
   */
  async recordTestResult(
    testId: string,
    variantId: string,
    userId: string,
    response: RAGResponse,
    userFeedback?: {
      helpful: boolean;
      rating?: number;
    },
  ): Promise<void> {
    // In a production system, this would store to database
    // For now, we'll update in-memory metrics

    const test = this.activeTests.get(testId);
    if (!test) {
      return;
    }

    const variant = test.variants.find((v) => v.id === variantId);
    if (!variant) {
      return;
    }

    // Update metrics
    if (!variant.metrics) {
      variant.metrics = {
        requests: 0,
        averageConfidence: 0,
        averageLatency: 0,
        userSatisfaction: 0,
      };
    }

    const metrics = variant.metrics;
    const prevRequests = metrics.requests;

    // Update running averages
    metrics.requests += 1;
    metrics.averageConfidence =
      (metrics.averageConfidence * prevRequests + response.confidence.overall) /
      metrics.requests;
    metrics.averageLatency =
      (metrics.averageLatency * prevRequests + response.executionTimeMs) /
      metrics.requests;

    if (userFeedback) {
      const feedbackScore = userFeedback.helpful ? 1 : 0;
      metrics.userSatisfaction =
        ((metrics.userSatisfaction || 0) * prevRequests + feedbackScore) /
        metrics.requests;
    }

    this.logger.debug(
      `Recorded test result for ${testId}/${variantId}: confidence=${response.confidence.overall}, latency=${response.executionTimeMs}ms`,
    );
  }

  /**
   * Create new A/B test
   */
  createTest(config: ABTestConfig): void {
    // Validate weights sum to 1
    const totalWeight = config.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.001) {
      throw new Error(`Variant weights must sum to 1.0 (got ${totalWeight})`);
    }

    this.activeTests.set(config.testId, config);
    this.logger.log(
      `Created A/B test: ${config.name} with ${config.variants.length} variants`,
    );
  }

  /**
   * Get test results
   */
  getTestResults(testId: string): ABTestMetrics[] | null {
    const test = this.activeTests.get(testId);
    if (!test) {
      return null;
    }

    return test.variants.map((variant) => ({
      variant: variant.name,
      totalRequests: variant.metrics?.requests || 0,
      averageConfidence: variant.metrics?.averageConfidence || 0,
      averageLatency: variant.metrics?.averageLatency || 0,
      successRate: this.calculateSuccessRate(variant),
      userSatisfactionScore: variant.metrics?.userSatisfaction,
    }));
  }

  /**
   * Determine winning variant (based on multiple metrics)
   */
  determineWinner(testId: string): {
    winner: string;
    confidence: number;
    metrics: Record<string, any>;
  } | null {
    const results = this.getTestResults(testId);
    if (!results || results.length === 0) {
      return null;
    }

    // Score each variant based on weighted metrics
    const scores = results.map((result) => {
      const confidenceScore = result.averageConfidence * 0.4;
      const latencyScore = this.normalizeLatency(result.averageLatency) * 0.2;
      const successScore = result.successRate * 0.2;
      const satisfactionScore = (result.userSatisfactionScore || 0.5) * 0.2;

      const totalScore =
        confidenceScore + latencyScore + successScore + satisfactionScore;

      return {
        variant: result.variant,
        score: totalScore,
        metrics: result,
      };
    });

    // Find highest scoring variant
    scores.sort((a, b) => b.score - a.score);
    const winner = scores[0];

    // Calculate confidence in winner (based on gap from second place)
    const winnerConfidence =
      scores.length > 1 ? Math.min((winner.score - scores[1].score) * 10, 1) : 1;

    return {
      winner: winner.variant,
      confidence: winnerConfidence,
      metrics: winner.metrics,
    };
  }

  /**
   * Stop test
   */
  stopTest(testId: string): void {
    const test = this.activeTests.get(testId);
    if (test) {
      test.active = false;
      this.logger.log(`Stopped A/B test: ${testId}`);
    }
  }

  /**
   * Get all active tests
   */
  getActiveTests(): ABTestConfig[] {
    return Array.from(this.activeTests.values()).filter((test) => test.active);
  }

  /**
   * Hash user ID for consistent variant assignment
   */
  private hashUserId(userId: string, testId: string): number {
    const hash = createHash('sha256')
      .update(`${testId}:${userId}`)
      .digest('hex');

    // Convert first 8 chars of hash to number
    return parseInt(hash.substring(0, 8), 16);
  }

  /**
   * Select variant index based on hash and weights
   */
  private selectVariantIndex(hash: number, variants: ABTestVariant[]): number {
    // Normalize hash to 0-1
    const normalized = (hash % 1000000) / 1000000;

    // Select variant based on cumulative weights
    let cumulative = 0;
    for (let i = 0; i < variants.length; i++) {
      cumulative += variants[i].weight;
      if (normalized < cumulative) {
        return i;
      }
    }

    // Fallback to last variant
    return variants.length - 1;
  }

  /**
   * Calculate success rate (responses with confidence >= 0.7)
   */
  private calculateSuccessRate(variant: ABTestVariant): number {
    if (!variant.metrics || variant.metrics.requests === 0) {
      return 0;
    }

    // For now, use confidence as proxy for success
    return variant.metrics.averageConfidence >= 0.7 ? 1 : 0.5;
  }

  /**
   * Normalize latency to 0-1 score (lower is better)
   */
  private normalizeLatency(latency: number): number {
    // Assume 5000ms is worst case, 0ms is best
    const maxLatency = 5000;
    return Math.max(0, 1 - latency / maxLatency);
  }

  /**
   * Export test results for analysis
   */
  exportTestResults(testId: string): any {
    const test = this.activeTests.get(testId);
    if (!test) {
      return null;
    }

    const results = this.getTestResults(testId);
    const winner = this.determineWinner(testId);

    return {
      test: {
        id: test.testId,
        name: test.name,
        description: test.description,
        startDate: test.startDate,
        endDate: test.endDate,
        active: test.active,
      },
      variants: test.variants.map((v) => ({
        id: v.id,
        name: v.name,
        weight: v.weight,
        strategy: v.strategy.name,
      })),
      results,
      winner,
      totalRequests: results?.reduce((sum, r) => sum + r.totalRequests, 0) || 0,
    };
  }

  /**
   * Calculate statistical significance (simplified)
   */
  calculateSignificance(
    testId: string,
    variantA: string,
    variantB: string,
  ): {
    significant: boolean;
    pValue: number;
    improvement: number;
  } {
    const results = this.getTestResults(testId);
    if (!results) {
      return { significant: false, pValue: 1, improvement: 0 };
    }

    const resultA = results.find((r) => r.variant === variantA);
    const resultB = results.find((r) => r.variant === variantB);

    if (!resultA || !resultB) {
      return { significant: false, pValue: 1, improvement: 0 };
    }

    // Simplified significance calculation
    // In production, use proper statistical tests
    const improvement =
      (resultA.averageConfidence - resultB.averageConfidence) /
      resultB.averageConfidence;
    const sampleSize = Math.min(resultA.totalRequests, resultB.totalRequests);

    // Simple threshold-based approach
    const significant = Math.abs(improvement) > 0.1 && sampleSize >= 30;
    const pValue = significant ? 0.05 : 0.5;

    return { significant, pValue, improvement };
  }
}
