import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  BarChart3, 
  FileText, 
  Users, 
  Search, 
  Settings, 
  HelpCircle,
  MessageSquare,
  Shield,
  TrendingUp,
  User,
  BookOpen
} from 'lucide-react';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Bills', href: '/bills', icon: FileText },
  { name: 'Community', href: '/community', icon: Users },
  { name: 'Expert Verification', href: '/expert-verification', icon: Shield },
  { name: 'Sponsorship Analysis', href: '/bill-sponsorship-analysis', icon: TrendingUp },
  { name: 'Profile', href: '/profile', icon: User },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r border-border">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary p-1">
          <img 
            src="/Chanuka_logo.svg" 
            alt="Chanuka Logo" 
            className="h-full w-full object-contain filter brightness-0 invert"
          />
        </div>
        <span className="text-xl font-bold text-primary">Chanuka</span>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search bills..."
            className="w-full pl-9 pr-3 py-2 bg-muted border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-4">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
            <span className="text-xs font-medium text-accent-foreground">U</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">User</p>
            <p className="text-xs text-muted-foreground truncate">user@example.com</p>
          </div>
          <Link
            to="/profile"
            className="p-1 rounded-md hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    </div>
  );
}