import React from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import i18n from '../i18n';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      const title = i18n.t('errorBoundary.title');
      const description = i18n.t('errorBoundary.description');
      const reloadLabel = i18n.t('errorBoundary.reload');

      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F5F7FA] px-4 py-12">
          <div className="w-full max-w-md rounded-[12px] border border-[#17263E]/10 bg-white p-8 text-center shadow-card">
            <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-[12px] bg-[#DC2626]/10 text-[#DC2626]">
              <AlertTriangle className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-[#0F1A2C]">{title}</h1>
            <p className="mt-2 text-sm text-[#5B6577]">{description}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[12px] bg-[#F47125] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#D95F18] transition-colors cursor-pointer"
            >
              <RotateCw className="h-4 w-4" />
              <span>{reloadLabel}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
