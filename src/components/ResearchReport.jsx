import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import './ResearchReport.css';

export default function ResearchReport({
    result,
    onFollowUp,
    isFollowUpLoading,
}) {
    const [followUpQuery, setFollowUpQuery] = useState('');
    const [activeTab, setActiveTab] = useState('report');
    const [copyFeedback, setCopyFeedback] = useState('');
    const reportRef = useRef(null);

    if (!result) return null;

    const { report, sources, tags, tokenUsage, cost, latency, mode, query, followUpResults } = result;

    const handleFollowUp = (e) => {
        e.preventDefault();
        if (!followUpQuery.trim() || isFollowUpLoading) return;
        onFollowUp(followUpQuery.trim());
        setFollowUpQuery('');
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(report);
            setCopyFeedback('Copied!');
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch {
            setCopyFeedback('Failed to copy');
            setTimeout(() => setCopyFeedback(''), 2000);
        }
    };

    const handleExport = () => {
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-${query.slice(0, 30).replace(/\s+/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatLatency = (ms) => {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const sourceTypeIcon = {
        paper: '📄',
        documentation: '📘',
        blog: '📝',
        repository: '💻',
    };

    return (
        <div className="research-report" ref={reportRef}>
            {/* Report Header */}
            <div className="research-report__header">
                <div className="research-report__header-left">
                    <h2 className="research-report__title">
                        <span className="research-report__title-icon">
                            {mode === 'quick' ? '⚡' : '🔬'}
                        </span>
                        Research Results
                    </h2>
                    <div className="research-report__tags">
                        {tags?.map(tag => (
                            <span key={tag} className="badge badge-purple">{tag}</span>
                        ))}
                    </div>
                </div>
                <div className="research-report__actions">
                    <button className="btn btn-ghost btn-sm" onClick={handleCopy} title="Copy to clipboard">
                        {copyFeedback || '📋 Copy'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Export as Markdown">
                        📥 Export
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="research-report__metrics">
                <div className="research-report__metric">
                    <span className="research-report__metric-icon">⏱️</span>
                    <div className="research-report__metric-info">
                        <span className="research-report__metric-value">{formatLatency(latency)}</span>
                        <span className="research-report__metric-label">Latency</span>
                    </div>
                </div>
                <div className="research-report__metric">
                    <span className="research-report__metric-icon">🪙</span>
                    <div className="research-report__metric-info">
                        <span className="research-report__metric-value">{tokenUsage?.total?.toLocaleString()}</span>
                        <span className="research-report__metric-label">Tokens</span>
                    </div>
                </div>
                <div className="research-report__metric">
                    <span className="research-report__metric-icon">💰</span>
                    <div className="research-report__metric-info">
                        <span className="research-report__metric-value">${cost?.toFixed(4)}</span>
                        <span className="research-report__metric-label">Cost</span>
                    </div>
                </div>
                <div className="research-report__metric">
                    <span className="research-report__metric-icon">📚</span>
                    <div className="research-report__metric-info">
                        <span className="research-report__metric-value">{sources?.length || 0}</span>
                        <span className="research-report__metric-label">Sources</span>
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="research-report__tabs">
                <button
                    className={`research-report__tab ${activeTab === 'report' ? 'research-report__tab--active' : ''}`}
                    onClick={() => setActiveTab('report')}
                >
                    📊 Report
                </button>
                <button
                    className={`research-report__tab ${activeTab === 'sources' ? 'research-report__tab--active' : ''}`}
                    onClick={() => setActiveTab('sources')}
                >
                    📚 Sources ({sources?.length || 0})
                </button>
                <button
                    className={`research-report__tab ${activeTab === 'usage' ? 'research-report__tab--active' : ''}`}
                    onClick={() => setActiveTab('usage')}
                >
                    📈 Token Usage
                </button>
            </div>

            {/* Tab Content */}
            <div className="research-report__content">
                {activeTab === 'report' && (
                    <div className="research-report__markdown markdown-content">
                        <ReactMarkdown>{report}</ReactMarkdown>
                    </div>
                )}

                {activeTab === 'sources' && (
                    <div className="research-report__sources">
                        {sources?.map((source, i) => (
                            <a
                                key={source.id || i}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="research-report__source"
                                style={{ animationDelay: `${i * 60}ms` }}
                            >
                                <div className="research-report__source-header">
                                    <span className="research-report__source-icon">
                                        {sourceTypeIcon[source.type] || '🔗'}
                                    </span>
                                    <span className={`badge ${source.type === 'paper' ? 'badge-teal' : source.type === 'documentation' ? 'badge-purple' : 'badge-warning'}`}>
                                        {source.type}
                                    </span>
                                </div>
                                <h4 className="research-report__source-title">{source.title}</h4>
                                <div className="research-report__source-meta">
                                    <span className="research-report__source-url">{new URL(source.url).hostname}</span>
                                    <div className="research-report__relevance">
                                        <div className="research-report__relevance-bar">
                                            <div
                                                className="research-report__relevance-fill"
                                                style={{ width: `${(source.relevance || 0) * 100}%` }}
                                            />
                                        </div>
                                        <span>{Math.round((source.relevance || 0) * 100)}%</span>
                                    </div>
                                </div>
                            </a>
                        ))}
                    </div>
                )}

                {activeTab === 'usage' && (
                    <div className="research-report__usage">
                        <div className="research-report__usage-chart">
                            <div className="research-report__usage-bar-group">
                                <label>Input Tokens</label>
                                <div className="research-report__usage-bar">
                                    <div
                                        className="research-report__usage-bar-fill research-report__usage-bar-fill--input"
                                        style={{ width: `${(tokenUsage?.input / tokenUsage?.total) * 100}%` }}
                                    />
                                </div>
                                <span>{tokenUsage?.input?.toLocaleString()}</span>
                            </div>
                            <div className="research-report__usage-bar-group">
                                <label>Output Tokens</label>
                                <div className="research-report__usage-bar">
                                    <div
                                        className="research-report__usage-bar-fill research-report__usage-bar-fill--output"
                                        style={{ width: `${(tokenUsage?.output / tokenUsage?.total) * 100}%` }}
                                    />
                                </div>
                                <span>{tokenUsage?.output?.toLocaleString()}</span>
                            </div>
                        </div>
                        <div className="research-report__usage-details">
                            <div className="research-report__usage-detail">
                                <span>Total Tokens</span>
                                <strong>{tokenUsage?.total?.toLocaleString()}</strong>
                            </div>
                            <div className="research-report__usage-detail">
                                <span>Estimated Cost</span>
                                <strong>${cost?.toFixed(4)}</strong>
                            </div>
                            <div className="research-report__usage-detail">
                                <span>Cost per Token</span>
                                <strong>${tokenUsage?.total ? (cost / tokenUsage.total * 1000).toFixed(4) : '0.0000'}/1K</strong>
                            </div>
                            <div className="research-report__usage-detail">
                                <span>Processing Time</span>
                                <strong>{formatLatency(latency)}</strong>
                            </div>
                            <div className="research-report__usage-detail">
                                <span>Tokens/Second</span>
                                <strong>{latency ? Math.round(tokenUsage?.total / (latency / 1000)) : 0}</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Follow-up Results */}
            {followUpResults && followUpResults.length > 0 && (
                <div className="research-report__followups">
                    <h3 className="research-report__followups-title">Follow-up Research</h3>
                    {followUpResults.map((fu, i) => (
                        <div key={i} className="research-report__followup" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className="research-report__followup-header">
                                <span className="research-report__followup-query">🔄 {fu.query}</span>
                                <span className="research-report__followup-meta">
                                    {fu.tokenUsage?.total?.toLocaleString()} tokens · ${fu.cost?.toFixed(4)}
                                </span>
                            </div>
                            <div className="markdown-content">
                                <ReactMarkdown>{fu.report}</ReactMarkdown>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Follow-up Input */}
            <div className="research-report__followup-input">
                <form onSubmit={handleFollowUp} className="research-report__followup-form">
                    <div className="research-report__followup-icon">🔄</div>
                    <input
                        type="text"
                        className="research-report__followup-field"
                        placeholder="Ask a follow-up question to dive deeper..."
                        value={followUpQuery}
                        onChange={e => setFollowUpQuery(e.target.value)}
                        disabled={isFollowUpLoading}
                    />
                    <button
                        type="submit"
                        className={`research-report__followup-submit ${followUpQuery.trim() ? 'active' : ''}`}
                        disabled={!followUpQuery.trim() || isFollowUpLoading}
                    >
                        {isFollowUpLoading ? (
                            <div className="search-panel__spinner" />
                        ) : (
                            'Send'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
