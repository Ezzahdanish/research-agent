/**
 * Core Research Engine
 * Implements 3 modes: quick, standard, deep.
 * All output is dynamically generated from real AI analysis.
 */

import { chatCompletion } from './aiProvider.js';
import { searchWeb, searchMultiple } from './searchProvider.js';
import { query as dbQuery } from '../db/pool.js';

// ============================================================
// PROMPTS
// ============================================================

const SYSTEM_PROMPTS = {
    queryAnalysis: `You are a research planning assistant. Given a user's research query, decompose it into:
1. The core question being asked
2. 3-5 specific sub-questions that need to be answered
3. The domain/field this belongs to
4. What type of output would be most useful (comparison table, step-by-step guide, analysis report, etc.)

Respond in JSON format:
{
  "coreQuestion": "...",
  "subQuestions": ["...", "..."],
  "domain": "...",
  "outputType": "..."
}`,

    quickResearch: `You are a concise research analyst. Provide a focused, structured answer to the user's question.
Rules:
- Be specific and concrete, not generic
- Include actual numbers, metrics, or data points where relevant
- If comparing technologies: name specific versions, benchmarks, trade-offs
- If discussing architecture: mention concrete patterns with pros/cons
- Use markdown formatting with proper headings
- Keep it focused — 300-500 words
- No filler phrases like "it depends" without explaining what it depends on
- No generic "industry best practices" unless you specify which practices
- End with 2-3 actionable recommendations`,

    standardResearch: `You are a thorough research analyst. Provide a well-structured, multi-faceted answer.
Rules:
- Start with a concise executive summary (2-3 sentences)
- Use proper heading hierarchy (##, ###)
- Include comparison tables where appropriate (use markdown tables)
- Cite specific technologies, versions, papers, or benchmarks
- Discuss concrete trade-offs with quantified metrics where possible
- If the topic involves code: include a practical example
- Address "when to use" and "when not to use" for each option
- 600-1000 words
- No vague generalizations — every claim should be supported
- End with a decision framework or recommendation matrix`,

    contentExtraction: `You are a research content analyst. Given a search result (title, URL, snippet), extract:
1. Key facts and claims relevant to the research query
2. Specific data points, numbers, or metrics mentioned
3. The perspective or bias of this source
4. How this source relates to the overall research question

Be concise. Focus on extractable facts, not summaries of summaries.`,

    crossValidation: `You are a critical research reviewer. Given extracted insights from multiple sources about a research topic:
1. Identify claims that multiple sources agree on (high confidence)
2. Identify contradictions between sources
3. Identify gaps — important aspects not covered by any source
4. Rate the overall confidence level for each key finding

Respond in structured markdown with sections for Agreements, Contradictions, and Gaps.`,

    deepSynthesis: `You are a senior research analyst producing a comprehensive research report.
Rules:
- Start with an executive summary (3-4 sentences, no fluff)
- Use proper heading hierarchy (##, ###, ####)
- Include comparison tables with specific metrics (use markdown tables)
- Every claim must reference the source it came from using [1], [2], etc.
- Include a "Trade-offs and Considerations" section with a decision matrix
- If architecture topic: include a concrete system design discussion
- If comparing technologies: include benchmark data where available
- If financial/data question: include computed metrics
- Discuss failure modes and edge cases
- 1200-2000 words
- No generic advice — everything must be grounded in the sources provided
- No emoji — professional, neutral tone
- End with "Key Decisions" section with clear recommendations`,

    citationLinking: `You are a citation formatter. Given a research report and a list of sources, ensure every factual claim in the report has a citation reference [1], [2], etc. mapped to the source list.

Return the final report text with all citations properly placed. Also return the citations list as JSON.

Respond in JSON:
{
  "report": "... the full report with [1], [2] citations ...",
  "citations": [
    {"id": 1, "title": "...", "url": "...", "relevance": "..."}
  ]
}`,
};

// ============================================================
// QUICK MODE
// ============================================================

export async function executeQuick(query, sessionId) {
    const startTime = Date.now();

    const result = await chatCompletion({
        systemPrompt: SYSTEM_PROMPTS.quickResearch,
        userPrompt: query,
        mode: 'quick',
        maxTokens: 1500,
        temperature: 0.6,
    });

    const duration = Date.now() - startTime;

    // Log single phase
    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, tokens_used, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, 'quick_synthesis', duration, result.tokens.total, JSON.stringify({ model: 'gpt-4o-mini' })]
    );

    return {
        report: result.content,
        citations: [],
        tokens: result.tokens,
        latencyMs: duration,
    };
}

// ============================================================
// STANDARD MODE
// ============================================================

