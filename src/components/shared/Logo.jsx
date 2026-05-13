export default function Logo({ className = '', showCompanyName = true }) {
  return (
    <div className={`text-center ${className}`}>
      <div className="flex items-center justify-center mb-3">
        <img
          src="https://media.base44.com/images/public/6a0409fc37a632ab53db20fd/fcd8c7ffa_image.png"
          alt="FleetDesk Pro Logo"
          className="h-14 w-14 object-contain"
        />
      </div>
      <h1 className="text-2xl font-bold text-sidebar-primary-foreground tracking-widest">TRUCKOPS</h1>
      {showCompanyName && (
        <p className="text-sidebar-foreground/60 text-xs mt-2 tracking-wide">UNITY TRANSPORTATION LLC</p>
      )}
    </div>
  );
}