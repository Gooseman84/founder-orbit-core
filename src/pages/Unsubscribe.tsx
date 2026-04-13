import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Status = "loading" | "valid" | "already_unsubscribed" | "invalid" | "success" | "error";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validate = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const res = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: supabaseKey } }
        );
        const data = await res.json();
        if (res.ok && data.valid === true) {
          setStatus("valid");
        } else if (data.reason === "already_unsubscribed") {
          setStatus("already_unsubscribed");
        } else {
          setStatus("invalid");
        }
      } catch {
        setStatus("error");
      }
    };

    validate();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (error) throw error;
      if (data?.success) {
        setStatus("success");
      } else if (data?.reason === "already_unsubscribed") {
        setStatus("already_unsubscribed");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">TrueBlazer</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <p className="text-muted-foreground">Validating your request...</p>
          )}
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">
                Click below to unsubscribe from TrueBlazer app emails.
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} className="w-full">
                {processing ? "Processing..." : "Confirm Unsubscribe"}
              </Button>
            </>
          )}
          {status === "success" && (
            <p className="text-muted-foreground">
              You've been unsubscribed. You won't receive any more app emails from TrueBlazer.
            </p>
          )}
          {status === "already_unsubscribed" && (
            <p className="text-muted-foreground">
              You're already unsubscribed from TrueBlazer app emails.
            </p>
          )}
          {status === "invalid" && (
            <p className="text-destructive">
              This unsubscribe link is invalid or has expired.
            </p>
          )}
          {status === "error" && (
            <p className="text-destructive">
              Something went wrong. Please try again later.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
