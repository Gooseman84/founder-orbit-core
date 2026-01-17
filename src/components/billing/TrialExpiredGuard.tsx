import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { TrialExpiredModal } from "./TrialExpiredModal";

const SESSION_STORAGE_KEY = "trueblazer_trial_modal_dismissed";

// Routes where we don't show the modal
const EXCLUDED_ROUTES = [
  "/auth",
  "/billing",
  "/terms",
  "/privacy",
  "/reset-password",
  "/",
];

export const TrialExpiredGuard = () => {
  const { user } = useAuth();
  const { isTrialExpired, hasPro, hasFounder, loading } = useFeatureAccess();
  const location = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    return sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
  });

  // Check if current route is excluded
  const isExcludedRoute = EXCLUDED_ROUTES.some(
    (route) => location.pathname === route || location.pathname.startsWith("/auth")
  );

  // Should show modal?
  const shouldShowModal = 
    user && 
    !loading &&
    isTrialExpired && 
    !hasPro && 
    !hasFounder && 
    !dismissed && 
    !isExcludedRoute;

  const handleDismiss = () => {
    sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    setDismissed(true);
  };

  // Reset dismissed state if user logs out and back in
  useEffect(() => {
    if (!user) {
      // Don't clear immediately, wait for potential re-auth
    }
  }, [user]);

  if (!shouldShowModal) return null;

  return <TrialExpiredModal open={true} onDismiss={handleDismiss} />;
};
