import { useState, useEffect, useCallback } from 'react';
import { supabase, API_BASE } from '../../../lib/supabase';

export function useDashboardData(org) {
  const [agents, setAgents] = useState([]);
  const [observations, setObservations] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [stats, setStats] = useState({ agents: 0, workspaces: 0, observations: 0, knowledgeItems: 0 });
  const [usage, setUsage] = useState({ count: 0, limit: 10000 });
  const [dataLoading, setDataLoading] = useState(true);
  const [apiKeys, setApiKeys] = useState([]);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [traces, setTraces] = useState([]);
  const [traceStats, setTraceStats] = useState(null);

  const fetchData = useCallback(async () => {
    if (!org?.id) return;
    setDataLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
      const [agentsRes, obsRes, wsRes, statsRes, tracesRes, traceStatsRes] = await Promise.allSettled([
        fetch(`${API_BASE}/api/v1/agents?org_id=${org.id}`, { headers }),
        fetch(`${API_BASE}/api/v1/observations?org_id=${org.id}&limit=50`, { headers }),
        fetch(`${API_BASE}/api/v1/workspaces?org_id=${org.id}`, { headers }),
        fetch(`${API_BASE}/api/v1/stats?org_id=${org.id}`, { headers }),
        fetch(`${API_BASE}/api/v1/traces?org_id=${org.id}&limit=50`, { headers }),
        fetch(`${API_BASE}/api/v1/traces/stats?org_id=${org.id}`, { headers }),
      ]);
      if (agentsRes.status === 'fulfilled' && agentsRes.value.ok) setAgents(await agentsRes.value.json());
      if (obsRes.status === 'fulfilled' && obsRes.value.ok) setObservations(await obsRes.value.json());
      if (wsRes.status === 'fulfilled' && wsRes.value.ok) setWorkspaces(await wsRes.value.json());
      if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
        const s = await statsRes.value.json();
        setStats(s);
        setUsage({ count: s.observations || 0, limit: s.observationLimit || 10000 });
      }
      if (tracesRes.status === 'fulfilled' && tracesRes.value.ok) setTraces(await tracesRes.value.json());
      if (traceStatsRes.status === 'fulfilled' && traceStatsRes.value.ok) setTraceStats(await traceStatsRes.value.json());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    }
    setDataLoading(false);
  }, [org?.id]);

  // Fetch API keys
  useEffect(() => {
    if (!org?.id) return;
    (async () => {
      try {
        const token = (await supabase.auth.getSession()).data.session?.access_token;
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/v1/api-keys?org_id=${org.id}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (res.ok) setApiKeys(await res.json());
      } catch (err) {
        console.error('Failed to load API keys:', err);
      }
    })();
  }, [org?.id]);

  // Fetch main data
  useEffect(() => {
    if (org?.id) fetchData();
  }, [org?.id, fetchData]);

  // Fetch knowledge items
  const fetchKnowledge = useCallback(async () => {
    if (!org?.id) return;
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(`${API_BASE}/api/v1/knowledge-items?org_id=${org.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setKnowledgeItems(await res.json());
    } catch {}
  }, [org?.id]);

  useEffect(() => { if (org?.id) fetchKnowledge(); }, [org?.id, fetchKnowledge]);

  return {
    agents, setAgents,
    observations, setObservations,
    workspaces, setWorkspaces,
    stats, setStats,
    usage, setUsage,
    dataLoading,
    apiKeys, setApiKeys,
    knowledgeItems, setKnowledgeItems,
    traces, setTraces,
    traceStats, setTraceStats,
    fetchData,
    fetchKnowledge,
  };
}
