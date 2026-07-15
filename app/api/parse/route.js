import { NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL, truncateJDText, executeGroqWithRetry } from "@/lib/groq";
import {
  buildExtractionPrompt,
  normalizeExtractedJob,
  parseLLMJson,
} from "@/lib/jobExtraction";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/parse
 * Body: { sessionId: string, jdText: string }
 *
 * Sends the JD text to Groq with a structured-extraction prompt,
 * validates the JSON response, saves it to the session row, and
 * returns the structured job data to the client.
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sessionId, jdText } = body;

  if (!jdText || jdText.trim().length < 30) {
    return NextResponse.json(
      { error: "Job description text is missing or too short to analyze." },
      { status: 400 }
    );
  }

  // Variable to hold the final validated output from our atomic block
  let finalExtractedJob;

  try {
    // 1. Isolate the Groq text processing step
    const groqCallFn = async () => {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: buildExtractionPrompt(truncateJDText(jdText)) }],
        temperature: 0.2,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices?.[0]?.message?.content || "";
      const parsed = parseLLMJson(rawContent);
      return normalizeExtractedJob(parsed);
    };

    // 2. Isolate the Supabase update 
    // This executes exclusively if the upstream Groq processing completes without error.
    const supabaseWriteFn = async (extractedJob) => {
      finalExtractedJob = extractedJob; // Bubble up out of the closure for our API return status

      if (sessionId) {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("jd_sessions")
          .update({ extracted_json: extractedJob })
          .eq("id", sessionId);

        if (error) {
          console.error("Supabase update error (extracted_json):", error);
          throw error; // Throwing inside here preserves database sanity 
        }
      }
    };

    // 3. Execute both blocks through the automated retry harness
    await executeGroqWithRetry(groqCallFn, supabaseWriteFn, "parse-job-description");

  } catch (err) {
    
    if (err.message && err.message.includes("heavy traffic")) {
      return NextResponse.json(
        { error: err.message },
        { status: 429 } // Too Many Requests back to front-end components
      );
    }

    console.error("Groq extraction error pipeline failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't analyze that job description right now. Please try again in a moment.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ sessionId: sessionId || null, extractedJob: finalExtractedJob });
}