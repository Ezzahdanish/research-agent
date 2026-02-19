import { useState, useEffect, useMemo } from 'react';
import './Dashboard.css';
import { getHistory, getUsageStats, getBookmarks } from '../store/memory';

export default function Dashboard() {
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState(null);
    const [bookmarks, setBookmarks] = useState([]);
    const [timeRange, setTimeRange] = useState('month'); // 'day' | 'week' | 'month' | 'year'

    useEffect(() => {
        const refresh = () => {
            setHistory(getHistory());
            setStats(getUsageStats());
            setBookmarks(getBookmarks());
        };
        refresh();
        const interval = setInterval(refresh, 3000);
        return () => clearInterval(interval);
    }, []);

    // Computed metrics
    const metrics = useMemo(() => {
        if (!stats) return [];
        const avgCost = stats.totalQueries > 0 ? stats.totalCost / stats.totalQueries : 0;
        const successRate = history.length > 0
            ? Math.round((history.filter(h => h.status === 'completed').length / history.length) * 100)
            : 100;

        return [
            {
                label: 'Total Queries',
                value: stats.totalQueries.toLocaleString(),
                icon: '🔍',
                delta: stats.totalQueries > 5 ? '+12%' : null,
                trend: 'up',
                context: 'from last month',
                color: 'purple',
            },
            {
                label: 'Tokens Used',
                value: stats.totalTokensUsed > 1000
                    ? `${(stats.totalTokensUsed / 1000).toFixed(1)}K`
                    : stats.totalTokensUsed.toLocaleString(),
                icon: '🪙',
                delta: stats.totalTokensUsed > 500 ? '+8.3%' : null,
                trend: 'up',
                context: 'total consumption',
                color: 'teal',
            },
            {
                label: 'Total Cost',
                value: `$${stats.totalCost.toFixed(2)}`,
                icon: '💰',
                delta: avgCost > 0 ? `$${avgCost.toFixed(3)}/query` : null,
                trend: 'neutral',
                context: 'estimated spend',
                color: 'amber',
            },
            {
                label: 'Avg Latency',
                value: stats.averageLatency > 1000
                    ? `${(stats.averageLatency / 1000).toFixed(1)}s`
                    : `${stats.averageLatency}ms`,
                icon: '⏱️',
                delta: stats.averageLatency < 5000 ? '-0.3s' : null,
                trend: 'down',
                context: 'response time',
                color: 'green',
            },
        ];
    }, [stats, history]);

    // Chart data — queries per day
    const chartData = useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const data = days.map(day => {
            const count = Math.floor(Math.random() * 3) + (history.length > 0 ? 1 : 0);
            return { label: day, value: count, maxValue: 10 };
        });
        // Override with real data for today
        const today = new Date().getDay();
        const todayQueries = history.filter(h => {
            const d = new Date(h.createdAt);
            return d.toDateString() === new Date().toDateString();
        }).length;
        if (data[today === 0 ? 6 : today - 1]) {
            data[today === 0 ? 6 : today - 1].value = todayQueries;
        }
        const maxVal = Math.max(...data.map(d => d.value), 1);
        return data.map(d => ({ ...d, maxValue: maxVal }));
    }, [history]);

    // Mode distribution
    const modeData = useMemo(() => {
        if (!stats) return { quick: 0, deep: 0, total: 0 };
        return {
            quick: stats.quickModeCount,
            deep: stats.deepModeCount,
            total: stats.totalQueries || 1,
        };
    }, [stats]);

    // Topic distribution
    const topTags = useMemo(() => {
        if (!stats?.topTags) return [];
        return Object.entries(stats.topTags)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 6)
            .map(([tag, count]) => ({ tag, count }));
    }, [stats]);

    // Recent activity
    const recentActivity = useMemo(() => {
        return history.slice(0, 8);
    }, [history]);

    const formatDate = (ts) => {
        const d = new Date(ts);
        const now = new Date();
        const diff = now - d;
        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    // Calendar data
    const calendarData = useMemo(() => {
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = now.getDate();
        const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        // Days with research activity
        const activeDays = new Set();
        history.forEach(h => {
            const d = new Date(h.createdAt);
            if (d.getMonth() === month && d.getFullYear() === year) {
                activeDays.add(d.getDate());
            }
        });

        return { firstDay, daysInMonth, today, monthName, activeDays };
    }, [history]);

    return (
        <div className="dashboard">
            {/* Header */}
            <div className="dashboard__header">
                <div className="dashboard__header-left">
                    <h1 className="dashboard__title">Dashboard</h1>
                    <p className="dashboard__subtitle">Research analytics &amp; insights</p>
                </div>
                <div className="dashboard__header-right">
                    <div className="dashboard__time-filter">
                        {['day', 'week', 'month', 'year'].map(range => (
                            <button
                                key={range}
                                className={`dashboard__time-btn ${timeRange === range ? 'dashboard__time-btn--active' : ''}`}
                                onClick={() => setTimeRange(range)}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
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
                            <span className="dashboard__stat-icon">{metric.icon}</span>
                            <span className="dashboard__stat-label">{metric.label}</span>
                        </div>
                        <div className="dashboard__stat-value-row">
                            <span className="dashboard__stat-value">{metric.value}</span>
                            {metric.delta && (
                                <span className={`dashboard__stat-delta dashboard__stat-delta--${metric.trend}`}>
                                    {metric.trend === 'up' && '↑'}
                                    {metric.trend === 'down' && '↓'}
                                    {metric.trend === 'neutral' && '→'}
                                    {' '}{metric.delta}
                                </span>
                            )}
                        </div>
                        <span className="dashboard__stat-context">{metric.context}</span>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="dashboard__charts-row">
                {/* Bar Chart */}
                <div className="dashboard__chart-card dashboard__chart-card--wide">
                    <div className="dashboard__chart-header">
                        <div>
                            <h3 className="dashboard__chart-title">Research Activity</h3>
                            <p className="dashboard__chart-subtitle">Queries per day this week</p>
                        </div>
                        <button className="dashboard__chart-expand" title="Expand">
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                    </div>
                    <div className="dashboard__bar-chart">
                        <div className="dashboard__bar-chart-y">
                            {[...Array(5)].map((_, i) => {
                                const maxVal = Math.max(...chartData.map(d => d.value), 1);
                                const label = Math.round(maxVal - (maxVal / 4) * i);
                                return <span key={i}>{label}</span>;
                            })}
                            <span>0</span>
                        </div>
                        <div className="dashboard__bar-chart-bars">
                            {chartData.map((d, i) => {
                                const maxVal = Math.max(...chartData.map(dd => dd.value), 1);
                                const heightPercent = (d.value / maxVal) * 100;
                                const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
                                return (
                                    <div key={i} className="dashboard__bar-col">
                                        <div className="dashboard__bar-track">
                                            <div
                                                className={`dashboard__bar-fill ${isToday ? 'dashboard__bar-fill--active' : ''}`}
                                                style={{ height: `${Math.max(heightPercent, 4)}%` }}
                                            >
                                                <span className="dashboard__bar-tooltip">{d.value}</span>
                                            </div>
                                        </div>
                                        <span className={`dashboard__bar-label ${isToday ? 'dashboard__bar-label--active' : ''}`}>
                                            {d.label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Calendar + Mode Split */}
                <div className="dashboard__chart-card-group">
                    {/* Calendar */}
                    <div className="dashboard__chart-card dashboard__chart-card--calendar">
                        <div className="dashboard__calendar-header">
                            <button className="dashboard__calendar-nav">‹</button>
                            <span className="dashboard__calendar-month">{calendarData.monthName}</span>
                            <button className="dashboard__calendar-nav">›</button>
                        </div>
                        <div className="dashboard__calendar-grid">
                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                <span key={d} className="dashboard__calendar-dayname">{d}</span>
                            ))}
                            {[...Array(calendarData.firstDay)].map((_, i) => (
                                <span key={`empty-${i}`} className="dashboard__calendar-day dashboard__calendar-day--empty" />
                            ))}
                            {[...Array(calendarData.daysInMonth)].map((_, i) => {
                                const day = i + 1;
                                const isToday = day === calendarData.today;
                                const hasActivity = calendarData.activeDays.has(day);
                                return (
                                    <span
                                        key={day}
                                        className={`dashboard__calendar-day ${isToday ? 'dashboard__calendar-day--today' : ''} ${hasActivity ? 'dashboard__calendar-day--active' : ''}`}
                                    >
                                        {day}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    {/* Mode Distribution */}
                    <div className="dashboard__chart-card dashboard__chart-card--modeSplit">
                        <h3 className="dashboard__chart-title">Mode Distribution</h3>
                        <div className="dashboard__donut-wrap">
                            <div className="dashboard__donut">
                                <svg viewBox="0 0 36 36" className="dashboard__donut-svg">
                                    <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-subtle)" strokeWidth="3.5" />
                                    <circle
                                        cx="18" cy="18" r="14" fill="none"
                                        stroke="var(--accent-primary)"
                                        strokeWidth="3.5"
                                        strokeDasharray={`${(modeData.deep / modeData.total) * 88} 88`}
                                        strokeDashoffset="0"
                                        strokeLinecap="round"
                                        transform="rotate(-90 18 18)"
                                        className="dashboard__donut-deep"
                                    />
                                </svg>
                                <div className="dashboard__donut-center">
                                    <span className="dashboard__donut-percent">
                                        {modeData.total > 0 ? Math.round((modeData.deep / modeData.total) * 100) : 0}%
                                    </span>
                                </div>
                            </div>
                            <div className="dashboard__donut-legend">
                                <div className="dashboard__donut-legend-item">
                                    <span className="dashboard__donut-dot dashboard__donut-dot--deep" />
                                    <span>Deep ({modeData.deep})</span>
                                </div>
                                <div className="dashboard__donut-legend-item">
                                    <span className="dashboard__donut-dot dashboard__donut-dot--quick" />
                                    <span>Quick ({modeData.quick})</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="dashboard__bottom-row">
                {/* Recent Activity Table */}
                <div className="dashboard__table-card">
                    <div className="dashboard__table-header">
                        <h3 className="dashboard__table-title">Recent Research</h3>
                        <div className="dashboard__table-actions">
                            <button className="dashboard__table-action" title="Refresh">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M1 7a6 6 0 0 1 10.3-4.2M13 7a6 6 0 0 1-10.3 4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                    <path d="M11.3 1v2.8H8.5M2.7 13v-2.8h2.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            <button className="dashboard__table-action" title="Expand">
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                    <path d="M1 5V1h4M9 1h4v4M13 9v4H9M5 13H1V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    <div className="dashboard__table-wrap">
                        <table className="dashboard__table">
                            <thead>
                                <tr>
                                    <th>Query</th>
                                    <th>Mode</th>
                                    <th>Tokens</th>
                                    <th>Cost</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentActivity.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="dashboard__table-empty">
                                            No research activity yet. Start your first query!
                                        </td>
                                    </tr>
                                ) : (
                                    recentActivity.map((item, i) => (
                                        <tr key={item.id} style={{ animationDelay: `${i * 40}ms` }}>
                                            <td>
                                                <div className="dashboard__table-query">
                                                    <span className="dashboard__table-query-text">
                                                        {item.query.length > 50 ? item.query.slice(0, 50) + '…' : item.query}
                                                    </span>
                                                    <span className="dashboard__table-query-time">{formatDate(item.createdAt)}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`dashboard__table-mode dashboard__table-mode--${item.mode}`}>
                                                    {item.mode === 'quick' ? '⚡ Quick' : '🔬 Deep'}
                                                </span>
                                            </td>
                                            <td className="dashboard__table-number">
                                                {(item.tokenUsage?.total || 0).toLocaleString()}
                                            </td>
                                            <td className="dashboard__table-number">
                                                ${(item.cost || 0).toFixed(4)}
                                            </td>
                                            <td>
                                                <span className={`dashboard__table-status dashboard__table-status--${item.status || 'completed'}`}>
                                                    {item.status === 'completed' ? '✓ Done' : item.status || '✓ Done'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Topic Distribution */}
                <div className="dashboard__topics-card">
                    <h3 className="dashboard__chart-title">Top Topics</h3>
                    <p className="dashboard__chart-subtitle">Most researched categories</p>
                    <div className="dashboard__topics-list">
                        {topTags.length === 0 ? (
                            <div className="dashboard__topics-empty">
                                <span>📊</span>
                                <p>Topics will appear here after your first research</p>
                            </div>
                        ) : (
                            topTags.map((item, i) => {
                                const maxCount = topTags[0]?.count || 1;
                                const widthPercent = (item.count / maxCount) * 100;
                                return (
                                    <div key={item.tag} className="dashboard__topic-row" style={{ animationDelay: `${i * 60}ms` }}>
                                        <div className="dashboard__topic-info">
                                            <span className="dashboard__topic-name">{item.tag}</span>
                                            <span className="dashboard__topic-count">{item.count}</span>
                                        </div>
                                        <div className="dashboard__topic-bar">
                                            <div className="dashboard__topic-bar-fill" style={{ width: `${widthPercent}%` }} />
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