export async function executeStandard(query, sessionId) {
    const totalStart = Date.now();
    let totalTokens = { input: 0, output: 0, total: 0 };

    // Phase 1: Web search + query understanding
    const phase1Start = Date.now();
    const searchResults = await searchWeb(query, { maxResults: 5, searchDepth: 'basic' });
    const phase1Duration = Date.now() - phase1Start;

    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, metadata)
     VALUES ($1, $2, $3, $4)`,
        [sessionId, 'source_discovery', phase1Duration, JSON.stringify({ sourcesFound: searchResults.length })]
    );

    // Phase 2: Synthesize with sources
    const phase2Start = Date.now();
    const sourceContext = searchResults.length > 0
        ? `\n\nRelevant sources found:\n${searchResults.map((s, i) =>
            `[${i + 1}] ${s.title} (${s.url})\n${s.snippet}`
        ).join('\n\n')}`
        : '';

    const result = await chatCompletion({
        systemPrompt: SYSTEM_PROMPTS.standardResearch,
        userPrompt: `Research query: ${query}${sourceContext}\n\nProvide a thorough, structured analysis. Reference sources with [1], [2], etc. where applicable.`,
        mode: 'standard',
        maxTokens: 3000,
        temperature: 0.6,
    });

    totalTokens.input += result.tokens.input;
    totalTokens.output += result.tokens.output;
    totalTokens.total += result.tokens.total;
    const phase2Duration = Date.now() - phase2Start;

    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, tokens_used, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, 'structured_synthesis', phase2Duration, result.tokens.total, JSON.stringify({ model: 'gpt-4o-mini' })]
    );

    const citations = searchResults.map((s, i) => ({
        id: i + 1,
        title: s.title,
        url: s.url,
        relevance: s.score,
    }));

    return {
        report: result.content,
        citations,
        tokens: totalTokens,
        latencyMs: Date.now() - totalStart,
    };
}

// ============================================================
// DEEP MODE — 6-phase pipeline
// ============================================================

/**
 * Execute deep research with streaming progress callback.
 * @param {string} query
 * @param {string} sessionId
 * @param {(event: Object) => void} onProgress - Callback for SSE events
 */
export async function executeDeep(query, sessionId, onProgress) {
    const totalStart = Date.now();
    let totalTokens = { input: 0, output: 0, total: 0 };
    let allSources = [];

    const emit = (phase, progress, message, data = null) => {
        if (onProgress) {
            onProgress({ phase, progress, message, data, timestamp: Date.now() });
        }
    };

    // ---- Phase 1: Query Analysis ----
    emit('query_analysis', 5, 'Analyzing query structure and intent...');
    const p1Start = Date.now();

    const analysisResult = await chatCompletion({
        systemPrompt: SYSTEM_PROMPTS.queryAnalysis,
        userPrompt: query,
        mode: 'deep',
        maxTokens: 800,
        temperature: 0.4,
        jsonMode: true,
    });

    totalTokens.input += analysisResult.tokens.input;
    totalTokens.output += analysisResult.tokens.output;
    totalTokens.total += analysisResult.tokens.total;

    let analysis;
    try {
        analysis = JSON.parse(analysisResult.content);
    } catch {
        analysis = { coreQuestion: query, subQuestions: [query], domain: 'general', outputType: 'analysis' };
    }

    const p1Duration = Date.now() - p1Start;
    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, tokens_used, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, 'query_analysis', p1Duration, analysisResult.tokens.total, JSON.stringify(analysis)]
    );

    emit('query_analysis', 15, `Identified ${analysis.subQuestions?.length || 0} sub-questions in "${analysis.domain}" domain`);

    // ---- Phase 2: Source Discovery ----
    emit('source_discovery', 20, 'Searching for relevant sources...');
    const p2Start = Date.now();

    const searchQueries = [query, ...(analysis.subQuestions || []).slice(0, 3)];
    const searchBatches = await searchMultiple(searchQueries, { maxResults: 4, searchDepth: 'advanced' });

    // Deduplicate sources by URL
    const seenUrls = new Set();
    for (const batch of searchBatches) {
        for (const result of batch.results) {
            if (!seenUrls.has(result.url)) {
                seenUrls.add(result.url);
                allSources.push(result);
            }
        }
    }

    const p2Duration = Date.now() - p2Start;
    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, metadata)
     VALUES ($1, $2, $3, $4)`,
        [sessionId, 'source_discovery', p2Duration, JSON.stringify({ sourcesFound: allSources.length, queries: searchQueries.length })]
    );

    emit('source_discovery', 30, `Found ${allSources.length} unique sources`);

    // ---- Phase 3: Content Extraction ----
    emit('content_extraction', 35, 'Extracting key insights from sources...');
    const p3Start = Date.now();

    let extractedInsights = '';
    if (allSources.length > 0) {
        const sourceSummary = allSources.map((s, i) =>
            `Source [${i + 1}]: ${s.title}\nURL: ${s.url}\nContent: ${s.snippet.slice(0, 500)}`
        ).join('\n\n---\n\n');

        const extractionResult = await chatCompletion({
            systemPrompt: SYSTEM_PROMPTS.contentExtraction,
            userPrompt: `Research question: ${query}\n\nSources to analyze:\n\n${sourceSummary}`,
            mode: 'deep',
            maxTokens: 2000,
            temperature: 0.4,
        });

        extractedInsights = extractionResult.content;
        totalTokens.input += extractionResult.tokens.input;
        totalTokens.output += extractionResult.tokens.output;
        totalTokens.total += extractionResult.tokens.total;
    }

    const p3Duration = Date.now() - p3Start;
    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, tokens_used, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, 'content_extraction', p3Duration, totalTokens.total, JSON.stringify({ insightLength: extractedInsights.length })]
    );

    emit('content_extraction', 50, 'Key insights extracted from all sources');

    // ---- Phase 4: Cross-source Validation ----
    emit('cross_validation', 55, 'Validating findings across sources...');
    const p4Start = Date.now();

    let validationReport = '';
    if (extractedInsights) {
        const validationResult = await chatCompletion({
            systemPrompt: SYSTEM_PROMPTS.crossValidation,
            userPrompt: `Research question: ${query}\n\nExtracted insights:\n${extractedInsights}`,
            mode: 'deep',
            maxTokens: 1500,
            temperature: 0.4,
        });

        validationReport = validationResult.content;
        totalTokens.input += validationResult.tokens.input;
        totalTokens.output += validationResult.tokens.output;
        totalTokens.total += validationResult.tokens.total;
    }

    const p4Duration = Date.now() - p4Start;
    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, tokens_used, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, 'cross_validation', p4Duration, 0, JSON.stringify({ hasValidation: !!validationReport })]
    );

    emit('cross_validation', 65, 'Cross-source validation complete');

    // ---- Phase 5: Structured Synthesis ----
    emit('structured_synthesis', 70, 'Synthesizing comprehensive report...');
    const p5Start = Date.now();

    const synthesisContext = [
        `Research query: ${query}`,
        `\nQuery analysis: ${JSON.stringify(analysis)}`,
        extractedInsights ? `\nExtracted insights:\n${extractedInsights}` : '',
        validationReport ? `\nCross-validation findings:\n${validationReport}` : '',
        allSources.length > 0 ? `\nSources:\n${allSources.map((s, i) => `[${i + 1}] ${s.title} — ${s.url}`).join('\n')}` : '',
    ].filter(Boolean).join('\n');

    const synthesisResult = await chatCompletion({
        systemPrompt: SYSTEM_PROMPTS.deepSynthesis,
        userPrompt: synthesisContext,
        mode: 'deep',
        maxTokens: 4000,
        temperature: 0.6,
    });

    totalTokens.input += synthesisResult.tokens.input;
    totalTokens.output += synthesisResult.tokens.output;
    totalTokens.total += synthesisResult.tokens.total;

    const p5Duration = Date.now() - p5Start;
    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, tokens_used, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
        [sessionId, 'structured_synthesis', p5Duration, synthesisResult.tokens.total, JSON.stringify({ reportLength: synthesisResult.content.length })]
    );

    emit('structured_synthesis', 85, 'Report synthesis complete');

    // ---- Phase 6: Citation Linking ----
    emit('citation_linking', 90, 'Linking citations to sources...');
    const p6Start = Date.now();

    const citations = allSources.map((s, i) => ({
        id: i + 1,
        title: s.title,
        url: s.url,
        relevance: s.score || 0,
    }));

    // The synthesis step already embeds most citations via instructed prompt format.
    // This phase ensures a clean citations JSON array.
    const p6Duration = Date.now() - p6Start;
    await dbQuery(
        `INSERT INTO research_phases (session_id, phase_name, duration_ms, metadata)
     VALUES ($1, $2, $3, $4)`,
        [sessionId, 'citation_linking', p6Duration, JSON.stringify({ citationCount: citations.length })]
    );

    emit('citation_linking', 100, `Linked ${citations.length} citations`);

    return {
        report: synthesisResult.content,
        citations,
        tokens: totalTokens,
        latencyMs: Date.now() - totalStart,
    };
}
