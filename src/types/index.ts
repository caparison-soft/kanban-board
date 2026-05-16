export interface User {
  id: string;
  email?: string;
  role?: string;
}

export interface KBoard { 
    id: string; 
    title: string; 
    background_color: string; 
    created_by: string; 
    created_at: string; 
    background_url?: string;
}

export interface KList { 
    id: string; 
    board_id: string; 
    title: string; 
    position: number; 
}

export interface KCard { 
    id: string; 
    list_id: string; 
    board_id: string; 
    title: string; 
    description: string; 
    position: number; 
    priority?: string; 
    due_date?: string; 
    created_by?: string; 
    subtask_statuses?: string[]; 
    label_color?: string; 
}

export interface KActivity { 
    id: string; 
    user_id: string; 
    action_type: string; 
    details: string; 
    created_at: string; 
    profiles?: { full_name: string }; 
    links?: any; 
}

export interface KSubtask { 
    id: string; 
    card_id: string; 
    board_id: string; 
    title: string; 
    status: string; 
    priority: string; 
    assignee_id?: string; 
    assignees?: string[]; 
    links?: any; 
    description?: string; 
    deadline?: string; 
}

export interface KSubSubtask { 
    id: string; 
    subtask_id: string; 
    board_id: string; 
    title: string; 
    status: string; 
    links?: any; 
    url?: string; 
    assignee_id?: string; 
    assignees?: string[]; 
    deadline?: string; 
    description?: string; 
}
