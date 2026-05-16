-- ==========================================
-- KANBAN MICRO-SERVICE SCHEMA
-- Run this on your new Kanban Supabase Project
-- ==========================================

-- Note: We do not need RLS policies here if the Next.js API uses the Service Role Key.
-- However, we still create the tables.

CREATE TABLE IF NOT EXISTS public.kanban_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    background_color TEXT DEFAULT 'bg-white dark:bg-slate-800',
    background_url TEXT,
    created_by UUID NOT NULL, -- References the Caparison Lab user ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kanban_board_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References the Caparison Lab user ID
    role TEXT DEFAULT 'member', -- 'owner' or 'member'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(board_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.kanban_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kanban_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES public.kanban_lists(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    position INTEGER NOT NULL DEFAULT 0,
    priority TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    label_color TEXT,
    created_by UUID, -- References the Caparison Lab user ID
    subtask_statuses TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kanban_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES public.kanban_cards(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Medium',
    assignee_id UUID, -- References the Caparison Lab user ID
    assignees UUID[],
    deadline TIMESTAMP WITH TIME ZONE,
    links JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kanban_sub_subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subtask_id UUID NOT NULL REFERENCES public.kanban_subtasks(id) ON DELETE CASCADE,
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'Pending',
    url TEXT,
    links JSONB,
    assignee_id UUID, -- References the Caparison Lab user ID
    assignees UUID[],
    deadline TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.kanban_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References the Caparison Lab user ID
    action_type TEXT NOT NULL,
    details TEXT,
    links JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
