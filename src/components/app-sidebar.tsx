import { Link } from '@tanstack/react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
import { nombreDeSesion } from '@/lib/auth/sesion'
import { useSesion } from '@/lib/auth/use-sesion'

export function AppSidebar() {
  const actual = useSesion()
  const secciones = actual ? menuPara(actual, import.meta.env.DEV) : []

  return (
    <Sidebar collapsible="icon" aria-label="Menú principal">
      <SidebarHeader className="px-3 pt-4 pb-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="hover:bg-transparent active:bg-transparent">
              <Link to="/inicio">
                <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-md bg-white p-0.5">
                  <img src="/asa-logo.png" alt="" className="h-full w-full object-contain" />
                </span>
                <span className="grid leading-tight">
                  <span className="font-heading text-lg font-bold tracking-wider text-white uppercase">SIGEDA</span>
                  <span className="text-xs text-sidebar-foreground/75">Aula virtual</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="gap-1 pb-4">
        {secciones.map((seccion) => (
          <SidebarGroup key={seccion.grupo} className="py-1.5">
            <SidebarGroupLabel className="font-heading text-[11px] font-bold tracking-[0.14em] text-[#9aa3c0] uppercase">
              {seccion.grupo}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {seccion.pantallas.map((pantalla) => (
                  <SidebarMenuItem key={pantalla.ruta}>
                    <SidebarMenuButton
                      asChild
                      tooltip={pantalla.titulo}
                      className="h-9 text-[15px] text-sidebar-foreground hover:bg-white/8 hover:text-white data-[active=true]:bg-white/8 data-[active=true]:font-semibold data-[active=true]:shadow-[inset_3px_0_0_#d8b858] data-[active=true]:text-white [&[data-active=true]>svg]:text-[#d8b858]"
                    >
                      <Link
                        to={pantalla.ruta}
                        activeOptions={{ exact: pantalla.ruta === '/inicio' }}
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
      {actual && (
        <SidebarFooter className="border-t border-sidebar-border px-4 py-3 group-data-[collapsible=icon]:hidden">
          <p className="text-sm leading-tight">
            <span className="block font-semibold text-white">{nombreDeSesion(actual.persona)}</span>
            <span className="text-xs text-sidebar-foreground/75">{actual.rol.nombre}</span>
          </p>
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  )
}
