import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pizzaService } from '../service/service';
import View from './view';
import Button from '../components/button';
import { useBreadcrumb } from '../hooks/appNavigation';

export default function DeleteUser() {
  const { state } = useLocation();
  const navigateToParentPath = useBreadcrumb();
  const [isDeleting, setIsDeleting] = useState(false);

  const user = useMemo(() => state?.user, [state]);

  useEffect(() => {
    if (!user) navigateToParentPath();
  }, [user, navigateToParentPath]);

  const handleDelete = useCallback(async () => {
    if (!user || isDeleting) return;
    setIsDeleting(true);
    try {
      await pizzaService.deleteUser(user);
      navigateToParentPath();
    } finally {
      setIsDeleting(false);
    }
  }, [user, isDeleting, navigateToParentPath]);

  const handleCancel = useCallback(() => {
    if (!isDeleting) navigateToParentPath();
  }, [isDeleting, navigateToParentPath]);

  return (
    <View title="Are you sure you want to delete?">
      <div className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl rounded-2xl bg-white shadow-xl ring-1 ring-black/5 p-6">
          <p className="text-sm text-slate-700">
            This action can’t be undone. The selected user will be permanently removed.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Button
              title={isDeleting ? 'Deleting…' : 'Delete'}
              onPress={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300"
            />
            <Button
              title="Cancel"
              onPress={handleCancel}
              className="bg-transparent border border-slate-300 text-slate-700 hover:bg-slate-100"
            />
          </div>
        </div>
      </div>
    </View>
  );
}
