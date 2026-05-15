import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export function usePreviewGate() {
  // Subscription wall temporarily disabled for live user testing
  const navigate = useNavigate();
  const [showDialog] = useState(false);
  const checkFeatureAccess = () => true;
  const handleDismiss = () => {};
  const handleSubscribe = () => {};
  const setShowDialog = () => {};
  return { showDialog, setShowDialog, checkFeatureAccess, handleDismiss, handleSubscribe, navigate };
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
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onDismiss}>Not Now</AlertDialogCancel>
          <AlertDialogAction onClick={onSubscribe}>Subscribe</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}