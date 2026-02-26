import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface PageHelpState {
  title: string;
  bullets: string[];
}

interface PageHelpContextValue {
  help: PageHelpState | null;
  setPageHelp: (title: string, bullets: string[]) => void;
  clearPageHelp: () => void;
}

const PageHelpContext = createContext<PageHelpContextValue | null>(null);

export function PageHelpProvider({ children }: { children: ReactNode }) {
  const [help, setHelp] = useState<PageHelpState | null>(null);

  const setPageHelp = useCallback((title: string, bullets: string[]) => {
    setHelp({ title, bullets });
  }, []);

  const clearPageHelp = useCallback(() => {
    setHelp(null);
  }, []);

  return (
    <PageHelpContext.Provider value={{ help, setPageHelp, clearPageHelp }}>
      {children}
    </PageHelpContext.Provider>
  );
}

export function usePageHelp() {
  const ctx = useContext(PageHelpContext);
  if (!ctx) throw new Error("usePageHelp must be used within PageHelpProvider");
  return ctx;
}
