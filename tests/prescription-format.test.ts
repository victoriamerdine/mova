import { describe, expect, it } from 'vitest'

import {
  formatMToLabel,
  formatSecToLabel,
  parseDistanceToM,
  parseLooseNumber,
  parseTimeToSec,
  textOrNull,
} from '@/lib/prescription-format'

describe('parseLooseNumber', () => {
  it('primer número del string', () => {
    expect(parseLooseNumber('60 kg')).toBe(60)
    expect(parseLooseNumber('1.5')).toBe(1.5)
    expect(parseLooseNumber('1,5')).toBe(1.5)
    expect(parseLooseNumber('-3 grados')).toBe(-3)
  })
  it('null si no hay número', () => {
    expect(parseLooseNumber('pesado')).toBeNull()
    expect(parseLooseNumber('')).toBeNull()
    expect(parseLooseNumber(null)).toBeNull()
  })
})

describe('parseTimeToSec', () => {
  it('mm:ss y hh:mm:ss', () => {
    expect(parseTimeToSec('3:30')).toBe(210)
    expect(parseTimeToSec('3:05:10')).toBe(11110)
  })
  it('segundos sueltos', () => {
    expect(parseTimeToSec('45')).toBe(45)
    expect(parseTimeToSec('45 s')).toBe(45)
    expect(parseTimeToSec('45 seg')).toBe(45)
  })
  it('minutos', () => {
    expect(parseTimeToSec('3 min')).toBe(180)
    expect(parseTimeToSec('3m')).toBe(180)
    expect(parseTimeToSec('1.5 min')).toBe(90)
  })
  it('horas — "2h" son 7200 s, no 2 (regresión del \\bh)', () => {
    expect(parseTimeToSec('2h')).toBe(7200)
    expect(parseTimeToSec('1 hora')).toBe(3600)
  })
  it('vacío / inválido ⇒ null', () => {
    expect(parseTimeToSec('')).toBeNull()
    expect(parseTimeToSec(null)).toBeNull()
    expect(parseTimeToSec('3:xx')).toBeNull()
    expect(parseTimeToSec('rápido')).toBeNull()
  })
})

describe('formatSecToLabel', () => {
  it('formatea predecible', () => {
    expect(formatSecToLabel(45)).toBe('45 s')
    expect(formatSecToLabel(180)).toBe('3 min')
    expect(formatSecToLabel(185)).toBe('3:05')
    expect(formatSecToLabel(0)).toBe('0 s')
  })
  it('null / negativo ⇒ ""', () => {
    expect(formatSecToLabel(null)).toBe('')
    expect(formatSecToLabel(-1)).toBe('')
    expect(formatSecToLabel(undefined)).toBe('')
  })
  it('round-trip con parseTimeToSec', () => {
    for (const s of [30, 90, 125, 3600]) {
      expect(parseTimeToSec(formatSecToLabel(s))).toBe(s)
    }
  })
})

describe('parseDistanceToM', () => {
  it('metros por defecto', () => {
    expect(parseDistanceToM('400')).toBe(400)
    expect(parseDistanceToM('400 m')).toBe(400)
  })
  it('kilómetros', () => {
    expect(parseDistanceToM('5 km')).toBe(5000)
    expect(parseDistanceToM('5k')).toBe(5000)
    expect(parseDistanceToM('1.5km')).toBe(1500)
  })
  it('inválido ⇒ null', () => {
    expect(parseDistanceToM('un rato')).toBeNull()
    expect(parseDistanceToM(null)).toBeNull()
  })
})

describe('formatMToLabel', () => {
  it('km exactos vs metros', () => {
    expect(formatMToLabel(5000)).toBe('5 km')
    expect(formatMToLabel(1500)).toBe('1500 m')
    expect(formatMToLabel(400)).toBe('400 m')
  })
  it('null / negativo ⇒ ""', () => {
    expect(formatMToLabel(null)).toBe('')
    expect(formatMToLabel(-5)).toBe('')
  })
})

describe('textOrNull', () => {
  it('trim, "" ⇒ null', () => {
    expect(textOrNull('  4:30 /km ')).toBe('4:30 /km')
    expect(textOrNull('   ')).toBeNull()
    expect(textOrNull('')).toBeNull()
    expect(textOrNull(null)).toBeNull()
  })
})
