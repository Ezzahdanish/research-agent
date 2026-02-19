/**
 * Research Engine
 * Simulates a deep research AI agent with dual modes,
 * structured reasoning, citations, and progressive output.
 * 
 * In a real implementation, this would connect to:
 * - OpenAI / Anthropic / Google APIs
 * - Semantic Scholar API
 * - GitHub API
 * - Documentation search engines
 */

import { getContextMemory, getPreferences } from '../store/memory.js';

// ========== Token & Cost Estimation ==========

const TOKEN_COST_PER_1K = {
    input: 0.003,
    output: 0.015,
};

export function estimateTokens(text) {
    // Rough estimation: ~4 chars per token average
    return Math.ceil((text || '').length / 4);
}

export function calculateCost(inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * TOKEN_COST_PER_1K.input;
    const outputCost = (outputTokens / 1000) * TOKEN_COST_PER_1K.output;
    return Math.round((inputCost + outputCost) * 10000) / 10000;
}

// ========== Clarification Detection ==========

const AMBIGUOUS_PATTERNS = [
    { pattern: /^(what|how|why)\s+(is|are|does|do)\s+\w+$/i, reason: 'Your query is quite broad. Could you specify what aspect you\'re interested in?' },
    { pattern: /best\s+(way|approach|practice|method)/i, reason: 'To give you the best recommendations, what\'s your specific use case and constraints?' },
    { pattern: /compare|vs|versus|difference/i, reason: 'I can provide a more focused comparison. What criteria matter most to you (performance, ease of use, ecosystem, etc.)?' },
    { pattern: /^.{1,15}$/i, reason: 'Your query is quite short. Could you provide more context about what you\'re looking for?' },
];

export function detectClarificationNeeded(query) {
    for (const { pattern, reason } of AMBIGUOUS_PATTERNS) {
        if (pattern.test(query.trim())) {
            return { needed: true, reason, suggestions: generateSuggestions(query) };
        }
    }
    return { needed: false };
}

function generateSuggestions(query) {
    const lower = query.toLowerCase();
    if (lower.includes('react')) {
        return [
            'React performance optimization techniques',
            'React vs Vue.js for enterprise apps',
            'React Server Components architecture',
        ];
    }
    if (lower.includes('database') || lower.includes('db')) {
        return [
            'SQL vs NoSQL for high-traffic applications',
            'Database sharding strategies',
            'Database indexing best practices',
        ];
    }
    if (lower.includes('api')) {
        return [
            'REST vs GraphQL API design trade-offs',
            'API rate limiting and security patterns',
            'gRPC for microservices communication',
        ];
    }
    return [
        `${query} - architectural patterns and trade-offs`,
        `${query} - production best practices`,
        `${query} - comparison with alternatives`,
    ];
}

// ========== Auto-tagging ==========

const TAG_KEYWORDS = {
    'machine-learning': ['ml', 'machine learning', 'neural', 'deep learning', 'model', 'training', 'inference', 'transformer', 'llm', 'gpt', 'bert'],
    'web-dev': ['react', 'vue', 'angular', 'nextjs', 'remix', 'css', 'html', 'frontend', 'web', 'browser', 'dom'],
    'backend': ['api', 'server', 'express', 'fastapi', 'django', 'rest', 'graphql', 'grpc', 'microservice'],
    'database': ['sql', 'nosql', 'postgres', 'mysql', 'mongodb', 'redis', 'database', 'query', 'index'],
    'devops': ['docker', 'kubernetes', 'k8s', 'ci/cd', 'deploy', 'aws', 'gcp', 'azure', 'terraform', 'infra'],
    'security': ['auth', 'security', 'encryption', 'jwt', 'oauth', 'csrf', 'xss', 'vulnerability'],
    'performance': ['performance', 'optimization', 'cache', 'latency', 'throughput', 'benchmark', 'profil'],
    'architecture': ['architecture', 'design pattern', 'system design', 'microservices', 'monolith', 'scaling'],
    'algorithms': ['algorithm', 'data structure', 'sorting', 'graph', 'dynamic programming', 'complexity'],
    'rust': ['rust', 'cargo', 'borrow checker', 'ownership'],
    'python': ['python', 'pip', 'django', 'fastapi', 'flask', 'pandas', 'numpy'],
    'typescript': ['typescript', 'type system', 'generics', 'interface'],
};

export function autoTagQuery(query) {
    const lower = query.toLowerCase();
    const tags = [];
    for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) {
            tags.push(tag);
        }
    }
    return tags.length > 0 ? tags : ['general'];
}

// ========== Source Generation ==========

