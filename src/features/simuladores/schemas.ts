import { z } from 'zod'
import type { CuerpoSimulador, TipoSimulador } from './api'

export const esquemaSimulador = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio.').max(255, 'Máximo 255 caracteres.'),
  tipo: z.enum(['FNPT', 'FTD', 'FFS']),
  descripcion: z.string().max(2000, 'Máximo 2000 caracteres.'),
  ubicacion: z.string().max(255, 'Máximo 255 caracteres.'),
  activo: z.boolean(),
})

export type ValoresSimulador = z.input<typeof esquemaSimulador>

export const SIMULADOR_VACIO: ValoresSimulador = {
  nombre: '',
  tipo: 'FNPT',
  descripcion: '',
  ubicacion: '',
  activo: true,
}

export function aCuerpoSimulador(valores: ValoresSimulador): CuerpoSimulador {
  return {
    nombre: valores.nombre.trim(),
    tipo: valores.tipo as TipoSimulador,
    descripcion: valores.descripcion.trim(),
    ubicacion: valores.ubicacion.trim(),
    activo: valores.activo,
  }
}
