"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Plus, Lock, Trash2 } from 'lucide-react';
import { createHubClient } from '../lib/supabase';
import { KBoard } from '../types';
import { UserMenu } from '../components/UserMenu';

export default function KanbanDashboard() {
    const [boards, setBoards] = useState<KBoard[]>([]);
    const [loading, setLoading] = useState(true);
    const [userToken, setUserToken] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
    
    const router = useRouter();
    const supabaseHub = createHubClient();

    const checkSession = useCallback(async () => {
        const { data: { session } } = await supabaseHub.auth.getSession();
        if (session) {
            setUserToken(session.access_token);
            setUserId(session.user.id);
            setUserEmail(session.user.email);
            return session.access_token;
        } else {
            // No local session — redirect bounce to the Hub login
            const currentAppUrl = encodeURIComponent(window.location.href);
            window.location.href = `https://www.caparisonlab.com/login?next=${currentAppUrl}`;
            return null;
        }
    }, [supabaseHub.auth]);

    const fetchBoards = useCallback(async (token: string) => {
        try {
            const res = await fetch('/api/kanban/boards', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.ok) {
                setBoards(data.boards);
            }
        } catch (err) {
            console.error("Fetch Boards Error:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkSession().then(token => {
            if (token) fetchBoards(token);
        });
    }, [checkSession, fetchBoards]);

    const handleCreateBoard = async () => {
        const title = prompt("Enter a name for your private board:");
        if (!title || !userToken) return;

        try {
            const res = await fetch('/api/kanban/boards', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ title })
            });
            const data = await res.json();
            
            if (data.ok && data.board) {
                setBoards(prev => [data.board, ...prev]);
                router.push(`/board/${data.board.id}`);
            } else {
                alert("Failed to create board");
            }
        } catch (err) {
            alert("Creation failed: " + (err as any).message);
        }
    };

    const handleDeleteBoard = async (e: React.MouseEvent, boardToDelete: KBoard) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to completely destroy "${boardToDelete.title}" and all its tasks?`)) return;

        try {
            const res = await fetch(`/api/kanban/boards/${boardToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${userToken}` }
            });
            const data = await res.json();
            if (data.ok) {
                setBoards(prev => prev.filter(b => b.id !== boardToDelete.id));
            }
        } catch (err) {
            console.error(err);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-gray-500">Loading Kanban Boards...</div>;
    }

    if (!userToken) {
        // Show a loading state while we redirect to the Hub
        return (
            <div className="p-8 text-center text-gray-500">
                Redirecting to Caparison Lab...
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700 max-w-[1400px] mx-auto p-8 font-sans text-[#34495E] dark:text-slate-200">
            {userToken && <UserMenu userToken={userToken} userEmail={userEmail} />}
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1 border-b border-gray-100 pb-8 mt-12 md:mt-0">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight text-[#34495E] dark:text-slate-200">Kanban Workspaces</h1>
                    <p className="text-sm font-medium text-gray-400 dark:text-slate-500">Independent Micro-Service Deployment</p>
                </div>
                <button 
                    onClick={handleCreateBoard}
                    className="bg-[#3A9BDC] text-white px-8 py-3.5 rounded-[1.25rem] text-[13px] font-black uppercase tracking-[0.15em] hover:bg-sky-500 transition-all shadow-xl shadow-sky-500/20 flex items-center justify-center gap-2"
                >
                    <Plus size={16} /> Create Workspace
                </button>
            </div>

            {/* Boards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mx-1">
                {boards.length === 0 ? (
                    <div className="col-span-full py-32 bg-white dark:bg-slate-800 border border-dashed border-gray-200 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-gray-200 dark:text-slate-700">
                            <LayoutDashboard size={32} />
                        </div>
                        <div>
                            <p className="text-sm font-black uppercase tracking-widest text-gray-300 dark:text-slate-600">No Authorized Boards Found</p>
                            <p className="text-xs font-bold text-gray-200 dark:text-slate-700 uppercase mt-1">Create a board to get started</p>
                        </div>
                    </div>
                ) : (
                    boards.map(b => (
                        <div 
                            key={b.id} 
                            onClick={() => router.push(`/board/${b.id}`)}
                            className={`group relative h-48 rounded-[2rem] p-8 cursor-pointer overflow-hidden shadow-sm hover:shadow-xl transition-all hover:-translate-y-1 ${b.background_color} border border-black/5 hover:border-black/10 bg-cover bg-center`}
                            style={b.background_url ? { backgroundImage: b.background_url.startsWith('http') ? `url(${b.background_url})` : b.background_url } : {}}
                        >
                            {b.background_url && <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors z-0"></div>}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent z-0"></div>
                            <div className="relative h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div className="bg-white dark:bg-slate-800/20 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/20">
                                        <Lock size={12} className="text-black dark:text-white/50" />
                                    </div>
                                    {b.created_by === userId && (
                                        <button 
                                            onClick={(e) => handleDeleteBoard(e, b)}
                                            className="bg-white dark:bg-slate-800/20 hover:bg-rose-50 dark:hover:bg-rose-500/100/90 backdrop-blur-md px-2 py-1.5 rounded-lg border border-white/20 text-black dark:text-white/50 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                                <h3 className={`text-xl font-bold leading-tight group-hover:scale-105 origin-left transition-transform duration-300 relative z-10 ${b.background_url ? 'text-white drop-shadow-md' : 'text-[#34495E] dark:text-slate-100'}`}>
                                    {b.title}
                                </h3>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
