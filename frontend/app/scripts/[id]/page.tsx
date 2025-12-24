'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { FormRenderer } from '@/components/FormRenderer';
import { Terminal, Server, User, Download, Play } from 'lucide-react';
import { api } from '@/lib/api';

export default function ScriptRunPage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const [runTarget, setRunTarget] = useState<'agent' | 'server'>('agent');
  const [showDryRun, setShowDryRun] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const { data: script, isLoading } = useQuery({
    queryKey: ['script', scriptId],
    queryFn: () => api.get(`/api/scripts/${scriptId}`).then((res) => res.data),
  });

  const { data: schema } = useQuery({
    queryKey: ['script-schema', scriptId],
    queryFn: () => api.get(`/api/scripts/${scriptId}/schema`).then((res) => res.data),
  });

  const createJobMutation = useMutation({
    mutationFn: (data: any) => api.post('/api/jobs', data).then((res) => res.data),
    onSuccess: (job) => {
      router.push(`/jobs/${job.id}`);
    },
  });

  const handleFormSubmit = (data: Record<string, any>) => {
    setFormData(data);
    setShowDryRun(true);
  };

  const handleExecute = () => {
    createJobMutation.mutate({
      script_id: scriptId,
      parameters: formData,
      runner: runTarget,
    });
  };

  const generateCLI = () => {
    if (!script || !formData) return '';
    
    const args = Object.entries(formData)
      .map(([key, value]) => `-${key} "${value}"`)
      .join(' ');
    
    return `${script.path} ${args}`;
  };

  if (isLoading) {
    return <div className="text-center py-12">Loading script...</div>;
  }

  if (!script) {
    return <div className="text-center py-12">Script not found</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{script.name}</h1>
        <p className="text-gray-600">{script.description}</p>
      </div>

      {!showDryRun ? (
        <div className="card">
          <h2 className="text-xl font-semibold mb-6">Configure Parameters</h2>

          {/* Runner Selection */}
          <div className="mb-6">
            <label className="label">Execution Target</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setRunTarget('agent')}
                className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                  runTarget === 'agent'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <User className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">Agent</div>
                <div className="text-sm text-gray-600">
                  Use local credentials
                </div>
              </button>
              <button
                onClick={() => setRunTarget('server')}
                className={`flex-1 p-4 border-2 rounded-lg transition-colors ${
                  runTarget === 'server'
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <Server className="w-6 h-6 mx-auto mb-2" />
                <div className="font-semibold">Server</div>
                <div className="text-sm text-gray-600">
                  Use Vault credentials
                </div>
              </button>
            </div>
          </div>

          {/* Parameters Form */}
          {schema?.parameters && (
            <FormRenderer
              parameters={schema.parameters}
              onSubmit={handleFormSubmit}
            />
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Dry Run Preview */}
          <div className="card">
            <div className="flex items-center space-x-2 mb-4">
              <Terminal className="w-5 h-5 text-gray-600" />
              <h2 className="text-xl font-semibold">Command Preview</h2>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-x-auto">
              {generateCLI()}
            </div>
          </div>

          {/* Parameters Summary */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Parameters</h2>
            <dl className="space-y-3">
              {Object.entries(formData).map(([key, value]) => (
                <div key={key} className="flex border-b border-gray-200 pb-2">
                  <dt className="font-medium text-gray-700 w-1/3">{key}:</dt>
                  <dd className="text-gray-900 w-2/3">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Execution Target */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Execution</h2>
            <div className="flex items-center space-x-3">
              {runTarget === 'agent' ? (
                <User className="w-6 h-6 text-primary-600" />
              ) : (
                <Server className="w-6 h-6 text-primary-600" />
              )}
              <div>
                <div className="font-medium">
                  {runTarget === 'agent' ? 'Agent Mode' : 'Server Mode'}
                </div>
                <div className="text-sm text-gray-600">
                  {runTarget === 'agent'
                    ? 'Runs on your machine using local credentials'
                    : 'Runs in isolated container with Vault credentials'}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={() => setShowDryRun(false)}
              className="btn btn-secondary flex-1"
            >
              Back to Edit
            </button>
            <button
              onClick={handleExecute}
              disabled={createJobMutation.isPending}
              className="btn btn-primary flex-1 flex items-center justify-center space-x-2"
            >
              <Play className="w-5 h-5" />
              <span>
                {createJobMutation.isPending ? 'Starting...' : 'Execute Job'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
