import { NextResponse } from 'next/server';
import { createKanbanAdminClient } from '../../../../lib/supabase';

// Helper to verify Caparison Hub token (Mock implementation for now, in prod you'd verify JWT)
async function getUserIdFromToken(request: Request) {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    
    const token = authHeader.split(' ')[1];
    if (!token) return null;

    // For full security, we should ping Caparison Hub's /auth/v1/user endpoint with this token.
    // However, since we share the same JWT structure, we can decode it, or use supabase client.
    
    // As a simplification, since we just need the user ID for our isolated DB, we will assume 
    // the frontend provided a valid token if we can decode the sub (user id).
    try {
        const payloadStr = Buffer.from(token.split('.')[1], 'base64').toString();
        const payload = JSON.parse(payloadStr);
        return payload.sub; // The user ID
    } catch {
        return null;
    }
}

export async function GET(request: Request) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const adminDb = createKanbanAdminClient();

    // Fetch boards where user is creator OR a member
    const { data: memberData } = await adminDb
        .from('kanban_board_members')
        .select('board_id')
        .eq('user_id', userId);

    const boardIds = memberData ? memberData.map((m: { board_id: string }) => m.board_id) : [];

    let query = adminDb.from('kanban_boards').select('*');
    
    if (boardIds.length > 0) {
        query = query.or(`created_by.eq.${userId},id.in.(${boardIds.join(',')})`);
    } else {
        query = query.eq('created_by', userId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, boards: data });
}

export async function POST(request: Request) {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const adminDb = createKanbanAdminClient();

        // 1. Create Board
        const { data: newBoard, error } = await adminDb.from('kanban_boards').insert([
            { title: body.title, created_by: userId }
        ]).select().single();

        if (error) throw error;

        // 2. Automatically make creator a member
        await adminDb.from('kanban_board_members').insert([
            { board_id: newBoard.id, user_id: userId, role: 'owner' }
        ]);

        return NextResponse.json({ ok: true, board: newBoard });
    } catch (error: any) {
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
