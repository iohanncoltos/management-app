import { prisma } from "@/lib/db";

export async function getResourceAllocations() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      assignments: {
        select: {
          allocationPct: true,
          task: {
            select: {
              id: true,
              title: true,
              project: { select: { id: true, code: true } },
              start: true,
              end: true,
            },
          },
        },
      },
      assignedTasks: {
        select: {
          id: true,
          title: true,
          project: { select: { id: true, code: true } },
          start: true,
          end: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return users.map((user) => {
    const assignments = user.assignments.length
      ? user.assignments.map((assignment) => ({
          allocationPct: assignment.allocationPct,
          taskId: assignment.task.id,
          taskTitle: assignment.task.title,
          projectCode: assignment.task.project?.code || "NO-PROJECT",
          start: assignment.task.start,
          end: assignment.task.end,
        }))
      : user.assignedTasks.map((task) => ({
          allocationPct: 100,
          taskId: task.id,
          taskTitle: task.title,
          projectCode: task.project?.code || "NO-PROJECT",
          start: task.start,
          end: task.end,
        }));

    const totalAllocation = assignments.reduce((total, assignment) => total + assignment.allocationPct, 0);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      totalAllocation,
      assignments,
    };
  });
}
