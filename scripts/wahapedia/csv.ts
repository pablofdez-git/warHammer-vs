// Lectura de los CSV de Wahapedia: separador "|", UTF-8 con BOM y un "|" al final de cada línea

export type Row = Record<string, string>;

const SEPARATOR = '|';
const BOM = '﻿';

// Parte una línea en campos y quita el campo vacío que deja el "|" final
function splitLine(line: string): string[] {
  const fields = line.split(SEPARATOR);
  if (fields[fields.length - 1] === '') {
    fields.pop();
  }
  return fields;
}

// Convierte el texto de un CSV en filas { columna: valor }.
// Si una línea no tiene tantos campos como la cabecera, para con un error: mejor eso que
// importar datos desplazados de columna sin enterarse (por ejemplo, si cambia el formato)
export function parseCsv(text: string, fileName = 'CSV'): Row[] {
  const lines = text.replace(BOM, '').split(/\r?\n/);
  const header = splitLine(lines[0] ?? '');
  if (header.length === 0 || header[0] === '') {
    throw new Error(`${fileName}: no tiene cabecera`);
  }

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === '') {
      continue;
    }
    const fields = splitLine(lines[i]);
    if (fields.length !== header.length) {
      throw new Error(
        `${fileName}, línea ${i + 1}: tiene ${fields.length} campos y la cabecera ${header.length}`
      );
    }
    const row: Row = {};
    header.forEach((column, index) => {
      row[column] = fields[index].trim();
    });
    rows.push(row);
  }
  return rows;
}

// Comprueba que el CSV trae las columnas que el importador va a usar
export function requireColumns(rows: Row[], columns: string[], fileName: string): void {
  if (rows.length === 0) {
    throw new Error(`${fileName}: está vacío`);
  }
  const missing = columns.filter((column) => !(column in rows[0]));
  if (missing.length > 0) {
    throw new Error(`${fileName}: faltan las columnas ${missing.join(', ')}`);
  }
}

// Agrupa filas por una columna (normalmente datasheet_id)
export function groupBy(rows: Row[], column: string): Map<string, Row[]> {
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = row[column];
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }
  return groups;
}
