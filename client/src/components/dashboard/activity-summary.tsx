import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useBills } from '@/hooks/use-bills';
import { logger } from '../utils/logger.js';

export const ActivitySummary = () => {
  const { summary, isLoading } = useBills();

  return (
    <Card className="bg-white rounded-lg border border-slate-200 shadow">
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <h3 className="text-base font-semibold">Activity Summary</h3>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            <div className="h-16 bg-slate-100 animate-pulse rounded-md"></div>
            <div className="h-16 bg-slate-100 animate-pulse rounded-md"></div>
            <div className="h-16 bg-slate-100 animate-pulse rounded-md"></div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-600">{summary?.billsTracked || 0}</p>
              <p className="text-xs text-slate-500">Bills Tracked</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600">{summary?.actionsNeeded || 0}</p>
              <p className="text-xs text-slate-500">Actions Needed</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600">{summary?.topicsCount || 0}</p>
              <p className="text-xs text-slate-500">Topics</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
