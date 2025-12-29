# HVC Escalation Dashboard

## Executive Summary

A real-time recruiting operations dashboard that enforces the **24-hour rule** for high-value candidates—ensuring no top talent slips through the cracks.

---

## The Problem

1. **Speed kills deals.** Top candidates accept offers within 10 days. Every hour of delay reduces conversion.
2. **Hidden backlogs.** Teams claim 270 quality candidates while results show zero hires.
3. **No accountability.** When candidates stall, it's unclear if the bottleneck is sourcing, AI screening, or hiring managers.
4. **Black box AI.** AI rejects qualified candidates (e.g., Waterloo grads) with no visibility into accuracy.

---

## The Solution

A unified command center that surfaces **observable metrics** instead of storytelling.

### Three Views, One Truth

| View | Purpose | Key Question Answered |
|------|---------|----------------------|
| **HVC Dashboard** | Candidates overdue for follow-up | *Who needs action NOW?* |
| **Pending Review** | AI-reviewed, awaiting human | *Where's the bottleneck?* |
| **CEO Insights** | 30-day trend analytics | *Are we getting better or worse?* |

---

## Key Features

### 1. 24-Hour Rule Enforcement
- Real-time tracking of hours since last activity
- Color-coded urgency: Green (<24h) → Amber (24-48h) → Red (>48h)
- Automatic filtering of high-value candidates only

### 2. Pipeline Transparency
- Live sync with Notion candidate database
- Filters: Last 30 days, excludes rejected/completed
- Priority tiers: Hot 🔥, 1st Priority, High Stratification

### 3. CEO Analytics Dashboard
Five metrics that matter:

| Metric | What It Tracks |
|--------|---------------|
| **Response Velocity** | Hours to first contact (target: <24h) |
| **Throughput** | New HVCs vs Processed (detect backlog) |
| **AI Accuracy** | Human vs AI score delta (is AI learning?) |
| **Manager Bottlenecks** | Time stuck in HM review queue |
| **Conversion Quality** | % of HVCs reaching interview stage |

---

## Technical Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Charts:** Recharts (lightweight, responsive)
- **Backend:** Vercel Serverless Functions
- **Data Source:** Notion API (real-time sync)
- **Deployment:** Vercel (auto-deploy from GitHub)

---

## Business Impact

| Before | After |
|--------|-------|
| Weekly spreadsheet reviews | Real-time visibility |
| "We're working on it" | Observable metrics |
| Candidates lost to delays | 24h response guarantee |
| Blame games | Clear accountability |
| AI black box | Trend-tracked accuracy |

---

## Access

```
Production:  [Vercel URL]
Repository:  https://github.com/Brommah/hvc
```

Auto-refreshes every 5 minutes. No manual data entry required.

---

*Built to move from storytelling to observable results.*

