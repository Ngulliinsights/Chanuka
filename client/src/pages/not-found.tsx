
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/logo';
import { logger } from '../utils/logger.js';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8" data-testid="not-found-page">
      <div className="sm:mx-auto sm:w-full sm:max-w-md" data-testid="not-found-container">
        <div className="text-center" data-testid="not-found-content">
          <div className="flex justify-center mb-8" data-testid="not-found-logo">
            <Logo size="lg" showText={true} />
          </div>
          <h1 className="text-9xl font-bold text-blue-600" data-testid="not-found-title">404</h1>
          <h2 className="mt-4 text-3xl font-bold text-gray-900" data-testid="not-found-subtitle">Page not found</h2>
          <p className="mt-2 text-lg text-gray-600" data-testid="not-found-message">
            Sorry, we couldn't find the page you're looking for.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center" data-testid="not-found-actions">
            <Link
              to="/"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              data-testid="not-found-go-home"
            >
              Go Home
            </Link>
            <Link
              to="/bills"
              className="border border-gray-300 hover:bg-gray-50 text-gray-700 px-6 py-3 rounded-lg font-semibold transition-colors"
              data-testid="not-found-browse-bills"
            >
              Browse Bills
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
