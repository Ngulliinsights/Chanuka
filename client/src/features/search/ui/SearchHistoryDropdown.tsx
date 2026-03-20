import React from 'react';
import { Clock, X } from 'lucide-react';
import { Button } from '@client/lib/design-system';
import { searchHistoryService, SearchHistoryItem } from '@client/features/search/services/search-history-service';

interface SearchHistoryDropdownProps {
  onSelect: (query: string) => void;
  visible: boolean;
}

export function SearchHistoryDropdown({ onSelect, visible }: SearchHistoryDropdownProps) {
  const [history, setHistory] = React.useState<SearchHistoryItem[]>([]);

  React.useEffect(() => {
    if (visible) {
      setHistory(searchHistoryService.getHistory());
    }
  }, [visible]);

  const handleClear = () => {
    searchHistoryService.clearHistory();
    setHistory([]);
  };

  if (!visible || history.length === 0) return null;

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <span className="text-sm font-medium text-gray-700">Recent Searches</span>
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="py-2">
        {history.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.query)}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3"
          >
            <Clock className="h-4 w-4 text-gray-400" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-900 truncate">{item.query}</div>
              {item.resultCount !== undefined && (
                <div className="text-xs text-gray-500">{item.resultCount} results</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
