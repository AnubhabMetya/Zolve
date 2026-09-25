import React from 'react';

// Reusable 3D illustration wrapper per spec §17
// Props: service {id, name, accent, illustrationAlt}, selected boolean, eager boolean
export const ServiceIllustration = ({ service, selected = false, eager = false }) => {
  const id = service?.id || 'unknown';
  const alt = service?.illustrationAlt || service?.name || 'Service illustration';
  const accent = service?.accent || 'from-slate-50 to-slate-100/50';

  // PNG source — local generated asset; fallback to webp if preferred
  const pngSrc = `/illustrations/partner-3d/${id}.png`;
  const webpSrc = `/illustrations/partner-3d/${id}.webp`;

  const [imgError, setImgError] = React.useState(false);

  return (
    <div
      className={`relative mx-auto flex items-center justify-center rounded-[20px] bg-gradient-to-br ${accent} overflow-hidden ring-1 transition-all duration-300 ${
        selected ? 'ring-blue-200' : 'ring-slate-200/50'
      } w-[112px] h-[112px] sm:w-[132px] sm:h-[132px]`}
      aria-hidden="true"
    >
      {/* subtle studio highlight */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/30 via-transparent to-white/10 pointer-events-none" />
      {/* soft depth shadow at bottom */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-[70%] h-3 bg-slate-900/[0.06] blur-[6px] rounded-full pointer-events-none" />

      {!imgError ? (
        <picture className="relative z-10 w-[88%] h-[88%] flex items-center justify-center">
          <source srcSet={webpSrc} type="image/webp" />
          <img
            src={pngSrc}
            alt={alt}
            width={160}
            height={160}
            loading={eager ? 'eager' : 'lazy'}
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.08)] transition-transform duration-300 group-hover:scale-[1.04]"
            style={{ imageRendering: 'auto' }}
          />
        </picture>
      ) : (
        // fallback premium SVG composition when PNG missing (still 3D style, not flat icon)
        <Fallback3D label={service?.name} accent={accent} />
      )}
    </div>
  );
};

// Minimal premium fallback — rounded 3D block with initial
const Fallback3D = ({ label, accent }) => {
  const initial = (label || '?').charAt(0).toUpperCase();
  return (
    <div className="relative z-10 w-[88%] h-[88%] flex flex-col items-center justify-center">
      <div className="w-[84px] h-[84px] sm:w-[96px] sm:h-[96px] rounded-[18px] bg-white shadow-[0_8px_20px_rgba(15,23,42,0.08),0_1px_0_rgba(15,23,42,0.04)] border border-slate-200/60 flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-[36%] bg-gradient-to-b from-white to-transparent opacity-80" />
        <span className="text-3xl font-black text-slate-800 tracking-tight">{initial}</span>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-1.5 rounded-full bg-blue-600" />
      </div>
    </div>
  );
};

export default ServiceIllustration;
