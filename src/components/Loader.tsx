import React from 'react';

interface LoaderProps {
  text?: string;
}

const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex flex-col justify-center items-center py-10">
      <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      {text && <p className="mt-4 text-slate-600 font-semibold">{text}</p>}
    </div>
  );
};

export default Loader;
