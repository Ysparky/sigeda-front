export const getModuleIcon = (nombre: string) => {
  switch (nombre) {
    case 'Adaptación':
      return '📋';
    case 'Operaciones HeliTransportadas':
      return '🚁';
    case 'Operaciones AeroTácticas':
      return '✈️';
    default:
      return '📚';
  }
};

export const getSubModuleIcon = (nombre: string) => {
  switch (nombre) {
    case 'Contacto':
      return '📞';
    case 'Navegación':
      return '🧭';
    case 'Instrumentos':
      return '🎯';
    case 'Campos Extraños':
      return '📝';
    case 'Formación':
      return '📚';
    default:
      return '📋';
  }
}; 