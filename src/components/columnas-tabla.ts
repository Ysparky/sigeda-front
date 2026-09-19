import {
  createColumnHelper,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type ColumnHelper,
  type RowData,
} from '@tanstack/react-table'

export const caracteristicasTabla = tableFeatures({ rowSortingFeature, rowPaginationFeature })

export type CaracteristicasTabla = typeof caracteristicasTabla

export type ColumnasTabla<TDatos extends RowData> = ReturnType<ColumnHelper<CaracteristicasTabla, TDatos>['columns']>

export function ayudanteDeColumnas<TDatos extends RowData>() {
  return createColumnHelper<CaracteristicasTabla, TDatos>()
}
