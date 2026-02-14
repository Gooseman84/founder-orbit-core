import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { VentureStateGuard } from "@/components/auth/VentureStateGuard";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { MainLayout } from "./components/layout/MainLayout";
import { TrialExpiredGuard } from "@/components/billing/TrialExpiredGuard";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Discover from "./pages/Discover";
import DiscoverSummary from "./pages/DiscoverSummary";
import DiscoverResults from "./pages/DiscoverResults";
import Ideas from "./pages/Ideas";
import IdeaDetail from "./pages/IdeaDetail";
import CompareIdeas from "./pages/CompareIdeas";
import FusionLab from "./pages/FusionLab";
import NorthStarRedirect from "./pages/NorthStarRedirect";
import Tasks from "./pages/Tasks";
import Radar from "./pages/Radar";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import Billing from "./pages/Billing";
import Blueprint from "./pages/Blueprint";
import VentureReview from "./pages/VentureReview";
import FeaturePlanner from "./pages/FeaturePlanner";
import Commit from "./pages/Commit";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <TrialExpiredGuard />
            <VentureStateGuard>
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
            <Route
              path="/fusion-lab"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <FusionLab />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
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
            <Route
              path="/radar"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <Radar />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
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
                  <Blueprint />
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
            <Route
              path="/feature-builder"
              element={
                <ProtectedRoute>
                  <MainLayout>
                    <FeaturePlanner />
                  </MainLayout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
              </Routes>
            </VentureStateGuard>
          </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
