"use client";

import React, { useEffect, useState } from 'react';
import { User, LayoutDashboard, Coins } from 'lucide-react';

export const UserMenu: React.FC<{ userToken: string; userEmail: string | undefined }> = ({ userToken, userEmail }) => {
    const [userCredits, setUserCredits] = useState<number | null>(null);

    useEffect(() => {
        if (!userToken) return;

        const checkCredits = async () => {
            try {
                const res = await fetch('/api/credits/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userToken })
                });
                const data = await res.json();
                if (data.ok) {
                    setUserCredits(data.credits ?? 0);
                }
            } catch (err) {
                console.error("Failed to check credits:", err);
            }
        };

        checkCredits();
    }, [userToken]);

    const handleGoToDashboard = () => {
        if (confirm("Do you want to go to the dashboard? This app will be closed.")) {
            window.location.href = 'https://www.caparisonlab.com/dashboard';
        }
    };

    return (
        <div className="absolute top-5 right-5 z-[55] pointer-events-auto flex items-center gap-2 font-sans">
            {/* Credits badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-gray-200 dark:border-slate-700 shadow-sm text-sm font-medium">
                <Coins className="h-3.5 w-3.5 text-yellow-400" />
                <span className="text-yellow-500 font-bold">{userCredits ?? '...'}</span>
                <span className="text-gray-400 dark:text-slate-400 text-xs">credits</span>
            </div>

            {/* Profile avatar */}
            <div className="group relative">
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-black/10 flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-default transition-transform hover:scale-105">
                    {userEmail ? userEmail[0].toUpperCase() : <User className="h-4 w-4" />}
                </div>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                    {userEmail || 'User'}
                </div>
            </div>

            {/* Dashboard */}
            <div className="group relative">
                <button
                    onClick={handleGoToDashboard}
                    className="flex items-center justify-center rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-gray-200 dark:border-slate-700 shadow-sm h-9 w-9 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                >
                    <LayoutDashboard className="h-4 w-4 text-gray-500 dark:text-slate-300" />
                </button>
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap">
                    Hub Dashboard
                </div>
            </div>
        </div>
    );
};
