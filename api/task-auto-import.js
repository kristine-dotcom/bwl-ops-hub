// ═══════════════════════════════════════════════════════════════════════════
// SOD/EOD TASK AUTO-IMPORT UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

// Helper to extract tasks from SOD goals
export async function processSODForTasks(sodData, taskAPI) {
  if (!sodData.goals || sodData.goals.trim().length === 0) return;

  const goals = sodData.goals.split('\n').filter(g => g.trim());
  
  for (const goal of goals) {
    // Skip if it's just a header or empty
    if (goal.trim().length < 5) continue;
    
    // Create task from goal
    const task = {
      title: goal.trim(),
      description: `Auto-imported from ${sodData.name}'s SOD on ${new Date().toLocaleDateString()}`,
      assignee: sodData.name,
      status: "pending",
      priority: "medium", // Default to medium
      dueDate: null, // No due date by default
      blockedBy: null,
      createdBy: "System (SOD)",
      source: "sod"
    };

    await taskAPI.create(task);
  }
}

// Helper to mark tasks done from EOD
export async function processEODForTasks(eodData, taskAPI) {
  // Get all tasks for this person that are not done
  const allTasks = await taskAPI.getAll();
  const userTasks = allTasks.filter(t => 
    t.assignee === eodData.name && 
    t.status !== "done"
  );

  if (userTasks.length === 0) return;

  // Extract completed items from EOD
  // This looks for common completion indicators
  const completedIndicators = [
    "completed",
    "finished",
    "done",
    "shipped",
    "delivered",
    "sent",
    "✓",
    "✅",
    "☑"
  ];

  const eodText = (eodData.summary || "").toLowerCase();
  
  // For each user task, check if it appears completed in EOD
  for (const task of userTasks) {
    const taskTitle = task.title.toLowerCase();
    
    // Check if task title appears in EOD text
    if (eodText.includes(taskTitle)) {
      // Check if it's mentioned with completion indicator
      const isCompleted = completedIndicators.some(indicator => {
        const regex = new RegExp(`${indicator}.*${taskTitle}|${taskTitle}.*${indicator}`, 'i');
        return eodText.match(regex);
      });

      if (isCompleted) {
        // Mark task as done
        await taskAPI.update(task.id, { 
          status: "done",
          completedAt: new Date().toISOString()
        });
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// INTEGRATION INTO EXISTING SOD/EOD COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ADD THIS TO YOUR SOD SUBMISSION HANDLER:
/*
const handleSODSubmit = async (sodData) => {
  // ... existing SOD logic ...
  
  // Auto-import tasks from goals
  await processSODForTasks(sodData, taskAPI);
  
  // ... rest of SOD logic ...
};
*/

// ADD THIS TO YOUR EOD SUBMISSION HANDLER:
/*
const handleEODSubmit = async (eodData) => {
  // ... existing EOD logic ...
  
  // Auto-complete tasks mentioned in EOD
  await processEODForTasks(eodData, taskAPI);
  
  // ... rest of EOD logic ...
};
*/
