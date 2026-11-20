import { encodeCode39 } from '../utils/barcodeGenerator'

export function BarcodeSvg({
  value,
  height = 50,
  className = '',
}: {
  value: string
  height?: number
  className?: string
}) {
  const { bars, totalWidth } = encodeCode39(value)

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[240px] h-auto"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect width={totalWidth} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => (
          <rect
            key={idx}
            x={bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#000000"
          />
        ))}
      </svg>
      <span className="font-mono text-xs tracking-widest text-slate-800 mt-1 font-semibold">
        {value}
      </span>
    </div>
  )
}
