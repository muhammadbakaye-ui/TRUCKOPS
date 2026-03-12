import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Bell, LogOut, Shield } from 'lucide-react';
import { useSession } from '../shared/AppSession';
import Logo from '../shared/Logo';

export default function TopBar({ pageTitle }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { logout } = useSession();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(createPageUrl(`Loads?search=${encodeURIComponent(searchQuery.trim())}`));
    }
  };

  return (
    <div className="h-14 border-b border-border bg-card flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <Logo className="flex-shrink-0" showCompanyName={false} />
        <h1 className="text-sm font-semibold text-foreground leading-none">{pageTitle}</h1>
      </div>

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
        <div className="flex items-center gap-2 pl-2 border-l border-border">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Shield className="w-3.5 h-3.5" />
            <span className="font-medium">Admin</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
            onClick={logout}
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </div>
    </div>
  );
}