const SOURCE_TEMPLATES = {
    'machine-learning': [
        { title: 'Attention Is All You Need', url: 'https://arxiv.org/abs/1706.03762', type: 'paper', relevance: 0.95 },
        { title: 'Hugging Face Documentation', url: 'https://huggingface.co/docs', type: 'documentation', relevance: 0.88 },
        { title: 'PyTorch Official Tutorials', url: 'https://pytorch.org/tutorials/', type: 'documentation', relevance: 0.85 },
        { title: 'Scaling Laws for Neural Language Models', url: 'https://arxiv.org/abs/2001.08361', type: 'paper', relevance: 0.82 },
        { title: 'ML Engineering Best Practices - Google', url: 'https://developers.google.com/machine-learning', type: 'blog', relevance: 0.78 },
    ],
    'web-dev': [
        { title: 'React Documentation', url: 'https://react.dev', type: 'documentation', relevance: 0.95 },
        { title: 'Web.dev Performance Guide', url: 'https://web.dev/performance', type: 'blog', relevance: 0.88 },
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org', type: 'documentation', relevance: 0.92 },
        { title: 'Patterns.dev — Design Patterns', url: 'https://www.patterns.dev', type: 'blog', relevance: 0.85 },
        { title: 'Next.js Documentation', url: 'https://nextjs.org/docs', type: 'documentation', relevance: 0.80 },
    ],
    'backend': [
        { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'repository', relevance: 0.92 },
        { title: 'Martin Fowler — Microservices', url: 'https://martinfowler.com/microservices/', type: 'blog', relevance: 0.88 },
        { title: 'API Design Guidelines — Microsoft', url: 'https://docs.microsoft.com/en-us/azure/architecture/', type: 'documentation', relevance: 0.85 },
        { title: 'The Twelve-Factor App', url: 'https://12factor.net', type: 'blog', relevance: 0.82 },
        { title: 'gRPC Official Documentation', url: 'https://grpc.io/docs/', type: 'documentation', relevance: 0.78 },
    ],
    'database': [
        { title: 'Use The Index, Luke — SQL Indexing', url: 'https://use-the-index-luke.com', type: 'blog', relevance: 0.92 },
        { title: 'PostgreSQL Documentation', url: 'https://www.postgresql.org/docs/', type: 'documentation', relevance: 0.90 },
        { title: 'Designing Data-Intensive Applications (DDIA)', url: 'https://dataintensive.net', type: 'paper', relevance: 0.95 },
        { title: 'MongoDB Architecture Guide', url: 'https://www.mongodb.com/docs/', type: 'documentation', relevance: 0.82 },
        { title: 'Redis Best Practices', url: 'https://redis.io/docs/management/', type: 'documentation', relevance: 0.78 },
    ],
    'performance': [
        { title: 'High Performance Browser Networking', url: 'https://hpbn.co', type: 'blog', relevance: 0.90 },
        { title: 'Google Performance Budgets', url: 'https://web.dev/performance-budgets-101/', type: 'blog', relevance: 0.85 },
        { title: 'Brendan Gregg — Systems Performance', url: 'https://www.brendangregg.com/perf.html', type: 'blog', relevance: 0.88 },
    ],
    general: [
        { title: 'GitHub Trending Repositories', url: 'https://github.com/trending', type: 'repository', relevance: 0.75 },
        { title: 'Hacker News', url: 'https://news.ycombinator.com', type: 'blog', relevance: 0.70 },
        { title: 'Stack Overflow', url: 'https://stackoverflow.com', type: 'blog', relevance: 0.80 },
        { title: 'ArXiv CS Papers', url: 'https://arxiv.org/list/cs/recent', type: 'paper', relevance: 0.72 },
    ],
};

function getSourcesForTags(tags) {
    const sources = [];
    const seen = new Set();
    tags.forEach(tag => {
        const tagSources = SOURCE_TEMPLATES[tag] || SOURCE_TEMPLATES.general;
        tagSources.forEach(s => {
            if (!seen.has(s.url)) {
                seen.add(s.url);
                sources.push({ ...s, id: `src_${Math.random().toString(36).slice(2, 8)}` });
            }
        });
    });
    return sources.sort((a, b) => b.relevance - a.relevance).slice(0, 8);
}

// ========== Research Report Generation ==========

function generateQuickReport(query, tags, context) {
    const codePreference = context.preferences.preferCodeExamples;
    const langs = context.preferences.preferredLanguages;

    let report = `## Quick Research: ${query}\n\n`;
    report += `> ⚡ Quick Mode — Focused, high-signal answer\n\n`;
    report += `### Summary\n\n`;
    report += generateSummaryForQuery(query, tags);
    report += `\n\n### Key Takeaways\n\n`;
    report += generateKeyTakeaways(query, tags);

    if (codePreference) {
        report += `\n\n### Code Example\n\n`;
        report += generateCodeExample(query, tags, langs);
    }

    report += `\n\n### Quick Recommendations\n\n`;
    report += generateRecommendations(query, tags);
    report += `\n\n---\n*💡 Switch to Deep Mode for comprehensive multi-source analysis with detailed citations.*`;

    return report;
}

function generateDeepReport(query, tags, context) {
    const codePreference = context.preferences.preferCodeExamples;
    const langs = context.preferences.preferredLanguages;

    let report = `## Deep Research Report: ${query}\n\n`;
    report += `> 🔬 Deep Mode — Multi-source synthesis with structured reasoning\n\n`;
    report += `### Executive Summary\n\n`;
    report += generateSummaryForQuery(query, tags);
    report += `\n\n### Background & Context\n\n`;
    report += generateBackground(query, tags);
    report += `\n\n### Detailed Analysis\n\n`;
    report += generateDetailedAnalysis(query, tags);

    if (tags.some(t => ['web-dev', 'backend', 'database', 'architecture'].includes(t))) {
        report += `\n\n### Architecture Considerations\n\n`;
        report += generateArchitectureSection(query, tags);
    }

    report += `\n\n### Comparative Analysis\n\n`;
    report += generateComparison(query, tags);

    if (codePreference) {
        report += `\n\n### Implementation Examples\n\n`;
        report += generateCodeExample(query, tags, langs);
        report += `\n\n#### Advanced Pattern\n\n`;
        report += generateAdvancedCodeExample(query, tags, langs);
    }

    report += `\n\n### Trade-offs & Considerations\n\n`;
    report += generateTradeoffs(query, tags);

    report += `\n\n### Production Readiness Checklist\n\n`;
    report += generateProductionChecklist(query, tags);

    report += `\n\n### Further Reading\n\n`;
    report += generateFurtherReading(tags);

    report += `\n\n### Research Methodology\n\n`;
    report += `This report was synthesized from multiple sources including academic papers, official documentation, `;
    report += `engineering blogs, and open-source repositories. Each claim is cross-referenced against at least `;
    report += `two independent sources for accuracy.\n\n`;
    report += `---\n*📌 You can ask follow-up questions to dive deeper into any section.*`;

    return report;
}

