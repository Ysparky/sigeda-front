import type { Fase } from '../../services/fases.service';

export interface ModulesSectionProps {
  fases: Fase[];
  isLoading: boolean;
  selectedFase: Fase | null;
  onFaseClick: (fase: Fase) => void;
}

export interface SubModulesSectionProps {
  fase: Fase;
  isLoading: boolean;
  error?: string | null;
} 