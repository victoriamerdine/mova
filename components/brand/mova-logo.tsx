'use client'

import { useId } from 'react'
import type { SVGProps } from 'react'

/**
 * Marca MOVA — wordmark con la "V" convertida en una figura (persona con los
 * brazos en alto, arcos verde→turquesa→azul). Las letras usan `currentColor`
 * (heredan el color del contenedor, así funciona en claro/oscuro).
 *
 * - `<MovaLogo>` — lockup horizontal. `withTagline` agrega "Tu vida en
 *   movimiento." debajo.
 * - `<MovaMark>` — solo la figura, en viewBox cuadrado (íconos).
 *
 * Client component para poder usar `useId()` y no chocar de id de gradiente
 * cuando hay varias instancias en la misma página.
 */

// Figura dibujada en un box local de 100×104, vértice ~(50, 92). Brazo
// derecho más largo (hace de pata de la "V"); la cabeza entra en el hueco.
const FIG = {
  leftArm:
    'M46 88 C36 74 23 53 13 28 C10 20 21 15 26 25 C36 47 46 67 59 85 C62 91 50 95 46 88 Z',
  rightArm:
    'M55 88 C63 66 79 42 93 15 C97 6 108 10 103 21 C91 49 73 74 65 86 C61 93 50 95 55 88 Z',
  body: 'M43 82 L59 82 L55 99 C54 102 48 102 47 99 Z',
  head: { cx: 54, cy: 18, r: 13.5 },
} as const

function FigureGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0.58" y1="0" x2="0.28" y2="1">
      <stop offset="0" stopColor="#8ad04c" />
      <stop offset="0.4" stopColor="#57c479" />
      <stop offset="0.72" stopColor="#22b3aa" />
      <stop offset="1" stopColor="#1a97db" />
    </linearGradient>
  )
}

function Figure({ fill }: { fill: string }) {
  return (
    <g fill={fill}>
      <path d={FIG.body} />
      <path d={FIG.leftArm} />
      <path d={FIG.rightArm} />
      <circle cx={FIG.head.cx} cy={FIG.head.cy} r={FIG.head.r} />
    </g>
  )
}

export function MovaLogo({
  withTagline = false,
  ...props
}: SVGProps<SVGSVGElement> & { withTagline?: boolean }) {
  const gid = useId()
  // Inter 800 @ 34: "MO" ≈ 0–55; la figura (box 100, escala 0.5) hace de "V"
  // solapando un poco la "O"; "A" arranca en ~104.
  const height = withTagline ? 52 : 39
  return (
    <svg
      viewBox={`0 0 131 ${height}`}
      role="img"
      aria-label="MOVA — Tu vida en movimiento"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <FigureGradient id={gid} />
      </defs>
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
        <text x="104" y="30">
          A
        </text>
      </g>
      <g transform="translate(52 -4) scale(0.5)">
        <Figure fill={`url(#${gid})`} />
      </g>
      {withTagline ? (
        <text
          x="1"
          y="48"
          fill="currentColor"
          fontFamily="var(--font-inter), system-ui, sans-serif"
          fontWeight={600}
          fontSize="7"
          letterSpacing="1.8"
          opacity="0.85"
        >
          Tu vida en movimiento.
        </text>
      ) : null}
    </svg>
  )
}

export function MovaMark(props: SVGProps<SVGSVGElement>) {
  const gid = useId()
  return (
    <svg viewBox="0 0 44 44" role="img" aria-label="MOVA" xmlns="http://www.w3.org/2000/svg" {...props}>
      <defs>
        <FigureGradient id={gid} />
      </defs>
      <g transform="translate(-2 1) scale(0.44)">
        <Figure fill={`url(#${gid})`} />
      </g>
    </svg>
  )
}
