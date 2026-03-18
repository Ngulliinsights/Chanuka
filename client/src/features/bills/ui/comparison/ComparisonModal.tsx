/**
 * Comparison Modal
 *
 * Modal for quick bill comparison from any page.
 * Allows users to select bills and navigate to full comparison view.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GitCompare } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Badge,
} from '@client/lib/design-system';
import { useComparisonCart } from '../../hooks/useComparisonCart';
import { BillSelector } from './BillSelector';

interface ComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedBillId?: string;
}

export function ComparisonModal({ isOpen, onClose, preselectedBillId }: ComparisonModalProps) {
  const navigate = useNavigate();
  const { billIds, addBill, removeBill, clearCart, canAddMore } = useComparisonCart();
  const [localSelection, setLocalSelection] = useState<string[]>([]);

  // Initialize with preselected bill and cart items
  useEffect(() => {
    if (isOpen) {
      const initial = [...billIds];
      if (preselectedBillId && !initial.includes(preselectedBillId)) {
        initial.unshift(preselectedBillId);
      }
      setLocalSelection(initial);
    }
  }, [isOpen, preselectedBillId, billIds]);

  const handleBillsSelected = (ids: string[]) => {
    setLocalSelection(ids);
  };

  const handleCompare = () => {
    // Update cart with selected bills
    clearCart();
    localSelection.forEach(id => addBill(id));

    // Navigate to comparison page
    navigate(`/analysis/compare?bills=${localSelection.join(',')}`);
    onClose();
  };

  const handleClose = () => {
    setLocalSelection([]);
    onClose();
  };

  const canCompare = localSelection.length >= 2;
  const maxReached = localSelection.length >= 4;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompare className="w-5 h-5" />
            Compare Bills
          </DialogTitle>
          <DialogDescription>
            Select 2-4 bills to compare side-by-side.{' '}
            {localSelection.length > 0 && (
              <span className="font-medium">{localSelection.length} selected</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          <BillSelector
            selectedBillIds={localSelection}
            onBillsSelected={handleBillsSelected}
            maxBills={4}
          />

          {maxReached && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                Maximum of 4 bills can be compared at once.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {localSelection.length > 0 && (
              <Badge variant="secondary">{localSelection.length} / 4 bills</Badge>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleCompare} disabled={!canCompare} className="gap-2">
              <GitCompare className="w-4 h-4" />
              View Comparison
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
