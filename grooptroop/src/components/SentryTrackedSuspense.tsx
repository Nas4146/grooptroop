import React, { Suspense } from 'react';
import { SentryHelper } from '../utils/sentryHelper';

interface Props {
  fallback: React.ReactNode;
  id: string;
  children: React.ReactNode;
}

export function SentryTrackedSuspense({ fallback, id, children }: Props) {
  return (
    <Suspense
      fallback={
        <SuspenseFallback id={id}>
          {fallback}
        </SuspenseFallback>
      }
    >
      <SuspenseContent id={id}>
        {children}
      </SuspenseContent>
    </Suspense>
  );
}

function SuspenseFallback({ id, children }: { id: string, children: React.ReactNode }) {
  const spanRef = React.useRef<string | null>(null);
  
  React.useEffect(() => {
    // Start tracking suspense loading time
    const transaction = SentryHelper.startTransaction(`suspense.${id}.loading`, 'loading');
    const spanId = Math.random().toString(36).substring(2, 15);
    spanRef.current = spanId;
    
    return () => {
      transaction.finish();
    };
  }, [id]);
  
  return <>{children}</>;
}

function SuspenseContent({ id, children }: { id: string, children: React.ReactNode }) {
  React.useEffect(() => {
    // Track when content is successfully loaded
    SentryHelper.addBreadcrumb({
      category: 'suspense',
      message: `Suspense content loaded for ${id}`,
      level: 'info'
    });
  }, [id]);
  
  return <>{children}</>;
}