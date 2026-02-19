import { useState, useEffect, useRef, useCallback } from 'react';
import './Sidebar.css';
import {
    getHistory,
    deleteHistoryItem,
    clearHistory,
    getUsageStats,
    getBookmarks,
    isBookmarked,
    addBookmark,
    removeBookmark,
} from '../store/memory';

export default function Sidebar({ activeResearchId, onSelectResearch, onNewResearch, isOpen, onToggle, activeView, onViewChange }) {
    const [history, setHistory] = useState([]);
    const [bookmarks, setBookmarks] = useState([]);
    const [stats, setStats] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' | 'bookmarked' | 'quick' | 'deep'
    const [searchTerm, setSearchTerm] = useState('');
    const [showStats, setShowStats] = useState(false);
    const sidebarRef = useRef(null);

    const refreshData = useCallback(() => {
        setHistory(getHistory());
        setBookmarks(getBookmarks());
        setStats(getUsageStats());
    }, []);

    useEffect(() => {
        refreshData();
        const interval = setInterval(refreshData, 2000);
        return () => clearInterval(interval);
    }, [refreshData]);

    const filteredHistory = history.filter(item => {
        if (filter === 'bookmarked' && !bookmarks.includes(item.id)) return false;
        if (filter === 'quick' && item.mode !== 'quick') return false;
        if (filter === 'deep' && item.mode !== 'deep') return false;
        if (searchTerm && !item.query.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const handleDelete = (e, id) => {
        e.stopPropagation();
        deleteHistoryItem(id);
        refreshData();
    };

    const handleBookmarkToggle = (e, id) => {
        e.stopPropagation();
        if (isBookmarked(id)) {
            removeBookmark(id);
        } else {
            addBookmark(id);
        }
        refreshData();
    };

    const handleClearAll = () => {
        if (window.confirm('Clear all research history? This cannot be undone.')) {
            clearHistory();
            refreshData();
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatCost = (cost) => {
        if (cost < 0.01) return '<$0.01';
        return `$${cost.toFixed(2)}`;
    };

    return (
        <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`} ref={sidebarRef}>
            {/* Header */}
            <div className="sidebar__header">
                <div className="sidebar__brand">
                    <div className="sidebar__logo">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <defs>
                                <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28">
                                    <stop offset="0%" stopColor="#6c5ce7" />
                                    <stop offset="100%" stopColor="#00cec9" />
                                </linearGradient>
                            </defs>
                            <circle cx="14" cy="14" r="12" stroke="url(#logoGrad)" strokeWidth="2" fill="none" />
                            <path d="M10 10 L18 14 L10 18Z" fill="url(#logoGrad)" />
                        </svg>
                    </div>
                    <div className="sidebar__brand-text">
                        <span className="sidebar__title">DeepResearch</span>
                        <span className="sidebar__subtitle">AI Agent</span>
                    </div>
                </div>
                <button className="sidebar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar__nav">
                <button
                    className={`sidebar__nav-btn ${activeView === 'dashboard' ? 'sidebar__nav-btn--active' : ''}`}
                    onClick={() => onViewChange('dashboard')}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                        <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                    <span>Dashboard</span>
                </button>
                <button
                    className={`sidebar__nav-btn ${activeView === 'research' ? 'sidebar__nav-btn--active' : ''}`}
                    onClick={() => onViewChange('research')}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    <span>Research</span>
                </button>
                <button
                    className={`sidebar__nav-btn ${activeView === 'files' ? 'sidebar__nav-btn--active' : ''}`}
                    onClick={() => onViewChange('files')}
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M2 3a1 1 0 0 1 1-1h4l2 2h4a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3z" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                    <span>Files</span>
                </button>
            </nav>

            {/* New Research Button */}
            <button id="new-research-btn" className="sidebar__new-btn" onClick={() => { onViewChange('research'); onNewResearch(); }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                <span>New Research</span>
            </button>

            {/* Search */}
            <div className="sidebar__search">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="sidebar__search-icon">
                    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M9.5 9.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <input
                    type="text"
                    className="sidebar__search-input"
                    placeholder="Search history..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Filters */}
            <div className="sidebar__filters">
                {['all', 'bookmarked', 'quick', 'deep'].map(f => (
                    <button
                        key={f}
                        className={`sidebar__filter ${filter === f ? 'sidebar__filter--active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' && 'All'}
                        {f === 'bookmarked' && '★'}
                        {f === 'quick' && '⚡'}
                        {f === 'deep' && '🔬'}
                    </button>
                ))}
            </div>

            {/* History List */}
            <div className="sidebar__history">
                {filteredHistory.length === 0 ? (
                    <div className="sidebar__empty">
                        <div className="sidebar__empty-icon">
                            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                                <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                                <path d="M12 13h8M12 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                            </svg>
                        </div>
                        <p>No research history yet</p>
                        <span>Start a new research to begin</span>
                    </div>
                ) : (
                    filteredHistory.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`sidebar__item ${activeResearchId === item.id ? 'sidebar__item--active' : ''}`}
                            onClick={() => onSelectResearch(item.id)}
                            style={{ animationDelay: `${idx * 40}ms` }}
                        >
                            <div className="sidebar__item-header">
                                <span className={`sidebar__item-mode ${item.mode === 'quick' ? 'mode-quick' : 'mode-deep'}`}>
                                    {item.mode === 'quick' ? '⚡' : '🔬'}
                                </span>
                                <span className="sidebar__item-time">{formatDate(item.createdAt)}</span>
                            </div>
                            <p className="sidebar__item-query">{item.query}</p>
                            <div className="sidebar__item-meta">
                                <span className="sidebar__item-tokens">
                                    {item.tokenUsage?.total?.toLocaleString() || 0} tokens
                                </span>
                                <span className="sidebar__item-cost">
                                    {formatCost(item.cost || 0)}
                                </span>
                            </div>
                            <div className="sidebar__item-actions">
                                <button
                                    className={`sidebar__item-action ${isBookmarked(item.id) ? 'bookmarked' : ''}`}
                                    onClick={e => handleBookmarkToggle(e, item.id)}
                                    title="Bookmark"
                                >
                                    {isBookmarked(item.id) ? '★' : '☆'}
                                </button>
                                <button
                                    className="sidebar__item-action sidebar__item-action--delete"
                                    onClick={e => handleDelete(e, item.id)}
                                    title="Delete"
                                >
                                    ×
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Stats Panel */}
            <div className="sidebar__footer">
                <button className="sidebar__stats-toggle" onClick={() => setShowStats(!showStats)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" opacity="0.6" />
                        <rect x="5.5" y="4" width="3" height="9" rx="1" fill="currentColor" opacity="0.8" />
                        <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor" />
                    </svg>
                    <span>Usage Stats</span>
                    <span className={`sidebar__stats-arrow ${showStats ? 'rotated' : ''}`}>▾</span>
                </button>
                {showStats && stats && (
                    <div className="sidebar__stats">
                        <div className="sidebar__stat">
                            <span className="sidebar__stat-label">Total Queries</span>
                            <span className="sidebar__stat-value">{stats.totalQueries}</span>
                        </div>
                        <div className="sidebar__stat">
                            <span className="sidebar__stat-label">Tokens Used</span>
                            <span className="sidebar__stat-value">{stats.totalTokensUsed.toLocaleString()}</span>
                        </div>
                        <div className="sidebar__stat">
                            <span className="sidebar__stat-label">Total Cost</span>
                            <span className="sidebar__stat-value">{formatCost(stats.totalCost)}</span>
                        </div>
                        <div className="sidebar__stat">
                            <span className="sidebar__stat-label">Avg Latency</span>
                            <span className="sidebar__stat-value">{(stats.averageLatency / 1000).toFixed(1)}s</span>
                        </div>
                        {history.length > 0 && (
                            <button className="sidebar__clear-btn" onClick={handleClearAll}>
                                Clear History
                            </button>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
