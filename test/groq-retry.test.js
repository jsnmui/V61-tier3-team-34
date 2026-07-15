import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeGroqWithRetry, calculateDelayWithJitter, isRateLimitError } from "@/lib/groq";

describe("Groq Rate-Limit & Backoff Test Suite", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --- 1. Rate-Limit Detection ---
  describe("Rate-Limit Detection", () => {
    it("should correctly identify 429 rate limit errors", () => {
      const mockError = { status: 429, message: "Rate limit exceeded" };
      expect(isRateLimitError(mockError)).toBe(true);
    });

    it("should correctly identify alternative rate limit signatures", () => {
      const mockError = new Error("Too Many Requests");
      mockError.status = 429;
      expect(isRateLimitError(mockError)).toBe(true);

      const alternativeError = new Error("rate_limit_exceeded");
      expect(isRateLimitError(alternativeError)).toBe(true);
    });

    it("should return false for unrelated errors (e.g. 500, Auth)", () => {
      const badAuth = { status: 401, message: "Invalid API Key" };
      expect(isRateLimitError(badAuth)).toBe(false);
    });
  });

  // --- 2. Backoff Timing Logic ---
  describe("Backoff Timing & Jitter Logic", () => {
    it("should dynamically calculate exponential delays with random jitter values", () => {
      const baseDelay = 250;
      
      // We test step 0, 1, and 2
      const stepZeroMax = baseDelay * Math.pow(2, 0); // 250ms
      const stepOneMax = baseDelay * Math.pow(2, 1);  // 500ms
      const stepTwoMax = baseDelay * Math.pow(2, 2);  // 1000ms

      for (let i = 0; i < 20; i++) {
        const delay0 = calculateDelayWithJitter(0, baseDelay);
        const delay1 = calculateDelayWithJitter(1, baseDelay);
        const delay2 = calculateDelayWithJitter(2, baseDelay);

        expect(delay0).toBeGreaterThanOrEqual(0);
        expect(delay0).toBeLessThanOrEqual(stepZeroMax);

        expect(delay1).toBeGreaterThanOrEqual(0);
        expect(delay1).toBeLessThanOrEqual(stepOneMax);

        expect(delay2).toBeGreaterThanOrEqual(0);
        expect(delay2).toBeLessThanOrEqual(stepTwoMax);
      }
    });
  });

  // --- 3. Retry Success Path ---
  describe("Retry Success Path", () => {
    it("should successfully resolve on a retry after encountering initial 429 errors", async () => {
      const mockGroqCall = vi.fn()
        .mockRejectedValueOnce({ status: 429, message: "Rate limit hit 1" })
        .mockRejectedValueOnce({ status: 429, message: "Rate limit hit 2" })
        .mockResolvedValueOnce({ questions: ["Q1", "Q2"] }); // Succeeds on 3rd attempt

      const mockSupabaseWrite = vi.fn().mockResolvedValue({ success: true });

      // Run execution wrapper
      const executionPromise = executeGroqWithRetry(mockGroqCall, mockSupabaseWrite, "test-success");

      // Fast-forward timers through the two backoff phases
      await vi.runAllTimersAsync();

      const result = await executionPromise;

      expect(mockGroqCall).toHaveBeenCalledTimes(3);
      expect(mockSupabaseWrite).toHaveBeenCalledTimes(1);
      expect(mockSupabaseWrite).toHaveBeenCalledWith({ questions: ["Q1", "Q2"] });
      expect(result).toEqual({ questions: ["Q1", "Q2"] });
    });
  });

  // --- 4. Retry Failure Path ---
  describe("Retry Failure Path", () => {
    it("should stop retrying and throw an error when max limit is exhausted", async () => {
      // Stub the 5 retries to always throw a rate limit error
      const mockGroqCall = vi.fn().mockRejectedValue({ status: 429, message: "Rate Limit Persistent" });
      const mockSupabaseWrite = vi.fn();
      
      const executionPromise = executeGroqWithRetry(mockGroqCall, mockSupabaseWrite, "test-failure");

        // Run the timers *and* handle the promise chain in tandem:
        await Promise.all([
        vi.runAllTimersAsync(),
        expect(executionPromise).rejects.toThrow(/heavy traffic/i)
        ]);
     
    });
  });

  // --- 5. Prevention of Duplicate Writes ---
  describe("Prevention of Duplicate Writes", () => {
    it("should never execute Supabase writes during rate limit retries", async () => {
      const mockGroqCall = vi.fn()
        .mockRejectedValueOnce({ status: 429, message: "Rate limit" })
        .mockRejectedValueOnce({ status: 429, message: "Rate limit" })
        .mockResolvedValueOnce({ result: "Success" });

      const mockSupabaseWrite = vi.fn().mockResolvedValue({ success: true });

      const executionPromise = executeGroqWithRetry(mockGroqCall, mockSupabaseWrite, "test-no-duplicates");

      // Verify that while waiting for timers, database write counts are at 0
      expect(mockSupabaseWrite).toHaveBeenCalledTimes(0);

      await vi.runAllTimersAsync();
      await executionPromise;

      // Successfully resolved, but written strictly once!
      expect(mockSupabaseWrite).toHaveBeenCalledTimes(1);
    });
  });
});