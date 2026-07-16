import { NextResponse } from "next/server";
import { getGroqClient, GROQ_MODEL, executeGroqWithRetry } from "@/lib/groq";
import {
  normalizeQuestions,
} from "@/lib/questionGeneration";
import { parseLLMJson } from "@/lib/jobExtraction";
import { getSupabaseClient } from "@/lib/supabase";
export const runtime = "nodejs";

/**
 * POST /api/generate-questions
 * Body: { sessionId: string, extractedJob: object, quantityPerCategory?: number }
 *
 * Makes 3 separate Groq calls (one per category) to ensure the correct
 * number of questions is returned for each category.
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

  const CATEGORIES = ["technical", "behavioral", "experience"];

  // Build a focused prompt for a single category
  function buildSingleCategoryPrompt(extractedJob, category, quantity) {
    return `You are an experienced interviewer preparing to interview a candidate for this role.
Job title: ${extractedJob.job_title || "Unknown"}
Summary: ${extractedJob.job_description || "N/A"}
Required skills: ${extractedJob.required_skills?.join(", ") || "N/A"}
Preferred skills: ${extractedJob.preferred_skills?.join(", ") || "N/A"}
Responsibilities: ${extractedJob.responsibilities?.join("; ") || "N/A"}
Tools/Technologies: ${extractedJob.tools_and_technologies?.join(", ") || "N/A"}
Experience required: ${extractedJob.experience?.join("; ") || "N/A"}
Core competencies: ${extractedJob.core_competencies?.join(", ") || "N/A"}

Generate EXACTLY ${quantity} interview questions for the "${category}" category only.
${category === "technical" ? "Focus on hands-on knowledge of the required tools, skills, and technologies." : ""}
${category === "behavioral" ? "Focus on how the candidate has handled past situations (teamwork, conflict, leadership, communication)." : ""}
${category === "experience" ? "Focus on the candidate's specific past experience relevant to this role's responsibilities and seniority." : ""}

Each question must include a concise sample answer (3-5 sentences) written in first person.

Return ONLY a valid JSON object — no markdown fences, no commentary — matching exactly this shape:
{
  "${category}": [{ "question": "", "sample_answer": "" }]
}
The array must contain EXACTLY ${quantity} objects. Count carefully before responding.`;
  }

  let finalQuestions = { technical: [], behavioral: [], experience: [] };

  try {
    // Make 3 separate calls, one per category
    for (const category of CATEGORIES) {
      const groqCallFn = async () => {
        const groq = getGroqClient();
        const completion = await groq.chat.completions.create({
          model: GROQ_MODEL,
          messages: [
            {
              role: "user",
              content: buildSingleCategoryPrompt(extractedJob, category, safeQuantity),
            },
          ],
          temperature: 0.6,
          response_format: { type: "json_object" },
        });
        const rawContent = completion.choices?.[0]?.message?.content || "";
        const parsed = parseLLMJson(rawContent);
        const normalized = normalizeQuestions(parsed);
        return normalized[category] || [];
      };

      const categoryQuestions = await executeGroqWithRetry(
        groqCallFn,
        null,
        `generate-questions-${category}`
      );

      finalQuestions[category] = categoryQuestions;
    }

    // Save to Supabase after all 3 calls succeed
    if (sessionId) {
      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from("jd_sessions")
        .update({ generated_questions: finalQuestions })
        .eq("id", sessionId);
      if (error) {
        console.error("Supabase update error (generated_questions):", error);
      }
    }

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
