const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type ChatMessage = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { currentResume, instruction, history, outputLanguage, targetRole } = await req.json() as {
      currentResume: string;
      instruction: string;
      history?: ChatMessage[];
      outputLanguage?: "en" | "tr";
      targetRole?: string;
    };

    if (!currentResume || !instruction) {
      return new Response(JSON.stringify({ error: "currentResume and instruction are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const lang = outputLanguage === "tr" ? "tr" : "en";
    const langName = lang === "tr" ? "Turkish (Türkçe)" : "English";

    const systemPrompt = `You are an expert AI Career Assistant helping a user iteratively improve their ATS-optimized resume.

RULES:
1. You will receive the FULL current resume (plain text, ATS format) and a user instruction.
2. Apply the user's instruction precisely. Modify ONLY what the instruction requires; preserve everything else verbatim.
3. Maintain strict ATS-friendly plain-text format: uppercase section headers (CONTACT, PROFESSIONAL SUMMARY, SKILLS, PROFESSIONAL EXPERIENCE, EDUCATION, CERTIFICATIONS, PROJECTS), simple "- " bullets, no tables, no emojis, no markdown symbols (no **bold**, no #).
4. Keep all section ordering intact. Do not invent fake experience, employers, dates, or metrics. If the user asks to "make achievements more quantifiable" and no numbers exist, use realistic placeholders like "[X]%" only when the user explicitly accepts placeholders; otherwise rephrase for stronger impact without fabricating numbers.
5. Output language: ${langName}. Keep proper nouns in original form.
6. Target role context: ${targetRole || "(not specified)"}.
7. ALWAYS return the COMPLETE updated resume (not a diff, not a snippet) via the tool call, plus a brief one-or-two-sentence assistant message describing what you changed.`;

    const messages: { role: string; content: string }[] = [
      { role: "system", content: systemPrompt },
    ];

    if (Array.isArray(history)) {
      for (const m of history.slice(-8)) {
        if (m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string") {
          messages.push({ role: m.role, content: m.content });
        }
      }
    }

    messages.push({
      role: "user",
      content: `CURRENT RESUME:\n"""\n${currentResume}\n"""\n\nINSTRUCTION:\n${instruction}`,
    });

    const body = {
      model: "google/gemini-3-flash-preview",
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: "return_updated_resume",
            description: "Return the updated full resume and a short explanation.",
            parameters: {
              type: "object",
              properties: {
                updated_resume: {
                  type: "string",
                  description: "The COMPLETE updated resume in ATS-friendly plain text.",
                },
                assistant_message: {
                  type: "string",
                  description: "Short 1-2 sentence reply explaining what was changed.",
                },
              },
              required: ["updated_resume", "assistant_message"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "return_updated_resume" } },
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
    console.error("edit-resume error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});