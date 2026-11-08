import type { ReactNode } from 'react'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { MenuUsuario } from './menu-usuario'
import { Migas } from './migas'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="selection:bg-[#d8b858]/40">
        <header className="sticky top-0 z-10 flex h-14 print:hidden items-center gap-3 border-b bg-background/90 px-4 backdrop-blur md:px-8">
          <SidebarTrigger aria-label="Mostrar u ocultar el menú" className="-ml-1" />
          <span className="font-heading text-base font-bold tracking-wider uppercase sm:hidden">SIGEDA</span>
          <Migas className="hidden min-w-0 sm:block" />
          <div className="ml-auto">
            <MenuUsuario />
          </div>
        </header>
        <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-6 px-4 py-6 md:px-8 md:py-8">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
