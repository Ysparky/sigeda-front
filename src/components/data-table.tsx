import { useTable, type PaginationState, type RowData, type SortingState, type Updater } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { Pagina, ParametrosPagina } from '@/lib/api/pagina'
import { caracteristicasTabla, type ColumnasTabla } from './columnas-tabla'

type Props<TDatos extends RowData> = {
  etiqueta: string
  columnas: ColumnasTabla<TDatos>
  pagina: Pagina<TDatos> | undefined
  cargando: boolean
  parametros: ParametrosPagina
  alCambiar: (cambios: Partial<ParametrosPagina>) => void
  vacio: ReactNode
  idDeFila: (fila: TDatos) => string
}

const SIN_FILAS: never[] = []

function resolver<T>(actualizador: Updater<T>, previo: T): T {
  return typeof actualizador === 'function' ? (actualizador as (anterior: T) => T)(previo) : actualizador
}

function IconoOrden({ direccion }: { direccion: false | 'asc' | 'desc' }) {
  if (direccion === 'asc') return <ArrowUp aria-hidden />
  if (direccion === 'desc') return <ArrowDown aria-hidden />
  return <ArrowUpDown aria-hidden className="opacity-50" />
}

export function DataTable<TDatos extends RowData>({
  etiqueta,
  columnas,
  pagina,
  cargando,
  parametros,
  alCambiar,
  vacio,
  idDeFila,
}: Props<TDatos>) {
  const pagination: PaginationState = { pageIndex: parametros.page, pageSize: parametros.size }
  const sorting: SortingState = parametros.property
    ? [{ id: parametros.property, desc: parametros.direction === 'DESC' }]
    : []
  const tabla = useTable({
    features: caracteristicasTabla,
    columns: columnas,
    data: pagina?.items ?? SIN_FILAS,
    getRowId: (fila) => idDeFila(fila),
    rowCount: pagina?.total ?? 0,
    manualPagination: true,
    manualSorting: true,
    enableSortingRemoval: false,
    defaultColumn: { enableSorting: false },
    state: { pagination, sorting },
    onPaginationChange: (actualizador) => {
      const siguiente = resolver(actualizador, pagination)
      alCambiar({ page: siguiente.pageIndex, size: siguiente.pageSize })
    },
    onSortingChange: (actualizador) => {
      const [primero] = resolver(actualizador, sorting)
      alCambiar({ property: primero?.id, direction: primero?.desc ? 'DESC' : 'ASC', page: 0 })
    },
  })

  if (pagina && pagina.items.length === 0) {
    return (
      <div className="grid gap-3">
        {vacio}
        {parametros.page > 0 && (
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={() => alCambiar({ page: 0 })}>
              Volver a la primera página
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-lg border">
        <Table aria-label={etiqueta} aria-busy={cargando}>
          <TableHeader>
            {tabla.getHeaderGroups().map((grupo) => (
              <TableRow key={grupo.id}>
                {grupo.headers.map((cabecera) => {
                  const direccion = cabecera.column.getIsSorted()
                  return (
                    <TableHead
                      key={cabecera.id}
                      aria-sort={direccion === 'asc' ? 'ascending' : direccion === 'desc' ? 'descending' : undefined}
                    >
                      {cabecera.isPlaceholder ? null : cabecera.column.getCanSort() ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="-ml-2"
                          onClick={cabecera.column.getToggleSortingHandler()}
                        >
                          <tabla.FlexRender header={cabecera} />
                          <IconoOrden direccion={direccion} />
                        </Button>
                      ) : (
                        <tabla.FlexRender header={cabecera} />
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {pagina
              ? tabla.getRowModel().rows.map((fila) => (
                  <TableRow key={fila.id}>
                    {fila.getAllCells().map((celda) => (
                      <TableCell key={celda.id}>
                        <tabla.FlexRender cell={celda} />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : Array.from({ length: 3 }, (_, indice) => (
                  <TableRow key={indice}>
                    <TableCell colSpan={columnas.length}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
          </TableBody>
        </Table>
      </div>
      {pagina && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
          <p className="tabular-nums">
            Página {pagina.page + 1} de {Math.max(tabla.getPageCount(), 1)} · {pagina.total}{' '}
            {pagina.total === 1 ? 'registro' : 'registros'}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => tabla.previousPage()}
              disabled={!tabla.getCanPreviousPage()}
            >
              Anterior
            </Button>
            <Button variant="outline" size="sm" onClick={() => tabla.nextPage()} disabled={!tabla.getCanNextPage()}>
              Siguiente
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
