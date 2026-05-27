/**
 * BlocksPage.jsx — Full Notion-style workspace page with block tree.
 * PDF upload, page title editing, and block creation.
 */
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchPageBlocks, createBlockAsync, optimisticAddBlock,
  selectBlockTree, setCurrentPage,
} from '../store/blockSlice';
import BlockNode from '../components/blocks/BlockNode';
import SortableBlockList from '../components/blocks/SortableBlockList';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Upload, Plus, FileText, Loader, Layers, CheckSquare, Type } from 'lucide-react';

export default function BlocksPage() {
  const { pageId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const fileInputRef = useRef();

  const { byPage, loading } = useSelector((s) => s.blocks);
  const blockTree = useSelector((s) => pageId ? selectBlockTree(s, pageId) : []);

  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPageData] = useState(null);
  const [pageTitle, setPageTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [pdfContext, setPdfContext] = useState('');
  const titleSaveTimeout = useRef(null);

  // Load pages list
  useEffect(() => {
    api.get('/pages').then(({ data }) => setPages(data.pages || []));
  }, []);

  // Load current page and its blocks
  useEffect(() => {
    if (!pageId) return;
    dispatch(setCurrentPage(pageId));
    dispatch(fetchPageBlocks(pageId));
    api.get(`/pages/${pageId}`).then(({ data }) => {
      setCurrentPageData(data.page);
      setPageTitle(data.page.title);
    }).catch(() => navigate('/blocks'));
  }, [pageId, dispatch, navigate]);

  // ── Title editing with debounced save ────────────────────────────────────────
  const handleTitleChange = (e) => {
    setPageTitle(e.target.value);
    clearTimeout(titleSaveTimeout.current);
    titleSaveTimeout.current = setTimeout(() => {
      api.patch(`/pages/${pageId}`, { title: e.target.value });
    }, 1000);
  };

  // ── Helpers: get last block order ─────────────────────────────────────────
  const getLastOrder = () => {
    const blocks = byPage[pageId];
    if (!blocks || blocks.length === 0) return 0;
    return Math.max(...blocks.map(b => b.order || 0));
  };

  // ── Add Section (heading2) ────────────────────────────────────────────────
  const handleAddSection = (label = '') => {
    const tempId = `temp-${Date.now()}`;
    const newBlock = {
      _id: tempId, _tempId: tempId,
      page: pageId, parent: null,
      type: 'heading2',
      content: label,
      textContent: label,
      order: getLastOrder() + 1000,
      children: [], checked: false,
    };
    dispatch(optimisticAddBlock({ pageId, block: newBlock }));
    dispatch(createBlockAsync({ pageId, parentId: null, type: 'heading2', content: label, _tempId: tempId }));
  };

  // ── Add Task (checkbox, top-level) ────────────────────────────────────────
  const handleAddTask = (label = '', parentId = null) => {
    const tempId = `temp-${Date.now()}`;
    const newBlock = {
      _id: tempId, _tempId: tempId,
      page: pageId, parent: parentId,
      type: 'checkbox',
      content: label,
      textContent: label,
      order: getLastOrder() + 1000,
      children: [], checked: false,
    };
    dispatch(optimisticAddBlock({ pageId, block: newBlock }));
    dispatch(createBlockAsync({ pageId, parentId, type: 'checkbox', content: label, _tempId: tempId }));
  };

  // ── Add generic text block ────────────────────────────────────────────────
  const handleAddBlock = (type = 'text') => {
    const tempId = `temp-${Date.now()}`;
    const newBlock = {
      _id: tempId, _tempId: tempId,
      page: pageId, parent: null,
      type, content: '',
      order: getLastOrder() + 1000,
      children: [], checked: false,
    };
    dispatch(optimisticAddBlock({ pageId, block: newBlock }));
    dispatch(createBlockAsync({ pageId, parentId: null, type, _tempId: tempId }));
  };

  // ── PDF Upload Pipeline ────────────────────────────────────────────────────
  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('pageId', pageId);
    formData.append('context', pdfContext);

    try {
      const { data } = await api.post('/upload/pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data.usedAI === false) {
        toast(`⛳ Imported ${data.blocksCreated} blocks (text mode — add GROQ_API_KEY for AI structuring)`, { icon: '📚', duration: 6000 });
      } else {
        toast.success(`⚓ Extracted ${data.blocksCreated} blocks from PDF!`);
      }
      dispatch(fetchPageBlocks(pageId));
    } catch (err) {
      toast.error(err.response?.data?.message || 'PDF upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ── No page selected ──────────────────────────────────────────────────────────
  if (!pageId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16 }}>
        <FileText size={48} color="var(--text-muted)" />
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Choose a Sea Chart</h2>
        <p style={{ color: 'var(--text-muted)' }}>Select a page from the sidebar or create a new one.</p>
        <button
          className="btn btn-primary"
          onClick={async () => {
            const { data } = await api.post('/pages', {});
            navigate(`/blocks/${data.page._id}`);
          }}
        >
          <Plus size={16} /> New Sea Chart
        </button>

        {/* List pages */}
        {pages.length > 0 && (
          <div style={{ width: '100%', maxWidth: 400, marginTop: 16 }}>
            {pages.map(p => (
              <button
                key={p._id}
                onClick={() => navigate(`/blocks/${p._id}`)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                  padding: '10px 14px', background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)', borderRadius: 8,
                  cursor: 'pointer', marginBottom: 6, color: 'var(--text-primary)',
                  fontSize: '0.875rem', textAlign: 'left',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
              >
                <span>{p.icon || '🗺️'}</span>
                <span>{p.title || 'Untitled'}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        {/* Page icon + title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 28 }}>{currentPage?.icon || '🗺️'}</span>
          <input
            value={pageTitle}
            onChange={handleTitleChange}
            placeholder="Untitled Sea Chart"
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 800,
              color: 'var(--text-primary)', width: '100%',
            }}
          />
        </div>

        {/* PDF Upload Section */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
          padding: '10px 14px', background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)', borderRadius: 8,
        }}>
          <input
            type="text"
            placeholder="Optional: context for AI (e.g. 'IT syllabus')"
            value={pdfContext}
            onChange={e => setPdfContext(e.target.value)}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              fontSize: '0.8rem', color: 'var(--text-secondary)',
              minWidth: 180,
            }}
          />
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            style={{ gap: 6 }}
          >
            {uploading ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={14} />}
            {uploading ? 'Extracting...' : 'Import PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfUpload}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* ── Block Tree ──────────────────────────────────────────────────── */}
      <div style={{ minHeight: 300 }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: 24, borderRadius: 4 }} />
            ))}
          </div>
        ) : blockTree.length === 0 ? (
          /* ── Empty state ───────────────────────────────────────────────── */
          <div style={{
            padding: '40px 24px', textAlign: 'center',
            border: '1px dashed var(--border-subtle)', borderRadius: 10,
          }}>
            <FileText size={32} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <div style={{ color: 'var(--text-muted)', marginBottom: 20, fontSize: '0.9rem' }}>
              This chart is empty — add a section or task below
            </div>
            <QuickAddBar
              onAddSection={handleAddSection}
              onAddTask={handleAddTask}
              onAddText={() => handleAddBlock('text')}
            />
          </div>
        ) : (
          <div>
            <SortableBlockList
              blocks={blockTree}
              pageId={pageId}
              onAddTask={handleAddTask}
              onAddSection={handleAddSection}
            />

            {/* ── Bottom quick-add toolbar ───────────────────────────────── */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
              <QuickAddBar
                onAddSection={handleAddSection}
                onAddTask={handleAddTask}
                onAddText={() => handleAddBlock('text')}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── QuickAddBar component ─────────────────────────────────────────────────────
function QuickAddBar({ onAddSection, onAddTask, onAddText }) {
  const btnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border-subtle)',
    background: 'var(--bg-surface)', cursor: 'pointer',
    fontSize: '0.8rem', color: 'var(--text-secondary)',
    fontWeight: 500, transition: 'all 0.15s',
  };
  const hover = (e, active) => {
    e.currentTarget.style.borderColor = active ? 'var(--zoro-500)' : 'var(--border-subtle)';
    e.currentTarget.style.color = active ? 'var(--zoro-500)' : 'var(--text-secondary)';
    e.currentTarget.style.background = active ? 'rgba(0,255,157,0.05)' : 'var(--bg-surface)';
  };

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <button
        style={btnStyle}
        onClick={() => onAddSection()}
        onMouseEnter={e => hover(e, true)}
        onMouseLeave={e => hover(e, false)}
        title="Add a new section heading"
      >
        <Layers size={13} />
        Add Section
      </button>

      <button
        style={btnStyle}
        onClick={() => onAddTask()}
        onMouseEnter={e => hover(e, true)}
        onMouseLeave={e => hover(e, false)}
        title="Add a standalone task"
      >
        <CheckSquare size={13} />
        Add Task
      </button>

      <button
        style={{ ...btnStyle, opacity: 0.6 }}
        onClick={onAddText}
        onMouseEnter={e => hover(e, true)}
        onMouseLeave={e => hover(e, false)}
        title="Add a plain text note"
      >
        <Type size={13} />
        Add Note
      </button>
    </div>
  );
}
