import { kv } from "@vercel/kv";

// Helper to get all tasks
async function getAllTasks() {
  try {
    const tasks = await kv.get("tasks");
    return tasks || [];
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

// Helper to save tasks
async function saveTasks(tasks) {
  try {
    await kv.set("tasks", tasks);
    return true;
  } catch (error) {
    console.error("Error saving tasks:", error);
    return false;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    // GET - Fetch all tasks
    if (req.method === "GET") {
      const tasks = await getAllTasks();
      return res.status(200).json({ success: true, tasks });
    }

    // POST - Create new task
    if (req.method === "POST") {
      const { task } = req.body;
      
      if (!task || !task.title || !task.assignee) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing required fields: title, assignee" 
        });
      }

      const tasks = await getAllTasks();
      const newTask = {
        id: Date.now(),
        title: task.title,
        description: task.description || "",
        assignee: task.assignee,
        status: task.status || "pending",
        priority: task.priority || "medium",
        dueDate: task.dueDate || null,
        blockedBy: task.blockedBy || null,
        comments: task.comments || [],
        createdAt: new Date().toISOString(),
        createdBy: task.createdBy || "Admin",
        completedAt: null,
        source: task.source || "manual"
      };

      tasks.push(newTask);
      await saveTasks(tasks);

      return res.status(201).json({ success: true, task: newTask });
    }

    // PUT - Update task
    if (req.method === "PUT") {
      const { taskId, updates } = req.body;

      if (!taskId) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing taskId" 
        });
      }

      const tasks = await getAllTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          error: "Task not found" 
        });
      }

      // Auto-set completedAt when status changes to "done"
      if (updates.status === "done" && tasks[taskIndex].status !== "done") {
        updates.completedAt = new Date().toISOString();
      }

      // Clear completedAt if moving out of done
      if (updates.status !== "done" && tasks[taskIndex].status === "done") {
        updates.completedAt = null;
      }

      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await saveTasks(tasks);

      return res.status(200).json({ success: true, task: tasks[taskIndex] });
    }

    // DELETE - Remove task
    if (req.method === "DELETE") {
      const { taskId } = req.body;

      if (!taskId) {
        return res.status(400).json({ 
          success: false, 
          error: "Missing taskId" 
        });
      }

      const tasks = await getAllTasks();
      const filteredTasks = tasks.filter(t => t.id !== taskId);

      if (filteredTasks.length === tasks.length) {
        return res.status(404).json({ 
          success: false, 
          error: "Task not found" 
        });
      }

      await saveTasks(filteredTasks);

      return res.status(200).json({ success: true, taskId });
    }

    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
