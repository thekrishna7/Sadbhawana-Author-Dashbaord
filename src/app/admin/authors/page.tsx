'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  BookOpen,
  Mail,
  Phone,
  ShieldAlert,
  X,
  Lock,
  UserCheck
} from 'lucide-react';
import { useToast } from '@/components/toast-context';

export default function AdminAuthorsPage() {
  const { showToast } = useToast();

  const [authors, setAuthors] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Add/Edit Author Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState<any | null>(null);

  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset Password Modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetAuthor, setResetAuthor] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [aRes, bRes] = await Promise.all([
        fetch('/api/authors').then((r) => r.json()),
        fetch('/api/books').then((r) => r.json()),
      ]);
      setAuthors(aRes.authors || []);
      setBooks(bRes.books || []);
    } catch {
      showToast('Failed to load author data', 'error');
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingAuthor(null);
    setFullName('');
    setUsername('');
    setEmail('');
    setPassword('');
    setPhone('');
    setAvatarUrl('');
    setStatus('ACTIVE');
    setSelectedBookIds([]);
    setModalOpen(true);
  };

  const openEditModal = (author: any) => {
    setEditingAuthor(author);
    setFullName(author.fullName);
    setUsername(author.username);
    setEmail(author.email);
    setPassword('');
    setPhone(author.phone || '');
    setAvatarUrl(author.avatarUrl || '');
    setStatus(author.status || 'ACTIVE');
    setSelectedBookIds(author.assignments?.map((a: any) => a.book.id) || []);
    setModalOpen(true);
  };

  const handleSaveAuthor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !username.trim() || !email.trim()) return;

    if (!editingAuthor && !password) {
      showToast('Password is required for new Author account', 'error');
      return;
    }

    setSaving(true);
    try {
      const url = editingAuthor ? `/api/authors/${editingAuthor.id}` : '/api/authors';
      const method = editingAuthor ? 'PUT' : 'POST';

      const bodyData: any = {
        fullName,
        username,
        email,
        phone,
        avatarUrl,
        status,
        assignedBookIds: selectedBookIds,
      };
      if (password) bodyData.password = password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save author', 'error');
        return;
      }

      showToast(editingAuthor ? 'Author profile updated' : 'Author account created successfully', 'success');
      setModalOpen(false);
      loadData();
    } catch {
      showToast('Server error saving author', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (author: any) => {
    const newStatus = author.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await fetch(`/api/authors/${author.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        showToast(`Author status updated to ${newStatus}`, 'info');
        loadData();
      }
    } catch {
      showToast('Failed to update status', 'error');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !resetAuthor) return;

    try {
      const res = await fetch(`/api/authors/${resetAuthor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      if (res.ok) {
        showToast(`Password reset successfully for ${resetAuthor.fullName}`, 'success');
        setResetModalOpen(false);
        setNewPassword('');
      } else {
        showToast('Password reset failed', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  const handleDeleteAuthor = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete author "${name}"?`)) return;

    try {
      const res = await fetch(`/api/authors/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Author account deleted', 'info');
        loadData();
      } else {
        showToast('Failed to delete author', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  const toggleBookSelection = (bookId: string) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  const filteredAuthors = authors.filter((a) => {
    const matchesSearch =
      a.fullName.toLowerCase().includes(search.toLowerCase()) ||
      a.username.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="w-7 h-7 text-blue-600" /> Author Management
          </h1>
          <p className="text-sm text-slate-500">Create login accounts, assign books, and manage author access credentials.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md glow-primary self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" /> Add New Author
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search author by name, username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold self-start sm:self-auto"
        >
          <option value="ALL">All Account Statuses</option>
          <option value="ACTIVE">Active Authors</option>
          <option value="INACTIVE">Deactivated Authors</option>
        </select>
      </div>

      {/* Authors Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading authors...</div>
      ) : filteredAuthors.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No authors found</h3>
          <p className="text-xs text-slate-500 mt-1">Click "Add New Author" to issue author login credentials.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAuthors.map((author) => (
            <div
              key={author.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Author Avatar & Header info */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                    alt={author.fullName}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold truncate">@{author.username}</span>
                      <button
                        onClick={() => handleToggleStatus(author)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase transition-colors ${
                          author.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {author.status}
                      </button>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-1">{author.fullName}</h3>
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1.5 mt-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {author.email}
                    </p>
                  </div>
                </div>

                {/* Assigned Books Pills */}
                <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-500" /> Assigned Books ({author.assignments?.length || 0}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {author.assignments && author.assignments.length > 0 ? (
                      author.assignments.map((a: any) => (
                        <span
                          key={a.book.id}
                          className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/80 border border-blue-100 dark:border-blue-900/40 text-[11px] font-semibold text-blue-700 dark:text-blue-300"
                        >
                          {a.book.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-500 italic">No assigned books</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => {
                    setResetAuthor(author);
                    setResetModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-500"
                >
                  <KeyRound className="w-4 h-4" /> Reset Password
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(author)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    title="Edit Author"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteAuthor(author.id, author.fullName)}
                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500"
                    title="Delete Author"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Author Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xl flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-blue-600" />
                {editingAuthor ? 'Edit Author Profile' : 'Issue New Author Credentials'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuthor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Author Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Krishna Prasad Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="krishna_author"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="author@sadbhawana.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Password {editingAuthor ? '(Leave blank to keep existing)' : '*'}
                  </label>
                  <input
                    type="password"
                    required={!editingAuthor}
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98*****090"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Profile Photo URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Deactivated</option>
                  </select>
                </div>
              </div>

              {/* Book Assignment Selection */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Assign Catalog Books to Author:
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {books.map((b) => {
                    const isSelected = selectedBookIds.includes(b.id);
                    return (
                      <button
                        type="button"
                        key={b.id}
                        onClick={() => toggleBookSelection(b.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input type="checkbox" checked={isSelected} onChange={() => {}} className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-xs truncate">{b.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md glow-primary"
                >
                  {saving ? 'Saving...' : editingAuthor ? 'Update Author' : 'Create & Issue Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetModalOpen && resetAuthor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-500" /> Reset Password for {resetAuthor.fullName}
              </h3>
              <button onClick={() => setResetModalOpen(false)} className="text-slate-400">✕</button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Enter New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="New strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm shadow-md"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
