/**
 * User Model & Table Definition for Supabase PostgreSQL
 * Table: public.users
 */

const UserTable = {
  tableName: 'users',
  columns: {
    id: 'UUID PRIMARY KEY DEFAULT gen_random_uuid()',
    name: 'VARCHAR(60) NOT NULL',
    email: 'VARCHAR(255) NOT NULL UNIQUE',
    password: 'VARCHAR(255) NOT NULL',
    created_at: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
    updated_at: 'TIMESTAMPTZ NOT NULL DEFAULT NOW()',
  },
};

module.exports = UserTable;
