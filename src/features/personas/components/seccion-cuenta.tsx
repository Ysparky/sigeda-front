import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { usePuede } from '@/lib/auth/use-sesion'
import type { PersonaDetalle } from '../api'
import { Dato } from './dato'
import { DialogoAsignarRol } from './dialogo-asignar-rol'
import { DialogoRestablecerContrasena } from './dialogo-restablecer-contrasena'

export const TEXTO_CUENTA_SIN_ROL = 'Sin rol: esta cuenta no puede iniciar sesión.'
export const TEXTO_SIN_CUENTA = 'Sin cuenta'
export const TEXTO_CUENTA_PROPIA =
  'Es su propia cuenta: no puede eliminarla ni cambiar su rol; para cambiar su contraseña use Cambiar contraseña.'

type Props = { persona: PersonaDetalle; esPropia: boolean }

export function SeccionCuenta({ persona, esPropia }: Props) {
  const { cuenta } = persona
  const puedeAsignarRol = usePuede('Manage Roles')

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
            {esPropia ? (
              <p className="text-sm text-muted-foreground">{TEXTO_CUENTA_PROPIA}</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {puedeAsignarRol && <DialogoAsignarRol persona={persona} idUsuario={cuenta.id} />}
                <DialogoRestablecerContrasena cuenta={cuenta} />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
