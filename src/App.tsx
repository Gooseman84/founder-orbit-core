import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "./components/shared/AppLayout";
import Onboarding from "./pages/Onboarding";
import Ideas from "./pages/Ideas";
import IdeaDetail from "./pages/IdeaDetail";
import NorthStar from "./pages/NorthStar";
import Feed from "./pages/Feed";
import Tasks from "./pages/Tasks";
import Profile from "./pages/Profile";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/onboarding" element={<AppLayout><Onboarding /></AppLayout>} />
          <Route path="/ideas" element={<AppLayout><Ideas /></AppLayout>} />
          <Route path="/ideas/:id" element={<AppLayout><IdeaDetail /></AppLayout>} />
          <Route path="/north-star" element={<AppLayout><NorthStar /></AppLayout>} />
          <Route path="/feed" element={<AppLayout><Feed /></AppLayout>} />
          <Route path="/tasks" element={<AppLayout><Tasks /></AppLayout>} />
          <Route path="/profile" element={<AppLayout><Profile /></AppLayout>} />
          <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
