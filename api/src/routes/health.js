import { Router } from 'express';

const router = Router();
const API_VERSION = 'v1';

router.get('/health', (req, res) => res.json({ status: 'ok', version: API_VERSION, uptime: process.uptime(), db: !!req.app.locals.supabase }));
router.get(`/api/${API_VERSION}/health`, (req, res) => res.json({ status: 'ok', version: API_VERSION }));

export default router;
