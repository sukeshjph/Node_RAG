# Retrieval Evaluation Harness

Minimal evaluation framework for measuring retrieval quality.

## Quick Start

```bash
# Run evaluation with default k=5
npm run eval

# Run with custom k
npm run eval -- --k=10
```

## Metrics

| Metric | Description | Range |
|--------|-------------|-------|
| **Recall@k** | Fraction of relevant docs retrieved in top-k | 0.0 - 1.0 |
| **nDCG@k** | Ranking quality with position discounting | 0.0 - 1.0 |
| **Precision@k** | Fraction of top-k that are relevant | 0.0 - 1.0 |
| **MRR** | Mean Reciprocal Rank of first relevant doc | 0.0 - 1.0 |

## Example Output

```
🧪 Starting Retrieval Evaluation
================================================================================

📊 Test Set: 5 queries
🎯 Evaluating at k=5

[1/5] "What is the risk policy?..."
  ✓ Recall@5: 50.0%
  ✓ nDCG@5: 63.1%
  ✓ Precision@5: 20.0%
  ✓ MRR: 100.0%
  ⏱️  234ms

[2/5] "How to reset password?..."
  ✓ Recall@5: 100.0%
  ✓ nDCG@5: 100.0%
  ✓ Precision@5: 20.0%
  ✓ MRR: 100.0%
  ⏱️  198ms

...

================================================================================
📈 EVALUATION SUMMARY
================================================================================

Total Queries:       5
Avg Recall@5:       68.00%
Avg nDCG@5:         74.50%
Avg Precision@5:    22.00%
Avg MRR:            90.00%
Avg Latency:        215ms
```

## Customizing Test Data

Edit `eval/testData.ts` to add your test cases:

```typescript
export const testSet: TestCase[] = [
    {
        query: "Your question here",
        relevant: ["doc123", "doc456"],  // Ground truth doc IDs
        description: "Optional description"
    },
    // Add more test cases...
];
```

**Important**: Replace document IDs with actual IDs from your Azure Search index.

## File Structure

```
eval/
├── index.ts           # CLI entry point
├── evalRunner.ts      # Main evaluation logic
├── evalMetrics.ts     # Metric implementations
├── testData.ts        # Test cases (customize this!)
└── README.md          # This file
```

## Adding Test Cases

1. Find ground truth document IDs from your index
2. Create test queries that should retrieve those documents
3. Add to `testData.ts`:

```typescript
{
    query: "What are trading hours?",
    relevant: ["doc-trading-hours-001", "doc-market-schedule-042"],
    description: "Trading operations question"
}
```

## Interpreting Results

### Good Performance
- **Recall@5 > 80%**: Most relevant docs are retrieved
- **nDCG@5 > 70%**: Relevant docs ranked highly
- **MRR > 0.8**: First relevant doc appears in top positions

### Needs Improvement
- **Recall@5 < 50%**: Missing too many relevant docs
- **nDCG@5 < 50%**: Poor ranking quality
- **MRR < 0.5**: Relevant docs buried in results

## Next Steps

1. **Add Real Test Cases**: Replace hardcoded examples with actual queries
2. **Collect Ground Truth**: Identify relevant documents for each query
3. **Run Baseline**: Establish current performance
4. **Iterate**: Tune retrieval (embeddings, reranking, k values)
5. **Track Progress**: Re-run eval after changes

## Advanced Usage

### Export Results to JSON

```bash
npm run eval > results.log
```

### Compare Configurations

```bash
# Test different k values
npm run eval -- --k=5  > results_k5.log
npm run eval -- --k=10 > results_k10.log
```

### Integration with CI/CD

Add to your test pipeline:

```yaml
- name: Run Retrieval Eval
  run: npm run eval
```

## Limitations

- **Hardcoded test data**: Not suitable for large test sets
- **Sequential execution**: No parallel processing
- **No stratification**: Doesn't group by query type
- **Basic metrics only**: No advanced IR metrics

For production evaluation, consider:
- Loading test sets from files (JSON/CSV)
- Batch processing for speed
- Statistical significance testing
- Category-specific metrics
- A/B testing framework

