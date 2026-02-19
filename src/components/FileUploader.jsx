import { useState, useRef, useCallback, useEffect } from 'react';
import './FileUploader.css';

const FILE_TYPE_CONFIG = {
    pdf: { icon: '📄', label: 'PDF', color: '#e74c3c', bg: 'rgba(231, 76, 60, 0.1)', border: 'rgba(231, 76, 60, 0.2)' },
    doc: { icon: '📝', label: 'DOC', color: '#2980b9', bg: 'rgba(41, 128, 185, 0.1)', border: 'rgba(41, 128, 185, 0.2)' },
    docx: { icon: '📝', label: 'DOCX', color: '#2980b9', bg: 'rgba(41, 128, 185, 0.1)', border: 'rgba(41, 128, 185, 0.2)' },
    xls: { icon: '📊', label: 'XLS', color: '#27ae60', bg: 'rgba(39, 174, 96, 0.1)', border: 'rgba(39, 174, 96, 0.2)' },
    xlsx: { icon: '📊', label: 'XLSX', color: '#27ae60', bg: 'rgba(39, 174, 96, 0.1)', border: 'rgba(39, 174, 96, 0.2)' },
    csv: { icon: '📋', label: 'CSV', color: '#16a085', bg: 'rgba(22, 160, 133, 0.1)', border: 'rgba(22, 160, 133, 0.2)' },
    txt: { icon: '📃', label: 'TXT', color: '#7f8c8d', bg: 'rgba(127, 140, 141, 0.1)', border: 'rgba(127, 140, 141, 0.2)' },
    md: { icon: '📖', label: 'MD', color: '#8e44ad', bg: 'rgba(142, 68, 173, 0.1)', border: 'rgba(142, 68, 173, 0.2)' },
    json: { icon: '{ }', label: 'JSON', color: '#f39c12', bg: 'rgba(243, 156, 18, 0.1)', border: 'rgba(243, 156, 18, 0.2)' },
    png: { icon: '🖼️', label: 'PNG', color: '#e67e22', bg: 'rgba(230, 126, 34, 0.1)', border: 'rgba(230, 126, 34, 0.2)' },
    jpg: { icon: '🖼️', label: 'JPG', color: '#e67e22', bg: 'rgba(230, 126, 34, 0.1)', border: 'rgba(230, 126, 34, 0.2)' },
    jpeg: { icon: '🖼️', label: 'JPEG', color: '#e67e22', bg: 'rgba(230, 126, 34, 0.1)', border: 'rgba(230, 126, 34, 0.2)' },
    zip: { icon: '📦', label: 'ZIP', color: '#95a5a6', bg: 'rgba(149, 165, 166, 0.1)', border: 'rgba(149, 165, 166, 0.2)' },
    default: { icon: '📎', label: 'FILE', color: '#6c5ce7', bg: 'rgba(108, 92, 231, 0.1)', border: 'rgba(108, 92, 231, 0.2)' },
};

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.md,.json,.png,.jpg,.jpeg,.zip';
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

