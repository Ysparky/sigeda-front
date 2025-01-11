import { createContext, useCallback, useContext, useState } from "react";
import { authService } from "../services/auth.service";
import { fasesService, type Fase } from "../services/fases.service";
import type { UserInfo } from "../types/auth.types";

interface DataContextType {
  userInfo: UserInfo | null;
  fases: Fase[];
  fasesDetail: Record<number, Fase>;
  loadUserInfo: () => Promise<void>;
  loadFases: () => Promise<void>;
  loadFaseDetail: (faseId: number) => Promise<void>;
  clearData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [fases, setFases] = useState<Fase[]>([]);
  const [fasesDetail, setFasesDetail] = useState<Record<number, Fase>>({});

  const loadUserInfo = useCallback(async () => {
    if (userInfo) return; // Return if already loaded

    const token = localStorage.getItem("auth_token");
    const username = localStorage.getItem("username");

    if (!token || !username) return;

    try {
      const data = await authService.getUserInfo(token, username);
      setUserInfo(data);
    } catch (err) {
      console.error("Error loading user info:", err);
      throw err;
    }
  }, [userInfo]);

  const loadFases = useCallback(async () => {
    if (fases.length > 0) return; // Return if already loaded

    try {
      const data = await fasesService.getFases();
      setFases(data);
    } catch (err) {
      console.error("Error loading fases:", err);
      throw err;
    }
  }, [fases.length]);

  const loadFaseDetail = useCallback(
    async (faseId: number) => {
      if (fasesDetail[faseId]) return; // Return if already cached

      try {
        const faseDetail = await fasesService.getFaseById(faseId);
        setFasesDetail((prev) => ({
          ...prev,
          [faseId]: faseDetail,
        }));
      } catch (err) {
        console.error("Error loading fase detail:", err);
        throw err;
      }
    },
    [fasesDetail]
  );

  const clearData = useCallback(() => {
    setUserInfo(null);
    setFases([]);
    setFasesDetail({});
  }, []);

  return (
    <DataContext.Provider
      value={{
        userInfo,
        fases,
        fasesDetail,
        loadUserInfo,
        loadFases,
        loadFaseDetail,
        clearData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider");
  }
  return context;
};
