import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "./components/layout/MainLayout";
import Index from "./pages/Index";
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
          <Route path="/" element={<Index />} />
          <Route path="/onboarding" element={<MainLayout><Onboarding /></MainLayout>} />
          <Route path="/ideas" element={<MainLayout><Ideas /></MainLayout>} />
          <Route path="/ideas/:id" element={<MainLayout><IdeaDetail /></MainLayout>} />
          <Route path="/north-star" element={<MainLayout><NorthStar /></MainLayout>} />
          <Route path="/feed" element={<MainLayout><Feed /></MainLayout>} />
          <Route path="/tasks" element={<MainLayout><Tasks /></MainLayout>} />
          <Route path="/profile" element={<MainLayout><Profile /></MainLayout>} />
          <Route path="/dashboard" element={<MainLayout><Dashboard /></MainLayout>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
