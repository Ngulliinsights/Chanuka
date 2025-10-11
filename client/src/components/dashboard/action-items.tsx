import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useBills } from '@/hooks/use-bills';
import { logger } from '../utils/logger.js';

export const ActionItems = () => {
  const { actionItems, isLoading } = useBills();

  return (
    <Card className="bg-white rounded-lg border border-slate-200 shadow">
      <CardHeader className="px-5 py-4 border-b border-slate-200">
        <h3 className="text-base font-semibold">Your Action Items</h3>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 bg-slate-100 animate-pulse rounded-md"></div>
            <div className="h-8 bg-slate-100 animate-pulse rounded-md"></div>
          </div>
        ) : actionItems && actionItems.length > 0 ? (
          <div className="space-y-3">
            {actionItems.map((item, index) => (
              <div key={index} className="flex justify-between items-start border-b pb-2 last:border-0">
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  item.priority === 'High' 
                    ? 'bg-red-100 text-red-800' 
                    : item.priority === 'Medium'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {item.priority}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-slate-500">
            <p className="text-sm">No action items at the moment</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
