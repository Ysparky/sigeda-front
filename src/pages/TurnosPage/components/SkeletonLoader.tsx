export function SkeletonLoader() {
  return (
    <div className="w-full animate-pulse">
      {/* Generate 6 skeleton cards in a grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="bg-white rounded-lg shadow-sm p-6 border border-gray-100"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-3/4">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-100 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-blue-100 rounded w-1/5"></div>
            </div>

            <div className="border-t border-gray-100 pt-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="h-4 w-4 bg-gray-200 rounded-full"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="h-4 bg-blue-100 rounded w-32"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
