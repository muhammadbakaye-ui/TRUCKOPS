import React from 'react';
import { ArrowLeft, Share2, Download, MoreVertical } from 'lucide-react';

export default function MobilePDFViewer({ htmlContent, title, onClose, onDownload }) {
  // Strip the floating download-bar from the embedded HTML so our action bar is the only CTA
  const iframeHtml = htmlContent.replace(
    /<div class="download-bar">[\s\S]*?<\/div>/,
    ''
  );

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title, url: window.location.href }); } catch (_) {}
    } else {
      try { await navigator.clipboard.writeText(window.location.href); } catch (_) {}
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', flexDirection: 'column',
      background: '#0f1117',
    }}>
      {/* Top Nav */}
      <div style={{
        height: '52px', flexShrink: 0,
        background: '#0f1117',
        display: 'flex', alignItems: 'center',
        padding: '0 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <button
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            color: '#3b82f6', fontSize: '15px', fontWeight: 500,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 4px', minHeight: '44px', minWidth: '70px',
          }}
        >
          <ArrowLeft style={{ width: 18, height: 18, flexShrink: 0 }} />
          Back
        </button>
        <span style={{
          flex: 1, textAlign: 'center', color: '#fff',
          fontSize: '15px', fontWeight: 600, letterSpacing: '0.01em',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          padding: '0 8px',
        }}>{title}</span>
        <div style={{ minWidth: '70px', display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{
            color: 'rgba(255,255,255,0.45)', background: 'none', border: 'none',
            cursor: 'pointer', padding: '8px', minHeight: '44px',
            display: 'flex', alignItems: 'center',
          }}>
            <MoreVertical style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </div>

      {/* Document Area — scrollable iframe */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#d1d5db' }}>
        <iframe
          srcDoc={iframeHtml}
          style={{ width: '100%', height: '100%', border: 'none' }}
          title={title}
        />
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        flexShrink: 0,
        background: '#0f1117',
        display: 'flex', alignItems: 'center',
        padding: '10px 12px',
        gap: '10px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'calc(10px + env(safe-area-inset-bottom))',
      }}>
        <button
          onClick={handleShare}
          style={{
            flex: 1, height: '52px',
            background: '#1e2535', color: '#fff',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', fontSize: '15px', fontWeight: 500,
          }}
        >
          <Share2 style={{ width: 18, height: 18 }} />
          Share
        </button>
        <button
          onClick={onDownload}
          style={{
            flex: 1, height: '52px',
            background: '#166534', color: '#fff',
            border: 'none', borderRadius: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', fontSize: '15px', fontWeight: 600,
          }}
        >
          <Download style={{ width: 18, height: 18 }} />
          Download PDF
        </button>
      </div>
    </div>
  );
}