function getFileTypeConfig(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    return FILE_TYPE_CONFIG[ext] || FILE_TYPE_CONFIG.default;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export default function FileUploader({ onFilesChange }) {
    const [files, setFiles] = useState([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);
    const dropZoneRef = useRef(null);

    // Simulate upload progress
    useEffect(() => {
        const uploading = files.filter(f => f.status === 'uploading');
        if (uploading.length === 0) return;

        const interval = setInterval(() => {
            setFiles(prev => prev.map(f => {
                if (f.status !== 'uploading') return f;
                const newProgress = Math.min(f.progress + Math.random() * 15 + 5, 100);
                if (newProgress >= 100) {
                    return { ...f, progress: 100, status: 'completed' };
                }
                return { ...f, progress: newProgress };
            }));
        }, 300);

        return () => clearInterval(interval);
    }, [files]);

    // Notify parent when files change
    useEffect(() => {
        if (onFilesChange) {
            const completedFiles = files.filter(f => f.status === 'completed');
            onFilesChange(completedFiles);
        }
    }, [files, onFilesChange]);

    const addFiles = useCallback((newFiles) => {
        setError(null);
        const fileArray = Array.from(newFiles);
        const validFiles = [];

        for (const file of fileArray) {
            if (file.size > MAX_FILE_SIZE) {
                setError(`"${file.name}" exceeds the 1 GB size limit.`);
                continue;
            }
            // Check for duplicate
            const isDuplicate = files.some(f => f.name === file.name && f.size === file.size);
            if (isDuplicate) {
                setError(`"${file.name}" has already been added.`);
                continue;
            }
            validFiles.push({
                id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                name: file.name,
                size: file.size,
                type: file.type,
                file: file,
                progress: 0,
                status: 'uploading', // uploading | completed | error
                addedAt: Date.now(),
            });
        }

        if (validFiles.length > 0) {
            setFiles(prev => [...prev, ...validFiles]);
        }
    }, [files]);

    const removeFile = useCallback((id) => {
        setFiles(prev => prev.filter(f => f.id !== id));
        setError(null);
    }, []);

    const cancelUpload = useCallback((id) => {
        setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, status: 'error', progress: 0 } : f
        ));
    }, []);

    const retryUpload = useCallback((id) => {
        setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, status: 'uploading', progress: 0 } : f
        ));
    }, []);

    // Drag and drop handlers
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        // Only set false if leaving the drop zone entirely
        if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget)) {
            setIsDragOver(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles.length > 0) {
            addFiles(droppedFiles);
        }
    }, [addFiles]);

    const handleBrowse = () => {
        fileInputRef.current?.click();
    };

    const handleFileInputChange = (e) => {
        if (e.target.files?.length > 0) {
            addFiles(e.target.files);
            e.target.value = ''; // Reset input
        }
    };

    const completedCount = files.filter(f => f.status === 'completed').length;
    const uploadingCount = files.filter(f => f.status === 'uploading').length;
    const totalSize = files.reduce((acc, f) => acc + f.size, 0);

    return (
        <div className="file-uploader">
            {/* Header */}
            <div className="file-uploader__header">
                <div className="file-uploader__header-left">
                    <h2 className="file-uploader__title">Upload Files</h2>
                    <p className="file-uploader__subtitle">
                        Upload documents for AI-powered analysis
                    </p>
                </div>
                {files.length > 0 && (
                    <div className="file-uploader__summary">
                        <span className="file-uploader__summary-count">
                            {completedCount}/{files.length} files
                        </span>
                        <span className="file-uploader__summary-size">
                            {formatFileSize(totalSize)}
                        </span>
                    </div>
                )}
            </div>

            {/* Drop Zone */}
            <div
                ref={dropZoneRef}
                className={`file-uploader__dropzone ${isDragOver ? 'file-uploader__dropzone--active' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleBrowse}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_TYPES}
                    onChange={handleFileInputChange}
                    className="file-uploader__input"
                />

                <div className="file-uploader__dropzone-content">
                    <div className={`file-uploader__dropzone-icon ${isDragOver ? 'file-uploader__dropzone-icon--active' : ''}`}>
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M16 4v18M9 11l7-7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M28 22v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>
                    <div className="file-uploader__dropzone-text">
                        <span className="file-uploader__dropzone-primary">
                            {isDragOver ? 'Drop files here' : 'Drop your files here or '}
                            {!isDragOver && <span className="file-uploader__dropzone-browse">browse</span>}
                        </span>
                        <span className="file-uploader__dropzone-secondary">
                            Max file size up to 1 GB
                        </span>
                    </div>
                </div>

                {/* Supported formats */}
                <div className="file-uploader__formats">
                    {['PDF', 'DOC', 'XLSX', 'CSV', 'JSON', 'TXT', 'MD', 'PNG'].map(fmt => (
                        <span key={fmt} className="file-uploader__format-tag">{fmt}</span>
                    ))}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="file-uploader__error">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M7 4v3.5M7 9.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </div>
            )}

            {/* File List */}
            {files.length > 0 && (
                <div className="file-uploader__list">
                    <div className="file-uploader__list-header">
                        <h3 className="file-uploader__list-title">
                            Uploads
                            {uploadingCount > 0 && (
                                <span className="file-uploader__uploading-badge">{uploadingCount} uploading</span>
                            )}
                        </h3>
                    </div>
                    <div className="file-uploader__files">
                        {files.map((file, i) => {
                            const typeConfig = getFileTypeConfig(file.name);
                            return (
                                <div
                                    key={file.id}
                                    className={`file-uploader__file ${file.status === 'completed' ? 'file-uploader__file--completed' : ''} ${file.status === 'error' ? 'file-uploader__file--error' : ''}`}
                                    style={{ animationDelay: `${i * 60}ms` }}
                                >
                                    {/* File Type Icon */}
                                    <div
                                        className="file-uploader__file-icon"
                                        style={{ background: typeConfig.bg, borderColor: typeConfig.border }}
                                    >
                                        <span className="file-uploader__file-type-label" style={{ color: typeConfig.color }}>
                                            {typeConfig.label}
                                        </span>
                                    </div>

                                    {/* File Info */}
                                    <div className="file-uploader__file-info">
                                        <span className="file-uploader__file-name">{file.name}</span>
                                        <span className="file-uploader__file-meta">
                                            {file.status === 'uploading'
                                                ? `${formatFileSize(Math.round(file.size * file.progress / 100))} of ${formatFileSize(file.size)}`
                                                : formatFileSize(file.size)
                                            }
                                        </span>
                                        {/* Progress Bar */}
                                        {file.status === 'uploading' && (
                                            <div className="file-uploader__progress">
                                                <div
                                                    className="file-uploader__progress-fill"
                                                    style={{ width: `${file.progress}%` }}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="file-uploader__file-actions">
                                        {file.status === 'completed' && (
                                            <button
                                                className="file-uploader__file-action file-uploader__file-action--delete"
                                                onClick={() => removeFile(file.id)}
                                                title="Remove file"
                                            >
                                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                                    <path d="M2 4h12M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1M6.5 7v4M9.5 7v4M3.5 4l.5 9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l.5-9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                            </button>
                                        )}
                                        {file.status === 'uploading' && (
                                            <button
                                                className="file-uploader__file-action file-uploader__file-action--cancel"
                                                onClick={() => cancelUpload(file.id)}
                                                title="Cancel upload"
                                            >
                                                ×
                                            </button>
                                        )}
                                        {file.status === 'error' && (
                                            <button
                                                className="file-uploader__file-action file-uploader__file-action--retry"
                                                onClick={() => retryUpload(file.id)}
                                                title="Retry upload"
                                            >
                                                ↻
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
