const { getSupabase, isSupabaseConnected } = require('../config/supabase');
const mockStore = require('../utils/mockStore');

// Helper to determine if a date + time is overdue
const isTaskOverdue = (dueDate, dueTime) => {
  if (!dueDate) return false;
  const time = dueTime || '23:59';
  const dueDateTime = new Date(`${dueDate}T${time}:00`);
  return dueDateTime < new Date();
};

/**
 * Format a database task row for standard client JSON response.
 * Provides both camelCase and snake_case, plus _id and id, for 100% frontend compatibility.
 */
const formatTaskResponse = (row) => {
  if (!row) return null;

  const dueDate = row.due_date || row.dueDate;
  const dueTime = row.due_time || row.dueTime || '23:59';
  const status = row.status || 'Pending';
  const isCompleted = status === 'Completed';

  let isOverdue = false;
  if (!isCompleted && dueDate) {
    isOverdue = isTaskOverdue(dueDate, dueTime);
  }

  let subtasks = row.subtasks;
  if (typeof subtasks === 'string') {
    try {
      subtasks = JSON.parse(subtasks);
    } catch (e) {
      subtasks = [];
    }
  }
  if (!Array.isArray(subtasks)) {
    subtasks = [];
  }

  const id = row.id || row._id;
  const userId = row.user_id || row.userId;
  const createdAt = row.created_at || row.createdAt;
  const updatedAt = row.updated_at || row.updatedAt;
  const completedAt = row.completed_at !== undefined ? row.completed_at : row.completedAt;

  return {
    _id: id,
    id: id,
    userId: userId,
    user_id: userId,
    title: row.title,
    description: row.description || '',
    dueDate: dueDate,
    due_date: dueDate,
    dueTime: dueTime,
    due_time: dueTime,
    priority: row.priority || 'Medium',
    category: row.category || 'Other',
    status: status,
    subtasks: subtasks,
    completedAt: completedAt || null,
    completed_at: completedAt || null,
    createdAt: createdAt,
    created_at: createdAt,
    updatedAt: updatedAt,
    updated_at: updatedAt,
    isOverdue,
  };
};

