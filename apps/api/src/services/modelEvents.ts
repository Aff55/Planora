import { prisma } from "../lib/prisma.js";
import { getAiDataPolicy } from "./aiPolicy.js";

export async function recordModelEvent(userId: string, eventType: string, payload: unknown) {
  const policy = await getAiDataPolicy(userId);
  if (!policy.canPersistLearning) return;

  await prisma.modelEvent.create({
    data: {
      userId,
      eventType,
      payload: payload as object
    }
  });
}
