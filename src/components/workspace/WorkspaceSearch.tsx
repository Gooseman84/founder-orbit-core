import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultsCount?: number;
  className?: string;
}

export function WorkspaceSearch({
  value,
  onChange,
  resultsCount,
  className,
}: WorkspaceSearchProps) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        placeholder="Search documents..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8 h-8 text-xs"
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChange('')}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
        </Button>
      )}
    </div>
  );
}

interface SearchResultsInfoProps {
  query: string;
  count: number;
}

export function SearchResultsInfo({ query, count }: SearchResultsInfoProps) {
  if (!query) return null;

  return (
    <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">
      {count === 0 ? (
        <span>No results for "{query}"</span>
      ) : (
        <span>
          {count} document{count !== 1 ? 's' : ''} found
        </span>
      )}
    </div>
  );
}

// Highlight matching text in search results
export function HighlightedText({
  text,
  query,
}: {
  text: string;
  query: string;
}) {
  if (!query.trim()) return <>{text}</>;

  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            className="bg-primary/30 text-foreground rounded px-0.5"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

function escapeRegex(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
