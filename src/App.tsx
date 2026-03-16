import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import RegisterPage from "./pages/RegisterPage";
import RegisterSuccessPage from "./pages/RegisterSuccessPage";
import DashboardLayout from "./pages/DashboardLayout";
import OverviewPage from "./pages/dashboard/OverviewPage";
import BookingsPage from "./pages/dashboard/BookingsPage";
import ServicesPage from "./pages/dashboard/ServicesPage";
import ProfilePage from "./pages/dashboard/ProfilePage";
import BusinessHoursPage from "./pages/dashboard/BusinessHoursPage";
import GalleryPage from "./pages/dashboard/GalleryPage";
import PublicBusinessPage from "./pages/PublicBusinessPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/register/success" element={<RegisterSuccessPage />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="services" element={<ServicesPage />} />
            <Route path="hours" element={<BusinessHoursPage />} />
            <Route path="gallery" element={<GalleryPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>
          <Route path="/:subdomain" element={<PublicBusinessPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