// @desc    Get all tasks for current user with search, filter, and sort
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res, next) => {
  try {
    const { search, status, priority, category, dateFilter, sort } = req.query;
    const currentUserId = req.user.id || req.user._id;

    if (isSupabaseConnected()) {
      const supabase = getSupabase();
      let query = supabase.from('tasks').select('*').eq('user_id', currentUserId);

      // Search across title and description
      if (search && search.trim() !== '') {
        const q = search.trim();
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
      }

      const todayStr = new Date().toISOString().split('T')[0];

      // Status Filter
      if (status && status !== 'All') {
        if (status === 'Overdue') {
          query = query.eq('status', 'Pending').lt('due_date', todayStr);
        } else {
          query = query.eq('status', status);
        }
      }

      // Priority Filter
      if (priority && priority !== 'All') {
        query = query.eq('priority', priority);
      }

      // Category Filter
      if (category && category !== 'All') {
        query = query.eq('category', category);
      }

      // Date Range Filter
      if (dateFilter && dateFilter !== 'All') {
        if (dateFilter === 'today') {
          query = query.eq('due_date', todayStr);
        } else if (dateFilter === 'week') {
          const nextWeek = new Date();
          nextWeek.setDate(new Date().getDate() + 7);
          const nextWeekStr = nextWeek.toISOString().split('T')[0];
          query = query.gte('due_date', todayStr).lte('due_date', nextWeekStr);
        } else if (dateFilter === 'overdue') {
          query = query.eq('status', 'Pending').lt('due_date', todayStr);
        }
      }

      // Sorting
      if (sort === 'oldest') {
        query = query.order('created_at', { ascending: true });
      } else if (sort === 'dueDate_asc') {
        query = query.order('due_date', { ascending: true }).order('due_time', { ascending: true });
      } else if (sort === 'dueDate_desc') {
        query = query.order('due_date', { ascending: false }).order('due_time', { ascending: false });
      } else {
        // Default newest
        query = query.order('created_at', { ascending: false });
      }

      let { data: rows, error } = await query;
      if (error) throw error;

      let tasks = (rows || []).map(formatTaskResponse);

      // Priority in-memory sorting
      if (sort === 'priority_desc') {
        const pWeights = { High: 3, Medium: 2, Low: 1 };
        tasks = tasks.sort((a, b) => (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0));
      } else if (sort === 'priority_asc') {
        const pWeights = { High: 3, Medium: 2, Low: 1 };
        tasks = tasks.sort((a, b) => (pWeights[a.priority] || 0) - (pWeights[b.priority] || 0));
      }

      return res.status(200).json({
        success: true,
        count: tasks.length,
        data: tasks,
      });
    }

    // Fallback In-Memory Storage
    let tasks = mockStore.tasks
      .filter((t) => (t.userId || t.user_id).toString() === currentUserId.toString())
      .map(formatTaskResponse);

    if (search && search.trim() !== '') {
      const q = search.trim().toLowerCase();
      tasks = tasks.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (status && status !== 'All') {
      if (status === 'Overdue') {
        tasks = tasks.filter((t) => t.status === 'Pending' && isTaskOverdue(t.dueDate, t.dueTime));
      } else {
        tasks = tasks.filter((t) => t.status === status);
      }
    }

    if (priority && priority !== 'All') {
      tasks = tasks.filter((t) => t.priority === priority);
    }

    if (category && category !== 'All') {
      tasks = tasks.filter((t) => t.category === category);
    }

    if (dateFilter && dateFilter !== 'All') {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];

      if (dateFilter === 'today') {
        tasks = tasks.filter((t) => t.dueDate === todayStr);
      } else if (dateFilter === 'week') {
        const nextWeek = new Date();
        nextWeek.setDate(today.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];
        tasks = tasks.filter((t) => t.dueDate >= todayStr && t.dueDate <= nextWeekStr);
      } else if (dateFilter === 'overdue') {
        tasks = tasks.filter((t) => t.status === 'Pending' && isTaskOverdue(t.dueDate, t.dueTime));
      }
    }

    // Sorting
    if (sort === 'oldest') {
      tasks.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (sort === 'dueDate_asc') {
      tasks.sort((a, b) => (a.dueDate + (a.dueTime || '')) > (b.dueDate + (b.dueTime || '')) ? 1 : -1);
    } else if (sort === 'dueDate_desc') {
      tasks.sort((a, b) => (a.dueDate + (a.dueTime || '')) < (b.dueDate + (b.dueTime || '')) ? 1 : -1);
    } else if (sort === 'priority_desc') {
      const pWeights = { High: 3, Medium: 2, Low: 1 };
      tasks.sort((a, b) => (pWeights[b.priority] || 0) - (pWeights[a.priority] || 0));
    } else {
      tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
const getTaskById = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user._id;

    if (isSupabaseConnected()) {
      const supabase = getSupabase();
      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle();

      if (error) throw error;
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      if (task.user_id.toString() !== currentUserId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized access' });
      }

      return res.status(200).json({ success: true, data: formatTaskResponse(task) });
    }

    const task = mockStore.tasks.find((t) => (t._id || t.id).toString() === req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if ((task.userId || task.user_id).toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    res.status(200).json({ success: true, data: formatTaskResponse(task) });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
const createTask = async (req, res, next) => {
  try {
    const { title, description, dueDate, dueTime, priority, category, subtasks } = req.body;
    const currentUserId = req.user.id || req.user._id;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }
    if (!dueDate) {
      return res.status(400).json({ success: false, message: 'Due date is required' });
    }

    if (isSupabaseConnected()) {
      const supabase = getSupabase();
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          user_id: currentUserId,
          title: title.trim(),
          description: description ? description.trim() : '',
          due_date: dueDate,
          due_time: dueTime || '23:59',
          priority: priority || 'Medium',
          category: category || 'Other',
          status: 'Pending',
          subtasks: Array.isArray(subtasks) ? subtasks : [],
          completed_at: null,
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(201).json({
        success: true,
        message: 'Task created successfully',
        data: formatTaskResponse(newTask),
      });
    }

    const newTask = {
      _id: 'task-' + Date.now(),
      id: 'task-' + Date.now(),
      userId: currentUserId,
      user_id: currentUserId,
      title: title.trim(),
      description: description ? description.trim() : '',
      dueDate,
      due_date: dueDate,
      dueTime: dueTime || '23:59',
      due_time: dueTime || '23:59',
      priority: priority || 'Medium',
      category: category || 'Other',
      status: 'Pending',
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      completedAt: null,
      completed_at: null,
      createdAt: new Date(),
      created_at: new Date(),
    };

    mockStore.tasks.unshift(newTask);
    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: formatTaskResponse(newTask),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details
// @route   PUT /api/tasks/:id
// @access  Private
const updateTask = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user._id;

    if (isSupabaseConnected()) {
      const supabase = getSupabase();
      const { data: task, error: findError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle();

      if (findError) throw findError;
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      if (task.user_id.toString() !== currentUserId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized access' });
      }

      const { title, description, dueDate, dueTime, priority, category, status, subtasks } = req.body;
      const updateFields = {};

      if (title !== undefined) updateFields.title = title.trim();
      if (description !== undefined) updateFields.description = description.trim();
      if (dueDate !== undefined) updateFields.due_date = dueDate;
      if (dueTime !== undefined) updateFields.due_time = dueTime;
      if (priority !== undefined) updateFields.priority = priority;
      if (category !== undefined) updateFields.category = category;
      if (subtasks !== undefined) updateFields.subtasks = subtasks;

      if (status !== undefined) {
        updateFields.status = status;
        updateFields.completed_at = status === 'Completed' ? new Date().toISOString() : null;
      }

      const { data: updated, error: updateError } = await supabase
        .from('tasks')
        .update(updateFields)
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        data: formatTaskResponse(updated),
      });
    }

    const task = mockStore.tasks.find((t) => (t._id || t.id).toString() === req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if ((task.userId || task.user_id).toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const { title, description, dueDate, dueTime, priority, category, status, subtasks } = req.body;
    if (title !== undefined) task.title = title.trim();
    if (description !== undefined) task.description = description.trim();
    if (dueDate !== undefined) {
      task.dueDate = dueDate;
      task.due_date = dueDate;
    }
    if (dueTime !== undefined) {
      task.dueTime = dueTime;
      task.due_time = dueTime;
    }
    if (priority !== undefined) task.priority = priority;
    if (category !== undefined) task.category = category;
    if (subtasks !== undefined) task.subtasks = subtasks;
    if (status !== undefined) {
      task.status = status;
      task.completedAt = status === 'Completed' ? new Date() : null;
      task.completed_at = task.completedAt;
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: formatTaskResponse(task),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle task completion status
// @route   PATCH /api/tasks/:id/complete
// @access  Private
const toggleTaskComplete = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user._id;

    if (isSupabaseConnected()) {
      const supabase = getSupabase();
      const { data: task, error: findError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', req.params.id)
        .maybeSingle();

      if (findError) throw findError;
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      if (task.user_id.toString() !== currentUserId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized access' });
      }

      const isNowCompleted = task.status !== 'Completed';
      const newStatus = isNowCompleted ? 'Completed' : 'Pending';
      const newCompletedAt = isNowCompleted ? new Date().toISOString() : null;

      const { data: updated, error: updateError } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newCompletedAt,
        })
        .eq('id', req.params.id)
        .select()
        .single();

      if (updateError) throw updateError;

      return res.status(200).json({
        success: true,
        message: `Task marked as ${updated.status.toLowerCase()}`,
        data: formatTaskResponse(updated),
      });
    }

    const task = mockStore.tasks.find((t) => (t._id || t.id).toString() === req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
    if ((task.userId || task.user_id).toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    if (task.status === 'Completed') {
      task.status = 'Pending';
      task.completedAt = null;
      task.completed_at = null;
    } else {
      task.status = 'Completed';
      task.completedAt = new Date();
      task.completed_at = task.completedAt;
    }

    res.status(200).json({
      success: true,
      message: `Task marked as ${task.status.toLowerCase()}`,
      data: formatTaskResponse(task),
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a task
// @route   DELETE /api/tasks/:id
// @access  Private
const deleteTask = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user._id;

    if (isSupabaseConnected()) {
      const supabase = getSupabase();
      const { data: task, error: findError } = await supabase
        .from('tasks')
        .select('id, user_id')
        .eq('id', req.params.id)
        .maybeSingle();

      if (findError) throw findError;
      if (!task) return res.status(404).json({ success: false, message: 'Task not found' });
      if (task.user_id.toString() !== currentUserId.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized access' });
      }

      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', req.params.id);

      if (deleteError) throw deleteError;

      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully',
        data: { id: req.params.id },
      });
    }

    const idx = mockStore.tasks.findIndex((t) => (t._id || t.id).toString() === req.params.id);
    if (idx === -1) return res.status(404).json({ success: false, message: 'Task not found' });
    if ((mockStore.tasks[idx].userId || mockStore.tasks[idx].user_id).toString() !== currentUserId.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    mockStore.tasks.splice(idx, 1);
    res.status(200).json({
      success: true,
      message: 'Task deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get dashboard metrics & summary statistics for current user
// @route   GET /api/tasks/stats/summary
// @access  Private
const getTaskStats = async (req, res, next) => {
  try {
    const currentUserId = req.user.id || req.user._id;
    let allUserTasks = [];

    if (isSupabaseConnected()) {
      const supabase = getSupabase();
      const { data: rows, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', currentUserId);

      if (error) throw error;
      allUserTasks = (rows || []).map(formatTaskResponse);
    } else {
      allUserTasks = mockStore.tasks
        .filter((t) => (t.userId || t.user_id).toString() === currentUserId.toString())
        .map(formatTaskResponse);
    }

    const total = allUserTasks.length;
    const completed = allUserTasks.filter((t) => t.status === 'Completed').length;
    const pending = allUserTasks.filter((t) => t.status === 'Pending').length;
    const highPriority = allUserTasks.filter((t) => t.priority === 'High' && t.status === 'Pending').length;

    const overdue = allUserTasks.filter((t) => {
      if (t.status === 'Completed') return false;
      return isTaskOverdue(t.dueDate, t.dueTime);
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    const categoryCounts = { Study: 0, Work: 0, Personal: 0, Other: 0 };
    allUserTasks.forEach((t) => {
      if (categoryCounts[t.category] !== undefined) categoryCounts[t.category]++;
      else categoryCounts.Other++;
    });

    const priorityCounts = { High: 0, Medium: 0, Low: 0 };
    allUserTasks.forEach((t) => {
      if (priorityCounts[t.priority] !== undefined) priorityCounts[t.priority]++;
    });

    res.status(200).json({
      success: true,
      data: {
        total,
        pending,
        completed,
        overdue,
        highPriority,
        completionRate,
        categoryCounts,
        priorityCounts,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  toggleTaskComplete,
  deleteTask,
  getTaskStats,
  formatTaskResponse,
};
