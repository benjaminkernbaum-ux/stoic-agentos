import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { supabase } from '../middleware/db.js';
import type { AuthenticatedRequest } from '../types.js';

const router = Router();
const API_VERSION = 'v1';

// GET /api/v1/integrations — list connected integration IDs
router.get(`/api/${API_VERSION}/integrations`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data, error } = await supabase!
      .from('organizations')
      .select('metadata')
      .eq('id', req.org.id)
      .single();
    if (error) throw error;
    const connected = data?.metadata?.connected_integrations || [];
    res.json({ connected });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/v1/integrations — connect an integration
router.post(`/api/${API_VERSION}/integrations`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { integration_id } = req.body;
    if (!integration_id) return res.status(400).json({ error: 'integration_id required' });
    
    // Get current metadata
    const { data: org } = await supabase!
      .from('organizations')
      .select('metadata')
      .eq('id', req.org.id)
      .single();
    
    const metadata = org?.metadata || {};
    const connected = new Set(metadata.connected_integrations || []);
    connected.add(integration_id);
    metadata.connected_integrations = [...connected];
    
    const { error } = await supabase!
      .from('organizations')
      .update({ metadata })
      .eq('id', req.org.id);
    if (error) throw error;
    
    res.json({ connected: metadata.connected_integrations });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// DELETE /api/v1/integrations/:id — disconnect an integration
router.delete(`/api/${API_VERSION}/integrations/:id`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: org } = await supabase!
      .from('organizations')
      .select('metadata')
      .eq('id', req.org.id)
      .single();
    
    const metadata = org?.metadata || {};
    const connected = new Set(metadata.connected_integrations || []);
    connected.delete(req.params.id);
    metadata.connected_integrations = [...connected];
    
    const { error } = await supabase!
      .from('organizations')
      .update({ metadata })
      .eq('id', req.org.id);
    if (error) throw error;
    
    res.json({ connected: metadata.connected_integrations });
  } catch (err: unknown) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
