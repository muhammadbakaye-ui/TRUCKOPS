import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function MobileLoadsHeader({ 
  filteredCount, 
  totalCount, 
  onNewLoad, 
  search, 
  onSearchChange,
  hasActiveFilters,
  onClearFilters,
  showFilters,
  onToggleFilters
}) {
  return (
    <div className="mobile-loads-header">
      {/* Top bar: Title + New Load button */}
      <div className="mobile-loads-top-bar">
        <div>
          <h1 className="text-lg font-bold text-foreground">Loads</h1>
          <p className="text-xs text-muted-foreground">
            {filteredCount} of {totalCount >= 1000 ? '1000+' : totalCount} loads
          </p>
        </div>
        <Button 
          className="new-load-btn" 
          onClick={onNewLoad}
        >
          <Plus className="w-4 h-4" /> 
          <span>New Load</span>
        </Button>
      </div>

      {/* Search bar */}
      <div className="mobile-search-bar">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search loads..."
          className="mobile-search-input"
        />
        {search && (
          <button onClick={() => onSearchChange('')} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter toggle bar */}
      <div className="mobile-filter-toggle-bar">
        <Button
          variant={showFilters ? "secondary" : "outline"}
          size="sm"
          className={cn(
            "w-full h-9 text-xs gap-2",
            showFilters && "bg-secondary"
          )}
          onClick={onToggleFilters}
        >
          <Filter className="w-3.5 h-3.5" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-primary" />
          )}
        </Button>
        {hasActiveFilters && showFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full h-9 text-xs gap-1 mt-2"
            onClick={onClearFilters}
          >
            <X className="w-3.5 h-3.5" />
            Clear All Filters
          </Button>
        )}
      </div>
    </div>
  );
}