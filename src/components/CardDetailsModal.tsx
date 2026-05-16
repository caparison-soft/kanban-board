import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
    X, AlignLeft, CheckSquare, ChevronRight, Link, Plus, 
    UserPlus, FileText, Trash2, Activity as ActivityIcon, ChevronDown 
} from 'lucide-react';
import { KCard, KBoard, KList, KSubtask, KSubSubtask, KActivity, User } from '../types';
import { kanbanQuery } from '../lib/api';

export const CardDetailsModal: React.FC<{ 
    card: KCard; board: KBoard; lists: KList[]; user: User; boardMembers: any[]; allUsers: any[]; onClose: () => void; onUpdate: (c: KCard) => void, userToken: string
}> = ({ card, board, lists, user, boardMembers, allUsers, onClose, onUpdate, userToken }) => {
    const [activities, setActivities] = useState<KActivity[]>([]);
    const [subtasks, setSubtasks] = useState<KSubtask[]>([]);
    const [subSubtasks, setSubSubtasks] = useState<KSubSubtask[]>([]);
    
    const [filterMode, setFilterMode] = useState<number>(0);
    const [commentText, setCommentText] = useState("");
    const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
    const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
    const [viewingTaskDetails, setViewingTaskDetails] = useState<{ id: string, type: 'subtask' | 'subsubtask' } | null>(null);
    
    const subtaskStatuses = ["Pending", "In-Progress", "Done"];

    const fetchData = useCallback(async () => {
        try {
            const actData = await kanbanQuery(userToken, { table: 'kanban_activities', action: 'select', match: { card_id: card.id }, order: { column: 'created_at', ascending: false } });
            if (actData) setActivities(actData);

            const subData = await kanbanQuery(userToken, { table: 'kanban_subtasks', action: 'select', match: { card_id: card.id }, order: { column: 'created_at', ascending: true } });
            if (subData) {
                setSubtasks(subData);
                // Currently generic query doesn't support 'in' easily, but we can fetch all sub_subtasks for the board instead and filter client-side to save complex API calls
                const sstData = await kanbanQuery(userToken, { table: 'kanban_sub_subtasks', action: 'select', match: { board_id: board.id } });
                if (sstData) setSubSubtasks(sstData.filter((sst: any) => subData.find((s: any) => s.id === sst.subtask_id)));
            }
        } catch (e) { console.error(e); }
    }, [card.id, board.id, userToken]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const updateField = async (field: keyof KCard, value: any) => {
        onUpdate({ ...card, [field]: value });
        await kanbanQuery(userToken, { table: 'kanban_cards', action: 'update', match: { id: card.id, board_id: board.id }, payload: { [field]: value } });
    };

    const handleAddComment = async () => {
        if (!commentText.trim()) return;
        const newAct = { board_id: board.id, card_id: card.id, user_id: user.id, action_type: 'comment', details: commentText.trim() };
        const data = await kanbanQuery(userToken, { table: 'kanban_activities', action: 'insert', payload: newAct });
        if (data && data[0]) {
            setActivities(prev => [data[0], ...prev]);
            setCommentText("");
        }
    };

    const handleAddSubtask = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && newSubtaskTitle.trim()) {
            const data = await kanbanQuery(userToken, { table: 'kanban_subtasks', action: 'insert', payload: { board_id: board.id, card_id: card.id, title: newSubtaskTitle.trim() }});
            if (data && data[0]) setSubtasks(prev => [...prev, data[0]]);
            setNewSubtaskTitle("");
        }
    };

    const updateSubtaskStatus = async (id: string, status: string) => {
        setSubtasks(prev => prev.map(s => s.id === id ? {...s, status} : s));
        await kanbanQuery(userToken, { table: 'kanban_subtasks', action: 'update', match: { id, board_id: board.id }, payload: { status }});
    };

    const deleteSubtask = async (id: string) => {
        if (!window.confirm("Delete this subtask?")) return;
        setSubtasks(prev => prev.filter(s => s.id !== id));
        await kanbanQuery(userToken, { table: 'kanban_subtasks', action: 'delete', match: { id, board_id: board.id }});
    };

    const getSubtaskProgress = (subtaskId: string) => {
        const children = subSubtasks.filter(sst => sst.subtask_id === subtaskId);
        if (children.length === 0) return 0;
        const done = children.filter(sst => sst.status === 'Done').length;
        return Math.round((done / children.length) * 100);
    };

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-slate-800 w-full mb-auto mt-12 max-w-5xl rounded-xl shadow-2xl flex flex-col font-sans border border-gray-200 dark:border-slate-800">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
                    <span className="flex items-center gap-1 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-md border border-gray-200 dark:border-slate-700 shadow-sm text-sm text-gray-500 font-medium">
                        <CheckSquare size={14} className="text-[#3A9BDC]"/> DP-{card.id.split('-')[0].substring(0,4).toUpperCase()}
                    </span>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg text-gray-400 transition-colors"><X size={18} /></button>
                </div>

                <div className="flex-1 flex flex-col md:flex-row max-h-[80vh] overflow-hidden">
                    <div className="flex-1 p-8 md:border-r border-gray-100 dark:border-slate-800 overflow-y-auto space-y-8">
                        <input 
                            value={card.title}
                            onChange={(e) => onUpdate({...card, title: e.target.value})}
                            onBlur={(e) => updateField('title', e.target.value)}
                            className="text-3xl font-bold text-[#172B4D] dark:text-slate-200 outline-none leading-tight bg-transparent w-full" 
                        />
                        
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-[#172B4D] dark:text-slate-200 flex items-center gap-2"><AlignLeft size={16}/> Description</h3>
                            <textarea 
                                value={card.description || ''}
                                onChange={(e) => onUpdate({...card, description: e.target.value})}
                                onBlur={(e) => updateField('description', e.target.value)}
                                placeholder="Add a description..."
                                className="w-full min-h-[120px] bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-3 rounded-lg text-sm outline-none"
                            />
                        </div>

                        {/* SUBTASKS */}
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-[#172B4D] dark:text-slate-200 flex items-center gap-2"><CheckSquare size={16}/> Subtasks</h3>
                            <div className="space-y-2">
                                {subtasks.map(s => (
                                    <div key={s.id} className="border border-gray-200 dark:border-slate-700 p-3 rounded-lg flex items-center justify-between bg-white dark:bg-slate-800 shadow-sm">
                                        <span className="text-sm font-bold text-gray-700 dark:text-slate-300">{s.title}</span>
                                        <div className="flex items-center gap-2">
                                            <select 
                                                value={s.status} 
                                                onChange={(e) => updateSubtaskStatus(s.id, e.target.value)}
                                                className="text-xs bg-gray-100 p-1 rounded"
                                            >
                                                {subtaskStatuses.map(st => <option key={st} value={st}>{st}</option>)}
                                            </select>
                                            <button onClick={() => deleteSubtask(s.id)} className="text-rose-500 hover:bg-rose-50 p-1 rounded"><Trash2 size={14}/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <input 
                                type="text" 
                                placeholder="Add new parent subtask (Press Enter)..." 
                                value={newSubtaskTitle}
                                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                onKeyDown={handleAddSubtask}
                                className="w-full text-sm bg-gray-50 border border-gray-200 p-3 rounded-lg outline-none" 
                            />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="w-full md:w-[340px] bg-[#F7F8F9] dark:bg-slate-900 p-6 overflow-y-auto space-y-6">
                        <select 
                            value={card.list_id}
                            onChange={(e) => updateField('list_id', e.target.value)}
                            className="bg-gray-200 dark:bg-slate-700 text-xs font-black uppercase px-4 py-3 rounded-xl w-full outline-none"
                        >
                            {lists.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
                        </select>
                        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 p-5 rounded-xl space-y-4">
                            <h4 className="text-xs font-black uppercase text-gray-500">Settings</h4>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500">Priority</span>
                                <button onClick={() => updateField('priority', card.priority === 'High' ? 'Low' : 'High')} className={`font-bold ${card.priority === 'High' ? 'text-rose-500' : 'text-emerald-500'}`}>
                                    {card.priority || 'Medium'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
