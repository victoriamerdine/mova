import { redirect } from 'next/navigation'

/**
 * `/constructor` era la maqueta estática de "Planes". La sección real vive
 * ahora en `/planes` (índice de todos los planes del profesor) y el editor
 * en `/planes/[planId]`. Se mantiene el redirect para no romper enlaces
 * viejos.
 */
export default function ConstructorRedirect() {
  redirect('/planes')
}
