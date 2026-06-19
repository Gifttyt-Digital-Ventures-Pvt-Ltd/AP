import React, { useState } from "react";

const PoLogo = ({ logoUrl, companyName = "Organisation", className = "" }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const initial = String(companyName || "O").trim().charAt(0).toUpperCase() || "O";
  const showImage = Boolean(logoUrl) && !imageFailed;

  return (
    <div
      className={`grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded border ${
        showImage
          ? "border-slate-200 bg-white"
          : "border-emerald-700 bg-emerald-700 text-lg font-semibold text-white"
      } ${className}`}
    >
      {showImage ? (
        <img
          src={logoUrl}
          alt={`${companyName || "Organisation"} logo`}
          className="h-full w-full object-contain p-1"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
};

export default PoLogo;
