import ExcelJS from 'exceljs'

import { getLibraryCatalog } from '@/lib/supabase/queries/exercises'
import { getCurrentProfessor } from '@/lib/supabase/queries/professor-dashboard'

export const runtime = 'nodejs'

/**
 * Plantilla .xlsx para cargar ejercicios: los encabezados que espera la
 * importación por CSV, con validación de datos (listas desplegables) en
 * patrón, músculo, dificultad y deporte, tomadas del catálogo real. El
 * profesor la completa, la guarda como CSV y la sube en la ventana de
 * importación.
 */
export async function GET() {
  const professor = await getCurrentProfessor()
  if (!professor) return new Response('No autorizado', { status: 401 })

  const catalog = await getLibraryCatalog()

  const wb = new ExcelJS.Workbook()
  wb.creator = 'MOVA'

  // Hoja de listas (referencia + origen de las validaciones).
  const lists = wb.addWorksheet('Listas')
  lists.columns = [
    { header: 'Patrones', key: 'p', width: 28 },
    { header: 'Músculos', key: 'm', width: 28 },
    { header: 'Deportes', key: 's', width: 22 },
    { header: 'Dificultad', key: 'd', width: 16 },
  ]
  const maxLen = Math.max(catalog.patterns.length, catalog.muscles.length, catalog.sports.length, 3)
  for (let i = 0; i < maxLen; i++) {
    lists.addRow({
      p: catalog.patterns[i]?.name ?? null,
      m: catalog.muscles[i]?.name ?? null,
      s: catalog.sports[i]?.name ?? null,
      d: ['principiante', 'intermedio', 'avanzado'][i] ?? null,
    })
  }
  lists.getRow(1).font = { bold: true }

  const pEnd = catalog.patterns.length + 1
  const mEnd = catalog.muscles.length + 1
  const sEnd = catalog.sports.length + 1

  // Hoja principal.
  const ws = wb.addWorksheet('Ejercicios')
  ws.columns = [
    { header: 'nombre', key: 'nombre', width: 40 },
    { header: 'patron', key: 'patron', width: 22 },
    { header: 'musculo', key: 'musculo', width: 22 },
    { header: 'dificultad', key: 'dificultad', width: 14 },
    { header: 'video', key: 'video', width: 40 },
    { header: 'deportes', key: 'deportes', width: 24 },
    { header: 'descripcion', key: 'descripcion', width: 40 },
    { header: 'instrucciones', key: 'instrucciones', width: 40 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  // Comentario en el encabezado de "deportes".
  ws.getCell('F1').note =
    'Uno o varios deportes separados por coma. La lista sugiere valores válidos.'

  const LAST = 500 // filas con validación
  // Los tipos de exceljs no exponen `worksheet.dataValidations`, pero sí el
  // `dataValidation` por celda. Se aplica fila por fila.
  for (let r = 2; r <= LAST; r++) {
    ws.getCell(r, 2).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Listas!$A$2:$A$${pEnd}`],
    }
    ws.getCell(r, 3).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`Listas!$B$2:$B$${mEnd}`],
    }
    ws.getCell(r, 4).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"principiante,intermedio,avanzado"'],
    }
    ws.getCell(r, 6).dataValidation = {
      type: 'list',
      allowBlank: true,
      // showErrorMessage falso: permite escribir varios separados por coma.
      showErrorMessage: false,
      formulae: [`Listas!$C$2:$C$${sEnd}`],
    }
  }

  const buffer = await wb.xlsx.writeBuffer()

  return new Response(buffer, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="plantilla-ejercicios-mova.xlsx"',
      'Cache-Control': 'no-store',
    },
  })
}
