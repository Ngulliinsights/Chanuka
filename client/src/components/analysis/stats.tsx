import { Card, CardContent, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { logger } from '../../utils/logger';

interface Bill {
  supportPercentage?: number;
  views?: number;
  analyses?: number;
  endorsements?: number;
  verifiedClaims?: number;
}

interface BillStatsProps {
  bill: Bill;
}

export const BillStats = ({ bill }: BillStatsProps) => {
  const supportPercentage = bill.supportPercentage || 0;
  const oppositionPercentage = 100 - supportPercentage;

  return (
    <Card className="sticky top-6">
      <CardContent className="p-6">
        <CardTitle className="mb-4 text-xl font-semibold">Bill Statistics</CardTitle>
        
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Support</span>
              <span>{supportPercentage}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="bg-green-500 h-full rounded-full" 
                style={{ width: `${supportPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium">Opposition</span>
              <span>{oppositionPercentage}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="bg-red-500 h-full rounded-full" 
                style={{ width: `${oppositionPercentage}%` }}
              ></div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <h3 className="font-medium mb-2">Engagement Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold text-primary-600">{bill.views || 0}</p>
                <p className="text-xs text-slate-500">Total Views</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">{bill.analyses || 0}</p>
                <p className="text-xs text-slate-500">Analyses</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">{bill.endorsements || 0}</p>
                <p className="text-xs text-slate-500">Endorsements</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">{bill.verifiedClaims || 0}</p>
                <p className="text-xs text-slate-500">Verified Claims</p>
              </div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-slate-200">
            <h3 className="font-medium mb-2">Expert Verification</h3>
            <div className="flex justify-between items-center text-sm">
              <span>Constitutional Assessment</span>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">Verified</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-2">
              <span>Economic Impact Analysis</span>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">Pending</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

