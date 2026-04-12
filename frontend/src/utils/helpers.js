// Helper function to format numbers with commas
export const formatNumber = (num) => {
  return num?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

// Helper function to format date
export const formatDate = (dateString) => {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
};

// Return a Tailwind color class based on status
export const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'critical':
    case 'high':
    case 'red':
      return 'text-status-red';
    case 'warning':
    case 'medium':
    case 'yellow':
      return 'text-status-yellow';
    case 'info':
    case 'low':
    case 'blue':
      return 'text-status-blue';
    case 'success':
    case 'green':
      return 'text-status-green';
    default:
      return 'text-neutral-700';
  }
};
