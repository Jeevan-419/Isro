import { Router, Request, Response } from 'express';
import { fetchAndParseWebsite, parseHtmlToCandidates } from '../services/universalScraper.js';
import { runAdaptiveInference } from '../services/adaptiveInference.js';
import { parseTaskToRequirements } from '../services/taskParser.js';
import { proposeBrowserAction } from '../services/actionPlanner.js';
import { validateActionWithGuard } from '../services/localActionGuard.js';

export const proxyRouter = Router();

/**
 * GET /api/proxy/page
 * Proxies any website HTML with stripped frame headers and <base> tag injection
 */
proxyRouter.get('/proxy/page', async (req: Request, res: Response): Promise<void> => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      res.status(400).send('Missing "url" query parameter.');
      return;
    }

    let targetUrl = rawUrl.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    let html = await response.text();

    // Inject base href so relative assets, css, and images load correctly
    const baseTag = `<base href="${targetUrl}">`;
    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}`);
    } else {
      html = `${baseTag}${html}`;
    }

    // Set permissive iframe and CORS headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');

    res.send(html);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    res.status(502).send(`<html><body style="font-family:sans-serif;padding:2rem;text-align:center;">
      <h3 style="color:#e11d48;">Unable to proxy website</h3>
      <p style="color:#64748b;">${msg}</p>
    </body></html>`);
  }
});

/**
 * POST /api/proxy/extract
 * Extracts all interactive elements and executes Attention Firewall on ANY website or HTML
 */
proxyRouter.post('/proxy/extract', async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, html, task } = req.body;

    let parsedResult;
    if (url) {
      parsedResult = await fetchAndParseWebsite(url);
    } else if (html) {
      parsedResult = parseHtmlToCandidates(html);
    } else {
      res.status(400).json({ success: false, error: 'Either "url" or "html" must be provided in request body.' });
      return;
    }

    const taskQuery = (task && typeof task === 'string' && task.trim()) || 'Inspect and interact with page elements';
    const requirements = parseTaskToRequirements({ task: taskQuery });

    // Run Attention Firewall & Adaptive Inference on the real website's candidate elements
    const adaptiveResult = runAdaptiveInference(taskQuery, requirements, parsedResult.elements);

    // Formulate proposed action for the given task on this website
    const proposedAction = proposeBrowserAction(
      taskQuery,
      requirements,
      adaptiveResult.sanitizedPerceptionPayload
    );

    // Validate with Local Action Guard
    const guardEvaluation = validateActionWithGuard(
      proposedAction,
      requirements,
      adaptiveResult.sanitizedPerceptionPayload
    );

    res.status(200).json({
      success: true,
      url: parsedResult.url,
      title: parsedResult.title,
      totalElementsExtracted: parsedResult.elements.length,
      requirements,
      adaptiveResult,
      proposedAction,
      guardEvaluation,
      elements: adaptiveResult.sanitizedPerceptionPayload,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to extract website: ' + (error instanceof Error ? error.message : String(error)),
    });
  }
});

/**
 * GET /api/proxy/presets
 * Returns curated real-world website presets for immediate 1-click testing
 */
proxyRouter.get('/proxy/presets', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    presets: [
      {
        name: 'Wikipedia Main Page',
        url: 'https://en.wikipedia.org/wiki/Main_Page',
        suggestedTask: 'Search for quantum computing in searchbox',
      },
      {
        name: 'Hacker News',
        url: 'https://news.ycombinator.com',
        suggestedTask: 'Click the login link in navigation bar',
      },
      {
        name: 'Example Domain (RFC-2606)',
        url: 'https://example.com',
        suggestedTask: 'Click More information link',
      },
      {
        name: 'ISRO SpaceOps Secure Portal (Default Simulation)',
        url: 'https://portal.space-ops.gov.in/personnel/secure-registration',
        suggestedTask: 'Download electricity bill',
      },
    ],
  });
});
