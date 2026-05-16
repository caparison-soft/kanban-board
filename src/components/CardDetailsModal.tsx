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
    
    const labelColors = [
        '#EF4444', '#F97316', '#EAB308', '#22C55E', '#14B8A6', 
        '#06B6D4', '#3B82F6', '#8B5CF6', '#A855F7', '#EC4899'
    ];

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
                            <h4 className="text-xs font-black uppercase text-gray-500">Settings Matrix</h4>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Creator</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                                        {card.created_by ? card.created_by.substring(0, 2).toUpperCase() : 'U'}
                                    </div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">User</span>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-500 font-medium">Priority</span>
                                <button onClick={() => updateField('priority', card.priority === 'High' ? 'Medium' : card.priority === 'Medium' ? 'Low' : 'High')} 
                                    className={`font-black uppercase text-xs tracking-wider ${card.priority === 'High' ? 'text-rose-500' : card.priority === 'Medium' ? 'text-orange-500' : 'text-emerald-500'}`}>
                                    ={card.priority || 'MEDIUM'}
                                </button>
                            </div>

                            <div className="flex justify-between items-start text-sm pt-2">
                                <span className="text-gray-500 font-medium mt-1">Label Color</span>
                                <div className="flex flex-col items-end gap-3">
                                    {card.label_color && (
                                        <div className="w-8 h-8 rounded-md shadow-sm border border-black/10" style={{ backgroundColor: card.label_color }}></div>
                                    )}
                                    <div className="grid grid-cols-5 gap-2">
                                        {labelColors.map(color => (
                                            <button 
                                                key={color}
                                                onClick={() => updateField('label_color', color)}
                                                className={`w-5 h-5 rounded hover:scale-110 transition-transform ${card.label_color === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    {card.label_color && (
                                        <button onClick={() => updateField('label_color', null)} className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 hover:text-gray-600 self-start mt-1">
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
