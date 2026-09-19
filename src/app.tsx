import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { ThemeProvider } from 'next-themes'
import { useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { sesion } from '@/lib/auth/sesion'
import type { Router } from '@/router'

type Props = { router: Router; queryClient: QueryClient }

export function App({ router, queryClient }: Props) {
  useEffect(
    () =>
      sesion.suscribir(() => {
        queryClient.clear()
        void router.invalidate()
      }),
    [router, queryClient],
  )

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <Toaster richColors closeButton position="top-right" />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
