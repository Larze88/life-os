import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { createQueryClient } from './query-client';
import { createRouter } from './router';

export function App() {
  const [queryClient] = useState(createQueryClient);
  const [router] = useState(createRouter);
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        richColors
        closeButton={false}
        offset={16}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      />
    </QueryClientProvider>
  );
}
