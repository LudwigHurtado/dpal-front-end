import React from "react";
import { Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import App from "./App";
import LoginPage from "./pages/auth/LoginPage";
import SignupPage from "./pages/auth/SignupPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import VerifyEmailPage from "./pages/auth/VerifyEmailPage";
import AccountDashboardPage from "./pages/auth/AccountDashboardPage";
import ProfilePage from "./pages/auth/ProfilePage";
import AdminDashboardPage from "./pages/auth/AdminDashboardPage";
import FloodLedgerVerificationPage from "./src/features/floodGuard/components/FloodLedgerVerificationPage";
import WaterIntelligenceRoutes from "./src/features/waterIntelligence/waterIntelligenceRoutes";
import { DpalNavigatorProvider } from "./src/features/dpalNavigator";

/**
 * Auth routes are mounted ahead of the main `App` catch-all so URLs like `/login`
 * do not get interpreted as `App` view state.
 */
export default function AppBootstrap() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/account" element={<AccountDashboardPage />} />
        <Route path="/account/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route
          path="/floodguard/verify/:ledgerRecordId"
          element={<FloodLedgerVerificationPage />}
        />
        <Route path="/water-intelligence/*" element={<WaterIntelligenceRoutes />} />
        <Route path="*" element={<App />} />
      </Routes>
      {/**
       * DPAL Navigator — floating guided-intelligence layer. Mounted once at the
       * shell level so it persists across route changes. Never auto-publishes,
       * auto-anchors, or auto-marks anything as verified.
       */}
      <DpalNavigatorProvider />
    </AuthProvider>
  );
}
