import { reiniciarIaMock } from './ia/datos'
import { reiniciarAsistencias } from './sigeda/asistencias'
import { reiniciarAuthMock } from './sigeda/auth'
import { reiniciarDatosMock } from './sigeda/datos'
import { reiniciarInscripcion } from './sigeda/inscripcion'

export function reiniciarMocks() {
  reiniciarAuthMock()
  reiniciarDatosMock()
  reiniciarIaMock()
  reiniciarInscripcion()
  reiniciarAsistencias()
}
