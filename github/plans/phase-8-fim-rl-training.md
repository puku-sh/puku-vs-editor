# Phase 8: FIM Reinforcement Learning (Cursor-style)

## Status: Future / Research

## Goal
Implement Cursor-style online reinforcement learning for FIM completions to improve suggestion quality and reduce noise.

## Background

Cursor uses online RL to:
1. Learn when to show suggestions (not just what to suggest)
2. Target specific accept rates (e.g., 25% threshold)
3. Continuously improve from user feedback

Reference: [Cursor Blog - Improving Cursor Tab with Online RL](https://cursor.com/blog/cursor-tab-rl)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FIM RL TRAINING LOOP                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. TELEMETRY COLLECTION                                         │
│     └── Log: prompt, suffix, completion, accepted/rejected       │
│                                                                  │
│  2. ON-POLICY DATA COLLECTION                                    │
│     └── Deploy model → Collect suggestions → Record outcomes     │
│                                                                  │
│  3. POLICY GRADIENT TRAINING                                     │
│     └── Reward: +0.75 accept, -0.25 reject, 0 no-show           │
│                                                                  │
│  4. MODEL DEPLOYMENT                                             │
│     └── Push new checkpoint → Repeat loop                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Phases

### Phase 8.1: Telemetry Collection (Cost: $0)
- [ ] Add telemetry events for FIM completions
- [ ] Track: prompt, suffix, completion, accepted/rejected/ignored
- [ ] Store in SQLite or send to backend
- [ ] Privacy: anonymize before upload

```typescript
interface FIMTelemetryEvent {
  timestamp: number;
  promptHash: string;      // SHA-256, not raw prompt
  suffixLength: number;
  completionLength: number;
  outcome: 'accepted' | 'rejected' | 'ignored';
  latencyMs: number;
  model: string;
}
```

### Phase 8.2: Contextual Filter (Cost: ~$0)
- [ ] Train logistic regression on collected data
- [ ] Features: language, prompt length, suffix presence, time of day
- [ ] Filter low-confidence suggestions before showing
- [ ] Target: Reduce shown suggestions by 20-30%

### Phase 8.3: Offline Fine-tuning (Cost: $200-500)
- [ ] Collect dataset of accepted completions
- [ ] Fine-tune Qwen2.5-Coder-7B on Modal
- [ ] Evaluate on held-out test set
- [ ] Deploy if improved

### Phase 8.4: Online RL (Cost: $3-5K/month)
- [ ] Implement policy gradient training loop
- [ ] Setup fast model deployment (Modal)
- [ ] Target 10-20 training iterations per day
- [ ] Monitor accept rate metrics

## Cost Analysis

### Hardware Options

| Option | Monthly Cost | Use Case |
|--------|--------------|----------|
| **Modal (cloud)** | $3-5K | Production RL loop |
| **DGX Spark** | $3K one-time + $50 electricity | Long-term, low volume |
| **RTX 4090** | $1.5K one-time + $30 electricity | Development |

### Phase Costs

| Phase | One-time | Monthly | Notes |
|-------|----------|---------|-------|
| 8.1 Telemetry | $0 | $0 | Just logging |
| 8.2 Contextual Filter | $0 | $0 | CPU training |
| 8.3 Offline Fine-tune | $200-500 | $0 | One-time per model |
| 8.4 Online RL | $0 | $3-5K | Continuous training |

## Model Options (Open License)

| Model | Params | License | FIM Support | VRAM |
|-------|--------|---------|-------------|------|
| **Qwen2.5-Coder-7B** | 7B | Apache 2.0 | ✅ Native | 14GB |
| **Qwen2.5-Coder-32B** | 32B | Apache 2.0 | ✅ Native | 64GB |
| **DeepSeek-Coder-V2** | 16B | MIT | ✅ Native | 32GB |
| **StarCoder2-7B** | 7B | BigCode | ✅ Native | 14GB |
| **StarCoder2-15B** | 15B | BigCode | ✅ Native | 30GB |

## Reward Function

```python
def compute_reward(outcome: str, completion_length: int) -> float:
    """
    Reward function for FIM suggestions.
    Target accept rate: 25%
    """
    if outcome == 'accepted':
        # Reward proportional to completion length
        base_reward = 0.75
        length_bonus = min(completion_length / 100, 0.25)
        return base_reward + length_bonus
    elif outcome == 'rejected':
        return -0.25
    else:  # ignored / not shown
        return 0.0
```

## Training Infrastructure (Modal)

```python
# modal_training.py
import modal

app = modal.App("puku-fim-training")

@app.cls(gpu="A100", timeout=3600)
class FIMTrainer:
    @modal.enter()
    def load_model(self):
        from transformers import AutoModelForCausalLM
        self.model = AutoModelForCausalLM.from_pretrained(
            "Qwen/Qwen2.5-Coder-7B",
            torch_dtype=torch.float16,
            device_map="auto"
        )

    @modal.method()
    def train_step(self, batch):
        # Policy gradient update
        pass

    @modal.method()
    def save_checkpoint(self, path: str):
        self.model.save_pretrained(path)
```

## Metrics to Track

| Metric | Target | Description |
|--------|--------|-------------|
| Accept Rate | 25-35% | % of shown suggestions accepted |
| Suggestion Rate | 40-60% | % of keystrokes with suggestion |
| Latency P50 | <100ms | Time to show suggestion |
| Latency P99 | <500ms | Tail latency |
| Characters Accepted/Hour | Maximize | Productivity metric |

## Timeline

| Phase | Duration | Prerequisites |
|-------|----------|---------------|
| 8.1 Telemetry | 1 week | None |
| 8.2 Contextual Filter | 2 weeks | 8.1 + 10K events |
| 8.3 Offline Fine-tune | 2 weeks | 8.1 + 100K events |
| 8.4 Online RL | Ongoing | 8.3 + 1M events |

## Dependencies
- Phase 7: Release Pipeline (for model deployment)
- Sufficient user base for data collection
- Modal or DGX Spark for training

## Estimated Total Effort
- **8.1**: 1 week, $0
- **8.2**: 2 weeks, $0
- **8.3**: 2 weeks, $500
- **8.4**: Ongoing, $3-5K/month

## References
- [Cursor: Improving Tab with Online RL](https://cursor.com/blog/cursor-tab-rl)
- [Policy Gradient Theorem](https://spinningup.openai.com/en/latest/spinningup/rl_intro3.html)
- [Modal GPU Pricing](https://modal.com/pricing)
