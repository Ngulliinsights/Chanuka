/**
 * Text Diff Component
 *
 * Displays text differences between two strings with highlighting.
 * Uses a simple word-based diff algorithm.
 */

import { useMemo } from 'react';

interface TextDiffProps {
  text1: string;
  text2: string;
  label1?: string;
  label2?: string;
}

type DiffType = 'equal' | 'added' | 'removed';

interface DiffPart {
  type: DiffType;
  value: string;
}

export function TextDiff({
  text1,
  text2,
  label1 = 'Version 1',
  label2 = 'Version 2',
}: TextDiffProps) {
  const diff = useMemo(() => computeDiff(text1 || '', text2 || ''), [text1, text2]);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Left Side - Original */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{label1}</h4>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {diff.left.map((part, index) => (
              <span
                key={index}
                className={
                  part.type === 'removed'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-900 dark:text-red-200 line-through'
                    : part.type === 'equal'
                      ? ''
                      : 'opacity-30'
                }
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right Side - Modified */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">{label2}</h4>
        <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="text-sm leading-relaxed whitespace-pre-wrap">
            {diff.right.map((part, index) => (
              <span
                key={index}
                className={
                  part.type === 'added'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-900 dark:text-green-200'
                    : part.type === 'equal'
                      ? ''
                      : 'opacity-30'
                }
              >
                {part.value}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Compute word-level diff between two texts
 */
function computeDiff(text1: string, text2: string): { left: DiffPart[]; right: DiffPart[] } {
  const words1 = text1.split(/(\s+)/);
  const words2 = text2.split(/(\s+)/);

  const left: DiffPart[] = [];
  const right: DiffPart[] = [];

  let i = 0;
  let j = 0;

  while (i < words1.length || j < words2.length) {
    const word1 = words1[i] || '';
    const word2 = words2[j] || '';

    if (i >= words1.length) {
      // Remaining words in text2 are additions
      right.push({ type: 'added', value: word2 });
      left.push({ type: 'added', value: word2 });
      j++;
    } else if (j >= words2.length) {
      // Remaining words in text1 are removals
      left.push({ type: 'removed', value: word1 });
      right.push({ type: 'removed', value: word1 });
      i++;
    } else if (word1 === word2) {
      // Words match
      left.push({ type: 'equal', value: word1 });
      right.push({ type: 'equal', value: word2 });
      i++;
      j++;
    } else {
      // Words differ - look ahead to find match
      const matchInText2 = words2.slice(j).findIndex(w => w === word1);
      const matchInText1 = words1.slice(i).findIndex(w => w === word2);

      if (matchInText2 !== -1 && (matchInText1 === -1 || matchInText2 < matchInText1)) {
        // Words were added in text2
        for (let k = 0; k < matchInText2; k++) {
          const addedWord = words2[j + k] || '';
          right.push({ type: 'added', value: addedWord });
          left.push({ type: 'added', value: addedWord });
        }
        j += matchInText2;
      } else if (matchInText1 !== -1) {
        // Words were removed from text1
        for (let k = 0; k < matchInText1; k++) {
          const removedWord = words1[i + k] || '';
          left.push({ type: 'removed', value: removedWord });
          right.push({ type: 'removed', value: removedWord });
        }
        i += matchInText1;
      } else {
        // No match found - treat as replacement
        left.push({ type: 'removed', value: word1 });
        right.push({ type: 'added', value: word2 });
        i++;
        j++;
      }
    }
  }

  return { left, right };
}
