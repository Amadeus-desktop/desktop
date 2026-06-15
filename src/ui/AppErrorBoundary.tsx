import { Component, type ErrorInfo, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { glassStyles, shellText } from "./glassStyles";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
  retryKey: number;
};

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
    retryKey: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary caught render error", error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState((current) => ({
      error: null,
      retryKey: current.retryKey + 1,
    }));
  };

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-dvh w-dvw place-items-center bg-transparent p-6">
          <section
            className={cn(
              "w-full max-w-sm space-y-4 px-5 py-6 text-center",
              glassStyles.shell,
              glassStyles.radiusWindow,
            )}
          >
            <p className={cn("text-sm font-semibold", shellText.primary)}>
              Something went wrong
            </p>
            <p className={cn("text-xs leading-5", shellText.muted)}>
              The app hit an unexpected error. You can try again without
              restarting.
            </p>
            <Button variant="primary" size="md" onClick={this.handleRetry}>
              Try again
            </Button>
          </section>
        </div>
      );
    }

    return (
      <div key={this.state.retryKey} className="contents">
        {this.props.children}
      </div>
    );
  }
}
