import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/auth";
import { DataProvider } from "./contexts/data";
import AppRoutes from "./routes";

function App() {
  return (
    <BrowserRouter>
      <DataProvider>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </DataProvider>
    </BrowserRouter>
  );
}

export default App;
