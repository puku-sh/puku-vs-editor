# Query Extractor - PRD

## Component Overview
**Purpose**: Extract search keywords from user chat messages
**Priority**: P0 (MVP - Week 1)
**Dependencies**: None
**File**: `src/chat/src/extension/context/node/chatQueryExtractor.ts`

---

## Problem
User messages are natural language questions, not optimized search queries. We need to extract meaningful keywords for semantic search.

**Examples:**
- "How does authentication work?" → `authentication login session verify`
- "Fix the bug in user validation" → `user validation error bug`
- "Explain the database schema" → `database schema model table`

---

## Requirements

### FR-1: Keyword Extraction (P0)
Extract identifiers and meaningful words from user message.

**Input**: User message (string)
**Output**: Array of keywords (string[])

**Rules:**
- Extract words matching pattern: `[a-zA-Z_][a-zA-Z0-9_]*`
- Filter out short words (length < 3)
- Convert to lowercase
- Remove duplicates
- Common words to skip: `the`, `a`, `an`, `is`, `are`, `how`, `what`, `why`

**Example:**
```typescript
Input: "How does user authentication work?"
Output: ["user", "authentication", "work"]
```

### FR-2: Query Building (P0)
Join keywords into search query string.

**Input**: Keywords array
**Output**: Search query string (space-separated)

**Example:**
```typescript
Input: ["user", "authentication", "work"]
Output: "user authentication work"
```

### FR-3: LLM-Enhanced Query (P2 - Future)
Use LLM to rephrase query for better search results.

**Input**: User message
**Output**: Optimized search query

**Meta-Prompt:**
```
Extract search keywords from the following question: "{message}"
Return only relevant keywords for code search, space-separated.
Focus on technical terms, function names, concepts.
```

---

## API Design

### Simple Implementation (P0)

```typescript
export class ChatQueryExtractor {
    /**
     * Extract keywords from user message
     */
    extractKeywords(message: string): string[] {
        const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were',
                                    'how', 'what', 'why', 'when', 'where', 'does']);

        const identifiers = new Set<string>();

        // Extract words
        for (const match of message.matchAll(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g)) {
            const word = match[0].toLowerCase();

            // Filter short words and stop words
            if (word.length >= 3 && !stopWords.has(word)) {
                identifiers.add(word);
            }
        }

        return Array.from(identifiers);
    }

    /**
     * Build search query from message
     */
    buildQuery(message: string): string {
        return this.extractKeywords(message).join(' ');
    }
}
```

### Enhanced Implementation (P2)

```typescript
export class ChatQueryExtractor {
    constructor(
        @IEndpointProvider private readonly endpointProvider: IEndpointProvider,
    ) {}

    /**
     * Build query using LLM meta-prompt
     */
    async buildQueryWithLLM(
        message: string,
        token: CancellationToken
    ): Promise<string> {
        const endpoint = await this.endpointProvider.getChatEndpoint('copilot-fast');

        const metaPrompt = {
            messages: [{
                role: 'system',
                content: 'Extract search keywords from user questions. Return only keywords, space-separated.'
            }, {
                role: 'user',
                content: `Question: "${message}"`
            }]
        };

        const result = await endpoint.makeChatRequest(
            'queryExtraction',
            metaPrompt.messages,
            async (text) => { return text; },
            token,
            ChatLocation.Other,
            undefined,
            { temperature: 0.1 }
        );

        return result.type === 'success' ? result.value.trim() : this.buildQuery(message);
    }
}
```

---

## Test Cases

| Input | Expected Keywords | Expected Query |
|-------|-------------------|----------------|
| "How does authentication work?" | `["authentication", "work"]` | `"authentication work"` |
| "Fix user validation bug" | `["fix", "user", "validation", "bug"]` | `"fix user validation bug"` |
| "What is the database schema?" | `["database", "schema"]` | `"database schema"` |
| "a b c" | `[]` (all too short) | `""` |
| "getUserById function" | `["getuserbyid", "function"]` | `"getuserbyid function"` |

---

## Performance Requirements
- **Latency**: <10ms for simple extraction
- **LLM mode**: <200ms for meta-prompt (if P2 implemented)
- **Memory**: Minimal (no caching needed)

---

## Success Criteria
- [ ] Extracts relevant keywords from user messages
- [ ] Filters out noise (stop words, short words)
- [ ] Works with natural language questions
- [ ] <10ms extraction time
- [ ] Unit tests cover edge cases

---

## Implementation Checklist

**Phase 1 (P0):**
- [ ] Create `ChatQueryExtractor` class
- [ ] Implement `extractKeywords()`
- [ ] Implement `buildQuery()`
- [ ] Add stop words list
- [ ] Write unit tests
- [ ] Add to service registry

**Phase 2 (P2):**
- [ ] Implement `buildQueryWithLLM()`
- [ ] Create meta-prompt
- [ ] Add fallback to simple extraction
- [ ] Measure improvement vs. simple extraction

---

## Related Documents
- `00-overview.md` - Component overview
- `02-context-formatter.md` - Next component (consumes query)
- `../../architecture/chat-semantic-context/data-flow.md` - Data flow

---

**Status**: Ready for Implementation
**Priority**: P0 (MVP)
**Estimated Effort**: 2-4 hours
**Owner**: TBD
