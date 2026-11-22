import React, { useEffect, useState } from 'react';
import { Star, Check, X, Trash2, MessageSquare, ExternalLink } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { ConfirmDialog } from '../../components/admin/ConfirmDialog';
import { Review, Product } from '../../types/database';

export const AdminReviewsPage: React.FC = () => {
  const { showToast } = useToast();
  const { at, tAdminField, formatAdminDate } = useAdminLanguage();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');

  const [deleteCandidate, setDeleteCandidate] = useState<Review | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [rRes, pRes] = await Promise.all([
        supabase.from('reviews').select('*').order('created_at', { ascending: false }),
        supabase.from('products').select('*'),
      ]);

      if (rRes.error) throw rRes.error;
      setReviews((rRes.data || []) as Review[]);

      const pMap: Record<string, Product> = {};
      if (pRes.data) {
        pRes.data.forEach((p) => {
          pMap[p.id] = p as Product;
        });
      }
      setProducts(pMap);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load reviews', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const handleApproveToggle = async (review: Review, approve: boolean) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('reviews')
        .update({ is_approved: approve })
        .eq('id', review.id);

      if (error) throw error;
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, is_approved: approve } : r))
      );
      showToast({
        type: 'success',
        title: approve ? 'Review Approved' : 'Review Hidden',
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    }
  };

  const handleDelete = async () => {
    if (!supabase || !deleteCandidate) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('reviews').delete().eq('id', deleteCandidate.id);
      if (error) throw error;
      setReviews((prev) => prev.filter((r) => r.id !== deleteCandidate.id));
      showToast({ type: 'success', title: 'Review deleted permanently' });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Delete failed', description: (err as Error)?.message });
    } finally {
      setIsDeleting(false);
      setDeleteCandidate(null);
    }
  };

  const filteredReviews = reviews.filter((r) => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return r.is_approved;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('reviews.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('reviews.subtitle')}
          </p>
        </div>

        <div className="flex rounded-xl border border-[#E1E4EA] bg-white p-1">
          {(
            [
              { id: 'pending', label: at('reviews.tab.pending') },
              { id: 'approved', label: at('reviews.tab.approved') },
              { id: 'all', label: at('reviews.tab.all') },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                filter === tab.id
                  ? 'bg-[#17263E] text-white shadow-xs'
                  : 'text-[#5B6577] hover:text-[#0F1A2C]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5B6577]">
            {at('reviews.noneFound')}
          </div>
        ) : (
          <div className="divide-y divide-[#E1E4EA]">
            {filteredReviews.map((r) => {
              const product = products[r.product_id];
              return (
                <div key={r.id} className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="flex text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < r.rating ? 'fill-current' : 'text-gray-200 fill-transparent'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-bold text-xs text-[#0F1A2C]">{r.customer_name}</span>
                      <span className="text-[11px] text-gray-400">
                        • {formatAdminDate(r.created_at)}
                      </span>
                    </div>

                    {product && (
                      <div className="text-xs font-semibold text-[#F47125]">
                        {at('orderCreate.product')}: {tAdminField(product, 'name')}
                      </div>
                    )}

                    <p className="text-xs text-[#5B6577] leading-relaxed">
                      "{r.comment || '—'}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!r.is_approved ? (
                      <Button
                        size="sm"
                        onClick={() => void handleApproveToggle(r, true)}
                        className="bg-emerald-600 text-white hover:bg-emerald-700 gap-1"
                      >
                        <Check className="h-4 w-4" /> {at('reviews.approve')}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleApproveToggle(r, false)}
                        className="text-gray-600 hover:bg-gray-100 gap-1"
                      >
                        <X className="h-4 w-4" /> {at('reviews.unapprove')}
                      </Button>
                    )}

                    <button
                      onClick={() => setDeleteCandidate(r)}
                      className="rounded-lg p-2 text-[#5B6577] hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {deleteCandidate && (
        <ConfirmDialog
          isOpen={true}
          title={at('reviews.deleteTitle')}
          message={at('common.confirmProceed')}
          confirmLabel={isDeleting ? at('common.deleting') : at('common.delete')}
          variant="danger"
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleteCandidate(null)}
        />
      )}
    </div>
  );
};
