import type { SVGProps } from 'react'

/**
 * Marca MOVA — wordmark con la "V" convertida en una figura (persona con los
 * brazos en alto). Las letras usan `currentColor` (heredan el color del
 * contenedor, así funciona en claro/oscuro); la figura va en el verde de
 * marca (`--primary`, con fallback fijo por si el SVG se usa fuera de la app).
 *
 * - `<MovaLogo>` — lockup horizontal. `withTagline` agrega "Tu vida en
 *   movimiento." debajo.
 * - `<MovaMark>` — solo la figura, en viewBox cuadrado (íconos).
 */

const GREEN = 'var(--primary, #3f9e7e)'

/** Figura (persona con brazos en alto) centrada en cx; hace de "V". */
function Figure({ cx }: { cx: number }) {
  return (
    <g fill="none" stroke={GREEN} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${cx - 14} 2 L${cx} 28 L${cx + 14} 2`} strokeWidth="7" />
      <path d={`M${cx} 28 L${cx} 35`} strokeWidth="7" />
      <circle cx={cx} cy="8.5" r="4.8" fill={GREEN} stroke="none" />
    </g>
  )
}

export function MovaLogo({
  withTagline = false,
  ...props
}: SVGProps<SVGSVGElement> & { withTagline?: boolean }) {
  // Coordenadas afinadas a ojo contra Inter 800: "MO" ocupa ~0–55, la figura
  // hace de "V" en ~56–80, y "A" arranca en ~79.
  const figureCx = 67
  const height = withTagline ? 52 : 38
  return (
    <svg
      viewBox={`0 0 109 ${height}`}
      role="img"
      aria-label="MOVA — Tu vida en movimiento"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g
        fill="currentColor"
        fontFamily="var(--font-inter), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
        fontWeight={800}
        fontSize="34"
        letterSpacing="-2"
      >
        <text x="0" y="30">
          MO
        </text>
        <text x="79" y="30">
          A
        </text>
      </g>
      <Figure cx={figureCx} />
      {withTagline ? (
        <text
          x="1"
          y="48"
          fill="currentColor"
          fontFamily="var(--font-inter), system-ui, sans-serif"
          fontWeight={600}
          fontSize="7.4"
          letterSpacing="1.15"
          opacity="0.8"
        >
          Tu vida en movimiento.
        </text>
      ) : null}
    </svg>
  )
}

export function MovaMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 40 40"
      role="img"
      aria-label="MOVA"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g fill="none" stroke={GREEN} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 6 L20 33 L34 6" strokeWidth="7.5" />
        <path d="M20 33 L20 37" strokeWidth="7.5" />
        <circle cx="20" cy="11" r="6" fill={GREEN} stroke="none" />
      </g>
    </svg>
  )
}
