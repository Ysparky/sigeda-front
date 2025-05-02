import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/auth";
import { DataProvider } from "./contexts/data";
import { ConditionalAlumnosProvider } from "./components/providers/ConditionalAlumnosProvider";
import AppRoutes from "./routes";

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AuthProvider>
          <ConditionalAlumnosProvider>
            <AppRoutes />
          </ConditionalAlumnosProvider>
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;
