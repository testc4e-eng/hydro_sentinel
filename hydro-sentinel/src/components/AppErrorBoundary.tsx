import React from "react";

interface AppErrorBoundaryState {
  errorMessage: string | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { errorMessage: null };

  private handleWindowError = (event: ErrorEvent) => {
    this.setState({ errorMessage: event.error?.message || event.message || "Erreur JavaScript inconnue." });
  };

  private handlePromiseRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = typeof reason === "string" ? reason : reason?.message || "Erreur asynchrone non geree.";
    this.setState({ errorMessage: message });
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { errorMessage: error.message || "Erreur de rendu React." };
  }

  componentDidMount(): void {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentWillUnmount(): void {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handlePromiseRejection);
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error("AppErrorBoundary caught error:", error, info);
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="min-h-screen bg-background p-6 text-foreground">
          <div className="mx-auto max-w-3xl rounded-lg border border-red-300 bg-red-50 p-4">
            <h1 className="text-lg font-semibold text-red-800">Erreur d'affichage detectee</h1>
            <p className="mt-2 text-sm text-red-700">{this.state.errorMessage}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md border border-red-400 bg-white px-3 py-1.5 text-sm text-red-800"
            >
              Recharger la page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
