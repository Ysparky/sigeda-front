import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/auth";
import { DataProvider } from "./contexts/data";
import { AlumnosProvider } from "./contexts/data/AlumnosContext";
import AppRoutes from "./routes";

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AuthProvider>
          <AlumnosProvider>
            <AppRoutes />
          </AlumnosProvider>
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;
