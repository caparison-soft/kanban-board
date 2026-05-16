"use client";

import React, { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check, X, AlertCircle } from 'lucide-react';

export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
};

export const SearchableSelect: React.FC<{
  options: { label: string, value: string, sublabel?: string }[],
  value: string,
  onChange: (value: string) => void,
  placeholder: string,
  className?: string
}> = ({ options, value, onChange, placeholder, className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateRect = () => {
    if (containerRef.current) {
      const newRect = containerRef.current.getBoundingClientRect();
      if (newRect.width > 0) {
        setRect(newRect);
      }
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateRect();
      const timer = setTimeout(updateRect, 50);
      window.addEventListener('scroll', updateRect, true);
      window.addEventListener('resize', updateRect);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('scroll', updateRect, true);
        window.removeEventListener('resize', updateRect);
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) updateRect();
  }, [options.length, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsidePortal = (target as HTMLElement).closest('.searchable-select-portal');

      if (!isInsideContainer && !isInsidePortal) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase().trim();
    return options.filter(o =>
      o.label.toLowerCase().includes(term) ||
      o.sublabel?.toLowerCase().includes(term)
    );
  }, [options, searchTerm]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-[#f8f9fd] dark:bg-slate-900 border rounded-xl px-4 py-3.5 text-sm font-bold text-[#34495E] dark:text-slate-200 transition-all cursor-pointer flex items-center justify-between ${isOpen ? 'border-blue-400 ring-4 ring-blue-50' : 'border-gray-100'}`}
      >
        <span className="truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </div>

      {isOpen && rect && (
        <Portal>
          <div
            style={{
              position: 'fixed',
              top: rect.bottom + 8,
              left: rect.left,
              width: rect.width,
            }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] border border-gray-100 overflow-hidden z-[999] animate-in fade-in slide-in-from-top-2 duration-200 searchable-select-portal"
          >
            <div className="p-3 border-b border-gray-50 flex items-center gap-3">
              <Search size={16} className="text-blue-400" />
              <input
                autoFocus
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full bg-transparent border-none text-xs font-bold text-[#34495E] dark:text-slate-200 outline-none placeholder:text-gray-300"
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto scrollbar-hide py-1">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-gray-300 text-xs font-bold uppercase italic tracking-widest">No results found</div>
              ) : filteredOptions.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    onChange(o.value);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-5 py-2 text-left hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all flex items-center justify-between group ${value === o.value ? 'bg-blue-50/50 dark:bg-blue-500/10' : ''}`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-black uppercase ${value === o.value ? 'text-blue-600 dark:text-blue-400' : 'text-[#34495E] dark:text-slate-200'}`}>{o.label}</p>
                    {o.sublabel && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest truncate">{o.sublabel}</p>}
                  </div>
                  {value === o.value && <Check size={14} className="text-blue-600 dark:text-blue-400" strokeWidth={3} />}
                </button>
              ))}
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
};

export const Card = React.forwardRef<HTMLDivElement, { children?: React.ReactNode, className?: string, onClick?: (e: React.MouseEvent) => void, style?: React.CSSProperties }>(({ children, className = "", onClick, style }, ref) => (
  <div
    ref={ref}
    onClick={onClick}
    style={style}
    className={`bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-sm border border-gray-100 dark:border-slate-800/50 p-6 ${className}`}
  >
    {children}
  </div>
));
Card.displayName = "Card";

export const Badge: React.FC<{ children?: React.ReactNode, colorClass: string, className?: string }> = ({ children, colorClass, className = "" }) => (
  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-tighter border ${colorClass} ${className}`}>
    {children}
  </span>
);

export const Modal: React.FC<{ isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode, maxWidth?: string }> = ({ isOpen, onClose, title, children, maxWidth = "max-w-md" }) => {
  if (!isOpen) return null;
  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 cursor-pointer"
    >
      <Card
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidth} p-0 overflow-hidden shadow-2xl animate-in zoom-in duration-300 cursor-default flex flex-col max-h-[90vh] bg-white dark:bg-slate-800 border-none`}
      >
        <div className="p-4 border-b border-gray-50 dark:border-slate-800/50 flex justify-between items-center bg-white dark:bg-slate-800 shrink-0">
          <h2 className="text-xs font-bold text-gray-900 dark:text-slate-200 uppercase tracking-widest">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-400">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </Card>
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  isOpen: boolean,
  onClose: () => void,
  onConfirm: () => void,
  title: string,
  message: string,
  confirmText?: string,
  confirmColor?: string,
  children?: React.ReactNode
}> = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", confirmColor = "bg-rose-600 hover:bg-rose-700", children }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
            <AlertCircle size={20} />
          </div>
          <p className="text-sm font-medium text-gray-600 leading-relaxed">{message}</p>
        </div>
        {children}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-50 dark:border-slate-800/50">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold uppercase text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 dark:hover:text-slate-200 transition-colors">Cancel</button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`${confirmColor} text-white px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-sm transition-all`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};
