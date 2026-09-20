import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PersonaDetalle } from '../api'
import { Dato } from './dato'

export const TEXTO_CUENTA_SIN_ROL = 'Sin rol: esta cuenta no puede iniciar sesión.'
export const TEXTO_SIN_CUENTA = 'Sin cuenta'
export const TEXTO_CUENTA_PROPIA =
  'Es su propia cuenta: no puede eliminarla ni cambiar su rol; para cambiar su contraseña use Cambiar contraseña.'

type Props = { persona: PersonaDetalle; esPropia: boolean }

export function SeccionCuenta({ persona, esPropia }: Props) {
  const { cuenta } = persona

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>Cuenta</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {cuenta === null ? (
          <p className="text-sm text-muted-foreground">{TEXTO_SIN_CUENTA}</p>
        ) : (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato etiqueta="Usuario">{cuenta.username}</Dato>
              <Dato etiqueta="Correo">{cuenta.correo ?? '—'}</Dato>
              <Dato etiqueta="Rol">{cuenta.rol?.nombre ?? '—'}</Dato>
            </dl>
            {cuenta.rol === null && <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_SIN_ROL}</p>}
            {esPropia && <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_PROPIA}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
