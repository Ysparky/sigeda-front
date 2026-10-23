import { Route } from '@/routes/matricula'

// Shell de la Tarea 5; el formulario de matrícula se implementa en la Tarea 11.
export function MatriculaPage() {
  const { curso } = Route.useSearch()

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Matrícula</h1>
      <p className="mt-2 text-muted-foreground">
        {curso ? `Inscripción al curso #${curso}.` : 'Elige un curso para inscribirte.'}
      </p>
    </main>
  )
}
