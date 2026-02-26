import { useEffect } from "react";
import { usePageHelp } from "@/contexts/PageHelpContext";

interface PageHelpProps {
  title: string;
  bullets: string[];
}

export function PageHelp({ title, bullets }: PageHelpProps) {
  const { setPageHelp, clearPageHelp } = usePageHelp();

  useEffect(() => {
    setPageHelp(title, bullets);
    return () => clearPageHelp();
  }, [title, bullets, setPageHelp, clearPageHelp]);

  return null;
}
