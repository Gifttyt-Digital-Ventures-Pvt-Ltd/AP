import React from 'react';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../components/ui/alert-dialog';

const DeleteVendorDialog = ({ open, onOpenChange, onConfirm, deleting = false }) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent
      onEscapeKeyDown={(event) => deleting && event.preventDefault()}
      onInteractOutside={(event) => deleting && event.preventDefault()}
    >
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete this vendor? This action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          disabled={deleting}
          onClick={(event) => {
            event.preventDefault();
            onConfirm?.();
          }}
        >
          {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {deleting ? 'Deleting…' : 'Delete'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export default DeleteVendorDialog;
