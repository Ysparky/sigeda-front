import type { ReactNode } from 'react'
import { AvisoDeError } from '@/components/aviso-de-error'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  titulo: string
  id?: string
  error?: unknown
  alReintentar?: () => void
  cargando?: boolean
  acciones?: ReactNode
  children: ReactNode
}

export function Panel({ titulo, id, error, alReintentar, cargando = false, acciones, children }: Props) {
  return (
    <Card id={id} role="region" aria-label={titulo}>
      <CardHeader>
        <CardTitle>
          <h2>{titulo}</h2>
        </CardTitle>
        {acciones}
      </CardHeader>
      <CardContent>
        {error ? (
          <AvisoDeError error={error} alReintentar={alReintentar} />
        ) : cargando ? (
          <Skeleton className="h-24 w-full" aria-busy="true" />
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
