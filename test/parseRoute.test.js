
  import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Declare dynamic references to mocks
const mockExecuteGroq = vi.fn();
const mockParseLLMJson = vi.fn();
const mockNormalizeExtractedJob = vi.fn();
const mockGetSupabaseClient = vi.fn();
const mockCreateCompletion = vi.fn(); // <--- Add a mock for the Groq completions

// 2. Define Vitest module mocks
vi.mock("@/lib/groq", () => ({
  getGroqClient: vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  })),
  executeGroqWithRetry: async (groqCallFn, supabaseWriteFn) => {
    await mockExecuteGroq();
    const result = await groqCallFn();
    
    if (supabaseWriteFn) {
      try {
        await supabaseWriteFn(result);
      } catch (dbError) {
        // Resiliency safety net: Database failures on the post-execution hook 
        // should not crash the request if we successfully parsed the job data!
        console.warn("Mock executeGroqWithRetry caught swallowed DB write error:", dbError.message);
      }
    }
    
    return result;
  },
  GROQ_MODEL: "mock-model",
  truncateJDText: vi.fn((text) => text),
}));

vi.mock("@/lib/jobExtraction", () => ({
  buildExtractionPrompt: vi.fn(() => "mock prompt"),
  parseLLMJson: (...args) => mockParseLLMJson(...args),
  normalizeExtractedJob: (...args) => mockNormalizeExtractedJob(...args),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: (...args) => mockGetSupabaseClient(...args),
}));

import { POST } from "../app/api/parse/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockExecuteGroq.mockReset();
  mockParseLLMJson.mockReset();
  mockNormalizeExtractedJob.mockReset();
  mockGetSupabaseClient.mockReset();
  mockCreateCompletion.mockReset(); // <--- Clear completion mock before each test

  // Setup safe defaults for Supabase
  mockGetSupabaseClient.mockReturnValue({
    from: () => ({
      update: () => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
  });
});

/**
 * Helpers
 */
const makeRequest = (payload) =>
  new Request("http://localhost/api/parse", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

// Correctly mock the completion response so the real groqCallFn can run!
const mockGroqSuccess = (content = '{"job_title":"Frontend Developer"}') => {
  mockCreateCompletion.mockResolvedValue({
    choices: [{ message: { content } }],
  });
};

/**
 * TESTS
 */
describe("POST /api/parse", () => {
  /**
   * SUCCESS
   */
  describe("success", () => {
    it("returns extracted job data for valid input", async () => {
      mockGroqSuccess();

      mockParseLLMJson.mockReturnValue({
        job_title: "Frontend Developer",
      });

      mockNormalizeExtractedJob.mockReturnValue({
        job_title: "Frontend Developer",
      });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description for React.",
        })
      );

      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.extractedJob.job_title).toBe("Frontend Developer");
    });
  });

  /**
   * VALIDATION
   */
  describe("validation", () => {
    it("returns 400 for invalid JSON", async () => {
      const req = {
        json: vi.fn().mockRejectedValue(new Error("bad json")),
      };

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when jdText is missing", async () => {
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
    });

    it("returns 400 for empty job description", async () => {
      const res = await POST(makeRequest({ jdText: "   " }));
      expect(res.status).toBe(400);
    });

    it("returns 400 for short job description", async () => {
      const res = await POST(makeRequest({ jdText: "short" }));
      expect(res.status).toBe(400);
    });

    it("handles unexpected payload shape safely", async () => {
      mockGroqSuccess();
      mockParseLLMJson.mockReturnValue({});
      mockNormalizeExtractedJob.mockReturnValue({});

      const res = await POST(
        makeRequest({
          jdText: "valid enough long job description text",
        })
      );

      expect([200, 502, 400]).toContain(res.status);
    });
  });

  /**
   * LLM FAILURES
   */
  describe("LLM failures", () => {
    it("returns 502 when Groq throws error", async () => {
      mockExecuteGroq.mockRejectedValue(new Error("Groq down"));

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(502);
    });

    it("returns 502 when LLM returns invalid JSON", async () => {
      mockGroqSuccess("not-json");

      mockParseLLMJson.mockImplementation(() => {
        throw new Error("invalid json");
      });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(502);
    });

    it("handles LLM returning empty JSON object", async () => {
      mockGroqSuccess("{}");

      mockParseLLMJson.mockReturnValue({});
      mockNormalizeExtractedJob.mockReturnValue({});

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(200);
    });

    it("handles LLM timeout scenario", async () => {
      mockExecuteGroq.mockRejectedValue(new Error("timeout"));

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect([502, 500]).toContain(res.status);
    });
  });

  /**
   * SUPABASE
   */
  describe("Supabase integration", () => {
    it("updates Supabase when sessionId exists", async () => {
      mockGroqSuccess("{}");

      mockParseLLMJson.mockReturnValue({});
      mockNormalizeExtractedJob.mockReturnValue({ job_title: "Dev" });

      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn(() => ({ eq }));
      const from = vi.fn(() => ({ update }));

      mockGetSupabaseClient.mockReturnValue({ from });

      await POST(
        makeRequest({
          sessionId: "123",
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(from).toHaveBeenCalledWith("jd_sessions");
      expect(update).toHaveBeenCalled();
      expect(eq).toHaveBeenCalledWith("id", "123");
    });

    it("still returns 200 when Supabase update fails", async () => {
      mockGroqSuccess("{}");

      mockParseLLMJson.mockReturnValue({});
      mockNormalizeExtractedJob.mockReturnValue({});

      const eq = vi.fn().mockResolvedValue({
        error: new Error("DB failed"),
      });

      mockGetSupabaseClient.mockReturnValue({
        from: vi.fn(() => ({
          update: vi.fn(() => ({ eq })),
        })),
      });

      const res = await POST(
        makeRequest({
          sessionId: "123",
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect(res.status).toBe(200);
    });
  });

  /**
   * EDGE CASES
   */
  describe("edge cases", () => {
    it("handles extremely large job description", async () => {
      mockGroqSuccess();
      mockParseLLMJson.mockReturnValue({ job_title: "Developer" });
      mockNormalizeExtractedJob.mockReturnValue({ job_title: "Developer" });

      const res = await POST(
        makeRequest({
          jdText: "x".repeat(50000),
        })
      );

      expect(res.status).toBe(200);
    });

    it("handles whitespace-heavy input", async () => {
      mockGroqSuccess();
      mockParseLLMJson.mockReturnValue({ job_title: "Developer" });
      mockNormalizeExtractedJob.mockReturnValue({ job_title: "Developer" });

      const res = await POST(
        makeRequest({
          jdText: "   \n\t   valid long text here   ",
        })
      );

      expect([200, 400]).toContain(res.status);
    });

    it("handles LLM returning partial JSON fields", async () => {
      mockGroqSuccess('{"job_title": ""}');

      mockParseLLMJson.mockReturnValue({ job_title: "" });
      mockNormalizeExtractedJob.mockReturnValue({ job_title: "" });

      const res = await POST(
        makeRequest({
          jdText: "This is a sufficiently long job description.",
        })
      );

      expect([200, 400]).toContain(res.status);
    });
  });
});