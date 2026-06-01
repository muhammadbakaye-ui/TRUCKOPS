import { useSession } from './AppSession';

export default function Logo({ className = '', showCompanyName = true }) {
  const { session } = useSession() || {};
  const companyName = session?.company_name || '';

  return (
    <div className={`text-center ${className}`}>
      <div className="flex items-center justify-center mb-3">
        <img src="https://media.base44.com/images/public/6a0409fc37a632ab53db20fd/5e47d1777_image.png" alt="TruckOps" className="h-14 w-14 object-contain" />
      </div>
      <h1 className="text-2xl font-bold text-sidebar-primary-foreground tracking-widest">TRUCKOPS</h1>
      {showCompanyName && companyName && (
        <p className="text-sidebar-foreground/60 text-xs mt-2 tracking-wide">{companyName.toUpperCase()}</p>
      )}
    </div>
  );
}