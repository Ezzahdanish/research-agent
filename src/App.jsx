import { useState, useCallback, useEffect } from 'react';
import './App.css';
import Sidebar from './components/Sidebar';
import SearchPanel from './components/SearchPanel';
import ResearchProgress from './components/ResearchProgress';
import ResearchReport from './components/ResearchReport';
import SettingsPanel from './components/SettingsPanel';
import Dashboard from './components/Dashboard';
import FileUploader from './components/FileUploader';
import {
  addToHistory,
  getHistoryItem,
  updateHistoryItem,
  addFollowUp,
  updateUsageStats,
  getPreferences,
  getHistory,
} from './store/memory';
import {
  executeResearch,
  executeFollowUp,
  detectClarificationNeeded,
  autoTagQuery,
} from './utils/researchEngine';

export default function App() {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeView, setActiveView] = useState('research'); // 'dashboard' | 'research' | 'files'
  const [activeResearchId, setActiveResearchId] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [progress, setProgress] = useState({ phase: '', progress: 0, sourcesFound: 0 });
  const [currentMode, setCurrentMode] = useState('deep');
  const [clarification, setClarification] = useState(null);
  const [error, setError] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

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
    setClarification(null);

    // Check if clarification is needed
    const clarificationCheck = detectClarificationNeeded(query);
    if (clarificationCheck.needed) {
      setClarification(clarificationCheck);
      return;
    }

    setIsLoading(true);
    setCurrentResult(null);
    setActiveResearchId(null);
    setCurrentMode(mode);
    setActiveView('research');
    setProgress({ phase: 'Initializing...', progress: 0, sourcesFound: 0 });

    try {
      const result = await executeResearch(query, mode, (progressData) => {
        setProgress(progressData);
      });

      // Save to history
      const tags = autoTagQuery(query);
      const historyEntry = addToHistory({
        query,
        mode,
        result: result.report,
        sources: result.sources,
        tokenUsage: result.tokenUsage,
        cost: result.cost,
        latency: result.latency,
        tags,
      });

      // Update usage stats
      updateUsageStats({
        mode,
        tokenUsage: result.tokenUsage,
        cost: result.cost,
        latency: result.latency,
        tags,
      });

      setCurrentResult({
        ...result,
        followUpResults: [],
      });
      setActiveResearchId(historyEntry.id);
      addToast('Research completed successfully', 'success');
    } catch (err) {
      console.error('Research failed:', err);
      setError({
        message: 'Research failed. Please try again.',
        details: err.message,
      });
      addToast('Research failed: ' + err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Handle Follow-up
  const handleFollowUp = useCallback(async (followUpQuery) => {
    if (!currentResult || !activeResearchId) return;

    setIsFollowUpLoading(true);
    setError(null);

    try {
      const result = await executeFollowUp(
        currentResult.query,
        followUpQuery,
        currentResult.report,
        () => { }
      );

      // Save to history
      addFollowUp(activeResearchId, {
        query: followUpQuery,
        result: result.report,
        tokenUsage: result.tokenUsage,
      });

      // Update usage stats
      updateUsageStats({
        mode: 'quick',
        tokenUsage: result.tokenUsage,
        cost: result.cost,
        latency: result.latency,
        tags: autoTagQuery(followUpQuery),
      });

      setCurrentResult(prev => ({
        ...prev,
        followUpResults: [
          ...(prev.followUpResults || []),
          { ...result, query: followUpQuery },
        ],
      }));

      addToast('Follow-up research completed', 'success');
    } catch (err) {
      console.error('Follow-up failed:', err);
      addToast('Follow-up failed: ' + err.message, 'error');
    } finally {
      setIsFollowUpLoading(false);
    }
  }, [currentResult, activeResearchId, addToast]);

  // Select research from history
  const handleSelectResearch = useCallback((id) => {
    const item = getHistoryItem(id);
    if (!item) return;

    setActiveView('research');
    setActiveResearchId(id);
    setCurrentResult({
      report: item.result,
      sources: item.sources,
      tags: item.tags,
      tokenUsage: item.tokenUsage,
      cost: item.cost,
      latency: item.latency,
      mode: item.mode,
      query: item.query,
      followUpResults: (item.followUps || []).map(fu => ({
        report: fu.result,
        query: fu.query,
        tokenUsage: fu.tokenUsage,
        cost: 0,
      })),
    });
    setIsLoading(false);
    setClarification(null);
    setError(null);
  }, []);

  // New Research
  const handleNewResearch = useCallback(() => {
    setActiveResearchId(null);
    setCurrentResult(null);
    setIsLoading(false);
    setClarification(null);
    setError(null);
  }, []);

  // Clarification Select
  const handleClarificationSelect = useCallback((suggestion) => {
    setClarification(null);
    handleSearch(suggestion, currentMode);
  }, [handleSearch, currentMode]);

  // View change
  const handleViewChange = useCallback((view) => {
    setActiveView(view);
  }, []);

  // Keyboard shortcut
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

  // Breadcrumb text
  const getBreadcrumb = () => {
    if (activeView === 'dashboard') return 'Dashboard';
    if (activeView === 'files') return 'Files';
    if (currentResult) return null; // will render full breadcrumb
    return 'New Research';
  };

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
                Research Intelligence
              </span>
              <span className="topbar__breadcrumb-sep">/</span>
              <span className="topbar__breadcrumb-current">
                {activeView === 'research' && currentResult
                  ? (currentResult.query?.slice(0, 40) + (currentResult.query?.length > 40 ? '…' : ''))
                  : activeView === 'dashboard' ? 'Dashboard'
                    : activeView === 'files' ? 'Files'
                      : 'Research Session'}
              </span>
            </div>
            {activeView === 'research' && (
              <div className="topbar__mode-pills">
                <button
                  className="topbar__mode-pill topbar__mode-pill--memory topbar__mode-pill--active"
                  title="Memory active"
                >
                  Memory
                </button>
                <button
                  className={`topbar__mode-pill ${currentMode === 'quick' ? 'topbar__mode-pill--active' : ''}`}
                  onClick={() => setCurrentMode('quick')}
                >
                  Quick Brief
                </button>
                <button
                  className={`topbar__mode-pill ${currentMode === 'deep' ? 'topbar__mode-pill--active' : ''}`}
                  onClick={() => setCurrentMode('deep')}
                >
                  Deep Analysis
                </button>
              </div>
            )}
          </div>
          <div className="topbar__right">
            <div className="topbar__shortcut">
              <kbd>⌘K</kbd>
              <span>New</span>
            </div>
            <button
              id="settings-btn"
              className="topbar__settings-btn"
              onClick={() => setSettingsOpen(true)}
              title="Preferences (⌘,)"
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
          {/* === DASHBOARD VIEW === */}
          {activeView === 'dashboard' && (
            <Dashboard />
          )}

          {/* === FILES VIEW === */}
          {activeView === 'files' && (
            <FileUploader onFilesChange={setUploadedFiles} />
          )}

          {/* === RESEARCH VIEW === */}
          {activeView === 'research' && (
            <div className="research-view">
              {/* Scrollable content area */}
              <div className="research-view__body">
                {showWelcome && (
                  <div className="welcome">
                    <div className="welcome__hero">
                      <h1 className="welcome__headline">
                        Research <em>anything.</em><br />
                        Get structured insights.
                      </h1>
                      <p className="welcome__subtext">
                        Ask a technical question or upload a file. The dashboard presents your
                        results as structured research reports — with metrics, visualisations,
                        and findings.
                      </p>
                    </div>

                    {/* Starter Brief Cards */}
                    <div className="welcome__cards">
                      <div className="welcome__cards-grid">
                        {[
                          { mode: 'deep', query: 'Compare vector databases: Pinecone vs Weaviate vs Qdrant for production RAG' },
                          { mode: 'quick', query: 'What are the trade-offs of gRPC vs REST in microservices?' },
                          { mode: 'deep', query: 'Production Kubernetes autoscaling: KEDA vs HPA vs VPA' },
                          { mode: 'quick', query: 'Redis caching strategies and eviction policy comparison' },
                          { mode: 'deep', query: 'Transformer attention mechanisms: complexity and optimisation' },
                          { mode: 'quick', query: 'RAFT vs Paxos consensus algorithm trade-offs' },
                        ].map((card, i) => (
                          <button
                            key={i}
                            className="welcome__card"
                            onClick={() => handleSearch(card.query, card.mode)}
                          >
                            <span className="welcome__card-mode">
                              {card.mode === 'deep' ? 'Deep Analysis' : 'Quick Brief'}
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
                    sourcesFound={progress.sourcesFound}
                    mode={currentMode}
                  />
                )}

                {error && !isLoading && (
                  <div className="error-panel">
                    <div className="error-panel__icon">⚠️</div>
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
                    <ResearchReport
                      result={currentResult}
                      onFollowUp={handleFollowUp}
                      isFollowUpLoading={isFollowUpLoading}
                    />
                  </div>
                )}
              </div>

              {/* Pinned Query Bar */}
              <SearchPanel
                onSearch={handleSearch}
                isLoading={isLoading}
                clarification={clarification}
                onClarificationSelect={handleClarificationSelect}
                onDismissClarification={() => setClarification(null)}
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
              {toast.type === 'success' && '✓'}
              {toast.type === 'error' && '✕'}
              {toast.type === 'info' && 'ℹ'}
            </span>
            <span className="toast__message">{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