// ========== Content Generators ==========

function generateSummaryForQuery(query, tags) {
    const lower = query.toLowerCase();

    if (lower.includes('react') && (lower.includes('performance') || lower.includes('optim'))) {
        return `React performance optimization is a multi-layered challenge that spans rendering efficiency, state management, bundle size, and runtime performance. Modern React (18+) introduces concurrent features like **Suspense**, **startTransition**, and **automatic batching** that fundamentally change how we think about performance. The key insight is that most performance problems stem from unnecessary re-renders, oversized bundles, and poor data fetching strategies — not from React itself [1][2].\n\nThe most impactful optimizations include: proper component memoization with \`React.memo()\`, strategic use of \`useMemo\` and \`useCallback\`, code splitting via \`React.lazy()\`, and leveraging React Server Components for reduced client-side JavaScript [3].`;
    }

    if (tags.includes('machine-learning')) {
        return `The landscape of ${query.toLowerCase()} has evolved significantly in recent years. Current research emphasizes the importance of **scalable architectures**, **efficient training pipelines**, and **robust evaluation frameworks**. The transformer architecture remains the dominant paradigm, but emerging approaches like **state-space models** (Mamba) and **mixture-of-experts** (MoE) are challenging this hegemony in specific domains [1][2].\n\nProduction deployment of ML systems requires careful consideration of inference latency, model serving infrastructure, and monitoring for data drift. The gap between research prototypes and production systems remains one of the biggest challenges in the field [3].`;
    }

    if (tags.includes('database')) {
        return `Modern database architecture for ${query.toLowerCase()} requires balancing several competing concerns: **query performance**, **write throughput**, **data consistency**, and **operational complexity**. The "one-size-fits-all" approach to databases is increasingly recognized as inadequate for complex systems [1].\n\nThe current best practice is a **purpose-built database strategy** where different data access patterns are served by specialized stores. This polyglot persistence approach, while adding operational overhead, typically delivers 10-100x performance improvements for specific workloads compared to a single general-purpose database [2][3].`;
    }

    if (tags.includes('architecture') || tags.includes('backend')) {
        return `The architectural considerations for ${query.toLowerCase()} involve trade-offs between **development velocity**, **operational complexity**, **scalability**, and **team autonomy**. Modern software architecture has moved beyond the monolith-vs-microservices debate toward a more nuanced understanding of service boundaries and communication patterns [1].\n\nKey architectural patterns gaining traction include **event-driven architecture**, **CQRS (Command Query Responsibility Segregation)**, and **the modular monolith** — which provides many benefits of microservices without the distributed systems overhead [2][3].`;
    }

    return `Research into ${query.toLowerCase()} reveals a nuanced landscape where multiple approaches compete across different dimensions of quality, performance, and maintainability. The field has matured significantly, with industry best practices now well-documented across official documentation, peer-reviewed papers, and battle-tested open-source implementations [1].\n\nThe most effective strategies balance theoretical correctness with practical engineering constraints. Teams that succeed tend to adopt an **incremental improvement** approach rather than wholesale rewrites, measuring impact at each step [2][3].`;
}

function generateBackground(query, tags) {
    return `The evolution of ${query.toLowerCase()} can be traced through several key inflection points in the industry. Early approaches focused on simplicity and correctness, while modern solutions prioritize scalability, developer experience, and operational excellence.\n\nUnderstanding this historical context is crucial because many current architectural decisions are reactions to specific pain points experienced at scale. What works for a team of 5 engineers serving 1,000 users often breaks fundamentally at 50 engineers and 10 million users — and the failure modes are not always obvious in advance [1][4].`;
}

function generateKeyTakeaways(query, tags) {
    return `- **Start with measurement**: Profile before optimizing. Intuition about bottlenecks is often wrong [1]\n- **Favor simplicity**: The simplest solution that meets requirements is usually the most maintainable [2]\n- **Design for failure**: Every component will eventually fail; architect for graceful degradation [3]\n- **Iterate incrementally**: Ship small improvements frequently rather than large changes infrequently\n- **Document decisions**: Record the *why* behind architectural choices, not just the *what*`;
}

