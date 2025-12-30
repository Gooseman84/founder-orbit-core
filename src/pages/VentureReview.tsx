import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

/**
 * Placeholder page for the Venture Review state.
 * This will be replaced with a full Review Decision UI later.
 */
const VentureReview = () => {
  return (
    <div className="container mx-auto py-12 px-4 flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full text-center border-amber-500/50">
        <CardHeader>
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <CardTitle className="text-2xl">Review Required</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Your commitment window has ended. A review decision UI is coming soon.
          </p>
          <p className="text-sm text-muted-foreground/70 mt-4">
            You'll be able to: recommit, mark complete, or kill this venture.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VentureReview;
