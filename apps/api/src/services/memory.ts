import { prisma } from "../lib/prisma.js";
import { getAiDataPolicy } from "./aiPolicy.js";

export function createLocalEmbedding(text: string, dimensions = 48) {
  const vector = Array.from({ length: dimensions }, () => 0);
  const tokens = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const token of tokens) {
    let hash = 0;
    for (const char of token) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    const index = hash % dimensions;
    vector[index] = (vector[index] ?? 0) + 1;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => Number((value / magnitude).toFixed(6)));
}

export async function upsertMemory(input: {
  userId: string;
  sourceType: string;
  sourceId: string;
  content: string;
  metadata?: object;
}) {
  const policy = await getAiDataPolicy(input.userId);
  if (!policy.canPersistLearning) return;

  await prisma.embeddingMemory.upsert({
    where: {
      userId_sourceType_sourceId: {
        userId: input.userId,
        sourceType: input.sourceType,
        sourceId: input.sourceId
      }
    },
    create: {
      ...input,
      embedding: createLocalEmbedding(input.content)
    },
    update: {
      content: input.content,
      metadata: input.metadata,
      embedding: createLocalEmbedding(input.content)
    }
  });
}

export async function retrieveUserContext(userId: string, query: string, limit = 6) {
  const policy = await getAiDataPolicy(userId);
  if (!policy.canUseSensitiveContext) return [];

  const memories = await prisma.embeddingMemory.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: 80
  });
  const queryTokens = new Set(query.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  if (queryTokens.size === 0) return [];

  return memories
    .map((memory) => {
      const contentTokens = new Set(memory.content.toLowerCase().match(/[a-z0-9]+/g) ?? []);
      const lexicalScore = [...queryTokens].filter((token) => contentTokens.has(token)).length;
      return { memory, lexicalScore };
    })
    .filter(({ lexicalScore }) => lexicalScore > 0)
    .sort((a, b) => b.lexicalScore - a.lexicalScore || b.memory.updatedAt.getTime() - a.memory.updatedAt.getTime())
    .slice(0, limit)
    .map(({ memory }) => ({
      sourceType: memory.sourceType,
      sourceId: memory.sourceId,
      content: memory.content
    }));
}
