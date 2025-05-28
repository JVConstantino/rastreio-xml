
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  return (
    <div className="my-8 p-4 bg-red-700/30 border border-red-600 text-red-300 rounded-lg shadow-md text-center">
      <p className="font-semibold">Oops! Something went wrong.</p>
      <p>{message}</p>
    </div>
  );
};
