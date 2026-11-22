import React, { useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';
import { Bold, Heading2, Heading3, Italic, List, ListOrdered, RemoveFormatting } from 'lucide-react';
import { cn } from '../../lib/utils';

interface SimpleRichTextEditorProps {
  value: string;
  onChange: (sanitizedHtml: string) => void;
  placeholder?: string;
  className?: string;
  label?: string;
}

export const SimpleRichTextEditor: React.FC<SimpleRichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  className,
  label,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sync internal content only if external value is significantly different to avoid cursor jumps
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = DOMPurify.sanitize(value || '');
    }
  }, [value]);

  const exec = (command: string, arg: string | undefined = undefined) => {
    document.execCommand(command, false, arg);
    if (editorRef.current) {
      const sanitized = DOMPurify.sanitize(editorRef.current.innerHTML);
      onChange(sanitized);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      const sanitized = DOMPurify.sanitize(editorRef.current.innerHTML);
      onChange(sanitized);
    }
  };

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-xs font-bold uppercase tracking-wider text-[#0F1A2C] mb-1.5">
          {label}
        </label>
      )}

      <div className="overflow-hidden rounded-[10px] border border-[#17263E]/15 bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-1 border-b border-[#17263E]/10 bg-[#F5F7FA] p-1.5 text-[#5B6577]">
          <button
            type="button"
            onClick={() => exec('bold')}
            title="Bold"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white hover:text-[#0F1A2C] cursor-pointer"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('italic')}
            title="Italic"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white hover:text-[#0F1A2C] cursor-pointer"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <span className="h-4 w-px bg-[#17263E]/15 mx-1" />
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h2>')}
            title="Heading 2"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white hover:text-[#0F1A2C] cursor-pointer"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('formatBlock', '<h3>')}
            title="Heading 3"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white hover:text-[#0F1A2C] cursor-pointer"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>
          <span className="h-4 w-px bg-[#17263E]/15 mx-1" />
          <button
            type="button"
            onClick={() => exec('insertUnorderedList')}
            title="Bullet list"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white hover:text-[#0F1A2C] cursor-pointer"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => exec('insertOrderedList')}
            title="Numbered list"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white hover:text-[#0F1A2C] cursor-pointer"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <span className="h-4 w-px bg-[#17263E]/15 mx-1" />
          <button
            type="button"
            onClick={() => exec('removeFormat')}
            title="Clear formatting"
            className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white hover:text-[#DC2626] cursor-pointer"
          >
            <RemoveFormatting className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Content Editable Body */}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          data-placeholder={placeholder ?? 'Write formatted description...'}
          className="min-h-[140px] max-h-[300px] overflow-y-auto p-3 text-xs leading-relaxed text-[#0F1A2C] focus:outline-none"
        />
      </div>
    </div>
  );
};
