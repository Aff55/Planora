import { normalizeTimeZone } from "../lib/dateTime.js";
import { prisma } from "../lib/prisma.js";

export type AiDataPolicy = {
  timeZone: string;
  aiPersonalization: boolean;
  privacyMode: boolean;
  canUsePersonalContext: boolean;
  canUseSensitiveContext: boolean;
  canPersistLearning: boolean;
};

export async function getAiDataPolicy(userId: string): Promise<AiDataPolicy> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      timezone: true,
      settings: {
        select: {
          aiPersonalization: true,
          privacyMode: true
        }
      }
    }
  });

  const aiPersonalization = user?.settings?.aiPersonalization ?? true;
  const privacyMode = user?.settings?.privacyMode ?? false;

  return {
    timeZone: normalizeTimeZone(user?.timezone),
    aiPersonalization,
    privacyMode,
    canUsePersonalContext: aiPersonalization,
    canUseSensitiveContext: aiPersonalization && !privacyMode,
    canPersistLearning: aiPersonalization && !privacyMode
  };
}
