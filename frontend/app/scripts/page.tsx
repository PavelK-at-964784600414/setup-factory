'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { PlayCircle, Clock, FileText } from 'lucide-react';
import { api } from '@/lib/api';

export default function ScriptsPage() {
  const { data: scripts, isLoading } = useQuery({
    queryKey: ['scripts'],
    queryFn: () => api.get('/api/scripts').then((res) => res.data),
  });

  if (isLoading) {
    return <div className="text-center py-12">Loading scripts...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Automation Scripts</h1>
        <button
          onClick={() => api.post('/api/admin/sync-scripts')}
          className="btn btn-secondary"
        >
          Sync from Bitbucket
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts?.map((script: any) => (
          <Link
            key={script.id}
            href={`/scripts/${script.id}`}
            className="card hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <h2 className="text-xl font-semibold text-gray-900">
                {script.name}
              </h2>
              <PlayCircle className="w-6 h-6 text-primary-600 flex-shrink-0" />
            </div>

            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
              {script.description}
            </p>

            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span className="flex items-center">
                  <FileText className="w-4 h-4 mr-1" />
                  {script.path?.split('/').pop()}
                </span>
              </div>
              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                {script.default_runner || 'agent'}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {scripts?.length === 0 && (
        <div className="text-center py-12 card">
          <PlayCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No scripts found
          </h3>
          <p className="text-gray-600 mb-4">
            Sync scripts from Bitbucket to get started
          </p>
          <button
            onClick={() => api.post('/api/admin/sync-scripts')}
            className="btn btn-primary"
          >
            Sync Now
          </button>
        </div>
      )}
    </div>
  );
}
