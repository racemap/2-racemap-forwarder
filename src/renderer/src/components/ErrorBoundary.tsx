import React, { type PropsWithChildren } from 'react';

interface Props {
  fallback: (props: { errorMessage: string }) => React.ReactNode;
}

export class ErrorBoundary extends React.Component<PropsWithChildren<Props>, { hasError: boolean; errorMessage: string }> {
  constructor(props: PropsWithChildren<Props>) {
    super(props);
    this.state = { errorMessage: '', hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback({ errorMessage: this.state.errorMessage });
    }

    return this.props.children;
  }
}
