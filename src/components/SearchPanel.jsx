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
    currentMode,
    onModeChange,
}) {
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState(currentMode || 'deep');
    const [isFocused, setIsFocused] = useState(false);
    const [localFiles, setLocalFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const dropRef = useRef(null);

    // Sync mode from external
    useEffect(() => {
        if (currentMode) setMode(currentMode);
    }, [currentMode]);

    const attachedFiles = externalFiles || localFiles;

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
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
        if (e.dataTransfer.files?.length > 0) addFiles(e.dataTransfer.files);
    }, [addFiles]);

    const canSubmit = query.trim() || attachedFiles.length > 0;

    const handleModeChange = (newMode) => {
        setMode(newMode);
        onModeChange?.(newMode);
    };

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
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path d="M12 4v13M6 9l6-5 6 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M20 18v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        <span>Drop files to attach</span>
                    </div>
                </div>
            )}

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
                            >×</button>
                        </div>
                    ))}
                </div>
            )}

            {/* Query Label */}
            <span className="search-panel__label">Research Query</span>

            {/* Search Input Form */}
            <form
                className={`search-panel__form ${isFocused ? 'search-panel__form--focused' : ''}`}
                onSubmit={handleSubmit}
            >
                <textarea
                    ref={textareaRef}
                    id="research-input"
                    className="search-panel__input"
                    placeholder={
                        attachedFiles.length > 0
                            ? `Ask about ${attachedFiles.map(f => f.name).join(', ')}...`
                            : 'Describe what you want researched for a full structured report...'
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
                    {/* File Attach */}
                    <button
                        type="button"
                        className="search-panel__attach-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach files"
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

                    {/* RUN button */}
                    <button
                        id="submit-research"
                        type="submit"
                        className={`search-panel__submit ${canSubmit ? 'search-panel__submit--active' : ''}`}
                        disabled={!canSubmit || isLoading}
                    >
                        {isLoading ? (
                            <div className="search-panel__spinner" />
                        ) : (
                            <>RUN →</>
                        )}
                    </button>
                </div>
            </form>

            {/* Clarification Dialog */}
            {clarification && (
                <div className="search-panel__clarification">
                    <div className="search-panel__clarification-header">
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <circle cx="7.5" cy="7.5" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M6.5 6a1.5 1.5 0 1 1 2.12 1.37c-.38.19-.62.56-.62.96V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                            <circle cx="7.5" cy="11" r="0.75" fill="currentColor" />
                        </svg>
                        <span>Clarification needed</span>
                        <button className="search-panel__clarification-dismiss" onClick={onDismissClarification}>×</button>
                    </div>
                    <p className="search-panel__clarification-reason">{clarification.reason}</p>
                    <div className="search-panel__suggestions">
                        {clarification.suggestions.map((s, i) => (
                            <button
                                key={i}
                                className="search-panel__suggestion"
                                onClick={() => onClarificationSelect(s)}
                            >
                                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span>{s}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
