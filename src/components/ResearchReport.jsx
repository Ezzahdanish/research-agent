import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import './ResearchReport.css';

export default function ResearchReport({ result }) {
    const [activeTab, setActiveTab] = useState('report');
    const [copyFeedback, setCopyFeedback] = useState('');

    if (!result) return null;

    const { report, citations, tokens, latencyMs, mode, query, fromCache } = result;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(report);
            setCopyFeedback('Copied');
            setTimeout(() => setCopyFeedback(''), 2000);
        } catch {
            setCopyFeedback('Failed');
            setTimeout(() => setCopyFeedback(''), 2000);
        }
    };

    const handleExport = () => {
        const blob = new Blob([report], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `research-${(query || 'report').slice(0, 30).replace(/\s+/g, '-')}.md`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const formatLatency = (ms) => {
        if (!ms) return '--';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(1)}s`;
    };

    const getModeLabel = (m) => {
        if (m === 'deep') return 'Deep Analysis';
        if (m === 'standard') return 'Standard';
        return 'Quick';
    };

    return (
        <div className="research-report">
            {/* Header */}
            <div className="research-report__header">
                <div className="research-report__header-left">
                    <h2 className="research-report__title">Research Results</h2>
                    <div className="research-report__meta-badges">
                        <span className={`research-report__mode-badge research-report__mode-badge--${mode}`}>
                            {getModeLabel(mode)}
                        </span>
                        {fromCache && (
                            <span className="research-report__cache-badge">Cached</span>
                        )}
                    </div>
                </div>
                <div className="research-report__actions">
                    <button className="btn btn-ghost btn-sm" onClick={handleCopy} title="Copy to clipboard">
                        {copyFeedback || 'Copy'}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={handleExport} title="Export as Markdown">
                        Export
                    </button>
                </div>
            </div>

            {/* Metrics Bar */}
            <div className="research-report__metrics">
                <div className="research-report__metric">
                    <span className="research-report__metric-value">{formatLatency(latencyMs)}</span>
                    <span className="research-report__metric-label">Latency</span>
                </div>
                <div className="research-report__metric">
                    <span className="research-report__metric-value">{tokens?.total?.toLocaleString() || '--'}</span>
                    <span className="research-report__metric-label">Tokens</span>
                </div>
                <div className="research-report__metric">
                    <span className="research-report__metric-value">{citations?.length || 0}</span>
                    <span className="research-report__metric-label">Sources</span>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="research-report__tabs">
                <button
                    className={`research-report__tab ${activeTab === 'report' ? 'research-report__tab--active' : ''}`}
                    onClick={() => setActiveTab('report')}
                >
                    Report
                </button>
                {citations?.length > 0 && (
                    <button
                        className={`research-report__tab ${activeTab === 'sources' ? 'research-report__tab--active' : ''}`}
                        onClick={() => setActiveTab('sources')}
                    >
                        Sources ({citations.length})
                    </button>
                )}
                <button
                    className={`research-report__tab ${activeTab === 'usage' ? 'research-report__tab--active' : ''}`}
                    onClick={() => setActiveTab('usage')}
                >
                    Details
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
                        {citations?.map((source, i) => (
                            <a
                                key={source.id || i}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="research-report__source"
                            >
                                <div className="research-report__source-header">
                                    <span className="research-report__source-num">[{source.id || i + 1}]</span>
                                    <h4 className="research-report__source-title">{source.title}</h4>
                                </div>
                                <span className="research-report__source-url">
                                    {(() => { try { return new URL(source.url).hostname; } catch { return source.url; } })()}
                                </span>
                            </a>
                        ))}
                    </div>
                )}

                {activeTab === 'usage' && (
                    <div className="research-report__usage">
                        <div className="research-report__usage-details">
                            <div className="research-report__usage-detail">
                                <span>Mode</span>
                                <strong>{getModeLabel(mode)}</strong>
                            </div>
                            <div className="research-report__usage-detail">
                                <span>Total Tokens</span>
                                <strong>{tokens?.total?.toLocaleString() || '--'}</strong>
                            </div>
                            {tokens?.input && (
                                <div className="research-report__usage-detail">
                                    <span>Input Tokens</span>
                                    <strong>{tokens.input.toLocaleString()}</strong>
                                </div>
                            )}
                            {tokens?.output && (
                                <div className="research-report__usage-detail">
                                    <span>Output Tokens</span>
                                    <strong>{tokens.output.toLocaleString()}</strong>
                                </div>
                            )}
                            <div className="research-report__usage-detail">
                                <span>Processing Time</span>
                                <strong>{formatLatency(latencyMs)}</strong>
                            </div>
                            <div className="research-report__usage-detail">
                                <span>Sources Found</span>
                                <strong>{citations?.length || 0}</strong>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
