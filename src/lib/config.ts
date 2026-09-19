export const config = {
  sigedaApiUrl: import.meta.env.VITE_SIGEDA_API_URL ?? 'http://localhost:8080',
  iaApiUrl: import.meta.env.VITE_IA_API_URL ?? 'http://localhost:3000',
  mockApi: import.meta.env.VITE_MOCK_API === 'true',
}
