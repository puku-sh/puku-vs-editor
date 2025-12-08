# PRD: Enable Forward Stability for Inline Completions

**Issue**: [#55](https://github.com/puku-sh/puku-vs-editor/issues/55)
**Status**: Draft
**Author**: Puku AI Team
**Created**: 2025-12-08
**Priority**: 🔴 Critical

---

## Executive Summary

Enable VS Code's `enableForwardStability` flag on inline completion results to prevent ghost text from jumping position during user edits. This is a one-line code change with immediate UX impact, aligning Puku with GitHub Copilot's behavior.

**Impact**: Eliminates visual instability in ghost text during typing
**Effort**: 5 minutes
**Risk**: Minimal (uses stable VS Code API)

---

## Background

### Current Behavior

Puku's inline completion provider returns completion results without the `enableForwardStability` flag. This causes ghost text to shift position unexpectedly when users type, edit, or move their cursor, creating a jarring and unprofessional UX.

### Industry Standard

GitHub Copilot sets `enableForwardStability: true` on all inline completion results ([reference](https://github.com/microsoft/vscode-copilot-release/blob/main/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts#L459)):

```typescript
const result: vscode.InlineCompletionList = {
    items: [...],
    enableForwardStability: true  // Prevents ghost text jumping
};
```

### VS Code API

From VS Code API documentation:

> **`enableForwardStability`** (optional): When set to `true`, the inline completion item will not move when the user types at the end of the completion. This is useful for completions that are intended to be accepted character-by-character.

---

## Problem Statement

**User Pain Point**: Ghost text completions visibly shift or jump during typing, creating visual noise and reducing trust in the AI system.

**Business Impact**:
- Degraded user experience vs Copilot
- Perceived as buggy or unpolished
- May cause users to disable inline completions

**Competitive Gap**: Copilot has stable ghost text; Puku does not.

---

## Goals & Objectives

### Primary Goal
Eliminate ghost text position instability during user typing and edits.

### Success Criteria
1. Ghost text remains anchored at original position during forward typing
2. No visual jumping or shifting when user types characters
3. Behavior matches GitHub Copilot's stability

### Non-Goals
- Performance optimization (already instant)
- Changing completion algorithm
- Adding new features

---

## User Stories

### Story 1: Forward Typing
**As a** developer typing code
**I want** ghost text to stay in place as I type
**So that** I can clearly see what the AI is suggesting without distraction

**Acceptance Criteria**:
- Ghost text anchor remains stable
- Completion text updates to show remaining suggestion
- No visual flicker or position jump

### Story 2: Multi-line Completions
**As a** developer accepting multi-line suggestions
**I want** the entire completion to remain visually stable
**So that** I can read ahead without the text moving

**Acceptance Criteria**:
- Multi-line ghost text doesn't shift vertically
- Line numbers remain aligned
- Indentation stays consistent

### Story 3: Cursor Movement
**As a** developer moving my cursor around
**I want** ghost text to disappear cleanly without artifacts
**So that** the editor feels responsive and clean

**Acceptance Criteria**:
- Ghost text clears immediately on cursor move
- No lingering visual artifacts
- New completions appear at new position

---

## Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Set `enableForwardStability: true` on all inline completion results | P0 |
| FR-2 | Apply to both FIM and diagnostics provider results | P0 |
| FR-3 | Maintain backward compatibility with existing completion flow | P0 |

### Non-Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-1 | Zero performance impact (flag is processed by VS Code) | P0 |
| NFR-2 | No breaking changes to existing API contracts | P0 |
| NFR-3 | Compatible with VS Code 1.85+ | P0 |

---

## Technical Design

### Architecture

No architecture changes required. This is a data transformation at the completion result boundary.

### Implementation

**File to modify**: `src/chat/src/extension/pukuai/vscode-node/pukuInlineEditModel.ts`

**Current code** (lines 166-171):
```typescript
if (fimResult) {
    return {
        type: 'fim',
        completion: fimResult.completion,
        requestId: fimResult.requestId
    };
}
```

**Proposed code**:
```typescript
if (fimResult) {
    return {
        type: 'fim',
        completion: fimResult.completion,
        requestId: fimResult.requestId,
        enableForwardStability: true  // ← Add this line
    };
}
```

**Also update diagnostics result** (lines 174-176):
```typescript
if (diagnosticsResult) {
    return diagnosticsResult;  // Ensure diagnosticsResult also has flag
}
```

### Data Flow

```
User types → VS Code InlineCompletionProvider triggers
          → Puku racing model returns result with enableForwardStability=true
          → VS Code renders stable ghost text
          → User continues typing
          → Ghost text updates in place (no position jump)
```

### Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| User types forward through completion | Ghost text shrinks but stays anchored |
| User backspaces | Ghost text grows but stays anchored |
| User accepts completion (TAB) | Ghost text commits, then clears |
| User rejects completion (ESC) | Ghost text clears immediately |
| Completion at end of line | Stays at line end |
| Multi-line completion | All lines remain stable |

---

## Dependencies

### Internal Dependencies
- None (self-contained change)

### External Dependencies
- VS Code API 1.85+ (already required)
- `vscode.InlineCompletionItem` type definition

### Blocked By
- None

---

## Testing Strategy

### Manual Testing

**Test Case 1: Forward Typing**
1. Open a TypeScript file
2. Start typing `function foo(`
3. Wait for inline completion to appear
4. Continue typing `x: num`
5. **Verify**: Ghost text stays anchored, doesn't jump

**Test Case 2: Multi-line Completion**
1. Write a comment: `// function to calculate fibonacci`
2. Press Enter
3. Wait for multi-line completion
4. Type first character `f`
5. **Verify**: All completion lines stay stable

**Test Case 3: Backspace**
1. Trigger a completion
2. Backspace several characters
3. **Verify**: Completion grows but doesn't shift position

### Automated Testing

**Unit Test** (add to `pukuInlineEditModel.test.ts`):
```typescript
test('completion results include enableForwardStability flag', async () => {
    const result = await model.getCompletion(document, position, context, token);

    expect(result).toBeDefined();
    expect(result.enableForwardStability).toBe(true);
});
```

### Regression Testing
- Run existing inline completion test suite
- Verify no breaking changes in completion flow
- Test with both FIM and diagnostics providers

---

## Success Metrics

### Quantitative Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Visual jump complaints | N reports/week | 0 | GitHub issues |
| Completion acceptance rate | X% | ≥X% | Telemetry |
| Completion rejection rate | Y% | ≤Y% | Telemetry |

### Qualitative Metrics

- User feedback: "Ghost text feels more stable"
- Internal testing: "Matches Copilot behavior"
- Code review: "Simple, low-risk change"

### Key Results (1 week post-launch)

- [ ] Zero bug reports related to ghost text jumping
- [ ] No regression in completion acceptance rates
- [ ] Positive feedback from beta testers

---

## Rollout Plan

### Phase 1: Development (Day 1)
- [ ] Make code change
- [ ] Add unit test
- [ ] Manual testing (5 scenarios)
- [ ] Code review

### Phase 2: Testing (Day 2)
- [ ] Deploy to dev environment
- [ ] Internal dogfooding (team uses it)
- [ ] Collect feedback

### Phase 3: Release (Day 3)
- [ ] Merge to main
- [ ] Include in next release
- [ ] Update release notes

### Rollback Plan

If issues detected:
1. Revert the one-line change
2. Deploy hotfix
3. Investigate root cause
4. Re-test before retry

**Rollback complexity**: Trivial (1 line revert)

---

## Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API incompatibility with old VS Code | High | Very Low | Already using stable API |
| Unexpected behavior with multi-line | Medium | Low | Extensive manual testing |
| Performance regression | Low | Very Low | Flag processed by VS Code, no perf impact |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User confusion if behavior changes | Low | Low | Change is improvement, not regression |
| Delay in other features | Low | Very Low | 5-minute fix, no blocking |

---

## Open Questions

- [ ] Should we add telemetry to track ghost text interactions?
- [ ] Should we document this in user-facing docs?
- [ ] Are there VS Code versions that don't support this flag?

---

## Alternatives Considered

### Alternative 1: Client-Side Position Locking
**Description**: Manually track and lock ghost text position in our code
**Pros**: Full control over behavior
**Cons**: Reinventing the wheel, VS Code already handles this
**Decision**: ❌ Rejected (use VS Code API instead)

### Alternative 2: Do Nothing
**Description**: Accept current jumping behavior
**Pros**: Zero effort
**Cons**: Poor UX, competitive disadvantage
**Decision**: ❌ Rejected (unacceptable UX)

### Alternative 3: Use VS Code API Flag (Selected)
**Description**: Set `enableForwardStability: true`
**Pros**: Simple, standard, matches Copilot
**Cons**: None
**Decision**: ✅ **Selected**

---

## References

### Code References
- **Puku**: `src/chat/src/extension/pukuai/vscode-node/pukuInlineEditModel.ts:166`
- **Copilot**: `vscode-copilot-chat/src/extension/inlineEdits/vscode-node/inlineCompletionProvider.ts:459`

### Documentation
- [VS Code Inline Completion API](https://code.visualstudio.com/api/references/vscode-api#InlineCompletionList)
- [Issue #55](https://github.com/puku-sh/puku-vs-editor/issues/55)

### Related Issues
- #56: Rejection tracking
- #57: Typing as suggested optimization
- #59: Reduce diagnostics delay

---

## Appendix

### Glossary

- **Ghost Text**: Inline completion suggestion shown in grey text
- **Forward Stability**: VS Code API flag preventing position jump during typing
- **FIM**: Fill-In-Middle completion provider
- **Racing Model**: Architecture that runs multiple providers in parallel

### Change Log

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-12-08 | 1.0 | Initial PRD | Puku AI Team |
