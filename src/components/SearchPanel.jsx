import { useState } from 'react';
import './SearchPanel.css';

const MODE_INFO = {
    quick: { label: 'Quick', desc: 'Fast summary, single-pass analysis' },
    standard: { label: 'Standard', desc: 'Multi-source structured synthesis' },
    deep: { label: 'Deep', desc: 'Multi-phase pipeline with live sources' },
};

export default function SearchPanel({
    onSearch,
    isLoading,
    currentMode,
    onModeChange,
}) {
    const [query, setQuery] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;
        onSearch(query.trim(), currentMode);
    };

    return (
        <div className="search-panel">
            <form className="search-panel__form" onSubmit={handleSubmit}>
                <div className="search-panel__input-row">
                    <input
                        id="research-input"
                        className="search-panel__input"
                        type="text"
                        placeholder="Ask a research question..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        disabled={isLoading}
                        autoComplete="off"
                    />
                    <button
                        className="search-panel__submit"
                        type="submit"
                        disabled={!query.trim() || isLoading}
                    >
                        {isLoading ? (
                            <span className="search-panel__spinner" />
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </button>
                </div>

                <div className="search-panel__modes">
                    {Object.entries(MODE_INFO).map(([key, info]) => (
                        <button
                            key={key}
                            type="button"
                            className={`search-panel__mode-btn ${currentMode === key ? 'search-panel__mode-btn--active' : ''}`}
                            onClick={() => onModeChange(key)}
                            disabled={isLoading}
                            title={info.desc}
                        >
                            {info.label}
                        </button>
                    ))}
                </div>
            </form>
        </div>
    );
}
