import { useSuspenseQuery } from '@tanstack/react-query'
import { StatusBadge } from '@/components/status-badge'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSesion } from '@/lib/auth/use-sesion'
import { etiquetaDeTipo } from '@/lib/dominio/personas'
import { consultasPersonas, nombreCompletoDePersona } from './api'
import { Dato } from './components/dato'
import { DialogoModificarPersona } from './components/dialogo-modificar-persona'
import { SeccionCuenta } from './components/seccion-cuenta'

export function PersonaPage({ cod }: { cod: string }) {
  const { data: persona } = useSuspenseQuery(consultasPersonas.detalle(cod))
  const actual = useSesion()
  const esPropia = actual?.codPersona === persona.codigo

  return (
    <>
      <PageHeader
        titulo={nombreCompletoDePersona(persona)}
        descripcion={`${persona.codigo} · ${etiquetaDeTipo(persona.tipo)}`}
        acciones={<DialogoModificarPersona persona={persona} />}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Datos de la persona</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <Dato etiqueta="Código">
                <span className="tabular-nums">{persona.codigo}</span>
              </Dato>
              <Dato etiqueta="DNI">
                <span className="tabular-nums">{persona.dni ?? '—'}</span>
              </Dato>
              <Dato etiqueta="Rango">{persona.rango ?? '—'}</Dato>
              <Dato etiqueta="Nombres">{persona.nombre}</Dato>
              <Dato etiqueta="Apellidos">{[persona.aPaterno, persona.aMaterno].filter(Boolean).join(' ') || '—'}</Dato>
              <Dato etiqueta="Tipo">{etiquetaDeTipo(persona.tipo)}</Dato>
              <Dato etiqueta="Estado">
                {persona.estado ? <StatusBadge vocabulario="estado" valor={persona.estado} /> : '—'}
              </Dato>
              <Dato etiqueta="Grupo">{persona.grupo?.nombre ?? 'Sin grupo'}</Dato>
            </dl>
          </CardContent>
        </Card>
        <SeccionCuenta persona={persona} esPropia={esPropia} />
      </div>
    </>
  )
}
