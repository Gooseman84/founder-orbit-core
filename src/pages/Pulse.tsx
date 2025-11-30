import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Redirect /pulse to /daily-reflection (the unified Daily Pulse & Check-In)
export default function Pulse() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/daily-reflection", { replace: true });
  }, [navigate]);

  return null;
}
