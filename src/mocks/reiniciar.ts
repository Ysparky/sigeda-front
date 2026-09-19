import { reiniciarAuthMock } from './sigeda/auth'
import { reiniciarDatosMock } from './sigeda/datos'

export function reiniciarMocks() {
  reiniciarAuthMock()
  reiniciarDatosMock()
}
