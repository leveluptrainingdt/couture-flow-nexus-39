
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import Inventory from "@/pages/Inventory";
import Appointments from "@/pages/Appointments";
import Alterations from "@/pages/Alterations";
import Customers from "@/pages/Customers";
import Staff from "@/pages/Staff";
import Expenses from "@/pages/Expenses";
import AdminExpenses from "@/pages/AdminExpenses";
import Reports from "@/pages/Reports";
import Admin from "@/pages/Admin";
import AdminControlPanel from "@/pages/AdminControlPanel";
import Settings from "@/pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/orders" element={
              <ProtectedRoute>
                <Layout>
                  <Orders />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/inventory" element={
              <ProtectedRoute>
                <Layout>
                  <Inventory />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/appointments" element={
              <ProtectedRoute>
                <Layout>
                  <Appointments />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/alterations" element={
              <ProtectedRoute>
                <Layout>
                  <Alterations />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/customers" element={
              <ProtectedRoute>
                <Layout>
                  <Customers />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/staff" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <Staff />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/expenses" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/expenses" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminExpenses />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/reports" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <Admin />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/control-panel" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <AdminControlPanel />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/admin/settings" element={
              <ProtectedRoute adminOnly>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
