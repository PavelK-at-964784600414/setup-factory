'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PlayCircle, History, BarChart3, Activity, Home, Settings } from 'lucide-react';
import clsx from 'clsx';

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Scripts', href: '/scripts', icon: PlayCircle },
  { name: 'Jobs', href: '/jobs', icon: History },
  { name: 'Dashboard', href: '/dashboard', icon: BarChart3 },
  { name: 'Agents', href: '/agents', icon: Activity },
  { name: 'Parameters', href: '/parameters', icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <PlayCircle className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">
                Setup Factory
              </span>
            </Link>
          </div>

          <div className="flex space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={clsx(
                    'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">User Name</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
