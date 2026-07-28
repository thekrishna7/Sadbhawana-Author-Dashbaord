'use client';

import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Eye,
  UserCheck,
  Calendar,
  Layers,
  CheckCircle2,
  X,
  FileText
} from 'lucide-react';
import { useToast } from '@/components/toast-context';
import Link from 'next/link';

export default function AdminBooksPage() {
  const { showToast } = useToast();
  const [books, setBooks] = useState<any[]>([]);
  const [authors, setAuthors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Add/Edit Book Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publicationDate, setPublicationDate] = useState('');
  const [language, setLanguage] = useState('English');
  const [edition, setEdition] = useState('1st Edition');
  const [bookType, setBookType] = useState('PAPERBACK');
  const [status, setStatus] = useState('IN_PROGRESS');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [selectedAuthorIds, setSelectedAuthorIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [bRes, aRes] = await Promise.all([
        fetch('/api/books').then((r) => r.json()),
        fetch('/api/authors').then((r) => r.json()),
      ]);
      setBooks(bRes.books || []);
      setAuthors(aRes.authors || []);
    } catch (e) {
      showToast('Failed to load books data', 'error');
    } finally {
      setLoading(false);
    }
  }

  const openCreateModal = () => {
    setEditingBook(null);
    setName('');
    setIsbn('');
    setPublicationDate('');
    setLanguage('English');
    setEdition('1st Edition');
    setBookType('PAPERBACK');
    setStatus('IN_PROGRESS');
    setDescription('');
    setCoverImageUrl('');
    setSelectedAuthorIds([]);
    setModalOpen(true);
  };

  const openEditModal = (book: any) => {
    setEditingBook(book);
    setName(book.name);
    setIsbn(book.isbn || '');
    setPublicationDate(book.publicationDate || '');
    setLanguage(book.language || 'English');
    setEdition(book.edition || '1st Edition');
    setBookType(book.bookType || 'PAPERBACK');
    setStatus(book.status || 'IN_PROGRESS');
    setDescription(book.description || '');
    setCoverImageUrl(book.coverImageUrl || '');
    setSelectedAuthorIds(book.assignments?.map((a: any) => a.author.id) || []);
    setModalOpen(true);
  };

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      const url = editingBook ? `/api/books/${editingBook.id}` : '/api/books';
      const method = editingBook ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          isbn,
          publicationDate,
          language,
          edition,
          bookType,
          status,
          description,
          coverImageUrl,
          assignedAuthorIds: selectedAuthorIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to save book', 'error');
        return;
      }

      showToast(editingBook ? 'Book updated successfully' : 'Book created & assigned successfully', 'success');
      setModalOpen(false);
      loadData();
    } catch (e) {
      showToast('Server error while saving book', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete book "${name}"?`)) return;

    try {
      const res = await fetch(`/api/books/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Book deleted', 'info');
        loadData();
      } else {
        showToast('Failed to delete book', 'error');
      }
    } catch {
      showToast('Server error', 'error');
    }
  };

  const toggleAuthorSelection = (authorId: string) => {
    setSelectedAuthorIds((prev) =>
      prev.includes(authorId) ? prev.filter((id) => id !== authorId) : [...prev, authorId]
    );
  };

  // Filtering
  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.isbn && b.isbn.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesType = typeFilter === 'ALL' || b.bookType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-blue-600" /> Book Management
          </h1>
          <p className="text-sm text-slate-500">Manage catalog publications, ISBN numbers, and author assignments.</p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-md glow-primary self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Book
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by title or ISBN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <option value="ALL">All Statuses</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold"
          >
            <option value="ALL">All Binding Types</option>
            <option value="PAPERBACK">Paperback</option>
            <option value="HARDCOVER">Hardcover</option>
          </select>
        </div>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading catalog...</div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No books found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">Try adjusting your filters or click "Add New Book" to publish a title.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-lg transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Book Cover Image & Status Badge */}
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300'}
                    alt={book.name}
                    className="w-16 h-22 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        book.bookType === 'HARDCOVER'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                      }`}>
                        {book.bookType}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        book.status === 'COMPLETED'
                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                          : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                      }`}>
                        {book.status.replace('_', ' ')}
                      </span>
                    </div>

                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                      {book.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">ISBN: {book.isbn || 'Unassigned'}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                  {book.description || 'No description provided for this publication title.'}
                </p>

                {/* Assigned Authors Pills */}
                <div className="mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Assigned Authors:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {book.assignments && book.assignments.length > 0 ? (
                      book.assignments.map((a: any) => (
                        <span
                          key={a.author.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          <img src={a.author.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50'} className="w-4 h-4 rounded-full" />
                          {a.author.fullName}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-amber-500 italic">No author assigned yet</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link
                  href={`/admin/books/${book.id}`}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500"
                >
                  <Eye className="w-4 h-4" /> View Details & Files ({book.files?.length || 0})
                </Link>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(book)}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
                    title="Edit Book"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteBook(book.id, book.name)}
                    className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950 text-rose-500"
                    title="Delete Book"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Book Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-xl flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" />
                {editingBook ? 'Edit Publication Details' : 'Add New Publication Title'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBook} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Book Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Nepali Grammar & Essays"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    ISBN Number
                  </label>
                  <input
                    type="text"
                    placeholder="978-9937-700-XX-X"
                    value={isbn}
                    onChange={(e) => setIsbn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Target Publication Date
                  </label>
                  <input
                    type="date"
                    value={publicationDate}
                    onChange={(e) => setPublicationDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Book Type (Default Paperback)
                  </label>
                  <select
                    value={bookType}
                    onChange={(e) => setBookType(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold"
                  >
                    <option value="PAPERBACK">Paperback (Default)</option>
                    <option value="HARDCOVER">Hardcover</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Edition
                  </label>
                  <input
                    type="text"
                    value={edition}
                    onChange={(e) => setEdition(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Language
                  </label>
                  <input
                    type="text"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Publication Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DRAFT">Draft</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cover Image URL
                  </label>
                  <input
                    type="text"
                    placeholder="https://..."
                    value={coverImageUrl}
                    onChange={(e) => setCoverImageUrl(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Overview of syllabus, chapters, or publication scope..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Author Assignment Selection */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Assign Authors (Selected authors receive instant portal sync)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  {authors.map((author) => {
                    const isSelected = selectedAuthorIds.includes(author.id);
                    return (
                      <button
                        type="button"
                        key={author.id}
                        onClick={() => toggleAuthorSelection(author.id)}
                        className={`flex items-center gap-3 p-2 rounded-lg text-left transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold shadow-sm'
                            : 'hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <div className="min-w-0">
                          <p className="text-xs truncate">{author.fullName}</p>
                          <p className="text-[10px] opacity-80 truncate">@{author.username}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-md glow-primary"
                >
                  {saving ? 'Saving Book...' : editingBook ? 'Update Book' : 'Create & Assign Book'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
