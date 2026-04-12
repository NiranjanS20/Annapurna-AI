import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../utils/constants';
import FeatureCard from '../components/FeatureCard';

const Landing = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  useEffect(() => {
    if (currentUser) {
      navigate(ROUTES.DASHBOARD, { replace: true });
    }
  }, [currentUser, navigate]);

  const handleCTA = () => {
    if (currentUser) {
      navigate(ROUTES.DASHBOARD);
    } else {
      navigate(ROUTES.AUTH);
    }
  };

  const features = [
    {
      title: 'Demand Prediction',
      description: 'Predict daily demand accurately to avoid overcooking.',
      icon: '📊',
      bgColor: 'bg-[#FDE047]' // bold yellow
    },
    {
      title: 'Food Entry Tracking',
      description: 'Track what is cooked vs sold in under 3 clicks.',
      icon: '🍛',
      bgColor: 'bg-[#93C5FD]' // bold light blue
    },
    {
      title: 'Smart Alerts',
      description: 'Get notified for overproduction or impending expiry.',
      icon: '🚨',
      bgColor: 'bg-[#FCA5A5]' // bold red
    },
    {
      title: 'Donation System',
      description: 'Quickly mark surplus for local community donation.',
      icon: '🤝',
      bgColor: 'bg-[#86EFAC]' // bold green
    },
    {
      title: 'Analytics Dashboard',
      description: 'Visualize your waste metrics and make bold decisions.',
      icon: '📈',
      bgColor: 'bg-[#D8B4FE]' // bold purple
    }
  ];

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-black">
      {/* Navbar override essentially for landing page */}
      <header className="border-b-4 border-black bg-white p-6 flex justify-between items-center shadow-[0_4px_0px_rgba(0,0,0,1)] relative z-20">
        <h1 className="text-3xl font-heading font-black tracking-tighter uppercase">Annapurna AI</h1>
        <button 
          onClick={handleCTA}
          className="font-heading font-bold uppercase tracking-wider text-sm md:text-base border-4 border-black bg-white px-6 py-2 shadow-[4px_4px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_rgba(0,0,0,1)] transition-all duration-200"
        >
          {currentUser ? 'Dashboard' : 'Login'}
        </button>
      </header>

      {/* Hero Section */}
      <section className="relative py-24 px-6 overflow-hidden">
        {/* Decorative Grid Background specific to Neobrutalism hero */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '30px 30px' }}></div>
        
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h2 className="text-6xl md:text-8xl font-heading font-black uppercase tracking-tighter leading-[0.9] mb-8 drop-shadow-[4px_4px_0px_rgba(0,0,0,1)]">
            Annapurna AI
          </h2>
          <p className="text-xl md:text-3xl font-sans font-medium max-w-2xl mx-auto border-4 border-black bg-[#FDE047] p-4 shadow-[6px_6px_0px_rgba(0,0,0,1)] mb-12">
            Smart Food Waste Management using AI
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <button 
              onClick={handleCTA}
              className="text-xl font-heading font-bold uppercase w-full sm:w-auto border-4 border-black bg-[#93C5FD] px-10 py-5 shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_rgba(0,0,0,1)] transition-all duration-200 active:translate-y-2 active:translate-x-2 active:shadow-none"
            >
              Get Started
            </button>
            <button 
              onClick={() => navigate(ROUTES.AUTH)}
              className="text-xl font-heading font-bold uppercase w-full sm:w-auto border-4 border-black bg-white px-10 py-5 shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_rgba(0,0,0,1)] transition-all duration-200 active:translate-y-2 active:translate-x-2 active:shadow-none"
            >
              Login
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t-4 border-black bg-white py-24 px-6 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-heading font-black uppercase mb-16 text-center drop-shadow-[3px_3px_0px_rgba(0,0,0,1)]">
            Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className={idx >= 3 ? "lg:col-span-1" : "col-span-1"}>
                <FeatureCard 
                  {...feature} 
                  onClick={handleCTA} 
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t-4 border-black bg-[#FCA5A5] py-32 px-6 text-center relative z-10">
        <div className="max-w-3xl mx-auto border-8 border-black bg-white p-12 shadow-[16px_16px_0px_rgba(0,0,0,1)] transform -rotate-1 hover:rotate-0 transition-transform duration-300">
          <h2 className="text-4xl md:text-6xl font-heading font-black uppercase mb-8 leading-none">
            Start reducing food waste today
          </h2>
          <button 
            onClick={handleCTA}
            className="text-2xl font-heading font-bold uppercase border-4 border-black bg-[#FDE047] px-12 py-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] hover:-translate-y-2 hover:-translate-x-2 hover:shadow-[16px_16px_0px_rgba(0,0,0,1)] transition-all duration-200 active:translate-y-2 active:translate-x-2 active:shadow-none"
          >
            Sign Up Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 text-center">
        <p className="font-heading font-bold uppercase tracking-widest text-sm">
          &copy; {new Date().getFullYear()} Annapurna AI. All Rights Reserved.
        </p>
      </footer>
    </div>
  );
};

export default Landing;
