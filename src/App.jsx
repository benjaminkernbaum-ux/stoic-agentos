import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Landing renders synchronously so first paint at "/" stays fast.
import LandingPage from './pages/LandingPage';

// Everything else is route-split.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const DocsPage = lazy(() => import('./pages/DocsPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AboutPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.AboutPage })));
const BlogPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.BlogPage })));
const ChangelogPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.ChangelogPage })));
const PrivacyPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.PrivacyPage })));
const TermsPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.TermsPage })));
const SecurityPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.SecurityPage })));
const NotFoundPage = lazy(() => import('./pages/StaticPages').then((m) => ({ default: m.NotFoundPage })));
const BlogArticles = lazy(() => import('./pages/BlogArticles'));

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg-primary, #0a0a1a)', color: '#fff'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16, animation: 'pulse 1.5s infinite' }}>⚡</div>
        <p style={{ color: 'rgba(255,255,255,0.5)' }}>Loading AgentOS...</p>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/docs" element={<DocsPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/why-traditional-apm-fails-for-ai-agents" element={<Suspense fallback={<div>Loading...</div>}><BlogArticles article="why-apm-fails" /></Suspense>} />
        <Route path="/blog/ai-observability-market-consolidation-2026" element={<Suspense fallback={<div>Loading...</div>}><BlogArticles article="market-consolidation" /></Suspense>} />
        <Route path="/blog/langfuse-vs-langsmith-vs-stoic-agentos" element={<Suspense fallback={<div>Loading...</div>}><BlogArticles article="comparison" /></Suspense>} />
        <Route path="/changelog" element={<ChangelogPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/security" element={<SecurityPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
