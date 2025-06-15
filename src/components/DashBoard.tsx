import { useEffect, useState, useRef } from 'react';
import { dashboardApi, deleteJobApi, JobFetching } from '@/Api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  Briefcase, 
  Timer, 
  CircleCheck, 
  CircleX,
  Trash2,
  Check,
  X
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'react-hot-toast';
import { AddJobTypes } from '@/pages/AddPage';

export interface JobSearchResponse {
  user?: AddJobTypes[];
  dashboard?: AddJobTypes[];
  data?: AddJobTypes[];
  pagination?: {
    total: number;
    page: number;
    pages: number;
  };
}

// Status types
const STATUS_TYPES = {
  PENDING: 'pending',
  INTERVIEW: 'interview',
  DECLINE: 'declined',
};

// Colors for chart
const STATUS_COLORS = {
  [STATUS_TYPES.PENDING]: '#FFBB28',
  [STATUS_TYPES.INTERVIEW]: '#00C49F',
  [STATUS_TYPES.DECLINE]: '#FF8042',
};

// Custom dropdown menu component for delete confirmation
interface DeleteConfirmDropdownProps {
  isOpen: boolean;
  onDelete: () => void;
  onCancel: () => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const DeleteConfirmDropdown = ({ isOpen, onDelete, onCancel, position = 'bottom-right' }: DeleteConfirmDropdownProps) => {
  if (!isOpen) return null;
  
  // Position classes based on the position prop
  const positionClasses = {
    'bottom-right': 'right-0 top-full mt-1',
    'bottom-left': 'left-0 top-full mt-1',
    'top-right': 'right-0 bottom-full mb-1',
    'top-left': 'left-0 bottom-full mb-1',
  };
  
  return (
    <div className={`absolute z-10 bg-white rounded-md shadow-lg border border-gray-200 w-48 py-1 ${positionClasses[position]}`}>
      <div className="px-3 py-2 text-sm font-medium text-gray-700 border-b border-gray-100">
        Confirm deletion?
      </div>
      <div className="flex p-2 gap-2">
        <button
          onClick={onDelete}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
        >
          <Check size={14} /> Yes
        </button>
        <button
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
        >
          <X size={14} /> No
        </button>
      </div>
    </div>
  );
};

// Hook to detect sidebar state - you'll need to implement this based on your state management
const useSidebarState = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // You might need to get this from a global state or context
  // For now, I'll use localStorage to sync with sidebar state
  useEffect(() => {
    const handleStorageChange = () => {
      const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
      setSidebarCollapsed(collapsed);
    };

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);
    
    // Initial check
    handleStorageChange();

    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return { sidebarCollapsed, isMobile };
};

const DashBoard = () => {
  const { data, isLoading } = useQuery<{ dashboard: AddJobTypes[] }>("jobDashboard", dashboardApi);
  const { data: dataJobFetch, isLoading: loadingJobFetch } = useQuery<JobSearchResponse>("jobfetch", JobFetching);
  
  // Get sidebar state
  const { sidebarCollapsed, isMobile } = useSidebarState();
  
  // State for delete confirmation dropdown
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    jobId: string | null;
  }>({
    isOpen: false,
    jobId: null
  });
  
  // For debugging - log job data
  useEffect(() => {
    if (data?.dashboard) {
      console.log("Dashboard data jobs:", data.dashboard);
    }
    if (dataJobFetch) {
      console.log("Job fetch data:", dataJobFetch);
    }
  }, [data, dataJobFetch]);
  
  // Close dropdown when clicking outside
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDeleteConfirmation({ isOpen: false, jobId: null });
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Access the query client for invalidating queries after mutation
  const queryClient = useQueryClient();
  
  // Setup delete mutation
  const deleteJobMutation = useMutation(deleteJobApi, {
    onSuccess: (data) => {
      console.log("Delete successful:", data);
      queryClient.invalidateQueries('jobDashboard');
      queryClient.invalidateQueries('jobfetch');
      toast.success('Job deleted successfully');
      setDeleteConfirmation({ isOpen: false, jobId: null });
    },
    onError: () => {
      toast.error('Failed to delete job');
      setDeleteConfirmation({ isOpen: false, jobId: null });
    }
  });
  
