# Puku Editor Documentation

This directory contains technical documentation, architecture guides, and product requirements for Puku Editor.

## Table of Contents

### Core Documentation

- **[FIM Architecture](fim.md)** - Fill-In-Middle completion system architecture and implementation
- **[Prompts System](prompts.md)** - TSX-based prompt engineering framework
- **[Tools Development](tools.md)** - Language model tool integration guidelines

### Architecture Documents

- **[Import Context Design](IMPORT_CONTEXT_DESIGN.md)** - Import-based context gathering for completions
- **[Import Context Summary](IMPORT_CONTEXT_SUMMARY.md)** - Summary of import context implementation
- **[Import Context Testing](TESTING_IMPORT_CONTEXT.md)** - Testing strategy for import context
- **[Radix Trie Cache](RADIX_TRIE_CACHE.md)** - Prefix-based completion caching
- **[File Extension Detection](FILE_EXTENSION_DETECTION_PLAN.md)** - Language detection implementation
- **[Puku Indexing Architecture](PUKU_INDEXING_ARCHITECTURE.md)** - Semantic search and embeddings system

### Product Requirements Documents (PRDs)

- **[PRD: Forward Stability](prd-forward-stability.md)** - Enable stable ghost text during edits ([Issue #55](https://github.com/puku-sh/puku-vs-editor/issues/55))

### Feature Plans

- **[Puku Chat with Indexing](plans/puku-chat-with-indexing.md)** - Chat integration with semantic search
- **[Remove Copilot Dependencies](plans/remove-copilot-dependencies.md)** - Migration plan for Copilot-specific code

## Feature Gap Analysis

We've analyzed Puku's inline completion system against GitHub Copilot and identified key missing features:

### 🔴 Critical Priority (Quick Wins)

| Issue | Feature | Effort | Status |
|-------|---------|--------|--------|
| [#55](https://github.com/puku-sh/puku-vs-editor/issues/55) | Enable forward stability | 5 min | 📝 PRD Complete |
| [#56](https://github.com/puku-sh/puku-vs-editor/issues/56) | Rejection tracking | 4-8 hours | 📋 Planned |
| [#57](https://github.com/puku-sh/puku-vs-editor/issues/57) | "Typing as suggested" optimization | 2-4 hours | 📋 Planned |

### 🟠 High Priority (Performance & UX)

| Issue | Feature | Effort | Status |
|-------|---------|--------|--------|
| [#58](https://github.com/puku-sh/puku-vs-editor/issues/58) | NextEditCache with rebasing | 8-16 hours | 📋 Planned |
| [#59](https://github.com/puku-sh/puku-vs-editor/issues/59) | Reduce diagnostics delay | 2 min | 📋 Planned |
| [#60](https://github.com/puku-sh/puku-vs-editor/issues/60) | Streaming responses | 1-2 hours | 📋 Planned |

### 🟡 Medium Priority (Advanced Features)

| Issue | Feature | Effort | Status |
|-------|---------|--------|--------|
| [#61](https://github.com/puku-sh/puku-vs-editor/issues/61) | 3-provider racing (NES) | 16+ hours | 📋 Planned |
| [#62](https://github.com/puku-sh/puku-vs-editor/issues/62) | Server-side trimming | 30 min | 📋 Planned |
| [#63](https://github.com/puku-sh/puku-vs-editor/issues/63) | Indentation hints | 1 hour | 📋 Planned |
| [#64](https://github.com/puku-sh/puku-vs-editor/issues/64) | Multiple completions | 2-3 hours | 📋 Planned |

### 🟢 Low Priority (Analytics)

| Issue | Feature | Effort | Status |
|-------|---------|--------|--------|
| [#65](https://github.com/puku-sh/puku-vs-editor/issues/65) | Edit survival tracking | 4-6 hours | 📋 Planned |
| [#66](https://github.com/puku-sh/puku-vs-editor/issues/66) | Advanced telemetry | 3-4 hours | 📋 Planned |

## Contributing

For information on contributing to Puku Editor, see:
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Main contributing guide
- [Code Structure](../CONTRIBUTING.md#code-structure) - Project organization
- [Testing](../CONTRIBUTING.md#testing) - How to run tests
- [Inline Completions](../CONTRIBUTING.md#inline-completions-fim) - FIM development guide

## Resources

### Internal
- [GitHub Issues](https://github.com/puku-sh/puku-vs-editor/issues)
- [Pull Requests](https://github.com/puku-sh/puku-vs-editor/pulls)

### External
- [VS Code API Documentation](https://code.visualstudio.com/api)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Fill-in-the-Middle Paper](https://arxiv.org/abs/2207.14255)
