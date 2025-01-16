import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("API URL not defined in environment variables");
}

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      throw new Error(
        error.response.data.message || "Error en la respuesta del servidor"
      );
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error("No se recibió respuesta del servidor");
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error("Error al realizar la petición");
    }
  }
);
