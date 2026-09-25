import { Blob, File } from 'node:buffer'
import { ReadableStream, TransformStream, WritableStream } from 'node:stream/web'

const formularioDeReferencia = await new Response('x=1', {
  headers: { 'content-type': 'application/x-www-form-urlencoded' },
}).formData()

const CLASES_DE_NODE: Record<string, unknown> = {
  Blob,
  File,
  FormData: Object.getPrototypeOf(formularioDeReferencia).constructor,
  ReadableStream,
  TransformStream,
  WritableStream,
}

for (const [nombre, valor] of Object.entries(CLASES_DE_NODE)) {
  Object.defineProperty(globalThis, nombre, { writable: true, configurable: true, value: valor })
}
