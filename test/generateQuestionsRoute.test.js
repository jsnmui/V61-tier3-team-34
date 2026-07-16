import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Declare references to mock spies so they can be modified dynamically
const mockExecuteGroq = vi.fn();
const mockParseLLMJson = vi.fn();
const mockNormalizeQuestions = vi.fn();
const mockGetSupabaseClient = vi.fn();
const mockCreateCompletion = vi.fn(); // Mock completions inside the client

// 2. Mock the modules using our dynamic references
vi.mock("@/lib/groq", () => ({
  getGroqClient: vi.fn(() => ({
    chat: {
      completions: {
        create: mockCreateCompletion,
      },
    },
  })),
  executeGroqWithRetry: async (groqCallFn, supabaseWriteFn) => {
    // Await the spy. If the test calls mockRejectedValue (e.g. timeout), this throws immediately.
    const mockResult = await mockExecuteGroq(); 
    
    // If the test set up a mocked response on mockExecuteGroq, route it through to the completions mock
    if (mockResult && mockResult.choices) {
      mockCreateCompletion.mockResolvedValueOnce(mockResult);
    }
    
    // Execute the real parsing callback
    const result = await groqCallFn();
    
    // Execute database callback inside our resiliency wrapper
    if (supabaseWriteFn) {
      try {
        await supabaseWriteFn(result);
      } catch (dbError) {
        console.warn("Mock executeGroqWithRetry caught swallowed DB write error:", dbError.message);
      }
    }
    
    return result;
  }, 
  GROQ_MODEL: "mock-model",
}));

vi.mock("@/lib/questionGeneration", () => ({
  buildQuestionGenerationPrompt: vi.fn(() => "prompt"),
  normalizeQuestions: (...args) => mockNormalizeQuestions(...args),
}));

vi.mock("@/lib/jobExtraction", () => ({
  parseLLMJson: (...args) => mockParseLLMJson(...args),
}));

vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: (...args) => mockGetSupabaseClient(...args),
}));

// 3. Import route ONLY after defining module mocks
import { POST } from "../app/api/generate-questions/route";

describe("POST /api/generate-questions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExecuteGroq.mockReset();
    mockParseLLMJson.mockReset();
    mockNormalizeQuestions.mockReset();
    mockGetSupabaseClient.mockReset();
    mockCreateCompletion.mockReset();

    // Setup safe defaults
    mockNormalizeQuestions.mockImplementation((q) => q);
    mockGetSupabaseClient.mockReturnValue({
      from: () => ({
        update: () => ({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });
  });

  // ---------------------------------------------------------------------------
  // Validation tests
  // ---------------------------------------------------------------------------

  describe("Validation", () => {
    it("returns 400 for invalid JSON body", async () => {
      const req = {
        json: vi.fn().mockRejectedValue(new Error()),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Invalid request body.",
      });
    });

    it("returns 400 when extractedJob is missing", async () => {
      const req = {
        json: vi.fn().mockResolvedValue({}),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
    });

    it("returns 400 when extractedJob is not an object", async () => {
      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: "developer",
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(400);
    });
  });

  // ---------------------------------------------------------------------------
  // Success tests
  // ---------------------------------------------------------------------------

  describe("Successful generation", () => {
    it("returns generated questions", async () => {
      mockExecuteGroq.mockResolvedValue({
        choices: [
          {
            message: {
              content: '{"technical":[]}',
            },
          },
        ],
      });

      mockParseLLMJson.mockReturnValue({
        technical: [],
      });

      // Crucial: Your route file expects "questions" key to wrap technical
      mockNormalizeQuestions.mockReturnValue({
        technical: [],
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: {
            job_title: "Developer",
          },
        }),
      };

      const res = await POST(req);
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.questions).toEqual({
        technical: [],
        behavioral: [],
        experience: [],
      });
    });

    it("returns sessionId when supplied", async () => {
      mockExecuteGroq.mockResolvedValue({
        choices: [{ message: { content: "{}" } }],
      });

      mockParseLLMJson.mockReturnValue({});
      mockNormalizeQuestions.mockReturnValue({});

      const req = {
        json: vi.fn().mockResolvedValue({
          sessionId: "123",
          extractedJob: {},
        }),
      };

      const res = await POST(req);
      const body = await res.json();

      expect(body.sessionId).toBe("123");
    });
  });

  // ---------------------------------------------------------------------------
  // Groq failures
  // ---------------------------------------------------------------------------

  describe("Groq failures", () => {
    it("returns 502 when Groq throws", async () => {
      mockExecuteGroq.mockRejectedValue(new Error("timeout"));

      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(502);
    });

    it("returns 502 when LLM returns malformed JSON", async () => {
      mockExecuteGroq.mockResolvedValue({
        choices: [{ message: { content: "not json" } }],
      });

      mockParseLLMJson.mockImplementation(() => {
        throw new Error("bad json");
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(502);
    });
  });

  // ---------------------------------------------------------------------------
  // Supabase
  // ---------------------------------------------------------------------------

  describe("Supabase persistence", () => {
    it("continues when database update succeeds", async () => {
      mockExecuteGroq.mockResolvedValue({
        choices: [{ message: { content: "{}" } }],
      });

      mockParseLLMJson.mockReturnValue({});
      mockNormalizeQuestions.mockReturnValue({});

      const req = {
        json: vi.fn().mockResolvedValue({
          sessionId: "1",
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(200);
    });

    it("still returns 200 when Supabase update fails", async () => {
      mockExecuteGroq.mockResolvedValue({
        choices: [{ message: { content: "{}" } }],
      });

      mockParseLLMJson.mockReturnValue({});
      mockNormalizeQuestions.mockReturnValue({});

      mockGetSupabaseClient.mockReturnValue({
        from: () => ({
          update: () => ({
            eq: vi.fn().mockResolvedValue({
              error: { message: "db failed" },
            }),
          }),
        }),
      });

      const req = {
        json: vi.fn().mockResolvedValue({
          sessionId: "1",
          extractedJob: {},
        }),
      };

      const res = await POST(req);

      expect(res.status).toBe(200);
    });
  });
});