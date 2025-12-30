import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getHighValueCandidates, getPendingHumanReview, getCEOMetrics, getAwaitingReview } from './notion.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

/**
 * GET /api/candidates
 * Returns high-value candidates that haven't been followed up on in 24+ hours
 */
app.get('/api/candidates', async (_req, res) => {
  try {
    const candidates = await getHighValueCandidates();
    res.json({ success: true, data: candidates, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/pending-review
 * Returns candidates that have been AI reviewed but awaiting human review
 */
app.get('/api/pending-review', async (_req, res) => {
  try {
    const candidates = await getPendingHumanReview();
    res.json({ success: true, data: candidates, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/ceo-metrics
 * Returns CEO dashboard metrics for last 30 days
 */
app.get('/api/ceo-metrics', async (_req, res) => {
  try {
    const metrics = await getCEOMetrics();
    res.json({ success: true, data: metrics, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching CEO metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

/**
 * GET /api/awaiting-review
 * Returns candidates awaiting Lynn's review
 */
app.get('/api/awaiting-review', async (_req, res) => {
  try {
    const candidates = await getAwaitingReview();
    res.json({ success: true, data: candidates, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error fetching awaiting review:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

