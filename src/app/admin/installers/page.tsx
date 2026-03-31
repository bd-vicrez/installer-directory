'use client';

import { useState, useEffect, useCallback } from 'react';
import { Installer } from '@/lib/types';

interface PaginatedResponse {
  installers: Installer[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type ModalMode = 'create' | 'edit' | 'view' | null;

const EMPTY_FORM = {
  business_name: '',
  street_address: '',
  city: '',
  state: '',
  zip_code: '',
  phone: '',
  email: '',
  website: '',
  install_capabilities: '',
  shop_type: '',
  specialize_in: '',
  source: '',
  status: 'active',
};

const STATUS_OPTIONS = ['active', 'removed'];
const PAGE_SIZE = 50;

export default function AdminInstallersPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Installer | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  const fetchInstallers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(PAGE_SIZE));
    if (search) params.set('search', search);
    if (stateFilter) params.set('state', stateFilter);
    if (statusFilter) params.set('status', statusFilter);

    try {
      const res = await fetch(`/api/admin/installers?${params}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch {
      showToast('Failed to load installers', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, stateFilter, statusFilter]);

  useEffect(() => {
    fetchInstallers();
  }, [fetchInstallers]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // CRUD handlers
  async function handleSave() {
    setSaving(true);
    setFormError('');

    if (!form.business_name || !form.city || !form.state) {
      setFormError('Business name, city, and state are required');
      setSaving(false);
      return;
    }

    try {
      const url = modalMode === 'edit'
        ? `/api/admin/installers/${editId}`
        : '/api/admin/installers';
      const method = modalMode === 'edit' ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Save failed');
      }

      showToast(modalMode === 'edit' ? 'Installer updated' : 'Installer created');
      setModalMode(null);
      fetchInstallers();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/installers/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      showToast(`${deleteTarget.business_name} removed`);
      setDeleteTarget(null);
      fetchInstallers();
    } catch {
      showToast('Failed to remove installer', 'error');
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;
    setBulkProcessing(true);

    try {
      const res = await fetch('/api/admin/installers/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          updates: { status: bulkAction },
        }),
      });

      if (!res.ok) throw new Error('Bulk update failed');
      const result = await res.json();
      showToast(`${result.updated} installers updated`);
      setSelectedIds(new Set());
      setBulkAction('');
      fetchInstallers();
    } catch {
      showToast('Bulk action failed', 'error');
    } finally {
      setBulkProcessing(false);
    }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setFormError('');
    setModalMode('create');
  }

  function openEdit(inst: Installer) {
    setForm({
      business_name: inst.business_name || '',
      street_address: inst.street_address || '',
      city: inst.city || '',
      state: inst.state || '',
      zip_code: inst.zip_code || '',
      phone: inst.phone || '',
      email: inst.email || '',
      website: inst.website || '',
      install_capabilities: Array.isArray(inst.install_capabilities) ? inst.install_capabilities.join(', ') : (inst.install_capabilities || ''),
      shop_type: inst.shop_type || '',
      specialize_in: inst.specialize_in || '',
      source: inst.source || '',
      status: inst.status || 'active',
    });
    setEditId(inst.id);
    setFormError('');
    setModalMode('edit');
  }

  function openView(inst: Installer) {
    setForm({
      business_name: inst.business_name || '',
      street_address: inst.street_address || '',
      city: inst.city || '',
      state: inst.state || '',
      zip_code: inst.zip_code || '',
      phone: inst.phone || '',
      email: inst.email || '',
      website: inst.website || '',
      install_capabilities: Array.isArray(inst.install_capabilities) ? inst.install_capabilities.join(', ') : (inst.install_capabilities || ''),
      shop_type: inst.shop_type || '',
      specialize_in: inst.specialize_in || '',
      source: inst.source || '',
      status: inst.status || 'active',
    });
    setEditId(inst.id);
    setModalMode('view');
  }

  function toggleSelect(id: string | number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (!data) return;
    if (selectedIds.size === data.installers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.installers.map((i) => i.id)));
    }
  }

  const installers = data?.installers || [];
  const allSelected = installers.length > 0 && selectedIds.size === installers.length;

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold" style={{ color: '#ffffff' }}>Installers</h1>
        <button
          onClick={openCreate}
          className="bg-vicrez-red hover:bg-vicrez-red-dark font-semibold px-4 py-2 rounded-lg transition-all text-sm"
          style={{ color: '#ffffff' }}
        >
          + Add New Installer
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, city, state, email..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-vicrez-red focus:ring-1 focus:ring-vicrez-red transition-all"
        />
        <select
          value={stateFilter}
          onChange={(e) => { setStateFilter(e.target.value); setPage(0); }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-vicrez-red w-full sm:w-32"
        >
          <option value="">All States</option>
          {['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-vicrez-red w-full sm:w-36"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="removed">Removed</option>
        </select>
      </div>

      {/* Bulk actions bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-lg px-4 py-3">
          <span className="text-sm text-gray-400">{selectedIds.size} selected</span>
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-vicrez-red"
          >
            <option value="">Choose action...</option>
            <option value="active">Set Active</option>
            <option value="removed">Set Removed</option>
          </select>
          <button
            onClick={handleBulkAction}
            disabled={!bulkAction || bulkProcessing}
            className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 transition-colors"
            style={{ color: '#ffffff' }}
          >
            {bulkProcessing ? 'Processing...' : 'Apply'}
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-500 hover:text-gray-300 ml-auto"
            style={{ color: '#9ca3af' }}
          >
            Clear
          </button>
        </div>
      )}

      {/* Count & table */}
      <p className="text-sm text-gray-500">
        {data ? `Showing ${installers.length} of ${data.total.toLocaleString()} installers` : 'Loading...'}
      </p>

      <div className="overflow-x-auto bg-gray-900 border border-gray-800 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="py-3 px-3 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-600 bg-gray-800 text-vicrez-red focus:ring-vicrez-red"
                />
              </th>
              <th className="py-3 px-3 text-gray-500 font-medium">Name</th>
              <th className="py-3 px-3 text-gray-500 font-medium">City</th>
              <th className="py-3 px-3 text-gray-500 font-medium">State</th>
              <th className="py-3 px-3 text-gray-500 font-medium hidden lg:table-cell">Capabilities</th>
              <th className="py-3 px-3 text-gray-500 font-medium">Rating</th>
              <th className="py-3 px-3 text-gray-500 font-medium">Status</th>
              <th className="py-3 px-3 text-gray-500 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-gray-500">Loading...</td>
              </tr>
            ) : installers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-20 text-center text-gray-500">No installers found</td>
              </tr>
            ) : (
              installers.map((inst) => {
                const rawCaps = inst.install_capabilities;
                const capsStr = Array.isArray(rawCaps) ? rawCaps.join(', ') : (typeof rawCaps === 'string' ? rawCaps : '');
                const caps = capsStr.split(/[,;|]/).map((c: string) => c.trim().replace(/^[{"]+|[}"]+$/g, '')).filter(Boolean);
                return (
                  <tr
                    key={inst.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(inst.id)}
                        onChange={() => toggleSelect(inst.id)}
                        className="rounded border-gray-600 bg-gray-800 text-vicrez-red focus:ring-vicrez-red"
                      />
                    </td>
                    <td
                      className="py-3 px-3 font-medium max-w-[200px] truncate cursor-pointer hover:underline"
                      style={{ color: '#e5e7eb' }}
                      onClick={() => openView(inst)}
                    >
                      {inst.business_name}
                    </td>
                    <td className="py-3 px-3 text-gray-500">{inst.city}</td>
                    <td className="py-3 px-3 text-gray-500">{inst.state}</td>
                    <td className="py-3 px-3 hidden lg:table-cell">
                      <div className="flex flex-wrap gap-1">
                        {caps.slice(0, 2).map((c, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                            {c}
                          </span>
                        ))}
                        {caps.length > 2 && (
                          <span className="text-xs text-gray-600">+{caps.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      {inst.google_rating ? (
                        <span className="text-yellow-400 font-mono text-xs">
                          {Number(inst.google_rating).toFixed(1)}
                          <span className="text-gray-600 ml-1">({inst.google_review_count || 0})</span>
                        </span>
                      ) : (
                        <span className="text-gray-600">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        inst.status === 'removed'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-green-500/10 text-green-400'
                      }`}>
                        {inst.status || 'active'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(inst)}
                          className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-blue-400"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {inst.status !== 'removed' && (
                          <button
                            onClick={() => setDeleteTarget(inst)}
                            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors text-gray-400 hover:text-red-400"
                            title="Remove"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500 font-mono">
            {page + 1} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages - 1, p + 1))}
            disabled={page >= data.totalPages - 1}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 border border-gray-700 text-gray-400 hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit/View Modal */}
      {modalMode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setModalMode(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-2xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-lg font-semibold" style={{ color: '#ffffff' }}>
                {modalMode === 'create' ? 'Add New Installer' : modalMode === 'edit' ? 'Edit Installer' : 'Installer Details'}
              </h2>
              <button
                onClick={() => setModalMode(null)}
                className="text-gray-500 hover:text-gray-300 text-2xl leading-none"
                style={{ color: '#9ca3af' }}
              >
                &times;
              </button>
            </div>

            <div className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Business Name *" value={form.business_name} onChange={(v) => setForm({ ...form, business_name: v })} readOnly={modalMode === 'view'} />
                <FormField label="Street Address" value={form.street_address} onChange={(v) => setForm({ ...form, street_address: v })} readOnly={modalMode === 'view'} />
                <FormField label="City *" value={form.city} onChange={(v) => setForm({ ...form, city: v })} readOnly={modalMode === 'view'} />
                <FormField label="State *" value={form.state} onChange={(v) => setForm({ ...form, state: v })} readOnly={modalMode === 'view'} />
                <FormField label="Zip Code" value={form.zip_code} onChange={(v) => setForm({ ...form, zip_code: v })} readOnly={modalMode === 'view'} />
                <FormField label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} readOnly={modalMode === 'view'} />
                <FormField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} readOnly={modalMode === 'view'} />
                <FormField label="Website" value={form.website} onChange={(v) => setForm({ ...form, website: v })} readOnly={modalMode === 'view'} />
                <FormField label="Shop Type" value={form.shop_type} onChange={(v) => setForm({ ...form, shop_type: v })} readOnly={modalMode === 'view'} />
                <FormField label="Source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} readOnly={modalMode === 'view'} />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Install Capabilities (comma-separated)</label>
                <textarea
                  value={form.install_capabilities}
                  onChange={(e) => setForm({ ...form, install_capabilities: e.target.value })}
                  readOnly={modalMode === 'view'}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-vicrez-red focus:ring-1 focus:ring-vicrez-red transition-all read-only:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Specialize In</label>
                <textarea
                  value={form.specialize_in}
                  onChange={(e) => setForm({ ...form, specialize_in: e.target.value })}
                  readOnly={modalMode === 'view'}
                  rows={2}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-vicrez-red focus:ring-1 focus:ring-vicrez-red transition-all read-only:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  disabled={modalMode === 'view'}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-vicrez-red disabled:opacity-60"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {modalMode !== 'view' && (
              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-800">
                <button
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                  style={{ color: '#9ca3af' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-vicrez-red hover:bg-vicrez-red-dark font-semibold px-5 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                  style={{ color: '#ffffff' }}
                >
                  {saving ? 'Saving...' : modalMode === 'edit' ? 'Update' : 'Create'}
                </button>
              </div>
            )}

            {modalMode === 'view' && (
              <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-800">
                <button
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                  style={{ color: '#9ca3af' }}
                >
                  Close
                </button>
                <button
                  onClick={() => setModalMode('edit')}
                  className="bg-blue-600 hover:bg-blue-700 font-semibold px-5 py-2 rounded-lg text-sm transition-all"
                  style={{ color: '#ffffff' }}
                >
                  Edit
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-2" style={{ color: '#ffffff' }}>Remove Installer</h3>
            <p className="text-gray-400 text-sm mb-6">
              Are you sure you want to remove <strong style={{ color: '#e5e7eb' }}>{deleteTarget.business_name}</strong>?
              This will set its status to &quot;removed&quot;. It can be reactivated later.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-colors"
                style={{ color: '#9ca3af' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 font-semibold px-5 py-2 rounded-lg text-sm transition-all disabled:opacity-50"
                style={{ color: '#ffffff' }}
              >
                {deleting ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg text-sm font-medium shadow-xl transition-all ${
          toast.type === 'success'
            ? 'bg-green-600'
            : 'bg-red-600'
        }`} style={{ color: '#ffffff' }}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

function FormField({
  label, value, onChange, readOnly = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        readOnly={readOnly}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-vicrez-red focus:ring-1 focus:ring-vicrez-red transition-all read-only:opacity-60"
      />
    </div>
  );
}
