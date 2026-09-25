import { ConfirmDialog } from '@/components/confirm-dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  AVISO_MINUTOS_RESTANTES,
  formatearRestante,
  TEXTO_CONFIRMAR_ENTREGA,
  TEXTO_QUEDAN_CINCO_MINUTOS,
  textoRespondidas,
  textoSinResponder,
} from '@/lib/dominio/teoria'

type Props = {
  restante: number
  respondidas: number
  total: number
  entregando: boolean
  alEntregar: () => void
}

export function CabeceraDeExamen({ restante, respondidas, total, entregando, alEntregar }: Props) {
  const sinResponder = total - respondidas
  const cerrado = restante === 0
  return (
    <div className="sticky top-14 z-10 grid gap-3 rounded-lg border bg-background p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-medium tabular-nums">Tiempo restante: {formatearRestante(restante)}</p>
        <p className="text-sm text-muted-foreground tabular-nums">{textoRespondidas(respondidas, total)}</p>
        <ConfirmDialog
          disparador={
            <Button type="button" disabled={cerrado || entregando}>
              Entregar
            </Button>
          }
          titulo="¿Entregar el examen?"
          descripcion={
            sinResponder > 0
              ? `${TEXTO_CONFIRMAR_ENTREGA} ${textoSinResponder(sinResponder)}`
              : TEXTO_CONFIRMAR_ENTREGA
          }
          confirmar="Entregar"
          alConfirmar={alEntregar}
        />
      </div>
      {restante > 0 && restante <= AVISO_MINUTOS_RESTANTES * 60_000 && (
        <Alert>
          <AlertDescription>{TEXTO_QUEDAN_CINCO_MINUTOS}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
