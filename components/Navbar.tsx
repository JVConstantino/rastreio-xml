
import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <nav className="w-full bg-slate-900/50 backdrop-blur-md shadow-lg p-4 sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between max-w-4xl">
        <div className="text-2xl font-bold text-sky-400">
          AI Tracking
        </div>
        {/* Future navigation links could go here */}
        {/* <div className="space-x-4">
          <a href="#home" className="text-slate-300 hover:text-sky-400 transition-colors">Home</a>
          <a href="#about" className="text-slate-300 hover:text-sky-400 transition-colors">About</a>
        </div> */}
      </div>
    </nav>
  );
};