  // Open delete confirmation dropdown
  const openDeleteConfirmation = (jobId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    console.log("Opening delete confirmation for job ID:", jobId);
    setDeleteConfirmation({ 
      isOpen: true, 
      jobId 
    });
  };
  
  // Handler for confirming deletion
  const handleConfirmDelete = () => {
    if (deleteConfirmation.jobId) {
      console.log("Confirming deletion of job ID:", deleteConfirmation.jobId);
      deleteJobMutation.mutate(deleteConfirmation.jobId);
    }
  };
  
  // Handler for canceling deletion
  const handleCancelDelete = () => {
    setDeleteConfirmation({ isOpen: false, jobId: null });
  };
  
  const [statusCounts, setStatusCounts] = useState({
    [STATUS_TYPES.PENDING]: 0,
    [STATUS_TYPES.INTERVIEW]: 0,
    [STATUS_TYPES.DECLINE]: 0,
  });

  // Process data to get counts
  useEffect(() => {
    if (data?.dashboard) {
      const counts = {
        [STATUS_TYPES.PENDING]: 0,
        [STATUS_TYPES.INTERVIEW]: 0,
        [STATUS_TYPES.DECLINE]: 0,
      };
      
      data.dashboard.forEach(job => {
        const statusValue = job.jobStatus;
        let statusString = '';
        
        if (typeof statusValue === 'string') {
          statusString = statusValue.toLowerCase();
        } else if (statusValue) {
          statusString = String(statusValue).toLowerCase();
        }
        
        if (statusString.includes('pend')) {
          counts[STATUS_TYPES.PENDING]++;
        } else if (statusString.includes('interview')) {
          counts[STATUS_TYPES.INTERVIEW]++;
        } else if (statusString.includes('declin') || statusString.includes('decline')) {
          counts[STATUS_TYPES.DECLINE]++;
        }
      });
      
      setStatusCounts(counts);
    }
  }, [data]);

  // Generate pie chart data
  const pieChartData = [
    { name: 'Pending', value: statusCounts[STATUS_TYPES.PENDING], color: STATUS_COLORS[STATUS_TYPES.PENDING] },
    { name: 'Interview', value: statusCounts[STATUS_TYPES.INTERVIEW], color: STATUS_COLORS[STATUS_TYPES.INTERVIEW] },
    { name: 'Declined', value: statusCounts[STATUS_TYPES.DECLINE], color: STATUS_COLORS[STATUS_TYPES.DECLINE] }
  ];

  // Function to get job title from fetched data if available
  interface Job {
    _id: string;
    jobTitle?: string;
    companyName?: string;
    jobStatus?: string;
    date?: string | Date;
    createdAt?: string | Date;
    dateApplied?: string | Date;
    userId?: string;
  }

  const getJobTitle = (job: AddJobTypes) => {
    if (job && job.jobTitle) {
      return job.jobTitle
    }
    
    if (dataJobFetch && dataJobFetch.user && Array.isArray(dataJobFetch.user) && job && job._id) {
      const matchingJob = dataJobFetch.user.find(fetchedJob => fetchedJob._id === job._id || fetchedJob.userId === job._id);
      if (matchingJob && matchingJob.jobTitle) {
        return matchingJob.jobTitle;
      }
    }
    
    return 'Untitled Job';
  };
  
  const getCompanyName = (job: AddJobTypes | null | undefined) => {
    if (job && job.companyName) {
      return job.companyName;
    }
    
    if (dataJobFetch && dataJobFetch.user && Array.isArray(dataJobFetch.user) && job && job._id) {
      const matchingJob = dataJobFetch.user.find((fetchedJob: Job) => fetchedJob._id === job._id || fetchedJob.userId === job._id);
      if (matchingJob && matchingJob.companyName) {
        return matchingJob.companyName;
      }
    }
    
    return 'Unknown Company';
  };

