import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class LazyErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <span className="text-primary text-[1.5rem]">◆</span>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Something went wrong
            </h2>
            <p className="text-sm text-muted-foreground">
              This page failed to load. This is usually temporary — try again.
            </p>
            <Button onClick={this.handleRetry} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
