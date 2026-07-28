'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Eye, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/toast-context';

export default function AuthorBooksPage() {
  const { showToast } = useToast();
  const [books, setBooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/books')
      .then((res) => res.json())
      .then((data) => setBooks(data.books || []))
      .catch(() => showToast('Failed to load books', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const filteredBooks = books.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    (b.isbn && b.isbn.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-blue-600" /> My Assigned Books
          </h1>
          <p className="text-sm text-slate-500">Access your publication manuscripts, review cover designs, and view file history.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search my books..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading assigned catalog...</div>
      ) : filteredBooks.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No books found</h3>
          <p className="text-xs text-slate-500 mt-1">Contact your Sadbhawana admin if you need a new title assigned.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => (
            <div
              key={book.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={book.coverImageUrl || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300'}
                    alt={book.name}
                    className="w-16 h-22 object-cover rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-[10px] font-bold uppercase">
                      {book.bookType} • {book.edition}
                    </span>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base line-clamp-2 mt-1">{book.name}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-1">ISBN: {book.isbn || 'TBD'}</p>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 mb-4">
                  {book.description || 'No publication description available.'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium">Status: <strong className="text-blue-600">{book.status.replace('_', ' ')}</strong></span>
                <Link
                  href={`/author/books/${book.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm glow-primary"
                >
                  <Eye className="w-4 h-4" /> Open Files & Review
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
