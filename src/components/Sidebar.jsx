import { useState, useEffect, useCallback } from 'react';
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
    const [activeTab, setActiveTab] = useState('reports'); // 'reports' | 'history' | 'prefs'
    const [showStats, setShowStats] = useState(false);

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
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatCost = (cost) => {
        if (cost < 0.01) return '<$0.01';
        return `$${cost.toFixed(2)}`;
    };

    // Which list to show based on tab
    const displayedHistory = activeTab === 'history'
        ? history
        : activeTab === 'reports'
            ? history
            : [];

    return (
        <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
            {/* Header */}
            <div className="sidebar__header">
                <span className="sidebar__intelligence-label">Research Intelligence</span>
                <div className="sidebar__brand">
                    <span className="sidebar__brand-title">Deep Research<br />Dashboard</span>
                    <button className="sidebar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* New Research Brief Button */}
            <button
                id="new-research-btn"
                className="sidebar__new-btn"
                onClick={() => { onViewChange('research'); onNewResearch(); }}
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                New Research Brief
            </button>

            {/* Tabs */}
            <div className="sidebar__tabs">
                {[
                    { id: 'reports', label: 'Reports' },
                    { id: 'history', label: 'History' },
                    { id: 'prefs', label: 'Prefs' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        className={`sidebar__tab ${activeTab === tab.id ? 'sidebar__tab--active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Session / History List */}
            <div className="sidebar__history">
                {activeTab === 'prefs' ? (
                    <div className="sidebar__empty">
                        <div className="sidebar__empty-icon">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                <circle cx="14" cy="14" r="5" stroke="currentColor" strokeWidth="1.5" opacity="0.4" />
                                <path d="M14 2v3M14 23v3M2 14h3M23 14h3M5.5 5.5l2 2M20.5 20.5l2 2M5.5 22.5l2-2M20.5 7.5l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
                            </svg>
                        </div>
                        <p>Preferences</p>
                        <span>Settings coming soon</span>
                    </div>
                ) : displayedHistory.length === 0 ? (
                    <div className="sidebar__empty">
                        <div className="sidebar__empty-icon">
                            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                                <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
                                <path d="M10 13h8M10 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
                            </svg>
                        </div>
                        <p>No research sessions yet</p>
                        <span>Start a new brief to begin</span>
                    </div>
                ) : (
                    displayedHistory.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`sidebar__item ${activeResearchId === item.id ? 'sidebar__item--active' : ''}`}
                            onClick={() => onSelectResearch(item.id)}
                            style={{ animationDelay: `${idx * 30}ms` }}
                        >
                            <div className="sidebar__item-header">
                                <span className="sidebar__item-name">
                                    {item.query?.slice(0, 36)}{item.query?.length > 36 ? '…' : ''}
                                </span>
                                <button
                                    className="sidebar__item-close"
                                    onClick={e => handleDelete(e, item.id)}
                                    title="Remove"
                                >×</button>
                            </div>
                            <div className="sidebar__item-meta">
                                <span className="sidebar__item-count">
                                    {item.mode === 'deep' ? 'Deep Analysis' : 'Quick Brief'}
                                </span>
                                <span>·</span>
                                <span className="sidebar__item-date">{formatDate(item.createdAt)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Stats Footer */}
            <div className="sidebar__footer">
                <button className="sidebar__stats-toggle" onClick={() => setShowStats(!showStats)}>
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                        <rect x="1" y="7" width="3" height="6" rx="1" fill="currentColor" opacity="0.5" />
                        <rect x="5.5" y="4" width="3" height="9" rx="1" fill="currentColor" opacity="0.7" />
                        <rect x="10" y="1" width="3" height="12" rx="1" fill="currentColor" />
                    </svg>
                    <span>Usage Stats</span>
                    <span className={`sidebar__stats-arrow ${showStats ? 'rotated' : ''}`}>▾</span>
                </button>
                {showStats && stats && (
                    <div className="sidebar__stats">
                        <div className="sidebar__stat">
                            <span className="sidebar__stat-label">Sessions</span>
                            <span className="sidebar__stat-value">{stats.totalQueries}</span>
                        </div>
                        <div className="sidebar__stat">
                            <span className="sidebar__stat-label">Tokens</span>
                            <span className="sidebar__stat-value">{stats.totalTokensUsed.toLocaleString()}</span>
                        </div>
                        <div className="sidebar__stat">
                            <span className="sidebar__stat-label">Cost</span>
                            <span className="sidebar__stat-value">{formatCost(stats.totalCost)}</span>
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
