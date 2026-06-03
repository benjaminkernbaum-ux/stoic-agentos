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

  const createDefaultOrg = useCallback(async (userId) => {
    try {
      const userMeta = (await supabase.auth.getUser()).data.user;
      const name = userMeta?.user_metadata?.full_name || userMeta?.email?.split('@')[0] || 'My Organization';
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 40) + '-' + Date.now().toString(36);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.stoicagentos.com'}/api/v1/auth/setup-org`, {
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
      } else {
        console.error('createDefaultOrg: server responded with', res.status, await res.text().catch(() => ''));
      }
    } catch (err) {
      console.error('createDefaultOrg failed:', err);
    }
  }, []);

  const loadOrg = useCallback(async (userId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        await createDefaultOrg(userId);
        setLoading(false);
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.stoicagentos.com'}/api/v1/auth/me`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });

      if (res.ok) {
        const membership = await res.json();
        if (membership?.organization) {
          setOrg({
            id: membership.organization.id,
            name: membership.organization.name,
            slug: membership.organization.slug,
            plan: membership.organization.plan,
            role: membership.role,
          });
        } else {
          await createDefaultOrg(userId);
        }
      } else {
        // No org yet — create one
        await createDefaultOrg(userId);
      }
    } catch (err) {
      console.error('loadOrg failed:', err);
      await createDefaultOrg(userId);
    } finally {
      setLoading(false);
    }
  }, [createDefaultOrg]);

  useEffect(() => {
    // Failsafe — never let loading spin forever
    const failsafe = setTimeout(() => setLoading(false), 6000);

    // INITIAL_SESSION fires after Supabase processes any OAuth redirect (?code=...)
    // Safe replacement for getSession() which races with PKCE code exchange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (session?.user) {
          setUser(session.user);
          loadOrg(session.user.id);
        } else {
          setLoading(false);
        }
      } else if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        loadOrg(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setOrg(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(failsafe);
      subscription.unsubscribe();
    };
  }, [loadOrg]);

  async function signUp(email, password, fullName, consentGivenAt) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, consent_given_at: consentGivenAt },
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
