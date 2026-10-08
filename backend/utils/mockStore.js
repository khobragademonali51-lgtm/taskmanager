// In-Memory Database Fallback for instant preview & testing when MongoDB service is not started
const mockStore = {
  users: [],
  tasks: [
    {
      _id: 'sample-task-1',
      userId: 'sample-user-id',
      title: 'Complete Project Architecture & Documentation',
      description: 'Review the MVC backend pattern, REST endpoints, and prepare presentation slides.',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '18:00',
      priority: 'High',
      category: 'Study',
      status: 'Pending',
      subtasks: [
        { title: 'Create ER Diagram', completed: true },
        { title: 'Write API Documentation', completed: true },
        { title: 'Prepare Viva Q&A', completed: false },
      ],
      completedAt: null,
      createdAt: new Date(),
    },
    {
      _id: 'sample-task-2',
      userId: 'sample-user-id',
      title: 'Refactor Styling & Dark Mode Palette',
      description: 'Verify smooth color transitions, mobile drawer menu, and badge aesthetics.',
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      dueTime: '14:30',
      priority: 'Medium',
      category: 'Work',
      status: 'Pending',
      subtasks: [],
      completedAt: null,
      createdAt: new Date(),
    },
    {
      _id: 'sample-task-3',
      userId: 'sample-user-id',
      title: 'Setup Database Connection in .env',
      description: 'Configure Supabase PostgreSQL URL and key in .env for persistent cloud storage.',
      dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
      dueTime: '12:00',
      priority: 'Low',
      category: 'Personal',
      status: 'Completed',
      subtasks: [],
      completedAt: new Date(),
      createdAt: new Date(Date.now() - 172800000),
    },
  ],
};

module.exports = mockStore;
