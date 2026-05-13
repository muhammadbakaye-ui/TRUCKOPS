import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function usePreviewGate() {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);

  const checkFeatureAccess = (isInPreview) => {
    if (isInPreview) {
      setShowDialog(true);
      return false;
    }
    return true;
  };

  const handleSubscribe = () => {
    setShowDialog(false);
    navigate('/pricing');
  };

  const handleDismiss = () => {
    setShowDialog(false);
  };

  return { showDialog, checkFeatureAccess, handleSubscribe, handleDismiss };
}

export function PreviewFeatureDialog({ open, onSubscribe, onDismiss }) {
  return (
    <AlertDialog open={open} onOpenChange={(isOpen) => !isOpen && onDismiss()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Preview Mode</AlertDialogTitle>
          <AlertDialogDescription>
            This feature is only available to subscribers. Subscribe to unlock full access and help support the platform.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex gap-3">
          <AlertDialogCancel onClick={onDismiss}>Not Now</AlertDialogCancel>
          <AlertDialogAction onClick={onSubscribe}>Subscribe</AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}