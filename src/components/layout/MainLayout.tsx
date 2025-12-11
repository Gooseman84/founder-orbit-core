// MainLayout is now just a re-export of AppShell for backwards compatibility
// All responsive logic has been moved to AppShell
import { AppShell } from "./AppShell";

export const MainLayout = ({ children }: { children: React.ReactNode }) => {
  return <AppShell>{children}</AppShell>;
};
