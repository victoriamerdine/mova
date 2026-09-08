import { describe, expect, it } from 'vitest'

import { matchCatalogId, matchCatalogIds, parseCsv, rowsFromCsv } from '@/lib/csv-import'

describe('parseCsv', () => {
  it('campos entre comillas con delimitador y salto de línea adentro', () => {
    const text = 'a,"b,c","línea 1\nlínea 2"\n1,2,3'
    expect(parseCsv(text, ',')).toEqual([
      ['a', 'b,c', 'línea 1\nlínea 2'],
      ['1', '2', '3'],
    ])
  })
  it('comilla doble escapada ("")', () => {
    expect(parseCsv('nombre,"dice ""hola"""', ',')).toEqual([['nombre', 'dice "hola"']])
  })
  it('normaliza CRLF', () => {
    expect(parseCsv('a,b\r\nc,d', ',')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ])
  })
})

describe('rowsFromCsv', () => {
  it('mapea encabezados por alias (con acentos) y detecta ";"', () => {
    const csv = 'Nombre;Patrón;Músculo;Nivel;Video\nSentadilla;Dominante de rodilla;Cuádriceps;Intermedio;https://youtu.be/abcdefghijk'
    const [row] = rowsFromCsv(csv)
    expect(row).toMatchObject({
      line: 2,
      name: 'Sentadilla',
      pattern: 'Dominante de rodilla',
      muscle: 'Cuádriceps',
      difficulty: 'intermedio',
      videoUrl: 'https://youtu.be/abcdefghijk',
      error: null,
    })
  })

  it('sin encabezado reconocible, la 1ª columna es el nombre', () => {
    const [row] = rowsFromCsv('foo,bar\nSentadilla,x')
    expect(row.name).toBe('Sentadilla')
  })

  it('fila sin nombre ⇒ error "Sin nombre"', () => {
    const rows = rowsFromCsv('nombre,patron\n,Empuje')
    expect(rows[0].error).toBe('Sin nombre')
  })

  it('columna "deportes" se parte por , ; | /', () => {
    const [row] = rowsFromCsv('nombre,deportes\nSentadilla,"Fútbol, Running / Pádel"')
    expect(row.sports).toEqual(['Fútbol', 'Running', 'Pádel'])
  })

  it('columna "propiedad": mio ⇒ true, publico ⇒ false, vacío ⇒ null', () => {
    const rows = rowsFromCsv(
      'nombre,propiedad\nA,mio\nB,publico\nC,',
    )
    expect(rows.map((r) => r.owned)).toEqual([true, false, null])
  })

  it('CSV vacío o solo encabezado ⇒ []', () => {
    expect(rowsFromCsv('')).toEqual([])
    expect(rowsFromCsv('nombre,patron')).toEqual([])
  })
})

describe('matchCatalogId / matchCatalogIds', () => {
  const catalog = [
    { id: 'p1', name: 'Empuje horizontal' },
    { id: 'p2', name: 'Dominante de Rodilla' },
  ]
  it('matchea por nombre normalizado (acentos / mayúsculas)', () => {
    expect(matchCatalogId('  dominante de rodilla ', catalog)).toBe('p2')
    expect(matchCatalogId('EMPUJE HORIZONTAL', catalog)).toBe('p1')
  })
  it('null si no matchea o si viene vacío', () => {
    expect(matchCatalogId('Rotación', catalog)).toBeNull()
    expect(matchCatalogId('', catalog)).toBeNull()
  })
  it('matchCatalogIds descarta los que no matchean', () => {
    expect(matchCatalogIds(['Empuje horizontal', 'Nada', 'Dominante de Rodilla'], catalog)).toEqual([
      'p1',
      'p2',
    ])
  })
})
