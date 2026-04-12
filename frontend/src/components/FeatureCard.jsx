import React from 'react';

const FeatureCard = ({ title, description, icon, bgColor, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className={`border-4 border-black ${bgColor} p-6 flex flex-col items-center text-center cursor-pointer shadow-[6px_6px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[10px_10px_0px_rgba(0,0,0,1)] transition-all duration-200`}
    >
      <div className="text-4xl mb-4 bg-white border-2 border-black p-3 rounded-full shadow-[2px_2px_0px_rgba(0,0,0,1)]">
        {icon}
      </div>
      <h3 className="font-heading font-bold text-xl text-black mb-2 uppercase tracking-tight">{title}</h3>
      <p className="font-sans font-medium text-black leading-snug">
        {description}
      </p>
    </div>
  );
};

export default FeatureCard;
