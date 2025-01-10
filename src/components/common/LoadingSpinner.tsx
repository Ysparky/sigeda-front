export const LoadingSpinner = () => (
  <div className="flex justify-center py-12 animate-fade-in">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600">
      <div className="w-full h-full rounded-full border-2 border-transparent border-t-green-600 animate-pulse"></div>
    </div>
  </div>
); 