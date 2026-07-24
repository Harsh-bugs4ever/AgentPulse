export function Logo({ className }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="Logo" 
      className={className || "w-6 h-6"} 
    />
  );
}
