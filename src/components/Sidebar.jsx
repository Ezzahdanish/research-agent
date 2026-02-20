import { useState, useEffect, useCallback } from 'react';
import './Sidebar.css';
import { getHistory, deleteSession } from '../services/api';

export default function Sidebar({
    activeResearchId,
    onSelectResearch,
    onNewResearch,
    isOpen,
    onToggle,
    activeView,
    onViewChange,
    historyVersion,
}) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const refreshData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getHistory({ limit: 50, offset: 0 });
            setHistory(data.items || []);
        } catch (err) {
            console.error('Failed to load history:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshData();
    }, [refreshData, historyVersion]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        try {
            await deleteSession(id);
            setHistory(prev => prev.filter(item => item.id !== id));
        } catch (err) {
            console.error('Failed to delete:', err);
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

    const getModeLabel = (mode) => {
        if (mode === 'deep') return 'Deep';
        if (mode === 'standard') return 'Standard';
        return 'Quick';
    };

    return (
        <aside className={`sidebar ${isOpen ? 'sidebar--open' : 'sidebar--closed'}`}>
            <div className="sidebar__header">
                <div className="sidebar__brand">
                    <span className="sidebar__brand-title">Deep Research</span>
                    <button className="sidebar__toggle" onClick={onToggle} aria-label="Toggle sidebar">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>
            </div>

            <button
                id="new-research-btn"
                className="sidebar__new-btn"
                onClick={() => { onViewChange('research'); onNewResearch(); }}
            >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                New Research
            </button>

            <div className="sidebar__history">
                {loading && history.length === 0 ? (
                    <div className="sidebar__empty">
                        <p>Loading...</p>
                    </div>
                ) : history.length === 0 ? (
                    <div className="sidebar__empty">
                        <p>No research sessions yet</p>
                        <span>Start a new session to begin</span>
                    </div>
                ) : (
                    history.map((item, idx) => (
                        <div
                            key={item.id}
                            className={`sidebar__item ${activeResearchId === item.id ? 'sidebar__item--active' : ''}`}
                            onClick={() => onSelectResearch(item.id)}
                            style={{ animationDelay: `${idx * 30}ms` }}
                        >
                            <div className="sidebar__item-header">
                                <span className="sidebar__item-name">
                                    {(item.title || item.query || '').slice(0, 50)}
                                    {(item.title || item.query || '').length > 50 ? '...' : ''}
                                </span>
                                <button
                                    className="sidebar__item-close"
                                    onClick={e => handleDelete(e, item.id)}
                                    title="Remove"
                                >&times;</button>
                            </div>
                            <div className="sidebar__item-meta">
                                <span className={`sidebar__item-mode sidebar__item-mode--${item.mode}`}>
                                    {getModeLabel(item.mode)}
                                </span>
                                <span>&middot;</span>
                                <span className="sidebar__item-date">{formatDate(item.created_at)}</span>
                                {item.status === 'failed' && (
                                    <>
                                        <span>&middot;</span>
                                        <span className="sidebar__item-status--failed">Failed</span>
                                    </>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="sidebar__footer">
                <span className="sidebar__footer-text">
                    {history.length} session{history.length !== 1 ? 's' : ''}
                </span>
            </div>
        </aside>
    );
}
