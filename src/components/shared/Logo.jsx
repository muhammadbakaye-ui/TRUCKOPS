import { Truck } from 'lucide-react';

export default function Logo({ className = '', showCompanyName = true }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="flex items-center justify-center mb-3">
        <div className="h-14 w-14 bg-sidebar-accent rounded-2xl flex items-center justify-center shadow-lg">
          <Truck className="w-8 h-8 text-sidebar-primary" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-sidebar-primary-foreground tracking-widest">TRUCKOPS</h1>
      {showCompanyName && (
        <p className="text-sidebar-foreground/60 text-xs mt-2 tracking-wide">UNITY TRANSPORTATION LLC</p>
      )}
    </div>
  );
}