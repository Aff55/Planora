import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoEmail = "demo@planora.local";
const demoPassword = "Planora123!";

function addDays(days: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return date;
}

async function main() {
  await prisma.user.deleteMany({ where: { email: demoEmail } });

  const passwordHash = await bcrypt.hash(demoPassword, 12);
  const user = await prisma.user.create({
    data: {
      email: demoEmail,
      name: "Demo Planner",
      passwordHash,
      timezone: "Asia/Kuala_Lumpur",
      settings: {
        create: {
          theme: "SYSTEM",
          notificationEmail: true,
          notificationPush: false,
          privacyMode: false,
          aiPersonalization: true,
          exportFormat: "JSON"
        }
      }
    }
  });

  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        userId: user.id,
        title: "Prep meals for tomorrow",
        description: "Make one simple protein-forward meal and pack fruit.",
        notes: "Keep it realistic, not perfect.",
        priority: "URGENT",
        status: "IN_PROGRESS",
        category: "WELLBEING",
        dueDate: addDays(0, 17),
        progress: 45,
        color: "#f97316",
        order: 0,
        subtasks: {
          create: [
            { title: "Check fridge", order: 0, completed: true },
            { title: "Cook rice and chicken", order: 1 },
            { title: "Pack snack", order: 2 }
          ]
        }
      }
    }),
    prisma.task.create({
      data: {
        userId: user.id,
        title: "Prepare product roadmap notes",
        description: "Write a concise planning memo for Monday.",
        priority: "HIGH",
        status: "TODO",
        category: "WORK",
        dueDate: addDays(1, 10),
        progress: 10,
        color: "#0ea5e9",
        order: 1
      }
    }),
    prisma.task.create({
      data: {
        userId: user.id,
        title: "Pay internet bill",
        priority: "MEDIUM",
        status: "TODO",
        category: "FINANCE",
        dueDate: addDays(3, 13),
        progress: 0,
        color: "#10b981",
        order: 2
      }
    }),
    prisma.task.create({
      data: {
        userId: user.id,
        title: "Reschedule dental checkup",
        priority: "LOW",
        status: "DEFERRED",
        category: "PERSONAL",
        dueDate: addDays(-2, 11),
        progress: 0,
        color: "#8b5cf6",
        order: 3
      }
    })
  ]);

  await prisma.activity.createMany({
    data: [
      {
        userId: user.id,
        title: "Ate chicken rice",
        category: "WELLBEING",
        minutes: 20,
        notes: "Felt full, skipped vegetables.",
        occurredAt: addDays(-1, 13)
      },
      {
        userId: user.id,
        title: "Chest workout",
        category: "FITNESS",
        minutes: 55,
        notes: "Bench, incline press, pushups.",
        occurredAt: addDays(-1, 18)
      },
      {
        userId: user.id,
        title: "Called old friend",
        category: "SOCIAL",
        minutes: 12,
        notes: "Quick check-in about their day.",
        occurredAt: addDays(-3, 20)
      },
      {
        userId: user.id,
        title: "Went outside for errands",
        category: "PERSONAL",
        minutes: 35,
        occurredAt: addDays(-2, 17)
      }
    ]
  });

  await prisma.calendarEvent.createMany({
    data: [
      {
        userId: user.id,
        taskId: tasks[0]?.id,
        title: "Meal prep block",
        type: "ACTIVITY",
        startAt: addDays(0, 15),
        endAt: addDays(0, 17),
        color: "#f97316"
      },
      {
        userId: user.id,
        title: "Roadmap review",
        description: "Discuss tradeoffs and milestones.",
        type: "ACTIVITY",
        startAt: addDays(1, 11),
        endAt: addDays(1, 12),
        color: "#0ea5e9"
      },
      {
        userId: user.id,
        title: "Leg day",
        type: "ACTIVITY",
        startAt: addDays(2, 18),
        endAt: addDays(2, 19),
        color: "#ef4444"
      }
    ]
  });

  await prisma.moodLog.createMany({
    data: [
      { userId: user.id, mood: "GOOD", stress: 4, energy: 7, reflection: "Solid morning after planning the day.", loggedAt: addDays(0, 8) },
      { userId: user.id, mood: "OKAY", stress: 6, energy: 5, reflection: "A little scattered but manageable.", loggedAt: addDays(-1, 21) },
      { userId: user.id, mood: "LOW", stress: 8, energy: 4, reflection: "Too many deadlines close together.", loggedAt: addDays(-3, 20) }
    ]
  });

  await prisma.sleepLog.createMany({
    data: [
      { userId: user.id, hours: 7.25, quality: "GOOD", notes: "Woke once but fell back asleep.", loggedAt: addDays(0, 7) },
      { userId: user.id, hours: 5.5, quality: "FAIR", notes: "Late caffeine.", loggedAt: addDays(-1, 7) },
      { userId: user.id, hours: 6.75, quality: "GOOD", loggedAt: addDays(-2, 7) }
    ]
  });

  await prisma.waterLog.createMany({
    data: [
      { userId: user.id, amountMl: 350, loggedAt: addDays(0, 9) },
      { userId: user.id, amountMl: 500, loggedAt: addDays(0, 12) },
      { userId: user.id, amountMl: 250, loggedAt: addDays(0, 14) },
      { userId: user.id, amountMl: 1200, loggedAt: addDays(-1, 16) }
    ]
  });

  const journal = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      title: "What helped today",
      body: "A short walk, a clear first task, and calling a friend made the day feel steadier.",
      mood: "GOOD"
    }
  });

  await prisma.habit.createMany({
    data: [
      { userId: user.id, title: "Morning planning", category: "PERSONAL", cadence: "daily", streak: 5, lastDoneAt: addDays(0, 8) },
      { userId: user.id, title: "Evening walk", category: "FITNESS", cadence: "daily", streak: 2, lastDoneAt: addDays(-3, 19) },
      { userId: user.id, title: "Water before coffee", category: "WELLBEING", cadence: "daily", streak: 9, lastDoneAt: addDays(0, 8) }
    ]
  });

  await prisma.recommendation.createMany({
    data: [
      {
        userId: user.id,
        key: "OVERDUE_TASK_REVIEW:review-deferred-personal-task",
        type: "OVERDUE_TASK_REVIEW",
        title: "Review deferred personal task",
        body: "One personal task is past due. Reschedule it or delete it to keep the list honest.",
        actionLabel: "Open tasks",
        actionUrl: "/tasks",
        active: true,
        metadata: { seeded: true }
      },
      {
        userId: user.id,
        key: "FOCUS_WINDOW:rotate-your-next-workout",
        type: "FOCUS_WINDOW",
        title: "Rotate your next workout",
        body: "You logged chest recently. Consider legs next, or rest if sleep is low.",
        actionLabel: "Log life",
        actionUrl: "/life",
        active: true,
        metadata: { seeded: true }
      }
    ]
  });

  const interaction = await prisma.aIInteraction.create({
    data: {
      userId: user.id,
      provider: "LOCAL_RULES",
      prompt: "Summarize my week",
      response:
        "You have a few practical tasks, some movement, and one social touchpoint. Keep tomorrow simple: one must-do, one healthy meal, and one recovery habit.",
      metadata: { seeded: true }
    }
  });

  await prisma.embeddingMemory.createMany({
    data: [
      {
        userId: user.id,
        sourceType: "JournalEntry",
        sourceId: journal.id,
        content: `${journal.title}. ${journal.body}`,
        embedding: [0.2, 0.1, 0.4],
        metadata: { mood: journal.mood }
      },
      {
        userId: user.id,
        sourceType: "AIInteraction",
        sourceId: interaction.id,
        content: `User: ${interaction.prompt}. Planora: ${interaction.response}`,
        embedding: [0.4, 0.3, 0.1],
        metadata: { provider: interaction.provider }
      },
      {
        userId: user.id,
        sourceType: "Task",
        sourceId: tasks[0]?.id ?? "seed-task",
        content: "Prep meals for tomorrow. Make a simple protein-forward meal and pack fruit.",
        embedding: [0.3, 0.5, 0.2],
        metadata: { category: "WELLBEING" }
      }
    ]
  });

  await prisma.modelEvent.createMany({
    data: [
      { userId: user.id, eventType: "seed_task_created", payload: { count: tasks.length } },
      { userId: user.id, eventType: "seed_wellbeing_logged", payload: { moodLogs: 3, sleepLogs: 3 } },
      { userId: user.id, eventType: "recommendation_shown", payload: { source: "seed" } }
    ]
  });

  console.log(`Seeded demo user: ${demoEmail} / ${demoPassword}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
