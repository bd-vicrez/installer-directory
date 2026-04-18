'use client';

import { useState, useEffect } from 'react';

interface Application {
  id: string;
  application_id: string;
  business_name: string;
  street_address: string | null;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  email: string;
  website: string | null;
  install_capabilities: string[];
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
}

const STATUS_TABS = [
  { key: 'all', label: 'All', color: 'text-gray-300' },
  { key: 'pending', label: 'Pending', color: 'text-yellow-400' },
  { key: 'approved', label: 'Approved', color: 'text-green-400' },
  { key: 'rejected', label: 'Rejected', color: 'text-red-400' }
];

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredApplications = applications.filter(app => 
    activeTab === 'all' || app.status === activeTab
  );

  useEffect(() => {
    fetchApplications();
  }, [activeTab]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const url = activeTab === 'all' 
        ? '/api/applications' 
        : `/api/applications?status=${activeTab}`;
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load applications');
      
      const data = await response.json();
      setApplications(data.applications);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });

      if (response.status === 401) {
        setError('Session expired — please log out and log back in, then try again.');
        return;
      }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to approve application');
      }
      await fetchApplications();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(id);
    try {
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'rejected',
          rejection_reason: rejectionReason || null
        })
      });

      if (!response.ok) throw new Error('Failed to reject application');
      
      setShowRejectModal(null);
      setRejectionReason('');
      await fetchApplications();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800';
      case 'approved': return 'bg-green-900/20 text-green-400 border-green-800';
      case 'rejected': return 'bg-red-900/20 text-red-400 border-red-800';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin h-10 w-10 text-vicrez-red" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Applications</h1>
        <div className="text-sm text-gray-400">
          {filteredApplications.length} applications
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex space-x-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-vicrez-red text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Applications Grid */}
      {filteredApplications.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-500 text-lg">No applications found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredApplications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              onApprove={handleApprove}
              onReject={(id) => setShowRejectModal(id)}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-4">Reject Application</h3>
            <p className="text-gray-300 mb-4">
              Optionally provide a reason for rejection:
            </p>
            <textarea
              rows={3}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-vicrez-red focus:border-transparent mb-4"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Optional rejection reason..."
            />
            <div className="flex space-x-3">
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={actionLoading === showRejectModal}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === showRejectModal ? 'Rejecting...' : 'Reject'}
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ApplicationCard({ 
  application, 
  onApprove, 
  onReject, 
  actionLoading 
}: { 
  application: Application;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  actionLoading: string | null;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-900/20 text-yellow-400 border-yellow-800';
      case 'approved': return 'bg-green-900/20 text-green-400 border-green-800';
      case 'rejected': return 'bg-red-900/20 text-red-400 border-red-800';
      default: return 'bg-gray-800 text-gray-400 border-gray-700';
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <span className="bg-gray-800 text-gray-300 text-xs font-mono px-2 py-1 rounded">
            {application.application_id}
          </span>
          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(application.status)}`}>
            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {new Date(application.submitted_at).toLocaleDateString()}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{application.business_name}</h3>
          <p className="text-gray-400">
            {application.city}, {application.state} {application.zip_code}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Phone:</span>
            <p className="text-gray-300">{application.phone}</p>
          </div>
          <div>
            <span className="text-gray-500">Email:</span>
            <p className="text-gray-300">{application.email}</p>
          </div>
          {application.website && (
            <div>
              <span className="text-gray-500">Website:</span>
              <a 
                href={application.website}
                target="_blank"
                rel="noopener noreferrer" 
                className="text-vicrez-red hover:underline block truncate"
              >
                {application.website}
              </a>
            </div>
          )}
        </div>

        {application.install_capabilities && application.install_capabilities.length > 0 && (
          <div>
            <span className="text-gray-500 text-sm">Services:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {application.install_capabilities.map((service, index) => (
                <span 
                  key={index}
                  className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}

        {application.status === 'rejected' && application.rejection_reason && (
          <div className="bg-red-900/10 border border-red-800 rounded-lg p-3">
            <span className="text-red-400 text-sm font-medium">Rejection Reason:</span>
            <p className="text-red-300 text-sm mt-1">{application.rejection_reason}</p>
          </div>
        )}
      </div>

      {application.status === 'pending' && (
        <div className="flex space-x-3 mt-4 pt-4 border-t border-gray-800">
          <button
            onClick={() => onApprove(application.id)}
            disabled={actionLoading === application.id}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            {actionLoading === application.id ? 'Approving...' : 'Approve'}
          </button>
          <button
            onClick={() => onReject(application.id)}
            disabled={actionLoading === application.id}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
}