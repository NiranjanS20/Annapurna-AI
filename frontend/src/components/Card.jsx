import React from 'react';

const Card = ({ children, className = '', title, noPadding = false }) => {
  return (
    <div className={`dashboard-card ${noPadding ? '' : 'p-6'} ${className}`}>
      {title && (
        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100 tracking-tight mb-4 px-6 pt-6">{title}</h3>
      )}
      {children}
    </div>
  );
};

export default Card;
