import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserCheck, UserX, AlertCircle, Info, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Spinner';
import { Profile, UserRole } from '../../types/database';

export const AdminStaffPage: React.FC = () => {
  const { user, profile: currentProfile } = useAdminAuth();
  const { showToast } = useToast();
  const { at } = useAdminLanguage();

  const [staffList, setStaffList] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchStaff = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['admin', 'manager', 'staff'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStaffList((data || []) as Profile[]);
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load staff list', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStaff();
  }, []);

  // Update role
  const handleRoleChange = async (targetId: string, newRole: UserRole) => {
    if (!supabase) return;

    // Check last admin protection
    const admins = staffList.filter((s) => s.role === 'admin' && s.is_active);
    const target = staffList.find((s) => s.id === targetId);

    if (target?.role === 'admin' && newRole !== 'admin' && admins.length <= 1) {
      showToast({
        type: 'error',
        title: 'Action Prohibited',
        description: 'Cannot demote the last remaining active Administrator.',
      });
      return;
    }

    setUpdatingId(targetId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetId);

      if (error) throw error;

      setStaffList((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, role: newRole } : s))
      );
      showToast({ type: 'success', title: 'Role updated successfully' });
      await logActivity('CHANGE_STAFF_ROLE', 'profiles', targetId, {
        newRole,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    } finally {
      setUpdatingId(null);
    }
  };

  // Toggle active
  const handleToggleActive = async (targetId: string, currentStatus: boolean) => {
    if (!supabase) return;

    // Check last admin protection
    const admins = staffList.filter((s) => s.role === 'admin' && s.is_active);
    const target = staffList.find((s) => s.id === targetId);

    if (target?.role === 'admin' && currentStatus && admins.length <= 1) {
      showToast({
        type: 'error',
        title: 'Action Prohibited',
        description: 'Cannot deactivate the last remaining active Administrator.',
      });
      return;
    }

    setUpdatingId(targetId);
    try {
      const newStatus = !currentStatus;
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: newStatus })
        .eq('id', targetId);

      if (error) throw error;

      setStaffList((prev) =>
        prev.map((s) => (s.id === targetId ? { ...s, is_active: newStatus } : s))
      );
      showToast({
        type: 'success',
        title: newStatus ? 'Staff Member Activated' : 'Staff Member Deactivated',
      });
      await logActivity(
        newStatus ? 'ACTIVATE_STAFF' : 'DEACTIVATE_STAFF',
        'profiles',
        targetId
      );
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Update failed', description: (err as Error)?.message });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">
          {at('staff.title')}
        </h1>
        <p className="text-sm text-[#5B6577]">
          {at('staff.subtitle')}
        </p>
      </div>

      {/* Role explanation boxes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-red-200 bg-red-50/50 p-4 text-xs space-y-1">
          <div className="font-bold text-red-900 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-red-600" /> {at('staff.role.admin')}
          </div>
          <p className="text-red-800">
            Full access to every section: settings, reports, staff management, and product catalog.
          </p>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-xs space-y-1">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <UserCheck className="h-4 w-4 text-blue-600" /> {at('staff.role.manager')}
          </div>
          <p className="text-blue-800">
            Access to orders, products, inventory, customers, and reports. Cannot alter staff or
            critical settings.
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-xs space-y-1">
          <div className="font-bold text-[#0F1A2C] flex items-center gap-1.5">
            <Lock className="h-4 w-4 text-gray-500" /> {at('staff.role.staff')}
          </div>
          <p className="text-[#5B6577]">
            Restricted access exclusively to Orders and Customers for customer service and fulfillment.
          </p>
        </div>
      </div>

      {/* Staff Notice */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <strong className="block font-bold">{at('staff.onboardTitle')}</strong>
          <span>
            Supabase Authentication → Users → SQL Editor (<code>profiles</code> role:{' '}
            <code>'manager'</code> / <code>'staff'</code>).
          </span>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-[#E1E4EA] bg-white shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="lg" className="text-[#F47125]" />
          </div>
        ) : staffList.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5B6577]">{at('common.noRecords')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-[#E1E4EA] bg-[#F8FAFC] text-[#5B6577]">
                <tr>
                  <th className="py-3 px-4 font-semibold">{at('staff.col.user')}</th>
                  <th className="py-3 px-4 font-semibold">{at('staff.col.contact')}</th>
                  <th className="py-3 px-4 font-semibold">{at('staff.col.role')}</th>
                  <th className="py-3 px-4 font-semibold">{at('staff.col.status')}</th>
                  <th className="py-3 px-4 text-right font-semibold">{at('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F5]">
                {staffList.map((member) => {
                  const isSelf = member.id === user?.id;
                  const isUpdating = updatingId === member.id;

                  return (
                    <tr key={member.id} className="hover:bg-[#F8FAFC]">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#0F1A2C]">
                          {member.full_name || 'Staff User'}
                          {isSelf && (
                            <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.2 text-[10px] font-bold text-[#F47125]">
                              {at('staff.you')}
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10px] text-gray-400 truncate max-w-[180px]">
                          {member.id}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono text-[#5B6577]">
                        {member.phone || at('header.noPhone')}
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={member.role}
                          disabled={isUpdating}
                          onChange={(e) =>
                            void handleRoleChange(member.id, e.target.value as UserRole)
                          }
                          className="rounded-lg border border-[#E1E4EA] bg-white px-2.5 py-1 text-xs font-semibold text-[#0F1A2C]"
                        >
                          <option value="admin">{at('staff.role.admin')}</option>
                          <option value="manager">{at('staff.role.manager')}</option>
                          <option value="staff">{at('staff.role.staff')}</option>
                        </select>
                      </td>

                      <td className="py-3 px-4">
                        {member.is_active ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            {at('common.active')}
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            {at('common.inactive')}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => void handleToggleActive(member.id, member.is_active)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                            member.is_active
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                        >
                          {member.is_active ? at('common.deactivate') : at('common.activate')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
