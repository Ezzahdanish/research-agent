import { useState, useEffect } from 'react';
import './SettingsPanel.css';

// Lightweight localStorage wrapper for preferences (kept client-side intentionally)
const PREFS_KEY = 'dr_user_preferences';
const DEFAULTS = {
    researchMode: 'standard',
    preferCodeExamples: true,
    preferredLanguages: ['javascript', 'python'],
    citationStyle: 'inline',
    outputFormat: 'markdown',
    maxSources: 10,
    showTokenUsage: true,
    autoSave: true,
};

function getPrefs() {
    try {
        const stored = localStorage.getItem(PREFS_KEY);
        return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : { ...DEFAULTS };
    } catch {
        return { ...DEFAULTS };
    }
}

function savePrefs(prefs) {
    try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch { /* ignore */ }
    return prefs;
}

export default function SettingsPanel({ isOpen, onClose }) {
    const [prefs, setPrefs] = useState(getPrefs());
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isOpen) setPrefs(getPrefs());
    }, [isOpen]);

    const handleChange = (key, value) => {
        const updated = { ...prefs, [key]: value };
        savePrefs(updated);
        setPrefs(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
    };

    const handleReset = () => {
        if (window.confirm('Reset all preferences to defaults?')) {
            savePrefs(DEFAULTS);
            setPrefs({ ...DEFAULTS });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
        }
    };

    const handleLanguageToggle = (lang) => {
        const current = prefs.preferredLanguages || [];
        const updated = current.includes(lang)
            ? current.filter(l => l !== lang)
            : [...current, lang];
        handleChange('preferredLanguages', updated);
    };

    if (!isOpen) return null;

    const languages = ['javascript', 'typescript', 'python', 'rust', 'go', 'java', 'c++', 'ruby'];

    return (
        <div className="settings-overlay" onClick={onClose}>
            <div className="settings-panel" onClick={e => e.stopPropagation()}>
                <div className="settings-panel__header">
                    <h2 className="settings-panel__title">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M10 1v3M10 16v3M1 10h3M16 10h3M3.93 3.93l2.12 2.12M13.95 13.95l2.12 2.12M3.93 16.07l2.12-2.12M13.95 6.05l2.12-2.12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        Preferences
                    </h2>
                    <button className="settings-panel__close" onClick={onClose}>
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                {saved && (
                    <div className="settings-panel__saved">Preferences saved</div>
                )}

                <div className="settings-panel__body">
                    <div className="settings-section">
                        <h3 className="settings-section__title">Research Defaults</h3>
                        <div className="settings-field">
                            <label className="settings-field__label">Default Research Mode</label>
                            <div className="settings-field__options">
                                {['quick', 'standard', 'deep'].map(m => (
                                    <button
                                        key={m}
                                        className={`settings-field__option ${prefs.researchMode === m ? 'active' : ''}`}
                                        onClick={() => handleChange('researchMode', m)}
                                    >
                                        {m.charAt(0).toUpperCase() + m.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-field">
                            <label className="settings-field__label">Output Format</label>
                            <div className="settings-field__options">
                                {['markdown', 'structured', 'concise'].map(fmt => (
                                    <button
                                        key={fmt}
                                        className={`settings-field__option ${prefs.outputFormat === fmt ? 'active' : ''}`}
                                        onClick={() => handleChange('outputFormat', fmt)}
                                    >
                                        {fmt.charAt(0).toUpperCase() + fmt.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="settings-field">
                            <label className="settings-field__label">Citation Style</label>
                            <div className="settings-field__options">
                                {['inline', 'footnote', 'appendix'].map(style => (
                                    <button
                                        key={style}
                                        className={`settings-field__option ${prefs.citationStyle === style ? 'active' : ''}`}
                                        onClick={() => handleChange('citationStyle', style)}
                                    >
                                        {style.charAt(0).toUpperCase() + style.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3 className="settings-section__title">Code Preferences</h3>
                        <div className="settings-field">
                            <div className="settings-field__toggle-row">
                                <div>
                                    <label className="settings-field__label">Include Code Examples</label>
                                    <span className="settings-field__desc">Show code snippets in research reports</span>
                                </div>
                                <button
                                    className={`settings-toggle ${prefs.preferCodeExamples ? 'active' : ''}`}
                                    onClick={() => handleChange('preferCodeExamples', !prefs.preferCodeExamples)}
                                >
                                    <div className="settings-toggle__thumb" />
                                </button>
                            </div>
                        </div>

                        <div className="settings-field">
                            <label className="settings-field__label">Preferred Languages</label>
                            <div className="settings-field__langs">
                                {languages.map(lang => (
                                    <button
                                        key={lang}
                                        className={`settings-lang ${(prefs.preferredLanguages || []).includes(lang) ? 'active' : ''}`}
                                        onClick={() => handleLanguageToggle(lang)}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="settings-section">
                        <h3 className="settings-section__title">Display</h3>
                        <div className="settings-field">
                            <div className="settings-field__toggle-row">
                                <div>
                                    <label className="settings-field__label">Show Token Usage</label>
                                    <span className="settings-field__desc">Display token and cost metrics</span>
                                </div>
                                <button
                                    className={`settings-toggle ${prefs.showTokenUsage ? 'active' : ''}`}
                                    onClick={() => handleChange('showTokenUsage', !prefs.showTokenUsage)}
                                >
                                    <div className="settings-toggle__thumb" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-panel__footer">
                    <button className="btn btn-danger btn-sm" onClick={handleReset}>
                        Reset to Defaults
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
