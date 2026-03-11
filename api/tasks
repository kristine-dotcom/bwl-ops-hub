// /api/tasks.js
// Task Management API for BWL Ops Hub

import { kv } from '@vercel/kv';

export const config = {
  runtime: 'nodejs'
};

export default async function handler(req, res) {
  try {
    const { method } = req;
    
    if (method === 'GET') {
      // Get all tasks
      const tasks = await kv.get('tasks') || [];
      return res.status(200).json({ success: true, tasks });
    }
    
    if (method === 'POST') {
      const { action, task, taskId, comment } = req.body;
      
      const tasks = await kv.get('tasks') || [];
      
      if (action === 'create') {
        // Create new task
        const newTask = {
          id: `task_${Date.now()}`,
          ...task,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          comments: []
        };
        
        tasks.push(newTask);
        await kv.set('tasks', tasks);
        
        return res.status(200).json({ success: true, task: newTask });
      }
      
      if (action === 'update') {
        // Update existing task
        const index = tasks.findIndex(t => t.id === taskId);
        if (index === -1) {
          return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        tasks[index] = {
          ...tasks[index],
          ...task,
          updatedAt: new Date().toISOString()
        };
        
        await kv.set('tasks', tasks);
        
        return res.status(200).json({ success: true, task: tasks[index] });
      }
      
      if (action === 'delete') {
        // Delete task
        const filtered = tasks.filter(t => t.id !== taskId);
        await kv.set('tasks', filtered);
        
        return res.status(200).json({ success: true });
      }
      
      if (action === 'comment') {
        // Add comment to task
        const index = tasks.findIndex(t => t.id === taskId);
        if (index === -1) {
          return res.status(404).json({ success: false, error: 'Task not found' });
        }
        
        const newComment = {
          id: `comment_${Date.now()}`,
          ...comment,
          timestamp: new Date().toISOString()
        };
        
        tasks[index].comments.push(newComment);
        tasks[index].updatedAt = new Date().toISOString();
        
        await kv.set('tasks', tasks);
        
        return res.status(200).json({ success: true, task: tasks[index] });
      }
      
      return res.status(400).json({ success: false, error: 'Invalid action' });
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Tasks API error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
