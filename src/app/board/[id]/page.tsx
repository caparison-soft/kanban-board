"use client";

import React, { useState, useEffect, useCallback, use } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useRouter } from 'next/navigation';
import { 
    LayoutDashboard, Plus, Settings, CheckSquare, Trash2, 
    AlignLeft, X, Check, ChevronDown, Bell, LogOut, ArrowLeft,
    Clock, Tag, User as UserIcon, Calendar, Activity as ActivityIcon,
    FileText, Link, UserPlus, ChevronRight
} from 'lucide-react';
import { createHubClient } from '../../../lib/supabase';
import { kanbanQuery } from '../../../lib/api';
import { KBoard, KList, KCard, KSubtask, KSubSubtask, KActivity, User } from '../../../types';
import { Card, Modal, SearchableSelect, ConfirmDialog } from '../../../components/ui';
import { CardDetailsModal } from '../../../components/CardDetailsModal';

// Mock list of all users from ERP (In a real system, you'd fetch this from the Hub)
const MOCK_USERS: User[] = [
    { id: 'mock-user-1', email: 'admin@caparison.com', role: 'Admin' }
];

export default function KanbanWorkspaceWrapper({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return <ActiveKanbanBoard boardId={id} />;
}

const ActiveKanbanBoard = ({ boardId }: { boardId: string }) => {
    const [board, setBoard] = useState<KBoard | null>(null);
    const [lists, setLists] = useState<KList[]>([]);
    const [cards, setCards] = useState<KCard[]>([]);
    const [boardMembers, setBoardMembers] = useState<any[]>([]);
    
    // For Subtasks tracking
    const [allSubtasks, setAllSubtasks] = useState<KSubtask[]>([]);
    
    const [userToken, setUserToken] = useState<string | null>(null);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const [isSharing, setIsSharing] = useState(false);
    const [viewingCard, setViewingCard] = useState<KCard | null>(null);
    const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

    const router = useRouter();
    const supabaseHub = createHubClient();

    const fetchBoardData = useCallback(async (token: string, uid: string) => {
        try {
            // Fetch Board
            const bData = await kanbanQuery(token, { table: 'kanban_boards', action: 'select', match: { id: boardId } });
            if (!bData || bData.length === 0) {
                router.push('/');
                return;
            }
            setBoard(bData[0]);

            // Fetch Members
            const members = await kanbanQuery(token, { table: 'kanban_board_members', action: 'select', match: { board_id: boardId } });
            setBoardMembers(members || []);

            // Fetch Lists
            const lData = await kanbanQuery(token, { table: 'kanban_lists', action: 'select', match: { board_id: boardId }, order: { column: 'position', ascending: true } });
            setLists(lData || []);

            // Fetch Cards
            const cData = await kanbanQuery(token, { table: 'kanban_cards', action: 'select', match: { board_id: boardId }, order: { column: 'position', ascending: true } });
            setCards(cData || []);

            // Fetch all subtasks for badges
            const stData = await kanbanQuery(token, { table: 'kanban_subtasks', action: 'select', match: { board_id: boardId } });
            setAllSubtasks(stData || []);

        } catch (err) {
            console.error(err);
            router.push('/');
        } finally {
            setLoading(false);
        }
    }, [boardId, router]);

    useEffect(() => {
        supabaseHub.auth.getSession().then(({ data: { session } }) => {
            if (session) {
                setUserToken(session.access_token);
                setCurrentUser({ id: session.user.id, email: session.user.email });
                fetchBoardData(session.access_token, session.user.id);
            } else {
                // No local session — redirect bounce to the Hub login
                const currentAppUrl = encodeURIComponent(window.location.href);
                window.location.href = `https://www.caparisonlab.com/login?next=${currentAppUrl}`;
            }
        });
    }, [fetchBoardData, router, supabaseHub.auth]);

    // HANDLERS
    const handleAddList = async () => {
        const title = prompt("Enter list title:");
        if (!title || !board || !userToken) return;
        
        const newList = { board_id: board.id, title, position: lists.length };
        const data = await kanbanQuery(userToken, { table: 'kanban_lists', action: 'insert', payload: newList });
        if (data && data[0]) setLists([...lists, data[0]]);
    };

    const handleAddCard = async (listId: string) => {
        const title = prompt("Enter card title:");
        if (!title || !board || !userToken) return;
        
        const listCards = cards.filter(c => c.list_id === listId);
        const newCard = { board_id: board.id, list_id: listId, title, position: listCards.length, created_by: currentUser?.id };
        const data = await kanbanQuery(userToken, { table: 'kanban_cards', action: 'insert', payload: newCard });
        if (data && data[0]) setCards([...cards, data[0]]);
    };

    const handleDragEnd = async (result: any) => {
        if (!result.destination || !userToken) return;
        const { source, destination, type } = result;

        if (type === 'list') {
            const newLists = Array.from(lists);
            const [moved] = newLists.splice(source.index, 1);
            newLists.splice(destination.index, 0, moved);
            setLists(newLists);
            newLists.forEach((l, idx) => {
                kanbanQuery(userToken, { table: 'kanban_lists', action: 'update', match: { id: l.id, board_id: board?.id }, payload: { position: idx } });
            });
            return;
        }

        if (type === 'card') {
            const sourceCards = cards.filter(c => c.list_id === source.droppableId).sort((a,b) => a.position - b.position);
            const destCards = source.droppableId === destination.droppableId ? sourceCards : cards.filter(c => c.list_id === destination.droppableId).sort((a,b) => a.position - b.position);
            
            const [moved] = sourceCards.splice(source.index, 1);
            
            if (source.droppableId !== destination.droppableId) {
                moved.list_id = destination.droppableId;
                destCards.splice(destination.index, 0, moved);
                kanbanQuery(userToken, { table: 'kanban_cards', action: 'update', match: { id: moved.id, board_id: board?.id }, payload: { list_id: destination.droppableId } });
            } else {
                sourceCards.splice(destination.index, 0, moved);
            }

            const otherCards = cards.filter(c => c.list_id !== source.droppableId && c.list_id !== destination.droppableId);
            const newCards = [...otherCards, ...sourceCards];
            if (source.droppableId !== destination.droppableId) newCards.push(...destCards);
            
            setCards(newCards);

            destCards.forEach((c, idx) => {
                kanbanQuery(userToken, { table: 'kanban_cards', action: 'update', match: { id: c.id, board_id: board?.id }, payload: { position: idx } });
            });
        }
    };

    const handleDeleteList = async (id: string) => {
        if (!window.confirm("Delete this list and all its cards?")) return;
        if (!userToken) return;
        setLists(lists.filter(l => l.id !== id));
        setCards(cards.filter(c => c.list_id !== id));
        await kanbanQuery(userToken, { table: 'kanban_lists', action: 'delete', match: { id, board_id: board?.id } });
    };

    const handleUpdateBoardTitle = async (newTitle: string) => {
        if (!board || !userToken) return;
        setBoard({ ...board, title: newTitle });
        await kanbanQuery(userToken, { table: 'kanban_boards', action: 'update', match: { id: board.id }, payload: { title: newTitle } });
    };

    if (loading || !board) return <div className="p-8 text-center">Loading board...</div>;

    return (
        <div className={`h-screen flex flex-col font-sans transition-all overflow-hidden ${board.background_color}`} style={board.background_url ? { backgroundImage: board.background_url.startsWith('http') ? `url(${board.background_url})` : board.background_url, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}>
            {/* Header */}
            <div className={`h-14 px-4 flex items-center justify-between shrink-0 transition-colors ${board.background_url ? 'bg-black/40 backdrop-blur-md border-b border-white/10' : 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800'}`}>
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/')} className={`p-1.5 rounded transition-colors ${board.background_url ? 'text-white/80 hover:bg-white/20' : 'text-gray-500 hover:bg-gray-200 dark:text-slate-400 dark:hover:bg-slate-800'}`}>
                        <ArrowLeft size={18} />
                    </button>
                    <input 
                        value={board.title}
                        onChange={(e) => setBoard({...board, title: e.target.value})}
                        onBlur={(e) => handleUpdateBoardTitle(e.target.value)}
                        className={`text-lg font-bold bg-transparent outline-none px-2 py-1 rounded transition-colors ${board.background_url ? 'text-white hover:bg-white/20 focus:bg-white/20' : 'text-[#172B4D] dark:text-slate-200 hover:bg-gray-200 dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-[#3A9BDC]'}`}
                    />
                </div>
            </div>

            {/* Board Area */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable droppableId="board" type="list" direction="horizontal">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="flex h-full items-start gap-4 pb-4">
                                {lists.map((list, index) => (
                                    <Draggable key={list.id} draggableId={list.id} index={index}>
                                        {(provided, snapshot) => (
                                            <div ref={provided.innerRef} {...provided.draggableProps} className={`w-[320px] shrink-0 flex flex-col max-h-full rounded-2xl transition-shadow ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-[#3A9BDC] rotate-2' : 'shadow-sm'} ${board.background_url ? 'bg-[#f1f2f4]/95 dark:bg-[#101204]/95 backdrop-blur-xl border border-white/20' : 'bg-[#f1f2f4] dark:bg-[#101204] border border-transparent'}`}>
                                                
                                                <div {...provided.dragHandleProps} className="px-4 py-3 flex items-center justify-between group cursor-grab active:cursor-grabbing">
                                                    <h3 className="text-[13px] font-black uppercase tracking-wider text-[#172B4D] dark:text-slate-200 truncate">{list.title}</h3>
                                                    <button onClick={() => handleDeleteList(list.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-rose-500 rounded transition-all">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>

                                                <Droppable droppableId={list.id} type="card">
                                                    {(provided, snapshot) => (
                                                        <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-1 overflow-y-auto px-2 pb-2 min-h-[50px] space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-[#3A9BDC]/5 dark:bg-sky-900/10' : ''}`}>
                                                            {cards.filter(c => c.list_id === list.id).map((card, index) => (
                                                                <Draggable key={card.id} draggableId={card.id} index={index}>
                                                                    {(provided, snapshot) => (
                                                                        <div 
                                                                            ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} 
                                                                            onClick={() => setViewingCard(card)}
                                                                            className={`bg-white dark:bg-slate-800 p-3.5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:ring-2 hover:ring-[#3A9BDC] cursor-pointer group transition-all ${snapshot.isDragging ? 'shadow-2xl rotate-3 scale-105 z-50 ring-2 ring-[#3A9BDC]' : ''}`}
                                                                        >
                                                                            {card.label_color && (
                                                                                <div className="w-12 h-1.5 rounded-full mb-3 shadow-sm" style={{ backgroundColor: card.label_color }}></div>
                                                                            )}
                                                                            <p className="text-xs font-bold text-[#34495E] dark:text-slate-200 leading-relaxed">{card.title}</p>
                                                                        </div>
                                                                    )}
                                                                </Draggable>
                                                            ))}
                                                            {provided.placeholder}
                                                        </div>
                                                    )}
                                                </Droppable>

                                                <div className="p-2 border-t border-black/5 dark:border-white/5">
                                                    <button onClick={() => handleAddCard(list.id)} className="w-full py-2 px-3 flex items-center justify-start gap-2 text-gray-500 hover:text-[#34495E] dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-xs font-bold">
                                                        <Plus size={14} /> Add a card
                                                    </button>
                                                </div>

                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                                
                                {/* Add List Button */}
                                <div className="w-[320px] shrink-0">
                                    <button onClick={handleAddList} className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-2 transition-all font-bold text-xs shadow-sm ${board.background_url ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md' : 'bg-white/50 hover:bg-white dark:bg-slate-800/50 dark:hover:bg-slate-800 text-[#34495E] dark:text-slate-200 border border-transparent hover:border-gray-200 dark:hover:border-slate-700'}`}>
                                        <Plus size={14} /> Add another list
                                    </button>
                                </div>
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {/* Card Details Modal */}
            {viewingCard && (
                <CardDetailsModal 
                    card={viewingCard}
                    board={board}
                    lists={lists}
                    user={currentUser as User}
                    boardMembers={boardMembers}
                    allUsers={MOCK_USERS}
                    userToken={userToken as string}
                    onClose={() => setViewingCard(null)}
                    onUpdate={(updatedCard) => {
                        setCards(cards.map(c => c.id === updatedCard.id ? updatedCard : c));
                        setViewingCard(updatedCard);
                    }}
                />
            )}
        </div>
    );
};