function generateDetailedAnalysis(query, tags) {
    if (tags.includes('machine-learning')) {
        return `#### Model Architecture Selection\n\nThe choice of model architecture depends on several factors:\n\n| Factor | Transformer | CNN | RNN/LSTM | SSM (Mamba) |\n|--------|------------|-----|----------|-------------|\n| Sequence Length | O(n²) | Fixed | O(n) | O(n) |\n| Parallelization | ✅ Excellent | ✅ Excellent | ❌ Limited | ✅ Good |\n| Long-range Deps | ✅ Strong | ⚠️ Limited | ⚠️ Degrades | ✅ Strong |\n| Training Speed | ⚠️ Memory | ✅ Fast | ❌ Slow | ✅ Fast |\n| Interpretability | ⚠️ Moderate | ❌ Low | ⚠️ Moderate | ⚠️ Moderate |\n\n#### Training Pipeline Optimization\n\nProduction ML training pipelines should implement:\n\n1. **Data validation** at ingestion (using tools like Great Expectations or TFX)\n2. **Distributed training** with gradient accumulation for large models\n3. **Mixed-precision training** (FP16/BF16) for 2x speedup with minimal accuracy loss\n4. **Checkpoint management** with automatic recovery from preemptions\n5. **Experiment tracking** (MLflow, W&B) for reproducibility [2][5]\n\n#### Inference Optimization\n\nFor production inference:\n- **Model quantization** (INT8/INT4) can reduce latency by 2-4x\n- **Dynamic batching** improves throughput by 5-10x\n- **Model distillation** creates smaller, faster models for deployment\n- **Speculative decoding** can improve LLM generation speed by 2-3x [3][4]`;
    }

    return `#### Core Architecture Patterns\n\nAnalyzing current best practices for ${query.toLowerCase()}, several patterns emerge:\n\n| Pattern | Complexity | Scalability | Use Case |\n|---------|-----------|-------------|----------|\n| Monolithic | Low | Limited | MVP, small teams |\n| Modular Monolith | Medium | Moderate | Mid-scale, growing teams |\n| Microservices | High | Excellent | Large-scale, many teams |\n| Event-Driven | High | Excellent | Async workflows |\n| Serverless | Low-Med | Auto-scales | Variable traffic |\n\n#### Implementation Strategy\n\n1. **Define clear boundaries**: Use domain-driven design to identify bounded contexts\n2. **Start monolithic**: Extract services only when you have evidence of need\n3. **Invest in observability early**: Distributed tracing, structured logging, metric dashboards\n4. **Automate everything**: CI/CD, infrastructure as code, automated testing [1][3][5]\n\n#### Performance Characteristics\n\nBenchmark data from production systems shows:\n- **P50 latency**: 15-50ms for well-optimized APIs\n- **P99 latency**: 150-500ms (the tail is what matters)\n- **Throughput**: 1,000-10,000 RPS per service instance\n- **Error budgets**: 99.9% availability = 8.7 hours downtime/year [2][4]`;
}

function generateArchitectureSection(query, tags) {
    return `\`\`\`
┌─────────────────────────────────────────────────────┐
│                    API Gateway                       │
│              (Rate Limiting, Auth)                    │
└──────────────┬──────────────┬───────────────────────┘
               │              │
       ┌───────▼──────┐ ┌────▼─────────┐
       │   Service A   │ │   Service B   │
       │  (Commands)   │ │  (Queries)    │
       └───────┬──────┘ └────┬─────────┘
               │              │
       ┌───────▼──────┐ ┌────▼─────────┐
       │  Event Bus    │ │  Read Store   │
       │  (Kafka/SQS)  │ │  (ElasticS.)  │
       └───────┬──────┘ └──────────────┘
               │
       ┌───────▼──────┐
       │  Write Store  │
       │ (PostgreSQL)  │
       └──────────────┘
\`\`\`\n\n**Key architectural decisions:**\n- CQRS pattern separates read and write models for independent scaling\n- Event bus enables loose coupling and eventual consistency\n- API Gateway handles cross-cutting concerns (auth, rate limiting, observability)\n- Each service owns its data store (Database per Service pattern) [1][3]`;
}

function generateComparison(query, tags) {
    return `#### Approach Comparison Matrix\n\n| Criteria | Approach A | Approach B | Approach C |\n|----------|-----------|-----------|------------|\n| **Learning Curve** | 🟢 Low | 🟡 Medium | 🔴 High |\n| **Performance** | 🟡 Good | 🟢 Excellent | 🟢 Excellent |\n| **Ecosystem** | 🟢 Mature | 🟡 Growing | 🟡 Growing |\n| **Scalability** | 🟡 Moderate | 🟢 High | 🟢 High |\n| **Debugging** | 🟢 Easy | 🟡 Moderate | 🔴 Complex |\n| **Community** | 🟢 Large | 🟢 Large | 🟡 Medium |\n\n#### Decision Framework\n\n**Choose Approach A when:** You need rapid prototyping, have a small team, or your scale is predictable.\n\n**Choose Approach B when:** You need high performance at scale, have experienced engineers, and can invest in infrastructure.\n\n**Choose Approach C when:** You're building for extreme scale, have dedicated platform teams, and need maximum flexibility [2][4].`;
}

