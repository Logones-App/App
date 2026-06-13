import { NextRequest, NextResponse } from "next/server";

import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const CONFIDENCE_THRESHOLD = 0.65;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface KnowledgeMatch {
  title: string;
  content: string;
  category: string;
  similarity: number;
}

function buildSystemPrompt(matches: KnowledgeMatch[]): string {
  if (matches.length === 0) {
    return `Tu es un assistant support pour une application de gestion de restaurant et de réservations.
Tu n'as pas d'informations spécifiques pour répondre à cette question.
Indique poliment que tu ne peux pas répondre et propose à l'utilisateur de contacter le support humain.`;
  }

  const context = matches.map((m) => `### ${m.title}\n${m.content}`).join("\n\n");

  return `Tu es un assistant support pour une application de gestion de restaurant et de réservations.
Réponds uniquement en te basant sur le contexte suivant. Si la réponse n'est pas dans le contexte, dis-le clairement.

CONTEXTE:
${context}

Réponds de manière concise et utile en français.`;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { message: string; history?: ChatMessage[] };
    const { message, history = [] } = body;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const supabase = createServiceClient();

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: message,
    });
    const embedding = embeddingResponse.data[0].embedding;

    const { data: matches, error: searchError } = await supabase.rpc("match_knowledge_base", {
      query_embedding: JSON.stringify(embedding),
      match_threshold: 0.6,
      match_count: 5,
    });

    if (searchError) throw searchError;

    const typedMatches: KnowledgeMatch[] = matches ?? [];
    const confidence = typedMatches.length > 0 ? typedMatches[0].similarity : 0;
    const systemPrompt = buildSystemPrompt(typedMatches);

    const claudeMessages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      system: systemPrompt,
      messages: claudeMessages,
    });

    const answer = response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({
      answer,
      confidence,
      needsHuman: confidence < CONFIDENCE_THRESHOLD,
      sources: typedMatches.map((m) => ({ title: m.title, category: m.category })),
    });
  } catch {
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
