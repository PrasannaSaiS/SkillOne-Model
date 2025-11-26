import { Toaster } from "./components/ui/toaster";
import { Toaster as Sonner } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminDashboard from "./pages/AdminDashboard";
import LearnerDashboard from "./pages/LearnerDashboard";
import LearningPathView from "./pages/LearningPathView";
import NotFound from "./pages/NotFound";
export const API_BASE_URL = "https://PrasannaSaiS-skillone-api.hf.space";
const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Admin Dashboard - Direct access for development */}
          <Route path="/" element={<LearnerDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/learner" element={<LearnerDashboard />} />
          <Route path="/learning-path" element={<LearningPathView />} />
          <Route path="/learning-path/:pathId" element={<LearningPathView />} />

          {/* Catch-all fallback */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;