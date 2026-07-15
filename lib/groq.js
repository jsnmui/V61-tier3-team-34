import Groq from "groq-sdk";

let groqClient = null;

export function getGroqClient() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY environment variable.");
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

// llama-3.1-8b-instant: higher TPM limit on Groq free tier (good for MVP).
// Switch to llama-3.3-70b-versatile for better quality if on a paid tier.
export const GROQ_MODEL = "llama-3.1-8b-instant";

// Groq free tier TPM limit is ~14,000 tokens for the 8b model.
// We cap the JD text at ~6,000 words (~8,000 tokens) before sending —
// job descriptions rarely need more than this to extract all fields.
const MAX_JD_CHARS = 24000;

export function truncateJDText(text) {
  if (!text || text.length <= MAX_JD_CHARS) return text;
  return text.slice(0, MAX_JD_CHARS) + "\n\n[Text truncated for processing]";
}

// =========================================================================
// IMPLEMENTATION: Rate-Limit Handling & Graceful Retry/Backoff 
// =========================================================================

const MAX_RETRIES = 5;
const INITIAL_DELAY_MS = 250;

/**
 * Helper to determine if an error is a rate limit error (429).
 * Used both internally and in unit testing assertions.
 */
export function isRateLimitError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    error.status === 429 || 
    error.statusCode === 429 ||
    msg.includes("rate limit") ||
    msg.includes("rate_limit_exceeded") ||
    error.error?.code === "rate_limit_exceeded"
  );
}

/**
 * Calculates exponential backoff with full jitter to avoid retry storms.
 * (e.g., Step 0: up to 250ms -> Step 1: up to 500ms -> Step 2: up to 1000ms...)
 */
export function calculateDelayWithJitter(attempt, baseDelay = INITIAL_DELAY_MS) {
  const delay = baseDelay * Math.pow(2, attempt);
  return Math.random() * delay; // Full jitter range: [0, delay]
}

/**
 * Executes a Groq API function with backoff logic and atomic persistence.
 * 
 * @param {Function} groqCallFn - An anonymous function or arrow wrapper returning a Groq API call promise.
 * @param {Function} supabaseWriteFn - An anonymous function or arrow wrapper executing your Supabase insert/upsert.
 * @param {string} endpointName - Identifier name used for structured logging and monitoring observability.
 */
export async function executeGroqWithRetry(groqCallFn, supabaseWriteFn, endpointName = "groq-api-call") {
  let attempt = 0;

  while (attempt <= MAX_RETRIES) {
    try {
      // Core LLM Call Execution
      const result = await groqCallFn();

      //  No Duplicate Writes
      // Supabase write is explicitly isolated until AFTER a successful Groq 200 response.
      if (supabaseWriteFn) {
        await supabaseWriteFn(result);
      }

      // Log success recovery if it previously hit rate limits
      if (attempt > 0) {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          endpoint: endpointName,
          retryCount: attempt,
          errorType: "NONE",
          message: "Recovered successfully after encountering a rate limit.",
          finalOutcome: "SUCCESS"
        }));
      }

      return result;

    } catch (error) {
      // Structural/Validation error paths bypass retries completely and fail instantly
      if (!isRateLimitError(error)) {
        throw error;
      }

      attempt++;

      //  Structured Logging for Observability
      console.warn(JSON.stringify({
        timestamp: new Date().toISOString(),
        endpoint: endpointName,
        retryCount: attempt,
        errorType: "RATE_LIMIT_429",
        message: error.message || "Groq TPM/RPM limit hit."
      }));

      // Fallback behavior once max retries are exceeded
      if (attempt > MAX_RETRIES) {
        console.error(JSON.stringify({
          timestamp: new Date().toISOString(),
          endpoint: endpointName,
          retryCount: attempt - 1,
          errorType: "RATE_LIMIT_EXHAUSTED",
          message: "Maximum retry attempts reached. Request aborted.",
          finalOutcome: "EXHAUSTED_FAILURE"
        }));
        
        // User-Friendly, Stable Error Shape (Hides deep internal tech stacks)
        throw new Error("The AI engine is currently experiencing heavy traffic.");
      }

      // Exponential Backoff + Jitter Mechanics
      const delay = calculateDelayWithJitter(attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}