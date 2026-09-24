import { Router, Request, Response } from 'express';
import {
  scanWebsiteLive,
  getWebsiteMonitorHistory,
  getMonitoredWebsitesSummary,
  clearWebsiteMonitorHistory,
} from '../services/websiteMonitor.js';

export const monitorRouter = Router();

/**
 * POST /api/monitor/scan
 * Performs an immediate live audit scan of any given website URL
 * Body: { "url": "https://example.com" }
 */
monitorRouter.post('/monitor/scan', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      res.status(400).json({ success: false, error: 'Target "url" string is required in request body.' });
      return;
    }

    const snapshot = await scanWebsiteLive(url);
    res.status(200).json({
      success: true,
      message: 'Website live scan completed successfully.',
      data: snapshot,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to scan website: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * GET /api/monitor/history
 * Retrieves chronological scan snapshots for a target website URL
 * Query: ?url=https://example.com
 */
monitorRouter.get('/monitor/history', (req: Request, res: Response): void => {
  try {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      res.status(400).json({ success: false, error: 'Query parameter "url" is required.' });
      return;
    }

    const history = getWebsiteMonitorHistory(rawUrl);
    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitor history: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * GET /api/monitor/summary
 * Retrieves overall monitoring telemetry and active website summaries
 */
monitorRouter.get('/monitor/summary', (_req: Request, res: Response): void => {
  try {
    const summaries = getMonitoredWebsitesSummary();
    res.status(200).json({
      success: true,
      count: summaries.length,
      data: summaries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve monitoring summary: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * DELETE /api/monitor/history
 * Clears monitoring history for a specific URL or all URLs
 */
monitorRouter.delete('/monitor/history', (req: Request, res: Response): void => {
  try {
    const rawUrl = req.query.url as string | undefined;
    clearWebsiteMonitorHistory(rawUrl);
    res.status(200).json({
      success: true,
      message: rawUrl ? `History cleared for ${rawUrl}` : 'All monitoring history cleared.',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to clear monitor history: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});
