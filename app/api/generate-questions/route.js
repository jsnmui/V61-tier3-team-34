import { NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL, executeGroqWithRetry } from "@/lib/groq";
import {
  buildQuestionGenerationPrompt,
  normalizeQuestions,
} from "@/lib/questionGeneration";
import { parseLLMJson } from "@/lib/jobExtraction";
import { getSupabaseClient } from "@/lib/supabase";

export const runtime = "nodejs";

/**
 * POST /api/generate-questions
 * Body: { sessionId: string, extractedJob: object, quantityPerCategory?: number }
 */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { sessionId, extractedJob, quantityPerCategory = 5 } = body;

  if (!extractedJob || typeof extractedJob !== "object") {
    return NextResponse.json(
      { error: "Missing extracted job data — analyze a job description first." },
      { status: 400 }
    );
  }

  const safeQuantity = Math.min(Math.max(Number(quantityPerCategory) || 5, 1), 20);

  // Variable to hold the final questions returned from our atomic step
  let finalQuestions = null;

  try {
    // 1. Define the Groq task execution step
    const groqCallFn = async () => {
      const groq = getGroqClient();
      const completion = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          {
            role: "user",
            content: buildQuestionGenerationPrompt(extractedJob, safeQuantity),
          },
        ],
        temperature: 0.6,
        response_format: { type: "json_object" },
      });

      const rawContent = completion.choices?.[0]?.message?.content || "";
      const parsed = parseLLMJson(rawContent);
      return normalizeQuestions(parsed);
    };

    // 2. Define the isolated database write step 
    const supabaseWriteFn = async (questions) => {
      finalQuestions = questions; // Assign questions to the variable for the API response

      if (sessionId) {
        const supabase = getSupabaseClient();
        const { error } = await supabase
          .from("jd_sessions")
          .update({ generated_questions: questions })
          .eq("id", sessionId);

        if (error) {
          console.error("Supabase update error (generated_questions):", error);
          throw error;
        }
      }
    };

    // 3. Execute the atomic wrapper loop
    await executeGroqWithRetry(groqCallFn, supabaseWriteFn, "generate-questions");

  } catch (err) {
    if (err.message && err.message.includes("heavy traffic")) {
      return NextResponse.json(
        { error: err.message },
        { status: 429 }
      );
    }

    console.error("Groq question generation error pipeline failed:", err);
    return NextResponse.json(
      {
        error:
          "We couldn't generate questions right now. Please try again in a moment.",
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ sessionId: sessionId || null, questions: finalQuestions });
}