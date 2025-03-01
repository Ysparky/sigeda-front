export function SkeletonLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm p-6 animate-pulse"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="w-2/3">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-blue-100 rounded-full w-20"></div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
              <div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>

            <div className="border-t pt-4 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="h-4 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-5 bg-green-100 rounded-full w-16"></div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <div className="h-4 bg-gray-200 rounded w-24"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
