import React, { useEffect, useState, useMemo } from 'react';
import { History, Search, Filter, Clock, Eye, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { ActivityLog } from '../../types/database';

export const AdminActivityPage: React.FC = () => {
  const { showToast } = useToast();
  const { at, formatAdminDate } = useAdminLanguage();

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');

  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const fetchLogs = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs((data || []) as ActivityLog[]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load activity logs', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchAction = l.action.toLowerCase().includes(q);
        const matchEntity = l.entity.toLowerCase().includes(q);
        if (!matchAction && !matchEntity) return false;
      }

      if (entityFilter !== 'all' && l.entity !== entityFilter) return false;

      return true;
    });
  }, [logs, searchQuery, entityFilter]);

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('activity.title')}</h1>
        <p className="text-sm text-[#5B6577]">
          {at('activity.subtitle')}
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6577]" />
            <Input
              type="text"
              placeholder={at('activity.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 text-xs"
            />
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-10 w-full rounded-xl border border-[#E1E4EA] bg-white px-3 text-xs text-[#0F1A2C] focus:border-[#F47125] focus:outline-none"
            >
              <option value="all">{at('activity.allEntities')}</option>
              <option value="products">{at('nav.products')}</option>
              <option value="orders">{at('nav.orders')}</option>
              <option value="categories">{at('nav.categories')}</option>
              <option value="brands">{at('nav.brands')}</option>
              <option value="suppliers">{at('nav.suppliers')}</option>
              <option value="coupons">{at('nav.coupons')}</option>
              <option value="store_settings">{at('nav.settings')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Logs Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5B6577]">{at('common.noRecords')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-4 font-semibold">{at('activity.col.timestamp')}</th>
                  <th className="py-3 px-4 font-semibold">{at('activity.col.action')}</th>
                  <th className="py-3 px-4 font-semibold">{at('activity.col.entity')}</th>
                  <th className="py-3 px-4 font-semibold">{at('activity.col.target')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{at('common.details')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F8FAFC]">
                    <td className="py-3 px-4 text-[#5B6577] flex items-center gap-1.5 font-mono text-[11px]">
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {formatAdminDate(log.created_at, true)}
                    </td>

                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-[#0F1A2C] bg-gray-100 px-2 py-0.5 rounded text-[11px]">
                        {log.action}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold text-[#F47125] uppercase text-[11px]">
                      {log.entity}
                    </td>

                    <td className="py-3 px-4 font-mono text-gray-500 max-w-[120px] truncate">
                      {log.entity_id || '—'}
                    </td>

                    <td className="py-3 px-4 text-right">
                      {log.details ? (
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-[#17263E] hover:text-[#F47125]"
                        >
                          <Eye className="h-3.5 w-3.5" /> {at('activity.viewJson')}
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* JSON Payload Viewer Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E1E4EA] pb-3">
              <h3 className="text-base font-bold text-[#0F1A2C]">
                {at('activity.col.action')}: {selectedLog.action}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <pre className="max-h-72 overflow-y-auto rounded-xl bg-gray-900 p-4 font-mono text-xs text-emerald-400">
              {JSON.stringify(selectedLog.details, null, 2)}
            </pre>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="rounded-xl bg-gray-100 px-4 py-2 text-xs font-bold text-[#0F1A2C] hover:bg-gray-200"
              >
                {at('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
