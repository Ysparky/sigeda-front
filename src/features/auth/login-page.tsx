import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { BODY, BTN_ORO, CONTROL, ERROR, FOCO, FOTO_COCKPIT, GOLD, LINEA, NAVY, TINTA } from '@/features/inscripcion/marca'
import { ApiError, MENSAJE_GENERICO } from '@/lib/api/errors'
import { sesion } from '@/lib/auth/sesion'

const esquema = z.object({
  username: z.string().trim().min(1, 'Ingrese su usuario.'),
  password: z.string().min(1, 'Ingrese su contraseña.'),
})

type Credenciales = z.infer<typeof esquema>

function Logo() {
  return (
    <span className="inline-flex rounded-md bg-white px-2.5 py-1.5">
      <img src="/asa-logo.png" alt="Aeroclub Sudamericano de los Andes" className="h-9 w-auto" />
    </span>
  )
}

export function LoginPage() {
  const [errorGeneral, setErrorGeneral] = useState<string | null>(() => sesion.aviso())
  const [verClave, setVerClave] = useState(false)
  const formulario = useForm<Credenciales>({
    resolver: zodResolver(esquema),
    defaultValues: { username: '', password: '' },
  })
  const { errors, isSubmitting } = formulario.formState

  async function ingresar(datos: Credenciales) {
    setErrorGeneral(null)
    try {
      await sesion.iniciar(datos.username, datos.password)
    } catch (error) {
      setErrorGeneral(error instanceof ApiError ? error.message : MENSAJE_GENERICO)
    }
  }

  return (
    <div
      className="font-body grid min-h-svh bg-white selection:bg-[#D8B858]/40 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"
      style={{ color: BODY, colorScheme: 'light' }}
    >
      <aside
        className="relative flex flex-col justify-between gap-8 px-6 py-6 text-white sm:px-10 lg:min-h-svh lg:py-10"
        style={{
          backgroundImage: `linear-gradient(140deg, rgba(10,18,48,0.95) 0%, rgba(16,34,78,0.88) 55%, rgba(24,42,99,0.8) 100%), url('${FOTO_COCKPIT}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <Link to="/" aria-label="Aeroclub Sudamericano de los Andes — inicio" className={`w-fit rounded ${FOCO}`}>
          <Logo />
        </Link>
        <div className="hidden max-w-md lg:block">
          <p className="font-display text-6xl font-bold uppercase leading-none">SIGEDA</p>
          <p className="mt-4 text-lg text-[#D6DBEA]">
            La gestión académica del Aeroclub Sudamericano de los Andes: turnos, evaluaciones DIRBE, instrucción en tierra
            y seguimiento hasta la licencia.
          </p>
        </div>
        <p className="hidden text-sm text-[#C3C9DB] lg:block">Escuela de aviación RAP 141 · Programa PDI EA-510</p>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <h1 className="font-display text-4xl font-bold uppercase" style={{ color: TINTA }}>
            Iniciar sesión
          </h1>
          <p className="mt-2 text-[15px]">Ingresa con el usuario que te asignó la escuela. Si fuiste admitido, es tu correo.</p>

          <form noValidate onSubmit={formulario.handleSubmit(ingresar)} className="mt-8 grid gap-5">
            {errorGeneral && (
              <div role="alert" className="flex gap-2.5 rounded-xl border bg-white p-4" style={{ borderColor: ERROR }}>
                <CircleAlert className="mt-0.5 size-5 shrink-0" style={{ color: ERROR }} aria-hidden />
                <p className="text-[15px] font-medium" style={{ color: ERROR }}>
                  {errorGeneral}
                </p>
              </div>
            )}
            <div className="grid gap-1.5">
              <label htmlFor="username" className="text-sm font-semibold" style={{ color: TINTA }}>
                Usuario
              </label>
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-invalid={Boolean(errors.username)}
                className={CONTROL}
                style={{ borderColor: errors.username ? ERROR : LINEA, color: TINTA }}
                {...formulario.register('username')}
              />
              {errors.username && (
                <p className="text-[13px] font-medium" style={{ color: ERROR }}>
                  {errors.username.message}
                </p>
              )}
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-sm font-semibold" style={{ color: TINTA }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={verClave ? 'text' : 'password'}
                  autoComplete="current-password"
                  aria-invalid={Boolean(errors.password)}
                  className={`${CONTROL} pr-24`}
                  style={{ borderColor: errors.password ? ERROR : LINEA, color: TINTA }}
                  {...formulario.register('password')}
                />
                <button
                  type="button"
                  aria-pressed={verClave}
                  onClick={() => setVerClave((visible) => !visible)}
                  className={`absolute inset-y-1 right-1 inline-flex items-center gap-1.5 rounded-md px-3 text-[13px] font-semibold hover:bg-[#101A3C]/5 ${FOCO}`}
                  style={{ color: TINTA }}
                >
                  {verClave ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  {verClave ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              {errors.password && (
                <p className="text-[13px] font-medium" style={{ color: ERROR }}>
                  {errors.password.message}
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`${BTN_ORO} mt-1 w-full disabled:cursor-wait disabled:opacity-70`}
              style={{ backgroundColor: GOLD, color: NAVY }}
            >
              {isSubmitting ? 'Ingresando…' : 'Ingresar'}
              {!isSubmitting && <ArrowRight className="size-4" aria-hidden />}
            </button>
            <p className="text-[13px]">¿Olvidaste tu contraseña? La administración de la escuela puede restablecerla.</p>
          </form>

          <div className="mt-10 grid gap-3 border-t pt-6 text-[15px]" style={{ borderColor: LINEA }}>
            <p>
              ¿Postulaste y aún no tienes cuenta?{' '}
              <Link to="/postulacion" className={`rounded font-semibold underline underline-offset-4 ${FOCO}`} style={{ color: TINTA }}>
                Consulta tu postulación
              </Link>
            </p>
            <Link
              to="/"
              className={`inline-flex w-fit items-center gap-1.5 rounded font-semibold ${FOCO}`}
              style={{ color: TINTA }}
            >
              <ArrowLeft className="size-4" aria-hidden />
              Volver al inicio
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
