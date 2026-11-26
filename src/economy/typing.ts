// Ajusta estos valores a tu gusto
// Inserciones idénticas seguidas que cuentan. Al mantener pulsada una tecla, el teclado
// repite el mismo texto sin parar; escribiendo de verdad casi nunca pasa de dos ("ll", "==").
export const MAX_IDENTICAL_INSERTS = 2;
// Lo que entra de golpe con más caracteres que esto (sin espacios) no lo has escrito tú:
// pegar, un snippet largo o una sugerencia de IA. No da RP. Escribiendo, cada cambio
// son 1 o 2 caracteres, y un autocompletado normal añade una palabra (addEventListener = 16).
export const MAX_TYPED_INSERT = 30;

// Espacios, tabuladores y saltos de línea no son escribir código: no dan RP
export function countableChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

// Filtra lo que se repite al mantener una tecla pulsada (también "()" o '""' que se cierran solos)
// y lo que no se ha escrito tecla a tecla (pegados)
export class RepeatFilter {
  private readonly last = new Map<string, { text: string; count: number }>();

  // Caracteres de esta inserción que cuentan para la Requisa
  countable(documentKey: string, text: string): number {
    // Borrar no inserta nada: no corta la racha de repeticiones (así no vale alternar con Retroceso)
    if (text === '') {
      return 0;
    }

    const previous = this.last.get(documentKey);
    const count = previous?.text === text ? previous.count + 1 : 1;
    this.last.set(documentKey, { text, count });

    if (count > MAX_IDENTICAL_INSERTS) {
      return 0;
    }
    const chars = countableChars(text);
    return chars > MAX_TYPED_INSERT ? 0 : chars;
  }

  forget(documentKey: string): void {
    this.last.delete(documentKey);
  }
}