function generateCodeExample(query, tags, langs) {
    if (tags.includes('web-dev') || tags.includes('typescript')) {
        return `\`\`\`typescript
// Optimized data fetching pattern with caching and error handling
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ResearchResult {
  id: string;
  title: string;
  findings: string[];
  sources: Source[];
  confidence: number;
}

// Custom hook with built-in caching, retry, and stale-while-revalidate
export function useResearch(query: string, mode: 'quick' | 'deep') {
  return useQuery<ResearchResult>({
    queryKey: ['research', query, mode],
    queryFn: async () => {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode }),
        signal: AbortSignal.timeout(mode === 'quick' ? 120_000 : 600_000),
      });
      
      if (!response.ok) {
        throw new ResearchError(response.status, await response.text());
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
  });
}
\`\`\``;
    }

    if (tags.includes('python') || tags.includes('machine-learning')) {
        return `\`\`\`python
# Production-ready ML pipeline with proper error handling
from dataclasses import dataclass
from typing import List, Optional
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

@dataclass
class ResearchConfig:
    model_name: str = "meta-llama/Llama-3-8b"
    max_tokens: int = 4096
    temperature: float = 0.7
    top_p: float = 0.9
    device: str = "cuda" if torch.cuda.is_available() else "cpu"

class ResearchAgent:
    def __init__(self, config: ResearchConfig):
        self.config = config
        self.tokenizer = AutoTokenizer.from_pretrained(config.model_name)
        self.model = AutoModelForCausalLM.from_pretrained(
            config.model_name,
            torch_dtype=torch.bfloat16,
            device_map="auto",
        )
        self._usage_stats = {"total_tokens": 0, "total_cost": 0.0}
    
    async def research(self, query: str, mode: str = "deep") -> dict:
        """Execute research with token tracking and error recovery."""
        try:
            inputs = self.tokenizer(query, return_tensors="pt").to(self.config.device)
            
            with torch.inference_mode():
                outputs = self.model.generate(
                    **inputs,
                    max_new_tokens=self.config.max_tokens,
                    temperature=self.config.temperature,
                    top_p=self.config.top_p,
                    do_sample=True,
                )
            
            response = self.tokenizer.decode(outputs[0], skip_special_tokens=True)
            token_count = len(outputs[0])
            self._usage_stats["total_tokens"] += token_count
            
            return {"result": response, "tokens": token_count, "status": "success"}
        except Exception as e:
            return {"result": None, "error": str(e), "status": "error"}
\`\`\``;
    }

    return `\`\`\`javascript
// Production-ready implementation pattern
class ResearchEngine {
  #cache = new Map();
  #stats = { queries: 0, tokens: 0, cost: 0 };
  
  constructor(config = {}) {
    this.maxRetries = config.maxRetries ?? 3;
    this.timeout = config.timeout ?? 30_000;
    this.cacheMaxAge = config.cacheMaxAge ?? 300_000; // 5 min
  }

  async research(query, options = {}) {
    const cacheKey = \`\${query}:\${options.mode || 'deep'}\`;
    const cached = this.#cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return { ...cached.data, fromCache: true };
    }

    const startTime = performance.now();
    let lastError;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeout);
        
        const result = await this.#executeQuery(query, {
          ...options,
          signal: controller.signal,
        });
        
        clearTimeout(timer);
        
        const latency = Math.round(performance.now() - startTime);
        this.#stats.queries++;
        this.#stats.tokens += result.tokenUsage.total;
        
        const response = { ...result, latency, attempt: attempt + 1 };
        this.#cache.set(cacheKey, { data: response, timestamp: Date.now() });
        
        return response;
      } catch (error) {
        lastError = error;
        if (!this.#isRetryable(error)) throw error;
        await this.#delay(Math.min(1000 * 2 ** attempt, 10000));
      }
    }
    
    throw lastError;
  }

  #isRetryable(error) {
    return error.name !== 'AbortError' && error.status !== 400;
  }

  #delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
\`\`\``;
}

function generateAdvancedCodeExample(query, tags, langs) {
    return `\`\`\`javascript
// Advanced: Stream-based research with progressive output
async function* streamResearch(query, options = {}) {
  const phases = [
    { name: 'query_analysis', weight: 0.1 },
    { name: 'source_discovery', weight: 0.2 },
    { name: 'content_extraction', weight: 0.3 },
    { name: 'synthesis', weight: 0.3 },
    { name: 'citation_linking', weight: 0.1 },
  ];

  let progress = 0;

  for (const phase of phases) {
    yield { 
      type: 'progress', 
      phase: phase.name, 
      progress: Math.round(progress * 100),
      message: \`Processing: \${phase.name.replace('_', ' ')}...\`
    };

    const result = await executePhase(phase.name, query, options);
    progress += phase.weight;

    yield { 
      type: 'partial_result', 
      phase: phase.name,
      data: result,
      progress: Math.round(progress * 100),
    };
  }

  yield { type: 'complete', progress: 100 };
}

// Usage
for await (const update of streamResearch('distributed cache invalidation')) {
  if (update.type === 'progress') {
    updateProgressBar(update.progress);
  } else if (update.type === 'partial_result') {
    appendToReport(update.data);
  }
}
\`\`\``;
}

function generateTradeoffs(query, tags) {
    return `| Decision | Pro | Con | Mitigation |\n|----------|-----|-----|------------|\n| Caching aggressively | ⬆️ Performance | Stale data risk | TTL + invalidation events |\n| Async processing | ⬆️ Throughput | Complexity | Dead letter queues + monitoring |\n| Strong typing | ⬆️ Safety | Dev speed | Code generation + gradual adoption |\n| Microservices | ⬆️ Scalability | Ops overhead | Platform team + service mesh |\n| Pre-computation | ⬆️ Read speed | Storage cost | Selective materialization |`;
}

function generateProductionChecklist(query, tags) {
    return `- [ ] **Monitoring**: Structured logging, distributed tracing, error tracking\n- [ ] **Alerting**: SLO-based alerts with clear runbooks\n- [ ] **Security**: Input validation, rate limiting, authentication/authorization\n- [ ] **Testing**: Unit tests (>80%), integration tests, load tests\n- [ ] **Documentation**: API docs, architecture decision records (ADRs)\n- [ ] **Deployment**: Blue-green or canary deployments\n- [ ] **Rollback**: Automated rollback on error rate spike\n- [ ] **Data**: Backup strategy, retention policies, GDPR compliance\n- [ ] **Performance**: P99 latency budgets, connection pooling, query optimization\n- [ ] **Resilience**: Circuit breakers, bulkheads, graceful degradation`;
}

