import { knowledgeBaseSeed } from "../src/lib/support/knowledge-base-seed";

const BASE_URL = process.env.SEED_BASE_URL ?? "http://localhost:3000";

async function seedKnowledgeBase() {
  console.log(`Seeding ${knowledgeBaseSeed.length} entries...`);

  for (const entry of knowledgeBaseSeed) {
    const response = await fetch(`${BASE_URL}/api/support/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Failed: ${entry.title} — ${error}`);
      continue;
    }

    const data = (await response.json()) as { id: string };
    console.log(`✅ ${entry.title} (${data.id})`);

    // Avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  console.log("Done.");
}

seedKnowledgeBase().catch(console.error);
