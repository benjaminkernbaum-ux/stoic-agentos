import { Router } from 'express';
import type { Response } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireMinRole } from '../middleware/rbac.js';
import { supabase } from '../middleware/db.js';
import { safeError } from '../lib/safeError.js';
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
    safeError(res, err);
  }
});

// POST /api/v1/integrations — connect an integration (generic on/off)
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
    safeError(res, err);
  }
});

// DELETE /api/v1/integrations/:id — disconnect an integration
router.delete(`/api/${API_VERSION}/integrations/:id`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
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
    safeError(res, err);
  }
});

// ── Vault-backed SMTP/Twilio Credentials Management ──

// GET /api/v1/integrations/credentials/:type — fetch credential metadata (safe status only)
router.get(`/api/${API_VERSION}/integrations/credentials/:type`, authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.params;
    if (type !== 'smtp' && type !== 'twilio') {
      return res.status(400).json({ error: 'Invalid integration type. Expected smtp or twilio.' });
    }

    const { data: org, error } = await supabase!
      .from('organizations')
      .select('smtp_key_vault_id, twilio_key_vault_id')
      .eq('id', req.org.id)
      .single();

    if (error) throw error;

    const hasCredentials = type === 'smtp' 
      ? Boolean(org?.smtp_key_vault_id) 
      : Boolean(org?.twilio_key_vault_id);

    // If connected, extract safe non-sensitive details to show in UI
    let details: Record<string, unknown> = {};
    if (hasCredentials) {
      const rpcName = type === 'smtp' ? 'get_org_smtp_credentials' : 'get_org_twilio_credentials';
      const { data: rawSecret } = await supabase!.rpc(rpcName, { p_org_id: req.org.id });
      if (rawSecret) {
        try {
          const parsed = JSON.parse(rawSecret);
          if (type === 'smtp') {
            details = {
              host: parsed.host,
              port: parsed.port,
              user: parsed.user ? `${parsed.user.slice(0, 3)}...` : null,
              fromEmail: parsed.fromEmail,
            };
          } else {
            details = {
              accountSid: parsed.accountSid ? `${parsed.accountSid.slice(0, 6)}...` : null,
              fromNumber: parsed.fromNumber,
            };
          }
        } catch {
          // If not JSON, it is a legacy format secret, ignore extraction
        }
      }
    }

    res.json({
      configured: hasCredentials,
      details,
    });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// POST /api/v1/integrations/credentials — save SMTP/Twilio credentials encrypted in vault
router.post(`/api/${API_VERSION}/integrations/credentials`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, credentials } = req.body;
    if (type !== 'smtp' && type !== 'twilio') {
      return res.status(400).json({ error: 'Invalid integration type. Expected smtp or twilio.' });
    }
    if (!credentials || typeof credentials !== 'object') {
      return res.status(400).json({ error: 'Credentials object is required' });
    }

    // Call corresponding secure RPC to insert/update vault
    const rpcName = type === 'smtp' ? 'set_org_smtp_credentials' : 'set_org_twilio_credentials';
    const credentialsStr = JSON.stringify(credentials);
    const { error: vaultError } = await supabase!.rpc(rpcName, {
      p_org_id: req.org.id,
      p_credentials: credentialsStr,
    });
    if (vaultError) throw vaultError;

    // Get current connected integrations metadata list and add this one
    const { data: org } = await supabase!
      .from('organizations')
      .select('metadata')
      .eq('id', req.org.id)
      .single();

    const metadata = org?.metadata || {};
    const connected = new Set(metadata.connected_integrations || []);
    connected.add(type);
    metadata.connected_integrations = [...connected];

    const { error: orgError } = await supabase!
      .from('organizations')
      .update({ metadata })
      .eq('id', req.org.id);
    if (orgError) throw orgError;

    res.json({ success: true, type, connected: metadata.connected_integrations });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

// DELETE /api/v1/integrations/credentials/:type — revoke/delete credentials from vault
router.delete(`/api/${API_VERSION}/integrations/credentials/:type`, authenticate, requireMinRole('admin'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type } = req.params;
    if (type !== 'smtp' && type !== 'twilio') {
      return res.status(400).json({ error: 'Invalid integration type. Expected smtp or twilio.' });
    }

    // Call secure deletion RPC database function
    const rpcName = type === 'smtp' ? 'delete_org_smtp_credentials' : 'delete_org_twilio_credentials';
    const { error: vaultError } = await supabase!.rpc(rpcName, { p_org_id: req.org.id });
    if (vaultError) throw vaultError;

    // Remove from connected_integrations metadata array
    const { data: org } = await supabase!
      .from('organizations')
      .select('metadata')
      .eq('id', req.org.id)
      .single();

    const metadata = org?.metadata || {};
    const connected = new Set(metadata.connected_integrations || []);
    connected.delete(type);
    metadata.connected_integrations = [...connected];

    const { error: orgError } = await supabase!
      .from('organizations')
      .update({ metadata })
      .eq('id', req.org.id);
    if (orgError) throw orgError;

    res.json({ success: true, type, connected: metadata.connected_integrations });
  } catch (err: unknown) {
    safeError(res, err);
  }
});

export default router;
