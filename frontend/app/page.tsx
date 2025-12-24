import Link from 'next/link';
import { Activity, PlayCircle, History, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Setup Factory
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Quickly reproduce automation and customer-facing bugs — run existing scripts 
          with exact parameters, capture environment and artifacts, and create reproducible 
          traces for debugging and Jira tickets.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
        <Link href="/scripts" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <PlayCircle className="w-8 h-8 text-primary-600" />
            <h2 className="text-xl font-semibold">Scripts</h2>
          </div>
          <p className="text-gray-600">
            Browse and execute reproduction scripts
          </p>
        </Link>

        <Link href="/jobs" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <History className="w-8 h-8 text-primary-600" />
            <h2 className="text-xl font-semibold">Jobs</h2>
          </div>
          <p className="text-gray-600">
            View job history and download bundles
          </p>
        </Link>

        <Link href="/dashboard" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <BarChart3 className="w-8 h-8 text-primary-600" />
            <h2 className="text-xl font-semibold">Dashboard</h2>
          </div>
          <p className="text-gray-600">
            Metrics, failures, and reproducibility stats
          </p>
        </Link>

        <Link href="/agents" className="card hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3 mb-3">
            <Activity className="w-8 h-8 text-primary-600" />
            <h2 className="text-xl font-semibold">Agents</h2>
          </div>
          <p className="text-gray-600">
            Monitor registered agents status
          </p>
        </Link>
      </div>

      <div className="card mt-12 bg-blue-50 border-blue-200">
        <h2 className="text-2xl font-semibold mb-4">How to Reproduce a Bug</h2>
        <ol className="space-y-3 text-gray-700">
          <li className="flex items-start">
            <span className="font-bold text-primary-600 mr-2">1.</span>
            <span>Browse Scripts — Find the relevant automation script</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-primary-600 mr-2">2.</span>
            <span>Configure Parameters — Fill in required parameters</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-primary-600 mr-2">3.</span>
            <span>Choose Execution Mode — Agent (local credentials) or Server (Vault)</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-primary-600 mr-2">4.</span>
            <span>Preview & Execute — Review dry-run CLI and run the job</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-primary-600 mr-2">5.</span>
            <span>Monitor & Collect — Watch live logs and capture artifacts</span>
          </li>
          <li className="flex items-start">
            <span className="font-bold text-primary-600 mr-2">6.</span>
            <span>Download Bundle — Get complete reproduction bundle for debugging</span>
          </li>
        </ol>
      </div>
    </div>
  );
}
