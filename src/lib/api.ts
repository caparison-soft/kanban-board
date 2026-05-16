export async function kanbanQuery(token: string, payload: {
    table: string,
    action: 'select' | 'insert' | 'update' | 'delete',
    match?: any,
    payload?: any,
    order?: { column: string, ascending: boolean }
}) {
    const res = await fetch('/api/kanban/query', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    const result = await res.json();
    if (!result.ok) {
        throw new Error(result.error);
    }
    
    return result.data;
}
