import { Link, useMatches } from '@tanstack/react-router'
import { Fragment } from 'react'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { migasPara } from '@/lib/auth/pantallas'
import { useSesion } from '@/lib/auth/use-sesion'

function rutaDeCoincidencia(fullPath: string) {
  return fullPath.length > 1 ? fullPath.replace(/\/$/, '') : fullPath
}

export function Migas({ className }: { className?: string }) {
  const actual = useSesion()
  const coincidencia = useMatches().at(-1)
  if (!actual || !coincidencia) return null
  const cadena = migasPara(rutaDeCoincidencia(coincidencia.fullPath), actual, import.meta.env.DEV)
  if (cadena.length === 0) return null
  const params = coincidencia.params

  return (
    <Breadcrumb aria-label="Migas de pan" className={className}>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/">Inicio</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {cadena.map((pantalla, indice) => (
          <Fragment key={pantalla.ruta}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {indice === cadena.length - 1 ? (
                <BreadcrumbPage>{pantalla.titulo}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={pantalla.ruta} params={params}>
                    {pantalla.titulo}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
