import { SVGProps, useId } from "react"

interface FlagProps extends SVGProps<SVGSVGElement> {
  className?: string
}

// Indonesia Flag - Waving style
export function FlagIndonesia({ className = "h-4 w-5", ...props }: FlagProps) {
  const id = useId()
  const clipId = `id-wave-${id}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M0,8 Q80,0 160,8 T320,8 T480,8 T640,8 L640,472 Q560,480 480,472 T320,472 T160,472 T0,472 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* White background */}
        <rect width="640" height="480" fill="#fff" />
        {/* Red top half with wave */}
        <path d="M0,8 Q80,0 160,8 T320,8 T480,8 T640,8 L640,240 Q560,248 480,240 T320,240 T160,240 T0,240 Z" fill="#ce1126" />
      </g>
      {/* Border outline */}
      <path
        d="M0,8 Q80,0 160,8 T320,8 T480,8 T640,8 L640,472 Q560,480 480,472 T320,472 T160,472 T0,472 Z"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="8"
      />
    </svg>
  )
}

// United Kingdom Flag - Waving style
export function FlagUnitedKingdom({ className = "h-4 w-5", ...props }: FlagProps) {
  const id = useId()
  const clipId = `uk-wave-${id}`

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 480"
      className={className}
      {...props}
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M0,8 Q80,0 160,8 T320,8 T480,8 T640,8 L640,472 Q560,480 480,472 T320,472 T160,472 T0,472 Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        {/* Blue background */}
        <rect width="640" height="480" fill="#012169" />
        {/* White diagonal stripes */}
        <path d="M0,0 L640,480 M640,0 L0,480" stroke="#fff" strokeWidth="80" />
        {/* Red diagonal stripes */}
        <path d="M0,0 L640,480 M640,0 L0,480" stroke="#C8102E" strokeWidth="32" />
        {/* White cross */}
        <path d="M320,0 V480 M0,240 H640" stroke="#fff" strokeWidth="128" />
        {/* Red cross */}
        <path d="M320,0 V480 M0,240 H640" stroke="#C8102E" strokeWidth="80" />
      </g>
      {/* Border outline */}
      <path
        d="M0,8 Q80,0 160,8 T320,8 T480,8 T640,8 L640,472 Q560,480 480,472 T320,472 T160,472 T0,472 Z"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="8"
      />
    </svg>
  )
}

// Flag component map for easy access
export const FlagIcons = {
  id: FlagIndonesia,
  en: FlagUnitedKingdom,
} as const
