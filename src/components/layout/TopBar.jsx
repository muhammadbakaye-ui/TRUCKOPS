import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Bell, User } from 'lucide-react';

export default function TopBar({ pageTitle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Loads?search=${encodeURIComponent(searchQuery.trim())}`));
    }
  };

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
      <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
      
      <div className="flex items-center gap-3">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search loads, invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 h-8 pl-8 text-xs bg-muted border-0"
          />
        </form>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Bell className="w-4 h-4 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <User className="w-4 h-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}