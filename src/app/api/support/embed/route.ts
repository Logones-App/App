import { NextRequest, NextResponse } from "next/server";

import OpenAI from "openai";

import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

interface EmbedBody {
  title: string;
  content: string;
  category?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmbedBody;
    const { title, content, category } = body;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: `${title}\n${content}`,
    });
    const embedding = embeddingResponse.data[0].embedding;

    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("support_knowledge_base")
      .insert({ title, content, category: category ?? null, embedding: JSON.stringify(embedding) })
      .select("id")
      .single();

    if (error) throw error;

    return NextResponse.json({ id: data.id });
  } catch {
    return NextResponse.json({ error: "Erreur inattendue" }, { status: 500 });
  }
}
