import { reiniciarIaMock } from './ia/datos'
import { reiniciarAuthMock } from './sigeda/auth'
import { reiniciarDatosMock } from './sigeda/datos'
import { reiniciarInscripcion } from './sigeda/inscripcion'

export function reiniciarMocks() {
  reiniciarAuthMock()
  reiniciarDatosMock()
  reiniciarIaMock()
  reiniciarInscripcion()
}