function generateRecommendations(query, tags) {
    return `1. **Start with the simplest approach** that meets your performance requirements\n2. **Measure first, optimize second** — use profiling tools to identify actual bottlenecks\n3. **Invest in automated testing** before scaling complexity\n4. **Document your architecture decisions** for future team members\n5. **Set up monitoring from day one** — you can't improve what you can't measure`;
}

function generateFurtherReading(tags) {
    let reading = '';
    if (tags.includes('machine-learning')) {
        reading += `- 📄 *"Scaling Laws for Neural Language Models"* — Kaplan et al., 2020\n`;
        reading += `- 📄 *"FlashAttention: Fast and Memory-Efficient Attention"* — Dao et al., 2022\n`;
        reading += `- 📘 *Designing Machine Learning Systems* — Chip Huyen, O'Reilly 2022\n`;
    }
    if (tags.includes('architecture') || tags.includes('backend')) {
        reading += `- 📘 *Designing Data-Intensive Applications* — Martin Kleppmann\n`;
        reading += `- 📘 *Building Microservices* — Sam Newman, O'Reilly\n`;
        reading += `- 📄 *"On Designing and Deploying Internet-Scale Services"* — James Hamilton\n`;
    }
    if (tags.includes('web-dev')) {
        reading += `- 📘 *High Performance Browser Networking* — Ilya Grigorik\n`;
        reading += `- 📄 React RFC: Server Components\n`;
        reading += `- 🔗 web.dev — Core Web Vitals optimization guides\n`;
    }
    if (!reading) {
        reading += `- 📘 *The Pragmatic Programmer* — Hunt & Thomas\n`;
        reading += `- 📘 *A Philosophy of Software Design* — John Ousterhout\n`;
        reading += `- 📘 *Staff Engineer: Leadership Beyond the Management Track* — Will Larson\n`;
    }
    return reading;
}

// ========== File Content Reading ==========

export function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const ext = file.name.split('.').pop()?.toLowerCase();
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
        const isText = ['txt', 'md', 'json', 'csv', 'html', 'css', 'js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs'].includes(ext);

        if (isImage) {
            reader.onload = (e) => resolve({
                type: 'image',
                content: e.target.result,
                preview: `[Image file: ${file.name}]`,
                mimeType: file.type,
            });
            reader.readAsDataURL(file);
        } else if (isText || ext === 'doc' || ext === 'docx') {
            reader.onload = (e) => resolve({
                type: 'text',
                content: e.target.result?.slice(0, 50000) || '',
                preview: e.target.result?.slice(0, 500) || '',
                mimeType: file.type || 'text/plain',
            });
            reader.readAsText(file);
        } else if (ext === 'pdf') {
            reader.onload = (e) => resolve({
                type: 'pdf',
                content: e.target.result,
                preview: `[PDF document: ${file.name}, ${formatFileSize(file.size)}]`,
                mimeType: 'application/pdf',
            });
            reader.readAsDataURL(file);
        } else if (['xls', 'xlsx'].includes(ext)) {
            reader.onload = (e) => resolve({
                type: 'spreadsheet',
                content: e.target.result,
                preview: `[Spreadsheet: ${file.name}, ${formatFileSize(file.size)}]`,
                mimeType: file.type || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            reader.readAsDataURL(file);
        } else {
            reader.onload = (e) => resolve({
                type: 'binary',
                content: e.target.result,
                preview: `[File: ${file.name}, ${formatFileSize(file.size)}]`,
                mimeType: file.type || 'application/octet-stream',
            });
            reader.readAsDataURL(file);
        }

        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    });
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ========== File Analysis Report Generation ==========

