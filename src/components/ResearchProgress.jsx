import './ResearchProgress.css';

const PHASE_ICONS = {
    'Analyzing query...': '🔍',
    'Analyzing query intent...': '🧠',
    'Scanning sources...': '📡',
    'Discovering relevant sources...': '🌐',
    'Extracting key insights...': '💡',
    'Cross-referencing findings...': '🔗',
    'Synthesizing analysis...': '⚗️',
    'Generating report...': '📝',
    'Generating structured report...': '📊',
    'Adding citations...': '📎',
    'Understanding follow-up context...': '🔄',
    'Analyzing in relation to previous research...': '🧩',
    'Generating refined response...': '✨',
};

export default function ResearchProgress({ progress, phase, sourcesFound, mode }) {
    const icon = PHASE_ICONS[phase] || '⏳';

    return (
        <div className="research-progress">
            <div className="research-progress__container">
                {/* Orbital Animation */}
                <div className="research-progress__orb">
                    <div className="research-progress__orb-ring research-progress__orb-ring--1" />
                    <div className="research-progress__orb-ring research-progress__orb-ring--2" />
                    <div className="research-progress__orb-ring research-progress__orb-ring--3" />
                    <div className="research-progress__orb-core">
                        <span className="research-progress__orb-icon">{icon}</span>
                    </div>
                </div>

                {/* Progress Info */}
                <div className="research-progress__info">
                    <div className="research-progress__header">
                        <span className="research-progress__mode-badge">
                            {mode === 'quick' ? '⚡ Quick Mode' : '🔬 Deep Mode'}
                        </span>
                        <span className="research-progress__percent">{progress}%</span>
                    </div>

                    <h3 className="research-progress__phase">{phase}</h3>

                    {/* Progress Bar */}
                    <div className="research-progress__bar-track">
                        <div
                            className="research-progress__bar-fill"
                            style={{ width: `${progress}%` }}
                        />
                        <div
                            className="research-progress__bar-glow"
                            style={{ left: `${progress}%` }}
                        />
                    </div>

                    <div className="research-progress__meta">
                        {sourcesFound !== undefined && (
                            <span className="research-progress__sources">
                                📚 {sourcesFound} source{sourcesFound !== 1 ? 's' : ''} found
                            </span>
                        )}
                        <span className="research-progress__eta">
                            {mode === 'quick' ? 'ETA: <2 min' : 'ETA: <10 min'}
                        </span>
                    </div>
                </div>

                {/* Typing dots */}
                <div className="research-progress__dots">
                    <span className="research-progress__dot" style={{ animationDelay: '0s' }} />
                    <span className="research-progress__dot" style={{ animationDelay: '0.2s' }} />
                    <span className="research-progress__dot" style={{ animationDelay: '0.4s' }} />
                </div>
            </div>
        </div>
    );
}
