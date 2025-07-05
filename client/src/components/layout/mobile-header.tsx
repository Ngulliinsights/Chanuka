
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Search, Gavel } from 'lucide-react';
import { cn } from '../../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Bills', href: '/bills' },
  { name: 'Analysis', href: '/analysis' },
  { name: 'Sponsorship', href: '/bill-sponsorship-analysis' },
  { name: 'Verification', href: '/expert-verification' },
];

export function MobileHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary p-1">
              <img 
                src="/Chanuka_logo.svg" 
                alt="Chanuka Logo" 
                className="h-full w-full object-contain filter brightness-0 invert"
              />
            </div>
            <span className="text-lg font-bold text-primary">Chanuka</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-md hover:bg-muted transition-colors">
              <Search className="h-5 w-5 text-muted-foreground" />
            </button>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-muted transition-colors"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Menu className="h-5 w-5 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="bg-card border-b border-border">
          <nav className="px-4 py-2 space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    'block px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
