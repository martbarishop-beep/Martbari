import React, { useEffect, useState } from 'react';
import { FileText, Save, Check, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { logActivity } from '../../lib/auth';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useToast } from '../../context/ToastContext';
import { useAdminLanguage } from '../../context/AdminLanguageContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { SimpleRichTextEditor } from '../../components/admin/SimpleRichTextEditor';
import { BilingualField } from '../../components/admin/BilingualField';
import { PageContent } from '../../types/database';

const DEFAULT_PAGES = [
  { slug: 'about', labelKey: 'pages.tab.about' },
  { slug: 'return-policy', labelKey: 'pages.tab.returnPolicy' },
  { slug: 'privacy-policy', labelKey: 'pages.tab.privacyPolicy' },
  { slug: 'terms', labelKey: 'pages.tab.terms' },
];

export const AdminPagesPage: React.FC = () => {
  const { user } = useAdminAuth();
  const { showToast } = useToast();
  const { at } = useAdminLanguage();

  const [activeSlug, setActiveSlug] = useState('about');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [titleBn, setTitleBn] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [contentBn, setContentBn] = useState('');
  const [contentEn, setContentEn] = useState('');
  const [contentLangTab, setContentLangTab] = useState<'bn' | 'en'>('en');

  const fetchPage = async (slug: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        const p = data as PageContent;
        setTitleBn(p.title_bn);
        setTitleEn(p.title_en);
        setContentBn(p.content_bn || '');
        setContentEn(p.content_en || '');
      } else {
        // Fallback placeholders
        const def = DEFAULT_PAGES.find((d) => d.slug === slug);
        const fallbackLabel = def ? at(def.labelKey) : slug;
        setTitleEn(fallbackLabel);
        setTitleBn(fallbackLabel);
        setContentBn('');
        setContentEn('');
      }
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Failed to load page', description: (err as Error)?.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPage(activeSlug);
  }, [activeSlug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    try {
      const payload = {
        slug: activeSlug,
        title_en: titleEn.trim(),
        title_bn: titleBn.trim() || titleEn.trim(),
        content_en: contentEn,
        content_bn: contentBn,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { data: existing } = await supabase
        .from('pages')
        .select('id')
        .eq('slug', activeSlug)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('pages')
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('pages').insert(payload);
        if (error) throw error;
      }

      showToast({ type: 'success', title: 'Page saved successfully' });
      await logActivity('UPDATE_PAGE_CONTENT', 'pages', activeSlug, {
        slug: activeSlug,
      });
    } catch (err: unknown) {
      showToast({ type: 'error', title: 'Save failed', description: (err as Error)?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1A2C]">{at('pages.title')}</h1>
          <p className="text-sm text-[#5B6577]">
            {at('pages.subtitle')}
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || loading}
          className="gap-1.5 bg-[#F47125] text-white hover:bg-[#e05e13]"
        >
          <Save className="h-4 w-4" />
          {saving ? at('common.saving') : at('pages.publish')}
        </Button>
      </div>

      {/* Page Tabs */}
      <div className="flex gap-2 overflow-x-auto border-b border-[#E1E4EA] pb-1">
        {DEFAULT_PAGES.map((page) => (
          <button
            key={page.slug}
            onClick={() => setActiveSlug(page.slug)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
              activeSlug === page.slug
                ? 'bg-[#17263E] text-white shadow-xs'
                : 'text-[#5B6577] hover:bg-gray-100 hover:text-[#0F1A2C]'
            }`}
          >
            {at(page.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner size="lg" className="text-[#F47125]" />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="rounded-2xl border border-[#E1E4EA] bg-white p-6 shadow-xs space-y-4">
            <BilingualField
              label={at('pages.pageTitle')}
              required
              valueBn={titleBn}
              valueEn={titleEn}
              onChangeBn={setTitleBn}
              onChangeEn={setTitleEn}
              placeholderBn="পৃষ্ঠার শিরোনাম"
              placeholderEn="Page Title"
            />

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold text-[#0F1A2C]">{at('pages.pageBody')}</label>
                <div className="inline-flex rounded-lg border border-[#E1E4EA] p-0.5 bg-gray-50 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setContentLangTab('bn')}
                    className={`rounded px-3 py-1 transition-colors ${
                      contentLangTab === 'bn' ? 'bg-[#17263E] text-white' : 'text-[#5B6577]'
                    }`}
                  >
                    Bangla (বাংলা)
                  </button>
                  <button
                    type="button"
                    onClick={() => setContentLangTab('en')}
                    className={`rounded px-3 py-1 transition-colors ${
                      contentLangTab === 'en' ? 'bg-[#17263E] text-white' : 'text-[#5B6577]'
                    }`}
                  >
                    English
                  </button>
                </div>
              </div>

              {contentLangTab === 'bn' ? (
                <SimpleRichTextEditor
                  value={contentBn}
                  onChange={setContentBn}
                  placeholder="বাংলায় সম্পূর্ণ বিবরণ লিখুন..."
                />
              ) : (
                <SimpleRichTextEditor
                  value={contentEn}
                  onChange={setContentEn}
                  placeholder="Write full page content in English..."
                />
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
