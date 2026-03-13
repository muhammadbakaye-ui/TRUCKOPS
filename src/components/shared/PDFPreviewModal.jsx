import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Printer, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PDFPreviewModal({ open, onClose, title, generatePDFContent }) {
  const [pdfUrl, setPdfUrl] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (open && generatePDFContent) {
      setIsGenerating(true);
      generatePDFContent()
        .then(url => {
          setPdfUrl(url);
          setIsGenerating(false);
        })
        .catch(err => {
          toast.error('Failed to generate PDF');
          setIsGenerating(false);
          onClose();
        });
    } else {
      setPdfUrl(null);
    }
  }, [open, generatePDFContent]);

  const handleDownload = () => {
    if (!pdfUrl) return;
    const link = document.createElement('a');
    link.href = pdfUrl;
    link.download = `${title || 'document'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('PDF downloaded');
  };

  const handlePrint = () => {
    if (!pdfUrl) return;
    const printWindow = window.open(pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>{title || 'PDF Preview'}</DialogTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleDownload} disabled={!pdfUrl}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button size="sm" variant="outline" onClick={handlePrint} disabled={!pdfUrl}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-hidden border rounded-lg bg-muted/20">
          {isGenerating ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-sm text-muted-foreground">Generating PDF...</p>
              </div>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-full"
              title="PDF Preview"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground">No PDF to display</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}