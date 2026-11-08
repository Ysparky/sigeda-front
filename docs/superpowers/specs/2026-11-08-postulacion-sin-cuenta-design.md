# Postulación sin cuenta, documentos, evaluación de admisión y pago (8 nov 2026)

Rediseño del tramo de entrada aprobado por el usuario. No hay información de cómo opera hoy el
Aeroclub; lo que los documentos no dicen se completa con **reglas fijas** (no configurables), cada una
con su fuente.

## Fuentes
- `Postulacion y simulador.docx`: el Coordinador valida documentos, habilita la **admisión presencial
  fuera del sistema** y registra admitido / no admitido.
- `flujo postulacion.docx`: datos personales, requisitos documentarios y declaración jurada.
- Semilla `cursos.requisitos`: «Ser mayor de edad, estudios secundarios completos y certificado médico
  aeronáutico vigente».
- Tesis §1.1 (Gestión de Matrícula): documentos personales, certificados médicos, antecedentes; pagos
  registrados como confirmados.

## Reglas fijas
| Regla | Valor | Fuente |
|---|---|---|
| Edad mínima | 18 años a la fecha de postulación | `cursos.requisitos` («mayor de edad») |
| Documentos al postular (obligatorios) | documento de identidad, certificado de estudios secundarios, fotografía (JPG/PNG), certificado de antecedentes policiales, **declaración jurada firmada** | flujo postulacion.docx + `cursos.requisitos` |
| Declaración jurada | documento firmado a mano o con firma digital sobre un modelo que la web genera prellenado (imprimible / PDF), con huella digital | práctica habitual; una casilla no prueba quién declara |
| Consentimiento de datos | casilla obligatoria antes de enviar, fechada (`consentimiento_datos_en`) | Ley 29733 (consentimiento previo, expreso e informado) |
| Documento opcional | constancia de estudios superiores | flujo postulacion.docx («si aplica») |
| Certificado médico aeronáutico clase 2 (RAP 67) | opcional al postular, **obligatorio y aceptado antes de registrar el resultado** | docx («si ya lo posee») + `cursos.requisitos` («vigente») |
| Archivos | PDF, JPG o PNG, máx. 5 MB | se mantiene la regla actual |
| Evaluación de admisión | examen de conocimientos 0–20, entrevista personal y evaluación psicológica (apto / no apto) | práctica habitual de escuelas de vuelo |
| Nota mínima del examen | 14 | práctica habitual (la escala vigesimal del curso aprueba con 14 en materias aeronáuticas) |
| Resultado | ADMITIDA si nota ≥ 14 y ambas «apto»; si no, NO_ADMITIDO (derivado, no elegido) | — |
| Medios de pago | transferencia, depósito, Yape, Plin, caja | medios usuales en Perú |

## Flujo
1. **Postular (público, sin cuenta):** datos (tipo y número de documento, nombres, apellidos, fecha de
   nacimiento, sexo, nacionalidad, dirección, teléfono, correo), descarga del modelo de declaración jurada
   prellenado, los archivos (incluida la declaración firmada) y el consentimiento de datos.
   Devuelve un **código de postulación** de 8 caracteres.
2. **Consultar (público):** número de documento + código → estado, documentos y su observación,
   citación y resultado; resubir un documento observado o cargar uno pendiente (p. ej. el médico).
3. **Revisión documental (Coordinador):** observar un documento o la postulación (→ OBSERVADA);
   validar exige los obligatorios cargados y ninguno observado (→ VALIDADA, documentos ACEPTADOS).
4. **Citación:** fecha (hoy o futura), hora y lugar (→ CITADA; se puede re-citar).
5. **Evaluación de admisión** (presencial, fuera del sistema; se registra): exige el médico aceptado.
   Controla vacantes y cohorte abierta.
6. **Al admitir** se crea la **Persona** como Alumno sin grupo (regla 4). La **cuenta** la activa el
   admitido desde la consulta (documento + código + contraseña nueva); usuario = correo.
7. **Pago de matrícula:** lo registra el Coordinador (fecha, monto, medio, número de operación). Sin
   pago confirmado el alumno no se asigna a un grupo.

## Estados
PENDIENTE ⇄ OBSERVADA → VALIDADA → CITADA → ADMITIDA | NO_ADMITIDO; RECHAZADA desde PENDIENTE u OBSERVADA.

## Se retira
Contraseña y cuenta Postulante al postular, `/api/matriculas/mia` y su pantalla, comprobante de pago,
preferencia de horario, `convocatorias.documentos_requeridos` (texto libre: la lista ahora es fija).
