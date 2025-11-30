import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { MainLayout } from "./components/layout/MainLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import ExtendedOnboarding from "./pages/ExtendedOnboarding";
import Ideas from "./pages/Ideas";
import IdeaDetail from "./pages/IdeaDetail";
import CompareIdeas from "./pages/CompareIdeas";
import NorthStar from "./pages/NorthStar";
import Feed from "./pages/Feed";
import Tasks from "./pages/Tasks";
import Pulse from "./pages/Pulse";
import PulseHistory from "./pages/PulseHistory";
import DailyReflection from "./pages/DailyReflection";
import ReflectionHistory from "./pages/ReflectionHistory";
import WeeklyReview from "./pages/WeeklyReview";
import Radar from "./pages/Radar";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import Workspace from "./pages/Workspace";
import DailyStreak from "./pages/DailyStreak";
import Billing from "./pages/Billing";
import Blueprint from "./pages/Blueprint";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<ProtectedRoute><MainLayout><Onboarding /></MainLayout></ProtectedRoute>} />
            <Route path="/onboarding/extended" element={<ProtectedRoute><ExtendedOnboarding /></ProtectedRoute>} />
            <Route path="/ideas" element={<ProtectedRoute><MainLayout><Ideas /></MainLayout></ProtectedRoute>} />
            <Route path="/ideas/:id" element={<ProtectedRoute><MainLayout><IdeaDetail /></MainLayout></ProtectedRoute>} />
            <Route path="/ideas/compare" element={<ProtectedRoute><MainLayout><CompareIdeas /></MainLayout></ProtectedRoute>} />
            <Route path="/north-star" element={<ProtectedRoute><MainLayout><NorthStar /></MainLayout></ProtectedRoute>} />
            <Route path="/feed" element={<ProtectedRoute><MainLayout><Feed /></MainLayout></ProtectedRoute>} />
            <Route path="/tasks" element={<ProtectedRoute><MainLayout><Tasks /></MainLayout></ProtectedRoute>} />
            <Route path="/pulse" element={<ProtectedRoute><MainLayout><Pulse /></MainLayout></ProtectedRoute>} />
            <Route path="/pulse/history" element={<ProtectedRoute><MainLayout><PulseHistory /></MainLayout></ProtectedRoute>} />
            <Route path="/daily-reflection" element={<ProtectedRoute><MainLayout><DailyReflection /></MainLayout></ProtectedRoute>} />
            <Route path="/weekly-review" element={<ProtectedRoute><MainLayout><WeeklyReview /></MainLayout></ProtectedRoute>} />
            <Route path="/reflection/history" element={<ProtectedRoute><MainLayout><ReflectionHistory /></MainLayout></ProtectedRoute>} />
            <Route path="/radar" element={<ProtectedRoute><MainLayout><Radar /></MainLayout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><MainLayout><Profile /></MainLayout></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><MainLayout><Dashboard /></MainLayout></ProtectedRoute>} />
            <Route path="/workspace" element={<ProtectedRoute><MainLayout><Workspace /></MainLayout></ProtectedRoute>} />
            <Route path="/workspace/:id" element={<ProtectedRoute><MainLayout><Workspace /></MainLayout></ProtectedRoute>} />
            <Route path="/streak" element={<ProtectedRoute><MainLayout><DailyStreak /></MainLayout></ProtectedRoute>} />
            <Route path="/billing" element={<ProtectedRoute><MainLayout><Billing /></MainLayout></ProtectedRoute>} />
            <Route path="/blueprint" element={<ProtectedRoute><MainLayout><Blueprint /></MainLayout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
