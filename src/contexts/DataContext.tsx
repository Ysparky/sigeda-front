import { createContext, useCallback, useContext, useState } from "react";
import { fasesService, type Fase } from "../services/fases.service";
import { SubFase, subfasesService } from "../services/subfases.service";

interface DataContextType {
  fases: Fase[];
  fasesDetail: Record<number, Fase>;
  loadFases: () => Promise<void>;
  loadFaseDetail: (faseId: number) => Promise<void>;
  clearData: () => void;
  subfases: SubFase[];
  loadSubFases: () => Promise<void>;
  selectedFaseId: number | null;
  setSelectedFaseId: (id: number | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [fases, setFases] = useState<Fase[]>([]);
  const [fasesDetail, setFasesDetail] = useState<Record<number, Fase>>({});
  const [subfases, setSubFases] = useState<SubFase[]>([]);
  const [selectedFaseId, setSelectedFaseId] = useState<number | null>(null);

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

  const loadSubFases = useCallback(async () => {
    if (subfases.length > 0) return; // Return if already loaded

    try {
      const data = await subfasesService.getAssignedSubFases();
      setSubFases(data);
    } catch (err) {
      console.error("Error loading subfases:", err);
      throw err;
    }
  }, [subfases.length]);

  const clearData = useCallback(() => {
    setFases([]);
    setFasesDetail({});
    setSubFases([]);
    setSelectedFaseId(null);
  }, []);

  return (
    <DataContext.Provider
      value={{
        fases,
        fasesDetail,
        loadFases,
        loadFaseDetail,
        clearData,
        subfases,
        loadSubFases,
        selectedFaseId,
        setSelectedFaseId,
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
