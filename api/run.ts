/**
 * Vercel serverless endpoint: run one agent iteration.
 * Call via GET/POST. Secure with CRON_SECRET when using Vercel Cron.
 */
import path from 'path';

export const config = {
  maxDuration: 60, // Pro plan: 60s. Hobby: 10s. Increase if you hit timeouts.
};

export default async function handler(
  req: { method?: string; headers?: { authorization?: string } },
  res: { status: (code: number) => { json: (body: object) => void; end: () => void }; setHeader: (name: string, value: string) => void }
): Promise<void> {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).end();
    return;
  }

  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers?.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ ok: false, error: 'Unauthorized' });
    return;
  }

  try {
    // Load built agent (run "npm run build" before deploy)
    const distPath = path.join(process.cwd(), 'dist', 'index.js');
    const { runAgentOnce } = require(distPath);
    const result = await runAgentOnce();
    res.status(200).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ ok: false, message });
  }
}
