import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthProvider";
import { DataProvider } from "./contexts/DataContext";
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
