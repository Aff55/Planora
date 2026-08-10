/**
 * Seeds 60 days of synthetic history for one throwaway account so every
 * pattern detector has something to find. Used to validate `patterns.ts`
 * against known ground truth; safe to re-run, and it only ever touches the
 * fixture user below.
 *
 *   npx tsx scripts/seed-pattern-fixture.ts
 */
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma.js";

const EMAIL = "pattern-fixture@planora.local";
const PASSWORD = "PatternFixture123!";
const DAYS = 60;

function at(daysAgo: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date;
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: { email: EMAIL, name: "Pattern Fixture", passwordHash, timezone: "Asia/Kuala_Lumpur" },
    update: {}
  });

  await prisma.settings.upsert({
    where: { userId: user.id },
    create: { userId: user.id, aiPersonalization: true, privacyMode: false },
    update: { aiPersonalization: true, privacyMode: false }
  });

  // Clear only this fixture's data so runs are reproducible.
  await Promise.all([
    prisma.activity.deleteMany({ where: { userId: user.id } }),
    prisma.moodLog.deleteMany({ where: { userId: user.id } }),
    prisma.sleepLog.deleteMany({ where: { userId: user.id } }),
    prisma.waterLog.deleteMany({ where: { userId: user.id } })
  ]);

  const activities: Array<{ title: string; category: "FITNESS" | "SOCIAL" | "WELLBEING"; minutes: number; occurredAt: Date }> = [];
  const moods: Array<{ mood: string; stress: number; energy: number; loggedAt: Date }> = [];
  const sleeps: Array<{ hours: number; quality: string; loggedAt: Date }> = [];

  for (let daysAgo = DAYS - 1; daysAgo >= 0; daysAgo -= 1) {
    const date = at(daysAgo, 12);
    const weekday = date.getDay(); // 0 Sun .. 6 Sat

    // GROUND TRUTH 1 — weekday rhythm: gym only on Mondays (1) and Thursdays (4),
    // and always at 07:00, which should also trigger the time-of-day detector.
    if (weekday === 1 || weekday === 4) {
      activities.push({ title: "Gym session", category: "FITNESS", minutes: 45, occurredAt: at(daysAgo, 7, 15) });
    }

    // GROUND TRUTH 2 — lapse: social contact was regular, then stopped 14 days ago.
    if (daysAgo >= 14 && daysAgo % 3 === 0) {
      activities.push({ title: "Called a friend", category: "SOCIAL", minutes: 20, occurredAt: at(daysAgo, 19) });
    }

    // Meals most days so there is a baseline behaviour that is NOT rhythmic.
    if (daysAgo % 7 !== 5) {
      activities.push({ title: "Ate a meal", category: "WELLBEING", minutes: 15, occurredAt: at(daysAgo, 13) });
    }

    // GROUND TRUTH 3 — co-occurrence: sleep drives next-day mood and energy.
    // Alternating long/short nights with mood following the previous night.
    const longNight = daysAgo % 2 === 0;
    const hours = longNight ? 8.0 : 5.5;
    sleeps.push({ hours, quality: longNight ? "GOOD" : "POOR", loggedAt: at(daysAgo, 7) });

    // Mood logged the morning after, tracking the previous night's sleep.
    const priorLong = (daysAgo + 1) % 2 === 0;
    // GROUND TRUTH 4 — trend: stress falls steadily across the window.
    const stress = Math.max(1, Math.round(9 - ((DAYS - daysAgo) / DAYS) * 6));
    moods.push({
      mood: priorLong ? "GOOD" : "LOW",
      stress,
      energy: priorLong ? 8 : 3,
      loggedAt: at(daysAgo, 9)
    });
  }

  await prisma.activity.createMany({ data: activities.map((a) => ({ ...a, userId: user.id })) });
  await prisma.moodLog.createMany({ data: moods.map((m) => ({ ...m, userId: user.id, mood: m.mood as never })) });
  await prisma.sleepLog.createMany({ data: sleeps.map((s) => ({ ...s, userId: user.id, quality: s.quality as never })) });

  console.log(
    JSON.stringify(
      {
        email: EMAIL,
        password: PASSWORD,
        seeded: { activities: activities.length, moods: moods.length, sleeps: sleeps.length },
        groundTruth: {
          weekdayRhythm: "Gym on Mondays and Thursdays only",
          timeOfDay: "Gym always ~07:15 (morning)",
          lapse: "Social contact stopped 14 days ago",
          coOccurrence: "Long sleep -> higher mood and energy the next day",
          trend: "Stress falling steadily over 60 days"
        }
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
