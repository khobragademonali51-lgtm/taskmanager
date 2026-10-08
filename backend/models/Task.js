/**
 * Task Model & Table Definition for Supabase PostgreSQL
 * Table: public.tasks
 */

const TaskTable = {
  tableName: 'tasks',
  columns: {
    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    user_id: 'UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE',
    title: 'VARCHAR(150) NOT NULL',
    description: "TEXT DEFAULT ''",
    due_date: 'VARCHAR(10) NOT NULL',
    due_time: "VARCHAR(5) DEFAULT '23:59'",
    priority: "VARCHAR(10) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High'))",
    category: "VARCHAR(20) DEFAULT 'Other' CHECK (category IN ('Study', 'Work', 'Personal', 'Other'))",
    status: "VARCHAR(15) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed'))",
    subtasks: "JSONB NOT NULL DEFAULT '[]'::jsonb",
    completed_at: 'TIMESTAMPTZ DEFAULT NULL',
    created_at: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    updated_at: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  },
};

module.exports = TaskTable;
