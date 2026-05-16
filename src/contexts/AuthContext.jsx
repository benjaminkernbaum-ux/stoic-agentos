/**
 * Stoic AgentOS — Auth Context
 * Manages Supabase auth state, org membership, and plan info
 */
import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadOrg(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await loadOrg(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setOrg(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadOrg(userId) {
    try {
      const { data: membership } = await supabase
        .from('org_members')
        .select('org_id, role, organizations(*)')
        .eq('user_id', userId)
        .single();

      if (membership?.organizations) {
        setOrg({
          id: membership.organizations.id,
          name: membership.organizations.name,
          slug: membership.organizations.slug,
          plan: membership.organizations.plan,
          role: membership.role,
        });
        setLoading(false);
      } else {
        // No org yet — unblock the UI immediately, create org in background
        setLoading(false);
        createDefaultOrg(userId);
      }
    } catch {
      setLoading(false);
      createDefaultOrg(userId);
    }
  }

  async function createDefaultOrg(userId) {
    try {
      const userMeta = (await supabase.auth.getUser()).data.user;
      const name = userMeta?.user_metadata?.full_name || userMeta?.email?.split('@')[0] || 'My Organization';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Date.now().toString(36);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://stoic-agentos-api-production.up.railway.app'}/api/v1/auth/setup-org`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({ name, slug, userId }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const orgData = await res.json();
        setOrg({
          id: orgData.id,
          name: orgData.name,
          slug: orgData.slug,
          plan: orgData.plan || 'free',
          role: 'owner',
        });
      }
    } catch (err) {
      console.error('Failed to create org:', err);
    }
  }

  async function signUp(email, password, fullName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });
    return { data, error };
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  }

  async function signInWithOAuth(provider) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    });
    return { data, error };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setOrg(null);
  }

  const value = {
    user,
    org,
    loading,
    signUp,
    signIn,
    signInWithOAuth,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