  const getFormattedDate = (job: AddJobTypes | null | undefined) => {
    if (!job) return 'Date not available';
    
    const dateValue = job.date;
    
    if (!dateValue) return 'Date not available';
    
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return 'Date not available';
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      console.log(e);
      return 'Date not available';
    }
  };

  // Loading skeleton
  if (isLoading || loadingJobFetch || deleteJobMutation.isLoading) {
    return (
      <div className={`transition-all duration-300 ${
        isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-16' : 'ml-64')
      }`}>
        <div className="container mx-auto px-4 py-6">
          <div className="mb-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-80"></div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md p-4 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="w-full">
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="bg-gray-200 h-12 w-12 rounded-full"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Determine which data source to use for the table
  const jobsToDisplay = dataJobFetch?.dashboard || dataJobFetch?.user || data?.dashboard || [];
  const totalJobs = data?.dashboard?.length || 0;

  return (
    <div className={`transition-all duration-300 ${
      isMobile ? 'ml-0' : (sidebarCollapsed ? 'ml-16' : 'ml-64')
    }`}>
      <div className="container mx-auto px-4 py-6">
        {/* Dashboard Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Job Application Dashboard</h1>
          <p className="text-gray-600">Track and manage your job application progress</p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Applications Card */}
          <div className="bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg border-t-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Total Applications</p>
                <p className="text-3xl font-bold text-gray-800">{totalJobs}</p>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-md">
                <Briefcase size={30} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Pending Card */}
          <div className="bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg border-t-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Pending</p>
                <p className="text-3xl font-bold text-gray-800">{statusCounts[STATUS_TYPES.PENDING]}</p>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md">
                <Timer size={30} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Interview Card */}
          <div className="bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg border-t-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Interview</p>
                <p className="text-3xl font-bold text-gray-800">{statusCounts[STATUS_TYPES.INTERVIEW]}</p>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-md">
                <CircleCheck size={30} strokeWidth={1.5} />
              </div>
            </div>
          </div>

          {/* Declined Card */}
          <div className="bg-white rounded-lg shadow-md p-6 transition-all hover:shadow-lg border-t-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium mb-1">Declined</p>
                <p className="text-3xl font-bold text-gray-800">{statusCounts[STATUS_TYPES.DECLINE]}</p>
              </div>
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white shadow-md">
                <CircleX size={30} strokeWidth={1.5} />
              </div>
            </div>
          </div>
        </div>

        {/* Chart Section */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-4 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Application Status Distribution</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => 
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {
                    pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))
                  }
                </Pie>
                <Tooltip formatter={(value) => [`${value} jobs`, 'Count']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Applications */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-4 border border-gray-100">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Recent Job Applications</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-4 text-left">Job Title</th>
                  <th className="py-3 px-4 text-left">Company</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="text-gray-600">
                {Array.isArray(jobsToDisplay) && jobsToDisplay.slice(0, 5).map((job, index) => {
                  const jobStatus = job.jobStatus;
                  let statusString = '';
                  
                  if (typeof jobStatus === 'string') {
                    statusString = jobStatus.toLowerCase();
                  } else if (jobStatus) {
                    statusString = String(jobStatus).toLowerCase();
                  }
                  
                  let displayStatus = 'Unknown';
                  let statusClass = 'bg-gray-100 text-gray-800';
                  
                  if (statusString.includes('pend')) {
                    statusClass = 'bg-yellow-100 text-yellow-800';
                    displayStatus = 'Pending';
                  } else if (statusString.includes('interview')) {
                    statusClass = 'bg-green-100 text-green-800';
                    displayStatus = 'Interview';
                  } else if (statusString.includes('declin') || statusString.includes('decline')) {
                    statusClass = 'bg-red-100 text-red-800';
                    displayStatus = 'Declined';
                  }
                  
                  return (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{getFormattedDate(job)}</td>
                      <td className="py-3 px-4 font-medium">{getJobTitle(job)}</td>
                      <td className="py-3 px-4">{getCompanyName(job)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
                          {displayStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center relative" ref={deleteConfirmation.jobId === job._id ? dropdownRef : null}>
                          <button 
                            onClick={(e) => openDeleteConfirmation(job._id, e)}
                            className="p-1.5 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete job"
                            disabled={deleteJobMutation.isLoading}
                          >
                            <Trash2 size={18} />
                          </button>
                          
                          {/* Delete confirmation dropdown */}
                          {deleteConfirmation.jobId === job._id && (
                            <DeleteConfirmDropdown 
                              isOpen={deleteConfirmation.isOpen}
                              onDelete={handleConfirmDelete}
                              onCancel={handleCancelDelete}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                
                {(!jobsToDisplay || jobsToDisplay.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No jobs  found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashBoard;