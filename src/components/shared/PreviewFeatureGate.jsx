import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

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

   const handleDismiss = () => {
     setShowDialog(false);
   };

   const handleSubscribe = () => {
     setShowDialog(false);
     navigate('/pricing');
   };

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