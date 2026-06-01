import React, { useState } from 'react';
import { ArrowLeft, Share2, Download, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export default function MobilePDFViewer({ htmlContent, title, onClose, onDownload }) {
  const [downloading, setDownloading] = useState(false);
  // Strip the floating download-bar from the embedded HTML so our action bar is the only CTA
  const iframeHtml = htmlContent.replace(
    /<div class="download-bar">[\s\S]*?<\/div>/,
    ''
  );

  const handleDownload = async () => {
    setDownloading(true);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:850px;height:1100px;border:none;visibility:hidden;';
    document.body.appendChild(iframe);
    try {
      iframe.contentDocument.open();
      iframe.contentDocument.write(iframeHtml);
      iframe.contentDocument.close();
      await new Promise(resolve => setTimeout(resolve, 1200));
      const body = iframe.contentDocument.body;
      const canvas = await html2canvas(body, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pxW = canvas.width / 1.5;
      const pxH = canvas.height / 1.5;
      const pdf = new jsPDF({ orientation: pxW > pxH ? 'landscape' : 'portrait', unit: 'px', format: [pxW, pxH] });
      pdf.addImage(imgData, 'PNG', 0, 0, pxW, pxH);
      pdf.save((title || 'document').replace(/\s+/g, '-') + '.pdf');
    } finally {
      document.body.removeChild(iframe);
      setDownloading(false);
    }
  };

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
        <div style={{ minWidth: '70px' }} />
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
          onClick={handleDownload}
          style={{
            flex: 1, height: '52px',
            background: '#166534', color: '#fff',
            border: 'none', borderRadius: '12px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '8px', fontSize: '15px', fontWeight: 600,
          }}
        >
          <Download style={{ width: 18, height: 18 }} />
          {downloading ? 'Generating PDF…' : 'Download PDF'}
        </button>
      </div>
    </div>
  );
}