import { useState, useRef, useEffect, useCallback } from 'react';
import './SearchPanel.css';

const FILE_TYPE_ICONS = {
    pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
    csv: '📋', txt: '📃', md: '📖', json: '{ }',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', zip: '📦',
};

function getFileIcon(name) {
    const ext = name?.split('.').pop()?.toLowerCase();
    return FILE_TYPE_ICONS[ext] || '📎';
}

function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

export default function SearchPanel({
    onSearch,
    isLoading,
    clarification,
    onClarificationSelect,
    onDismissClarification,
    attachedFiles: externalFiles,
    onAttachFiles,
    onRemoveFile,
}) {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState('deep');
    const [isFocused, setIsFocused] = useState(false);
    const [localFiles, setLocalFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const dropRef = useRef(null);

    // Use external files if provided, otherwise local
    const attachedFiles = externalFiles || localFiles;

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
        }
    }, [query]);

    const handleSubmit = (e) => {
        e?.preventDefault();
        if ((!query.trim() && attachedFiles.length === 0) || isLoading) return;
        onSearch(query.trim(), mode, attachedFiles);
        setQuery('');
        if (!externalFiles) setLocalFiles([]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const addFiles = useCallback((fileList) => {
        const newFiles = Array.from(fileList).map(file => ({
            id: `f_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: file.name,
            size: file.size,
            file: file,
        }));
        if (onAttachFiles) {
            onAttachFiles(prev => [...(prev || []), ...newFiles]);
        } else {
            setLocalFiles(prev => [...prev, ...newFiles]);
        }
    }, [onAttachFiles]);

    const removeFile = useCallback((id) => {
        if (onRemoveFile) {
            onRemoveFile(id);
        } else {
            setLocalFiles(prev => prev.filter(f => f.id !== id));
        }
    }, [onRemoveFile]);

    // Drag and drop on the search panel
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (dropRef.current && !dropRef.current.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files?.length > 0) {
            addFiles(e.dataTransfer.files);
        }
    }, [addFiles]);

    const suggestions = [
        'How do React Server Components work under the hood?',
        'Compare PostgreSQL vs CockroachDB for distributed SQL',
        'Best practices for LLM inference optimization in production',
        'Explain CRDT-based conflict resolution for collaborative apps',
    ];

    const canSubmit = query.trim() || attachedFiles.length > 0;

    return (
        <div
            className={`search-panel ${isDragOver ? 'search-panel--drag-over' : ''}`}
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragOver && (
                <div className="search-panel__drag-overlay">
                    <div className="search-panel__drag-content">
                        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                            <path d="M14 4v16M8 10l6-6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M24 18v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>Drop files to attach</span>
                    </div>
                </div>
            )}

            {/* Mode Selector */}
            <div className="search-panel__modes">
                <button
                    id="mode-quick"
                    className={`search-panel__mode ${mode === 'quick' ? 'search-panel__mode--active' : ''}`}
                    onClick={() => setMode('quick')}
                >
                    <span className="search-panel__mode-icon">⚡</span>
                    <div className="search-panel__mode-info">
                        <span className="search-panel__mode-name">Quick Mode</span>
                        <span className="search-panel__mode-desc">Fast, focused answers (&lt;2 min)</span>
                    </div>
                </button>
                <button
                    id="mode-deep"
                    className={`search-panel__mode ${mode === 'deep' ? 'search-panel__mode--active' : ''}`}
                    onClick={() => setMode('deep')}
                >
                    <span className="search-panel__mode-icon">🔬</span>
                    <div className="search-panel__mode-info">
                        <span className="search-panel__mode-name">Deep Mode</span>
                        <span className="search-panel__mode-desc">Multi-source synthesis (&lt;10 min)</span>
                    </div>
                </button>
            </div>

            {/* Attached Files */}
            {attachedFiles.length > 0 && (
                <div className="search-panel__files">
                    {attachedFiles.map(file => (
                        <div key={file.id} className="search-panel__file-pill">
                            <span className="search-panel__file-icon">{getFileIcon(file.name)}</span>
                            <span className="search-panel__file-name">{file.name}</span>
                            <span className="search-panel__file-size">{formatSize(file.size)}</span>
                            <button
                                className="search-panel__file-remove"
                                onClick={() => removeFile(file.id)}
                                title="Remove file"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Search Input */}
            <form className={`search-panel__form ${isFocused ? 'search-panel__form--focused' : ''}`} onSubmit={handleSubmit}>
                <div className="search-panel__input-wrap">
                    <div className="search-panel__input-icon">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="8.5" cy="8.5" r="6" stroke="currentColor" strokeWidth="1.8" />
                            <path d="M13 13L18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        </svg>
                    </div>
                    <textarea
                        ref={textareaRef}
                        id="research-input"
                        className="search-panel__input"
                        placeholder={
                            attachedFiles.length > 0
                                ? `Ask a question about ${attachedFiles.map(f => f.name).join(', ')} or press → to analyze...`
                                : 'Ask a technical research question...'
                        }
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isLoading}
                    />
                    <div className="search-panel__actions">
                        {/* File Attach Button */}
                        <button
                            type="button"
                            className="search-panel__attach-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Attach files (PDF, DOC, CSV, etc.)"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                <path d="M14 8.67L8.36 14.3a4 4 0 0 1-5.66-5.66L9.05 2.3a2.67 2.67 0 0 1 3.77 3.77l-6.35 6.35a1.33 1.33 0 0 1-1.89-1.89l5.66-5.65" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.zip"
                            onChange={(e) => { if (e.target.files?.length) { addFiles(e.target.files); e.target.value = ''; } }}
                            style={{ display: 'none' }}
                        />

                        <span className="search-panel__hint">
                            {mode === 'quick' ? '⚡ Quick' : '🔬 Deep'}
                            {attachedFiles.length > 0 && ` • ${attachedFiles.length} file(s)`}
                            {' • Shift+Enter for newline'}
                        </span>
                        <button
                            id="submit-research"
                            type="submit"
                            className={`search-panel__submit ${canSubmit ? 'search-panel__submit--active' : ''}`}
                            disabled={!canSubmit || isLoading}
                        >
                            {isLoading ? (
                                <div className="search-panel__spinner" />
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                    <path d="M3 9h12M10 4l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </form>

            {/* Clarification Dialog */}
            {clarification && (
                <div className="search-panel__clarification">
                    <div className="search-panel__clarification-header">
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M6.5 6a1.5 1.5 0 1 1 2.12 1.37c-.38.19-.62.56-.62.96V9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="8" cy="11" r="0.75" fill="currentColor" />
                        </svg>
                        <span>Clarification needed</span>
                        <button className="search-panel__clarification-dismiss" onClick={onDismissClarification}>
                            ×
                        </button>
                    </div>
                    <p className="search-panel__clarification-reason">{clarification.reason}</p>
                    <div className="search-panel__suggestions">
                        {clarification.suggestions.map((s, i) => (
                            <button
                                key={i}
                                className="search-panel__suggestion"
                                onClick={() => onClarificationSelect(s)}
                            >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>{s}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Suggestion Chips */}
            {!query && !isLoading && !clarification && attachedFiles.length === 0 && (
                <div className="search-panel__chips">
                    <span className="search-panel__chips-label">Try these:</span>
                    <div className="search-panel__chips-list">
                        {suggestions.map((s, i) => (
                            <button
                                key={i}
                                className="search-panel__chip"
                                onClick={() => setQuery(s)}
                                style={{ animationDelay: `${i * 80}ms` }}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
