
export const JobCardSkeleton = () => {
  return (
    <div className="border rounded-md p-4 mb-4 bg-white shadow-sm animate-pulse">
      <div className="flex gap-4">
        {/* Company logo skeleton */}
        <div className="w-16 h-16 bg-gray-200 rounded-md"></div>
        
        <div className="flex-1 space-y-2">
          {/* Title skeleton */}
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          
          {/* Company name skeleton */}
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          
          {/* Description skeleton */}
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          <div className="h-3 bg-gray-200 rounded w-full"></div>
          
          {/* Job details skeleton */}
          <div className="flex gap-2 pt-1">
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
            <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};
export const JobSkeletons = ({ count = 5 }) => {
    return (
      <div className="space-y-4">
        {Array(count).fill(0).map((_, index) => (
          <JobCardSkeleton key={index} />
        ))}
      </div>
    );
  };