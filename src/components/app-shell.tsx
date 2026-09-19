import type { ReactNode } from 'react'
import { Separator } from '@/components/ui/separator'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from './app-sidebar'
import { MenuUsuario } from './menu-usuario'
import { Migas } from './migas'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur">
          <SidebarTrigger aria-label="Mostrar u ocultar el menú" />
          <Separator orientation="vertical" className="h-5" />
          <span className="font-semibold tracking-tight sm:hidden">SIGEDA</span>
          <Migas className="hidden min-w-0 sm:block" />
          <div className="ml-auto">
            <MenuUsuario />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
