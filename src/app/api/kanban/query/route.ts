import { NextResponse } from 'next/server';
import { createKanbanAdminClient } from '../../../../lib/supabase';

// Helper to verify Caparison Hub token
async function getUserIdFromToken(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.split(' ')[1];
    if (!token) return null;
    try {
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        return payload.sub; // User ID
    } catch {
        return null;
    }
}

// Verify if user has access to a specific board
async function verifyBoardAccess(userId: string, boardId: string, adminDb: any) {
    // Check if creator
    const { data: board } = await adminDb.from('kanban_boards').select('created_by').eq('id', boardId).single();
    if (board && board.created_by === userId) return true;

    // Check if member
    const { data: member } = await adminDb.from('kanban_board_members')
        .select('*').eq('board_id', boardId).eq('user_id', userId).single();
    
    return !!member;
}

export async function POST(request: Request) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { table, action, match, payload, order } = await request.json();
        const adminDb = createKanbanAdminClient();

        // 1. All Kanban operations require a board_id to verify authorization
        const targetBoardId = match?.board_id || payload?.board_id || payload?.[0]?.board_id;
        
        if (!targetBoardId) {
            return NextResponse.json({ ok: false, error: 'board_id is required for security checks' }, { status: 400 });
        }

        const hasAccess = await verifyBoardAccess(userId, targetBoardId, adminDb);
        if (!hasAccess) {
            return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
        }

        // 2. Execute Generic Query securely
        let queryBuilder = adminDb.from(table);
        let result;

        if (action === 'select') {
            let q = queryBuilder.select('*');
            if (match) q = q.match(match);
            if (order) q = q.order(order.column, { ascending: order.ascending });
            result = await q;
        } 
        else if (action === 'insert') {
            result = await queryBuilder.insert(payload).select();
        } 
        else if (action === 'update') {
            if (!match) throw new Error("Match criteria required for update");
            result = await queryBuilder.update(payload).match(match).select();
        } 
        else if (action === 'delete') {
            if (!match) throw new Error("Match criteria required for delete");
            result = await queryBuilder.delete().match(match);
        }
        else {
            return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
        }

        if (result.error) throw result.error;

        return NextResponse.json({ ok: true, data: result.data });

    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
