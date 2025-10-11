import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useBills } from '@/hooks/use-bills';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';
import { logger } from '../utils/logger.js';

export const TrackedTopics = () => {
  const { trackedTopics, isLoading } = useBills();
  const [isEditing, setIsEditing] = useState(false);

  return (
    <Card className="bg-white rounded-lg border border-slate-200 shadow">
      <CardHeader className="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
        <h3 className="text-base font-semibold">Tracked Topics</h3>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-xs font-medium px-2.5 py-1.5 border border-slate-300 rounded"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </CardHeader>
      <CardContent className="p-5">
        {isLoading ? (
          <div className="h-12 bg-slate-100 animate-pulse rounded-md"></div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {trackedTopics && trackedTopics.map((topic, index) => (
              <span 
                key={index} 
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${
                  isEditing ? 'pr-1' : ''
                }`}
              >
                {topic}
                {isEditing && (
                  <button 
                    className="ml-1 text-blue-500 hover:text-blue-700"
                    aria-label={`Remove ${topic}`}
                  >
                    ✕
                  </button>
                )}
              </span>
            ))}
            {isEditing && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-full h-6 px-2 text-primary"
              >
                <PlusCircle className="h-3 w-3 mr-1" />
                <span className="text-xs">Add</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
