/**
 * User Profile Page
 * Main page component for user profile management
 */

import React from 'react';
import { Navigate } from 'react-router-dom';

// Legacy wrapper kept for backward compatibility. Redirect to consolidated /account route.
export default function UserProfilePage() {
  return <Navigate to="/account" replace />;
}