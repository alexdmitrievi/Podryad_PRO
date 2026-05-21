'use client';

import { useState, useEffect, useRef } from 'react';
import { Menu, X, Search } from 'lucide-react';
import type { ElementType } from 'react';

interface TabItem {
  id: string;
  label: string;
  icon: ElementType;
}

const FAVORITES_KEY = 'admin_fav_tabs';

function getFavorites(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
  } catch {
    return [];
  }
}

function toggleFavorite(tabId: string): string[] {
  const favs = getFavorites();
  const next = favs.includes(tabId) ? favs.filter(f => f !== tabId) : [...favs, tabId];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export default function MobileTabMenu({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: TabItem[];
  activeTab: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [favorites, setFavorites] = useState<string[]>(getFavorites);
  const inputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 150);
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    setSearch('');
  };

  const handleSelect = (tabId: string) => {
    onSelect(tabId);
    handleClose();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 80) handleClose();
  };

  const activeTabObj = tabs.find(t => t.id === activeTab);

  const handleFavorite = (tabId: string) => {
    const next = toggleFavorite(tabId);
    setFavorites(next);
  };

  const filtered = search.trim()
    ? tabs.filter(t => t.label.toLowerCase().includes(search.toLowerCase()))
    : tabs;

  const favTabs = favorites.map(id => tabs.find(t => t.id === id)).filter(Boolean) as TabItem[];
  const otherTabs = filtered.filter(t => !favorites.includes(t.id));

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border text-gray-700 dark:text-dark-text text-sm font-semibold cursor-pointer hover:border-brand-400 transition-colors min-h-[44px]"
        aria-label="Меню разделов"
      >
        <Menu className="w-5 h-5" />
        <span className="truncate max-w-[140px]">{activeTabObj?.label || 'Меню'}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Навигация по разделам"
        >
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          <div
            ref={sheetRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-dark-card rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl animate-slide-up"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Разделы</h2>
              <button
                onClick={handleClose}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-dark-border text-gray-500 hover:text-gray-700 cursor-pointer min-h-[44px] min-w-[44px]"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск раздела..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border bg-surface dark:bg-dark-bg text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-[44px]"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-5 pb-5 space-y-4">
              {!search && favTabs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    Избранное
                  </p>
                  <div className="space-y-1">
                    {favTabs.map(tab => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleSelect(tab.id)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors text-left min-h-[44px] ${
                            activeTab === tab.id
                              ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-500'
                              : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border'
                          }`}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          <span className="flex-1">{tab.label}</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleFavorite(tab.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer flex-shrink-0"
                            aria-label="Убрать из избранного"
                          >
                            ★
                          </button>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                {!search && otherTabs.length > 0 && (
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                    Все разделы
                  </p>
                )}
                <div className="space-y-1">
                  {otherTabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleSelect(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-colors text-left min-h-[44px] ${
                          activeTab === tab.id
                            ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-500'
                            : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-dark-border'
                        }`}
                      >
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className="flex-1">{tab.label}</span>
                        {!favorites.includes(tab.id) && (
                          <button
                            onClick={e => { e.stopPropagation(); handleFavorite(tab.id); }}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 cursor-pointer flex-shrink-0"
                            aria-label="Добавить в избранное"
                          >
                            ☆
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filtered.length === 0 && (
                <p className="text-center text-gray-400 text-sm py-8">
                  Ничего не найдено
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
