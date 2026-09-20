declare global {
  interface ImportMetaEnv {
    readonly VITE_SIGEDA_API_URL?: string
    readonly VITE_IA_API_URL?: string
    readonly VITE_MOCK_API?: string
    readonly VITE_DEPENDENCIAS_RESUELTAS?: string
  }
}

export {}
