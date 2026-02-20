import { useState, useCallback, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import SearchPanel from './components/SearchPanel';
import ResearchProgress from './components/ResearchProgress';
import ResearchReport from './components/ResearchReport';
import SettingsPanel from './components/SettingsPanel';
import Dashboard from './components/Dashboard';
import {
  startResearch,
  streamResearch,
  getReport,
} from './services/api';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState('research');
  const [activeResearchId, setActiveResearchId] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ phase: '', progress: 0, message: '' });
  const [currentMode, setCurrentMode] = useState('standard');
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  // Keep a counter to signal sidebar to refresh
  const [historyVersion, setHistoryVersion] = useState(0);

  // Toast System
  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  // Handle Search
  const handleSearch = useCallback(async (query, mode) => {
    setError(null);
    setIsLoading(true);
    setCurrentResult(null);
    setActiveResearchId(null);
    setCurrentMode(mode);
    setActiveView('research');
    setProgress({ phase: 'Initializing...', progress: 0, message: '' });

    try {
      const response = await startResearch(query, mode);

      if (mode === 'deep' && response.sessionId && response.status === 'running') {
        // Deep mode: connect to SSE stream
        setActiveResearchId(response.sessionId);
        setProgress({ phase: 'Starting deep research...', progress: 5, message: 'Connecting...' });

        const stream = streamResearch(response.sessionId, {
          onPhase: (data) => {
            setProgress({
              phase: data.phase || '',
              progress: data.progress || 0,
              message: data.message || '',
            });
          },
          onComplete: (data) => {
            setCurrentResult({
              report: data.report,
              citations: data.citations || [],
              tokens: data.tokens,
              latencyMs: data.latencyMs,
              mode,
              query,
              sessionId: response.sessionId,
            });
            setIsLoading(false);
            setHistoryVersion(v => v + 1);
            addToast('Deep research completed', 'success');
          },
          onError: (message) => {
            setError({ message: 'Research failed', details: message });
            setIsLoading(false);
            addToast('Research failed: ' + message, 'error');
          },
        });

        // Store stream ref for potential cleanup
        // (stream.close() can be called to abort)
        return;
      }

      // Quick or Standard — result already returned
      setCurrentResult({
        report: response.report,
        citations: response.citations || [],
        tokens: response.tokens,
        latencyMs: response.latencyMs,
        mode,
        query,
        sessionId: response.sessionId,
        fromCache: response.fromCache,
      });
      setActiveResearchId(response.sessionId);
      setIsLoading(false);
      setHistoryVersion(v => v + 1);
      addToast(response.fromCache ? 'Loaded from cache' : 'Research completed', 'success');
    } catch (err) {
      console.error('Research failed:', err);
      setError({
        message: 'Research failed. Please try again.',
        details: err.message,
      });
      setIsLoading(false);
      addToast('Research failed: ' + err.message, 'error');
    }
  }, [addToast]);

  // Select research from history
  const handleSelectResearch = useCallback(async (id) => {
    setActiveView('research');
    setIsLoading(true);
    setError(null);

    try {
      const data = await getReport(id);
      setActiveResearchId(id);
      setCurrentResult({
        report: data.report,
        citations: data.citations || [],
        tokens: { total: data.totalTokens || 0 },
        latencyMs: data.totalLatencyMs || 0,
        mode: data.mode,
        query: data.query,
        sessionId: id,
        phases: data.phases,
      });
    } catch (err) {
      setError({ message: 'Failed to load report', details: err.message });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // New Research
  const handleNewResearch = useCallback(() => {
    setActiveResearchId(null);
    setCurrentResult(null);
    setIsLoading(false);
    setError(null);
  }, []);

  // View change
  const handleViewChange = useCallback((view) => {
    setActiveView(view);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewResearch();
        setActiveView('research');
        setTimeout(() => document.getElementById('research-input')?.focus(), 100);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        setSettingsOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNewResearch]);

  const showWelcome = activeView === 'research' && !isLoading && !currentResult && !error;

  return (
    <div className="app">
      <Sidebar
        activeResearchId={activeResearchId}
        onSelectResearch={handleSelectResearch}
        onNewResearch={handleNewResearch}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activeView={activeView}
        onViewChange={handleViewChange}
        historyVersion={historyVersion}
      />

      <main className={`main ${sidebarOpen ? 'main--with-sidebar' : 'main--full'}`}>
        {/* Top Bar */}
        <header className="topbar">
          <div className="topbar__left">
            {!sidebarOpen && (
              <button className="topbar__menu-btn" onClick={() => setSidebarOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <div className="topbar__breadcrumb">
              <span className="topbar__breadcrumb-item" onClick={handleNewResearch} style={{ cursor: 'pointer' }}>
                Research
              </span>
              <span className="topbar__breadcrumb-sep">/</span>
              <span className="topbar__breadcrumb-current">
                {activeView === 'research' && currentResult
                  ? (currentResult.query?.slice(0, 40) + (currentResult.query?.length > 40 ? '...' : ''))
                  : activeView === 'dashboard' ? 'Dashboard'
                    : 'New Session'}
              </span>
            </div>
            {activeView === 'research' && (
              <div className="topbar__mode-pills">
                {['quick', 'standard', 'deep'].map(mode => (
                  <button
                    key={mode}
                    className={`topbar__mode-pill ${currentMode === mode ? 'topbar__mode-pill--active' : ''}`}
                    onClick={() => setCurrentMode(mode)}
                  >
                    {mode === 'quick' ? 'Quick' : mode === 'standard' ? 'Standard' : 'Deep'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="topbar__right">
            <div className="topbar__shortcut">
              <kbd>Ctrl+K</kbd>
              <span>New</span>
            </div>
            <button
              id="settings-btn"
              className="topbar__settings-btn"
              onClick={() => setSettingsOpen(true)}
              title="Preferences (Ctrl+,)"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M9 1v2.5M9 14.5V17M1 9h2.5M14.5 9H17M3.4 3.4l1.77 1.77M12.83 12.83l1.77 1.77M3.4 14.6l1.77-1.77M12.83 5.17l1.77-1.77" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="content">
          {activeView === 'dashboard' && (
            <Dashboard />
          )}

          {activeView === 'research' && (
            <div className="research-view">
              <div className="research-view__body">
                {showWelcome && (
                  <div className="welcome">
                    <div className="welcome__hero">
                      <h1 className="welcome__headline">
                        Research <em>anything.</em><br />
                        Get structured insights.
                      </h1>
                      <p className="welcome__subtext">
                        Ask a technical question. The engine analyzes real sources,
                        synthesizes findings, and delivers a structured report with citations.
                      </p>
                    </div>

                    <div className="welcome__cards">
                      <div className="welcome__cards-grid">
                        {[
                          { mode: 'deep', query: 'Compare vector databases: Pinecone vs Weaviate vs Qdrant for production RAG' },
                          { mode: 'quick', query: 'What are the trade-offs of gRPC vs REST in microservices?' },
                          { mode: 'standard', query: 'Production Kubernetes autoscaling: KEDA vs HPA vs VPA' },
                          { mode: 'quick', query: 'Redis caching strategies and eviction policy comparison' },
                          { mode: 'deep', query: 'Transformer attention mechanisms: complexity and optimization' },
                          { mode: 'standard', query: 'RAFT vs Paxos consensus algorithm trade-offs' },
                        ].map((card, i) => (
                          <button
                            key={i}
                            className="welcome__card"
                            onClick={() => handleSearch(card.query, card.mode)}
                          >
                            <span className="welcome__card-mode">
                              {card.mode === 'deep' ? 'Deep' : card.mode === 'standard' ? 'Standard' : 'Quick'}
                            </span>
                            <span className="welcome__card-query">{card.query}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {isLoading && (
                  <ResearchProgress
                    progress={progress.progress}
                    phase={progress.phase}
                    message={progress.message}
                    mode={currentMode}
                  />
                )}

                {error && !isLoading && (
                  <div className="error-panel">
                    <h3 className="error-panel__title">Research Failed</h3>
                    <p className="error-panel__message">{error.message}</p>
                    {error.details && (
                      <pre className="error-panel__details">{error.details}</pre>
                    )}
                    <button className="btn btn-primary" onClick={handleNewResearch}>
                      Try Again
                    </button>
                  </div>
                )}

                {currentResult && !isLoading && (
                  <div className="result-container">
                    <ResearchReport result={currentResult} />
                  </div>
                )}
              </div>

              <SearchPanel
                onSearch={handleSearch}
                isLoading={isLoading}
                currentMode={currentMode}
                onModeChange={setCurrentMode}
              />
            </div>
          )}
        </div>
      </main>

      <SettingsPanel isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Toast Container */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <span className="toast__icon">
              {toast.type === 'success' && '\u2713'}
              {toast.type === 'error' && '\u2715'}
              {toast.type === 'info' && 'i'}
            </span>
            <span className="toast__message">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
