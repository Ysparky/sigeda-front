import { Link } from '@tanstack/react-router'
import { Plane } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { menuPara } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'

export function AppSidebar() {
  const actual = useSesion()
  const secciones = actual ? menuPara(actual.permisos, import.meta.env.DEV) : []

  return (
    <Sidebar collapsible="icon" aria-label="Menú principal">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Plane className="size-4" aria-hidden />
                </span>
                <span className="grid leading-tight">
                  <span className="font-semibold">SIGEDA</span>
                  <span className="text-xs text-sidebar-foreground/70">Gestión académica</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {secciones.map((seccion) => (
          <SidebarGroup key={seccion.grupo}>
            <SidebarGroupLabel>{seccion.grupo}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {seccion.pantallas.map((pantalla) => (
                  <SidebarMenuItem key={pantalla.ruta}>
                    <SidebarMenuButton asChild tooltip={pantalla.titulo}>
                      <Link
                        to={pantalla.ruta}
                        activeOptions={{ exact: pantalla.ruta === '/' }}
                        activeProps={{ 'data-active': true, 'aria-current': 'page' }}
                      >
                        <pantalla.icono aria-hidden />
                        <span>{pantalla.titulo}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
