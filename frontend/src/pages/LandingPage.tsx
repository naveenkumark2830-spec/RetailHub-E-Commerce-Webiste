import React from 'react';
import { Navigate } from 'react-router-dom';

export const LandingPage: React.FC = () => {
  return <Navigate to="/home" replace />;
};
