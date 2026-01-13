'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Edit2, Save, X, Download } from 'lucide-react';
import { api } from '@/lib/api';

interface UserParameter {
  id: string;
  key: string;
  value: string;
  description?: string;
  category?: string;
  created_at: string;
  updated_at: string;
}

export default function ParametersPage() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    description: '',
    category: 'general',
  });

  const { data: parameters, isLoading } = useQuery({
    queryKey: ['user-parameters'],
    queryFn: () => api.get('/api/user-parameters').then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/api/user-parameters', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-parameters'] });
      setShowAddForm(false);
      setFormData({ key: '', value: '', description: '', category: 'general' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: Partial<UserParameter> }) =>
      api.put(`/api/user-parameters/${key}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-parameters'] });
      setEditingId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (key: string) => api.delete(`/api/user-parameters/${key}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-parameters'] });
    },
  });

  const exportParameters = async () => {
    const response = await api.get('/api/user-parameters/export/json');
    const blob = new Blob([JSON.stringify(response.data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-parameters-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const categories = ['general', 'credentials', 'network', 'endpoints', 'other'];

  const groupedParameters = parameters?.reduce((acc: Record<string, UserParameter[]>, param: UserParameter) => {
    const cat = param.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(param);
    return acc;
  }, {});

  if (isLoading) {
    return <div className="text-center py-12">Loading parameters...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Parameters</h1>
          <p className="text-gray-600 mt-1">
            Configure reusable values for script execution (usernames, IPs, endpoints, etc.)
          </p>
        </div>
        <div className="flex space-x-3">
          <button onClick={exportParameters} className="btn btn-secondary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Parameter</span>
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Add New Parameter</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Key *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., default_host, api_endpoint"
                value={formData.key}
                onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Value *</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., server.example.com, user123"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Description</label>
              <input
                type="text"
                className="input"
                placeholder="Optional description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-3">
              <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Saving...' : 'Save Parameter'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ key: '', value: '', description: '', category: 'general' });
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Parameters List */}
      {!parameters || parameters.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No parameters configured yet.</p>
          <p className="text-sm text-gray-500 mt-2">
            Add parameters to store reusable values for script execution.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedParameters || {}).map(([category, params]: [string, UserParameter[]]) => (
            <div key={category} className="card">
              <h2 className="text-xl font-semibold mb-4 capitalize">{category}</h2>
              <div className="space-y-3">
                {params.map((param) => (
                  <div
                    key={param.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300"
                  >
                    {editingId === param.id ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          className="input"
                          defaultValue={param.value}
                          onChange={(e) => {
                            param.value = e.target.value;
                          }}
                        />
                        <input
                          type="text"
                          className="input text-sm"
                          placeholder="Description"
                          defaultValue={param.description || ''}
                          onChange={(e) => {
                            param.description = e.target.value;
                          }}
                        />
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              updateMutation.mutate({
                                key: param.key,
                                data: {
                                  value: param.value,
                                  description: param.description,
                                },
                              });
                            }}
                            className="text-sm text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save</span>
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-sm text-gray-600 hover:text-gray-700 flex items-center space-x-1"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3">
                            <code className="text-sm font-mono font-semibold text-gray-900">
                              {param.key}
                            </code>
                            <span className="text-gray-600">=</span>
                            <span className="text-gray-900">{param.value}</span>
                          </div>
                          {param.description && (
                            <p className="text-sm text-gray-600 mt-1">{param.description}</p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingId(param.id)}
                            className="text-gray-600 hover:text-primary-600"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete parameter "${param.key}"?`)) {
                                deleteMutation.mutate(param.key);
                              }
                            }}
                            className="text-gray-600 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
