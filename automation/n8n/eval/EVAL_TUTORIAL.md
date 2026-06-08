# n8n Eval Tutorial — echo workflow (no AI agent)

Learn how **Evaluations** work without Telegram, Merge, or an AI agent.

## Files

| File | Purpose |
|------|---------|
| `eval-echo-tutorial.json` | Import into n8n |
| `eval-echo-dataset.csv` | 3-row test dataset |

## What the workflow does

```text
Manual Trigger → Set Sample Row ──┐
Eval Trigger (data table row) ────┼→ Build Fake Reply → Check if Evaluating
                                       ├─ eval → Set Metrics → Set Outputs
                                       └─ manual → Manual Test Done
```

Each **Run Test** executes **one row at a time** (3 runs for 3 rows). Similarity should be **1.0** (exact match).

**Why Manual Trigger?** n8n Cloud **Publish** requires a normal trigger (Manual / Schedule / Webhook). **Eval Trigger alone cannot Publish** — you will see *“Workflow cannot be activated because it has no trigger node”*.

---

## Setup (~10 min)

### 1. Import workflow

1. n8n → **Workflows** → **Import from file**
2. Select `automation/n8n/eval/eval-echo-tutorial.json`
3. Open the workflow **Eval tutorial — echo (no AI agent)**

### 2. Create data table

1. n8n → **Data tables** → **Create data table** → name `eval_echo`
2. **Import** `eval-echo-dataset.csv` (columns: `message`, `expected_output`, …)
3. Confirm **3 data rows** (plus header)

### 3. Link data table in workflow

Open these two nodes and select **`eval_echo`**:

| Node | Field |
|------|--------|
| **Eval Trigger** | Data table |
| **Set Outputs** | Data table (Source = Data table) |

**Save** → **Publish** (should succeed now — **Manual Trigger** is present).

If you already imported the old JSON, either **re-import** the updated file or add manually:
1. **Manual Trigger** → **Set** (message = `hello world`, expected_output = `Echo: hello world`) → **Build Fake Reply**
2. After **Build Fake Reply**: **Evaluation → Check if evaluating** → eval branch → **Set Metrics** → **Set Outputs**; normal branch → **No Operation**

### 4. Create evaluation in UI

1. Workflow → **Evaluations** tab → **Set up evaluation** (or **Create evaluation**)
2. Dataset: same **`eval_echo`** data table
3. **Save** evaluation config

### 5. Run

1. **Evaluations** → **Run Test** (runs all rows in sequence)
2. Open **Executions** tab — you should see 3 successful runs
3. Open **Data tables** → `eval_echo` — columns `actual_output`, `similarity_score`, `pass_fail` filled

**Note:** The **Editor canvas does not animate** during Run Test. Use **Executions** and the data table.

---

## Expected results

| message | expected_output | actual_output | similarity_score | pass_fail |
|---------|-----------------|---------------|------------------|-----------|
| hello world | Echo: hello world | Echo: hello world | 1 | Pass |
| foo bar | Echo: foo bar | Echo: foo bar | 1 | Pass |
| test 123 | Echo: test 123 | Echo: test 123 | 1 | Pass |

---

## Apply to your Telegram workflow

Once this works, the same pattern applies to **Add ledger, Plaid Q&A**:

| Tutorial | Your workflow |
|----------|----------------|
| Eval Trigger | When fetching a dataset row |
| Build Fake Reply | Edit Fields + AI Agent |
| Set Metrics | String similarity on agent `output` |
| Set Outputs | Write back to Google Sheet |

Keep **no Merge** on the eval path and end on **Set Metrics** / **Set Outputs** (skip Telegram).

See also: [N8N_EVAL_SETUP.md](../../docs/N8N_EVAL_SETUP.md)

---

## n8n Cloud plan limits (why Run Test may do nothing)

From [n8n metric-based evaluations docs](https://docs.n8n.io/advanced-ai/evaluations/metric-based-evaluations/):

| Plan | Evaluations tab / Set Metrics |
|------|-------------------------------|
| **14-day trial** | Pro features (should work) |
| **Starter / free tier after trial** | **One workflow only** with metric-based eval |
| **Pro / Enterprise** | Unlimited workflows |

If you already set up eval on **Add ledger, Plaid Q&A**, the echo tutorial may **not** get a second eval — Run Test can look broken.

**Trial expired:** executions and some AI features stop; upgrade or use fallback below.

### Fallback — no Evaluations tab required

Import **`eval-manual-batch.json`** instead:

```text
Manual Trigger → Get All Rows (data table) → Build Reply (Pass/Fail expression)
```

1. Import `eval-manual-batch.json`
2. **Get All Rows** → table `eval_echo`
3. **Publish** → **Execute workflow**
4. Open **Build Reply** output — 3 items with `output` and `pass_fail`

Same idea for your Telegram bot: **Google Sheets Read** → **Loop Over Items** → agent → **Set** pass/fail — no official Evaluations UI.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| **Cannot Publish** — no trigger node | Add **Manual Trigger** (included in updated JSON); Eval Trigger does not count for Publish on n8n Cloud |
| Run Test, nothing in Executions | **Publish**; pick data table on **Eval Trigger**; **Evaluations** tab → **Set up evaluation** |
| No row found | Data table empty or wrong table selected |
| Set Metrics error | Check expressions reference **Eval Trigger** and **Build Fake Reply** node names |
| Only 1 row runs | Wait for run to finish; or cancel stuck run; check Executions for hang |
| similarity_score empty in Set Outputs | Try `{{ $json.stringSimilarity }}` instead of `{{ $json.score }}` |
