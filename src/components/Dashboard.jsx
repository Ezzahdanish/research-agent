import { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';
import { getHistory } from '../services/api';

export default function Dashboard() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const data = await getHistory({ limit: 50 });
                setHistory(data.items || []);
            } catch (err) {
                console.error('Failed to load dashboard data:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const metrics = useMemo(() => {
        const total = history.length;
        const completed = history.filter(h => h.status === 'completed').length;
        const totalTokens = history.reduce((sum, h) => sum + (h.total_tokens || 0), 0);
        const avgLatency = total > 0
            ? Math.round(history.reduce((sum, h) => sum + (h.total_latency_ms || 0), 0) / total)
            : 0;

        return [
            { label: 'Total Sessions', value: total.toLocaleString(), color: 'purple' },
            { label: 'Tokens Used', value: totalTokens > 1000 ? `${(totalTokens / 1000).toFixed(1)}K` : totalTokens.toLocaleString(), color: 'teal' },
            { label: 'Completed', value: `${completed}/${total}`, color: 'green' },
            { label: 'Avg Latency', value: avgLatency > 1000 ? `${(avgLatency / 1000).toFixed(1)}s` : `${avgLatency}ms`, color: 'amber' },
        ];
    }, [history]);

    const modeBreakdown = useMemo(() => {
        const quick = history.filter(h => h.mode === 'quick').length;
        const standard = history.filter(h => h.mode === 'standard').length;
        const deep = history.filter(h => h.mode === 'deep').length;
        return { quick, standard, deep };
    }, [history]);

    const recentItems = useMemo(() => history.slice(0, 10), [history]);

    const formatDate = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard__header">
                    <h1 className="dashboard__title">Dashboard</h1>
                </div>
                <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', marginTop: 60 }}>Loading...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <div className="dashboard__header-left">
                    <h1 className="dashboard__title">Dashboard</h1>
                    <p className="dashboard__subtitle">Research analytics</p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="dashboard__stats">
                {metrics.map((metric, i) => (
                    <div
                        key={metric.label}
                        className={`dashboard__stat-card dashboard__stat-card--${metric.color}`}
                        style={{ animationDelay: `${i * 80}ms` }}
                    >
                        <div className="dashboard__stat-header">
                            <span className="dashboard__stat-label">{metric.label}</span>
                        </div>
                        <div className="dashboard__stat-value-row">
                            <span className="dashboard__stat-value">{metric.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Mode Distribution */}
            <div className="dashboard__charts-row">
                <div className="dashboard__chart-card">
                    <h3 className="dashboard__chart-title">Mode Distribution</h3>
                    <div className="dashboard__donut-legend" style={{ marginTop: 12 }}>
                        <div className="dashboard__donut-legend-item">
                            <span className="dashboard__donut-dot dashboard__donut-dot--quick" />
                            <span>Quick ({modeBreakdown.quick})</span>
                        </div>
                        <div className="dashboard__donut-legend-item">
                            <span className="dashboard__donut-dot" style={{ background: '#8b5cf6' }} />
                            <span>Standard ({modeBreakdown.standard})</span>
                        </div>
                        <div className="dashboard__donut-legend-item">
                            <span className="dashboard__donut-dot dashboard__donut-dot--deep" />
                            <span>Deep ({modeBreakdown.deep})</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div className="dashboard__bottom-row">
                <div className="dashboard__table-card">
                    <div className="dashboard__table-header">
                        <h3 className="dashboard__table-title">Recent Research</h3>
                    </div>
                    <div className="dashboard__table-wrap">
                        <table className="dashboard__table">
                            <thead>
                                <tr>
                                    <th>Query</th>
                                    <th>Mode</th>
                                    <th>Tokens</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="dashboard__table-empty">
                                            No research sessions yet.
                                        </td>
                                    </tr>
                                ) : (
                                    recentItems.map((item, i) => (
                                        <tr key={item.id} style={{ animationDelay: `${i * 40}ms` }}>
                                            <td>
                                                <div className="dashboard__table-query">
                                                    <span className="dashboard__table-query-text">
                                                        {(item.title || item.query || '').slice(0, 50)}
                                                    </span>
                                                    <span className="dashboard__table-query-time">{formatDate(item.created_at)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`dashboard__table-mode dashboard__table-mode--${item.mode}`}>
                                                    {item.mode === 'quick' ? 'Quick' : item.mode === 'standard' ? 'Standard' : 'Deep'}
                                                </span>
                                            </td>
                                            <td className="dashboard__table-number">
                                                {(item.total_tokens || 0).toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={`dashboard__table-status dashboard__table-status--${item.status || 'completed'}`}>
                                                    {item.status === 'completed' ? 'Done' : item.status === 'failed' ? 'Failed' : item.status || 'Done'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
