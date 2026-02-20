import { useState, useEffect } from 'react';
import './ResearchProgress.css';

const PHASE_LABELS = {
    query_analysis: 'Analyzing Query',
    source_discovery: 'Discovering Sources',
    content_extraction: 'Extracting Content',
    cross_validation: 'Cross-Validating',
    structured_synthesis: 'Synthesizing Report',
    citation_linking: 'Linking Citations',
};

export default function ResearchProgress({ progress = 0, phase = '', message = '', mode = 'standard' }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = Date.now();
        const interval = setInterval(() => {
            setElapsed(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    const phaseLabel = PHASE_LABELS[phase] || phase || 'Processing...';
    const isDeep = mode === 'deep';

    return (
        <div className="research-progress">
            <div className="research-progress__header">
                <h3 className="research-progress__title">
                    {isDeep ? 'Deep Research in Progress' : 'Researching...'}
                </h3>
                <span className="research-progress__time">{elapsed}s</span>
            </div>

            <div className="research-progress__bar-track">
                <div
                    className="research-progress__bar-fill"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                />
            </div>

            <div className="research-progress__info">
                <span className="research-progress__phase">{phaseLabel}</span>
                <span className="research-progress__percent">{Math.round(progress)}%</span>
            </div>

            {message && (
                <p className="research-progress__message">{message}</p>
            )}

            {isDeep && (
                <div className="research-progress__phases">
                    {Object.entries(PHASE_LABELS).map(([key, label]) => {
                        const phaseOrder = Object.keys(PHASE_LABELS);
                        const currentIdx = phaseOrder.indexOf(phase);
                        const thisIdx = phaseOrder.indexOf(key);
                        const isDone = thisIdx < currentIdx;
                        const isCurrent = key === phase;

                        return (
                            <div
                                key={key}
                                className={`research-progress__phase-item ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''}`}
                            >
                                <span className="research-progress__phase-dot">
                                    {isDone ? '\u2713' : isCurrent ? '\u25CF' : '\u25CB'}
                                </span>
                                <span className="research-progress__phase-label">{label}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
