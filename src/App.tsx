import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VentureStateGuard } from "@/components/auth/VentureStateGuard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { MainLayout } from "./components/layout/MainLayout";
import { LazyErrorBoundary } from "@/components/shared/LazyErrorBoundary";
import { TrialExpiredGuard } from "@/components/billing/TrialExpiredGuard";
import { PageHelpProvider } from "@/contexts/PageHelpContext";
import { NorthStarRedirect } from "@/components/auth/NorthStarRedirect";

// Eagerly loaded — needed immediately on first paint
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazily loaded — split into separate chunks, loaded on navigation
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Terms = lazy(() => import("./pages/Terms"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Discover = lazy(() => import("./pages/Discover"));
const DiscoverSummary = lazy(() => import("./pages/DiscoverSummary"));
const DiscoverResults = lazy(() => import("./pages/DiscoverResults"));
const Commit = lazy(() => import("./pages/Commit"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Ideas = lazy(() => import("./pages/Ideas"));
const IdeaDetail = lazy(() => import("./pages/IdeaDetail"));
const CompareIdeas = lazy(() => import("./pages/CompareIdeas"));
const Tasks = lazy(() => import("./pages/Tasks"));
const Workspace = lazy(() => import("./pages/Workspace"));
const Blueprint = lazy(() => import("./pages/Blueprint"));
const Profile = lazy(() => import("./pages/Profile"));
const Billing = lazy(() => import("./pages/Billing"));
const VentureReview = lazy(() => import("./pages/VentureReview"));

/** Logs a deprecation warning and redirects */
function DeprecatedRedirect({ to, label }: { to: string; label: string }) {
  console.log(`Deprecated: ${label} redirected to ${to}`);
  return <Navigate to={to} replace />;
}
const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <PageHelpProvider>
            <TrialExpiredGuard />
            <VentureStateGuard>
              <LazyErrorBoundary>
              <Suspense fallback={null}>
              <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route
              path="/discover"
              element={
                <ProtectedRoute>
                  <Discover />
                </ProtectedRoute>
              }
            />
            <Route
              path="/discover/summary"
              element={
                <ProtectedRoute>
                  <DiscoverSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/discover/results"
              element={
                <ProtectedRoute>
                  <DiscoverResults />
                </ProtectedRoute>
              }
            />
            <Route
              path="/commit/:ideaId"
              element={
                <ProtectedRoute>
                  <Commit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ideas"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Ideas />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ideas/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <IdeaDetail />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ideas/compare"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <CompareIdeas />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/fusion-lab" element={<Navigate to="/ideas" replace />} />
            <Route path="/onboarding" element={<DeprecatedRedirect to="/discover" label="structured onboarding" />} />
            <Route path="/onboarding/*" element={<DeprecatedRedirect to="/discover" label="structured onboarding" />} />
            <Route path="/pulse" element={<Navigate to="/dashboard" replace />} />
            <Route path="/pulse/history" element={<Navigate to="/dashboard" replace />} />
            <Route path="/daily-reflection" element={<Navigate to="/dashboard" replace />} />
            <Route path="/reflection-history" element={<Navigate to="/dashboard" replace />} />
            <Route path="/streak" element={<Navigate to="/dashboard" replace />} />
            <Route path="/daily-streak" element={<Navigate to="/dashboard" replace />} />
            <Route path="/weekly-review" element={<Navigate to="/dashboard" replace />} />
            <Route path="/feed" element={<Navigate to="/dashboard" replace />} />
            <Route path="/code-architect-test" element={<Navigate to="/dashboard" replace />} />
            <Route path="/context-inspector" element={<Navigate to="/profile" replace />} />
            
            {/* NorthStar Redirect */}
            <Route
              path="/north-star"
              element={
                <ProtectedRoute>
                  <NorthStarRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Tasks />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/radar" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Profile />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Dashboard />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Workspace />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/workspace/:id"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Workspace />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/billing"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Billing />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/blueprint"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Blueprint />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/venture-review"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <VentureReview />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            <Route path="/feature-builder" element={<Navigate to="/workspace?tab=feature-builder" replace />} />
            <Route path="/feature-planner" element={<Navigate to="/workspace?tab=feature-builder" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              </LazyErrorBoundary>
            </VentureStateGuard>
            </PageHelpProvider>
          </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
