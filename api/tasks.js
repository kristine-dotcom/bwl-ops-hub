import { kv } from "@vercel/kv";

export default async function handler(req, res) {
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
      const tasks = await kv.get("tasks") || [];
      return res.status(200).json({ success: true, tasks });
    }

    // POST - Create new task
    if (req.method === "POST") {
      const { task } = req.body;
      
      if (!task || !task.title || !task.assignee) {
        return res.status(400).json({ 
          success: false, 
          error: "Task title and assignee are required" 
        });
      }

      const tasks = await kv.get("tasks") || [];
      
      const newTask = {
        id: Date.now(),
        title: task.title,
        description: task.description || "",
        assignee: task.assignee,
        status: task.status || "pending",
        priority: task.priority || "medium",
        dueDate: task.dueDate || null,
        blockedBy: task.blockedBy || null,
        comments: [],
        createdAt: new Date().toISOString(),
        createdBy: task.createdBy || "Manual",
        completedAt: null,
        source: task.source || "manual"
      };

      tasks.push(newTask);
      await kv.set("tasks", tasks);

      return res.status(200).json({ success: true, task: newTask });
    }

    // PUT - Update existing task
    if (req.method === "PUT") {
      const { taskId, updates } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ 
          success: false, 
          error: "Task ID is required" 
        });
      }

      const tasks = await kv.get("tasks") || [];
      const taskIndex = tasks.findIndex(t => t.id === taskId);

      if (taskIndex === -1) {
        return res.status(404).json({ 
          success: false, 
          error: "Task not found" 
        });
      }

      // Auto-set completedAt when status changes to done
      if (updates.status === "done" && !updates.completedAt) {
        updates.completedAt = new Date().toISOString();
      }

      tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
      await kv.set("tasks", tasks);

      return res.status(200).json({ success: true, task: tasks[taskIndex] });
    }

    // DELETE - Remove task
    if (req.method === "DELETE") {
      const { taskId } = req.body;
      
      if (!taskId) {
        return res.status(400).json({ 
          success: false, 
          error: "Task ID is required" 
        });
      }

      const tasks = await kv.get("tasks") || [];
      const filteredTasks = tasks.filter(t => t.id !== taskId);

      if (filteredTasks.length === tasks.length) {
        return res.status(404).json({ 
          success: false, 
          error: "Task not found" 
        });
      }

      await kv.set("tasks", filteredTasks);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });

  } catch (error) {
    console.error("Tasks API Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
