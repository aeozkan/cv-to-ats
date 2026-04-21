import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { rawText, targetRole } = await req.json();
    if (!rawText || typeof rawText !== "string") {
      return new Response(JSON.stringify({ error: "rawText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `You are an ATS (Applicant Tracking System) resume optimization expert.
You will receive raw text extracted from a resume (which may contain artifacts from tables, columns, or graphics) and an optional target role.

Your job:
1. Clean the text: strip artifacts, fix ordering, remove non-ATS friendly elements (icons, emojis, table residue, multi-column jumbles, special bullets).
2. Reorganize content into a strict standard ATS layout with these sections in this exact order (omit any section that has no content):
   - CONTACT
   - PROFESSIONAL SUMMARY
   - SKILLS
   - PROFESSIONAL EXPERIENCE
   - EDUCATION
   - CERTIFICATIONS
   - PROJECTS
3. Use plain text only. Use simple "- " bullets. Use uppercase section headers.
4. For each job in EXPERIENCE: "Job Title | Company | Location | Start – End" on one line, then bullet achievements.
5. Suggest 8-15 missing industry keywords relevant to the target role (or inferred role) that would improve ATS match score, plus an estimated current ATS score (0-100).

Return ONLY via the provided tool call.`;

    const userPrompt = `Target role: ${targetRole || "(infer from resume)"}\n\nRAW RESUME TEXT:\n${rawText}`;

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "return_ats_resume",
            description: "Return cleaned ATS resume and keyword suggestions.",
            parameters: {
              type: "object",
              properties: {
                ats_resume: {
                  type: "string",
                  description: "Full ATS-formatted resume as plain text with uppercase section headers and '- ' bullets.",
                },
                detected_role: { type: "string" },
                ats_score: { type: "number", description: "Estimated ATS match score 0-100" },
                missing_keywords: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      keyword: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["keyword", "reason"],
                    additionalProperties: false,
                  },
                },
                improvements: {
                  type: "array",
                  items: { type: "string" },
                  description: "Short list of additional ATS improvement tips.",
                },
              },
              required: ["ats_resume", "detected_role", "ats_score", "missing_keywords", "improvements"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_ats_resume" } },
    };

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!aiResp.ok) {
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Lovable Cloud workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await aiResp.text();
      console.error("AI error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No structured output from AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(args), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("restructure-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});