function generateFileAnalysisReport(fileName, fileContent, fileType, mode, query) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const isCSV = ext === 'csv';
    const isJSON = ext === 'json';
    const isSpreadsheet = ['xls', 'xlsx'].includes(ext);
    const isPDF = ext === 'pdf';
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
    const isMarkdown = ext === 'md';
    const isCode = ['js', 'ts', 'jsx', 'tsx', 'py', 'rb', 'go', 'rs', 'css', 'html'].includes(ext);

    let report = `## ${mode === 'deep' ? 'Deep' : 'Quick'} Analysis: ${fileName}\n\n`;
    report += `> 📎 File analysis${query ? ` — "${query}"` : ''}\n\n`;

    // Document Overview
    report += `### Document Overview\n\n`;
    report += `| Property | Value |\n|----------|-------|\n`;
    report += `| **File Name** | \`${fileName}\` |\n`;
    report += `| **File Type** | ${ext?.toUpperCase()} |\n`;
    report += `| **MIME Type** | ${fileContent?.mimeType || 'unknown'} |\n`;
    report += `| **Analysis Mode** | ${mode === 'deep' ? 'Deep Analysis' : 'Quick Scan'} |\n\n`;

    if (isCSV && fileContent?.content) {
        const lines = fileContent.content.split('\n').filter(l => l.trim());
        const headers = lines[0]?.split(',').map(h => h.trim().replace(/"/g, ''));
        const rowCount = lines.length - 1;

        report += `### Data Structure\n\n`;
        report += `- **Rows**: ${rowCount.toLocaleString()} data records\n`;
        report += `- **Columns**: ${headers?.length || 0} fields\n`;
        if (headers) {
            report += `- **Fields**: ${headers.map(h => `\`${h}\``).join(', ')}\n`;
        }
        report += `\n### Sample Data\n\n`;
        if (headers && lines.length > 1) {
            report += `| ${headers.join(' | ')} |\n`;
            report += `| ${headers.map(() => '---').join(' | ')} |\n`;
            const sampleRows = lines.slice(1, Math.min(6, lines.length));
            sampleRows.forEach(row => {
                const cols = row.split(',').map(c => c.trim().replace(/"/g, ''));
                report += `| ${cols.join(' | ')} |\n`;
            });
        }
        report += `\n### Data Quality Assessment\n\n`;
        report += `- ✅ File is parseable CSV format\n`;
        report += `- ${headers?.length > 3 ? '✅' : '⚠️'} ${headers?.length || 0} columns detected — ${headers?.length > 3 ? 'good dimensionality' : 'limited fields'}\n`;
        report += `- ${rowCount > 10 ? '✅' : '⚠️'} ${rowCount} rows — ${rowCount > 100 ? 'substantial dataset' : rowCount > 10 ? 'moderate dataset' : 'small dataset'}\n`;
        report += `- ⚠️ Check for missing values and type consistency\n`;
    } else if (isJSON && fileContent?.content) {
        let parsed;
        try { parsed = JSON.parse(fileContent.content); } catch { parsed = null; }
        report += `### JSON Structure\n\n`;
        if (parsed) {
            const isArray = Array.isArray(parsed);
            report += `- **Root Type**: ${isArray ? `Array (${parsed.length} items)` : 'Object'}\n`;
            if (isArray && parsed.length > 0) {
                const keys = Object.keys(parsed[0]);
                report += `- **Item Keys**: ${keys.map(k => `\`${k}\``).join(', ')}\n`;
                report += `- **Sample Item**:\n\`\`\`json\n${JSON.stringify(parsed[0], null, 2).slice(0, 500)}\n\`\`\`\n`;
            } else if (!isArray) {
                const keys = Object.keys(parsed);
                report += `- **Top-level Keys**: ${keys.slice(0, 15).map(k => `\`${k}\``).join(', ')}${keys.length > 15 ? ` ... (+${keys.length - 15} more)` : ''}\n`;
                report += `- **Structure Preview**:\n\`\`\`json\n${JSON.stringify(parsed, null, 2).slice(0, 500)}\n\`\`\`\n`;
            }
        } else {
            report += `- ⚠️ JSON parsing failed — file may contain syntax errors\n`;
        }
    } else if (isCode && fileContent?.content) {
        const lines = fileContent.content.split('\n');
        report += `### Code Analysis\n\n`;
        report += `- **Lines of Code**: ${lines.length}\n`;
        report += `- **Language**: ${ext?.toUpperCase()}\n`;
        const imports = lines.filter(l => l.trim().startsWith('import ') || l.trim().startsWith('from '));
        if (imports.length > 0) {
            report += `- **Imports**: ${imports.length} dependencies\n`;
        }
        const functions = lines.filter(l => l.match(/function\s+\w+|const\s+\w+\s*=\s*\(|def\s+\w+|func\s+\w+/));
        if (functions.length > 0) {
            report += `- **Functions/Methods**: ~${functions.length} detected\n`;
        }
        report += `\n### Code Preview\n\n`;
        report += `\`\`\`${ext}\n${lines.slice(0, 30).join('\n')}\n\`\`\`\n`;
    } else if (isMarkdown && fileContent?.content) {
        const lines = fileContent.content.split('\n');
        const headings = lines.filter(l => l.startsWith('#'));
        report += `### Document Structure\n\n`;
        report += `- **Total Lines**: ${lines.length}\n`;
        report += `- **Headings**: ${headings.length}\n`;
        if (headings.length > 0) {
            report += `- **Table of Contents**:\n`;
            headings.slice(0, 10).forEach(h => {
                const level = h.match(/^#+/)?.[0].length || 1;
                report += `${'  '.repeat(level - 1)}- ${h.replace(/^#+\s*/, '')}\n`;
            });
        }
        report += `\n### Content Preview\n\n`;
        report += fileContent.content.slice(0, 1000) + (fileContent.content.length > 1000 ? '\n\n*... (content truncated)*' : '');
    } else {
        report += `### Content Preview\n\n`;
        if (fileContent?.preview) {
            report += fileContent.preview;
        } else {
            report += `*Binary file — content preview not available for ${ext?.toUpperCase()} files.*\n`;
        }
    }

    // Key Findings (generic for all types)
    report += `\n\n### Key Findings\n\n`;
    report += `1. **File Structure**: The ${ext?.toUpperCase()} file has been successfully parsed and analyzed\n`;
    report += `2. **Data Integrity**: Initial scan shows the file is well-formed and readable\n`;
    report += `3. **Content Quality**: The file contains structured data suitable for further analysis\n`;

    if (mode === 'deep') {
        report += `\n### Recommendations\n\n`;
        report += `- 📊 **Data validation**: Run comprehensive null-check and type-consistency analysis\n`;
        report += `- 🔍 **Deep dive**: Ask specific questions about this file for targeted insights\n`;
        report += `- 📈 **Visualization**: Consider generating charts from quantitative fields\n`;
        report += `- 🔗 **Cross-reference**: Compare this data with external benchmarks or standards\n`;
    }

    report += `\n\n---\n*📌 Ask follow-up questions to explore specific aspects of this file.*`;

    return report;
}

// ========== Main Research Execution ==========

export async function executeResearch(query, mode = 'deep', onProgress, attachedFiles = []) {
    const startTime = performance.now();
    const context = getContextMemory();
    const prefs = getPreferences();
    const tags = autoTagQuery(query || 'general');
    const sources = getSourcesForTags(tags);
    const hasFiles = attachedFiles.length > 0;

    // Determine phases based on mode and files
    let phases;
    if (hasFiles && !query.trim()) {
        // File-only analysis
        phases = mode === 'quick'
            ? ['Reading file contents...', 'Parsing structure...', 'Generating analysis...']
            : ['Reading file contents...', 'Parsing document structure...', 'Analyzing data patterns...', 'Extracting key insights...', 'Cross-referencing findings...', 'Generating comprehensive report...'];
    } else if (hasFiles) {
        // Query + files
        phases = mode === 'quick'
            ? ['Reading attached files...', 'Analyzing query...', 'Scanning sources...', 'Generating report...']
            : ['Reading attached files...', 'Parsing file structure...', 'Analyzing query intent...', 'Discovering relevant sources...', 'Cross-referencing with file data...', 'Synthesizing analysis...', 'Generating structured report...'];
    } else {
        // Standard query
        phases = mode === 'quick'
            ? ['Analyzing query...', 'Scanning sources...', 'Generating report...']
            : ['Analyzing query intent...', 'Discovering relevant sources...', 'Extracting key insights...', 'Cross-referencing findings...', 'Synthesizing analysis...', 'Generating structured report...', 'Adding citations...'];
    }

    // Read file contents if present
    let fileContents = [];
    if (hasFiles) {
        for (const file of attachedFiles) {
            try {
                const content = await readFileContent(file.file || file);
                fileContents.push({ name: file.name || file.file?.name, content, file });
            } catch (err) {
                console.error('Failed to read file:', err);
                fileContents.push({ name: file.name || 'unknown', content: null, error: err.message });
            }
        }
    }

    // Simulate progressive research with delays
    for (let i = 0; i < phases.length; i++) {
        if (onProgress) {
            onProgress({
                phase: phases[i],
                progress: Math.round(((i + 1) / phases.length) * 100),
                sourcesFound: Math.min(sources.length, Math.ceil(((i + 1) / phases.length) * sources.length)),
            });
        }
        const delay = mode === 'quick'
            ? 600 + Math.random() * 500
            : 1200 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, delay));
    }

    // Generate the report
    let report;
    if (hasFiles && !query.trim()) {
        // File-only analysis — generate report for each file
        const fileReports = fileContents.map(fc =>
            generateFileAnalysisReport(fc.name, fc.content, fc.content?.type, mode, '')
        );
        report = fileReports.join('\n\n---\n\n');
    } else if (hasFiles) {
        // Query + files — combine file analysis with research
        const fileNames = fileContents.map(fc => fc.name).join(', ');
        const fileReport = fileContents.map(fc =>
            generateFileAnalysisReport(fc.name, fc.content, fc.content?.type, mode, query)
        ).join('\n\n');

        const queryReport = mode === 'quick'
            ? generateQuickReport(query, tags, context)
            : generateDeepReport(query, tags, context);

        report = `## Research with File Analysis\n\n`;
        report += `> 📎 Analyzing ${fileContents.length} file(s): ${fileNames}\n`;
        report += `> 🔍 Query: "${query}"\n\n`;
        report += fileReport;
        report += `\n\n---\n\n`;
        report += queryReport;
    } else {
        // Standard research
        report = mode === 'quick'
            ? generateQuickReport(query, tags, context)
            : generateDeepReport(query, tags, context);
    }

    const latency = Math.round(performance.now() - startTime);
    const inputTokens = estimateTokens(query) + estimateTokens(JSON.stringify(context)) +
        fileContents.reduce((sum, fc) => sum + estimateTokens(fc.content?.preview || ''), 0);
    const outputTokens = estimateTokens(report);
    const totalTokens = inputTokens + outputTokens;
    const cost = calculateCost(inputTokens, outputTokens);

    return {
        report,
        sources,
        tags,
        tokenUsage: { input: inputTokens, output: outputTokens, total: totalTokens },
        cost,
        latency,
        mode,
        query: query || `File Analysis: ${attachedFiles.map(f => f.name || f.file?.name).join(', ')}`,
        attachedFiles: attachedFiles.map(f => ({ name: f.name || f.file?.name, size: f.size || f.file?.size })),
    };
}

export async function executeFollowUp(originalQuery, followUpQuery, originalReport, onProgress) {
    const startTime = performance.now();
    const tags = autoTagQuery(followUpQuery);
    const context = getContextMemory();

    const phases = [
        'Understanding follow-up context...',
        'Analyzing in relation to previous research...',
        'Generating refined response...',
    ];

    for (let i = 0; i < phases.length; i++) {
        if (onProgress) {
            onProgress({
                phase: phases[i],
                progress: Math.round(((i + 1) / phases.length) * 100),
            });
        }
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 800));
    }

    let report = `## Follow-up: ${followUpQuery}\n\n`;
    report += `> Continuing from: *"${originalQuery}"*\n\n`;
    report += generateSummaryForQuery(followUpQuery, tags);
    report += `\n\n### Additional Details\n\n`;
    report += generateDetailedAnalysis(followUpQuery, tags);

    if (context.preferences.preferCodeExamples) {
        report += `\n\n### Updated Code Example\n\n`;
        report += generateCodeExample(followUpQuery, tags, context.preferences.preferredLanguages);
    }

    const latency = Math.round(performance.now() - startTime);
    const inputTokens = estimateTokens(followUpQuery) + estimateTokens(originalReport.substring(0, 500));
    const outputTokens = estimateTokens(report);
    const cost = calculateCost(inputTokens, outputTokens);

    return {
        report,
        tokenUsage: { input: inputTokens, output: outputTokens, total: inputTokens + outputTokens },
        cost,
        latency,
    };
}
