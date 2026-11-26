# CLAUDE.md — Extensión de VS Code con temática Warhammer 40K

> Nombre provisional: **warhammer-companion** (cámbialo si Pablo elige otro).

## Qué es este proyecto

Extensión de VS Code en **TypeScript** que convierte programar en una pequeña campaña de Warhammer 40K:
mientras el usuario escribe código aparecen **contactos hostiles** en un panel lateral, se resuelven con
**tiradas de dados reales** (reglas simplificadas de 40K) y las victorias dan **Puntos de Requisa** para
reclutar unidades y montar una **lista de ejército**.

Es la "hermana" de una extensión que Pablo ya terminó: **pokemon-companion**
(repo: `github.com/pablofdez-git/pokemon-companion`). Muchas piezas se reutilizan tal cual, adaptando nombres
y temática. **Antes de escribir algo nuevo, mira si ya existe allí.**

## Sobre quién trabaja contigo

- Pablo es estudiante de 2º de DAM. Tiene base de JS/TS, pero no domina hacer una extensión desde cero.
- **Explica el razonamiento antes de implementar** y avanza **por fases pequeñas** que se puedan probar (F5 en VS Code).
- Código **modular**: ficheros pequeños con una responsabilidad cada uno, nada de un `extension.ts` gigante.
- Cuando algo falle, explica el error de forma clara y sin complicarlo.
- Al terminar cada fase, di exactamente cómo probarla y para ahí; no encadenes fases sin que Pablo lo confirme.
- Responde en español.

## Qué reutilizar de pokemon-companion

Pide a Pablo la ruta local del repo (o clónalo) y revisa estas partes antes de reescribirlas:

| En pokemon-companion | Aquí pasa a ser |
|---|---|
| Monedas por caracteres escritos al guardar (con protección anti-abuso de borrar + guardar + Ctrl+Z) | **Puntos de Requisa (RP)**, misma lógica |
| Guardado de la partida en un archivo dentro de OneDrive, sincronizado entre dos ordenadores | Igual, otro nombre de archivo |
| Botón de pausar/reanudar en la barra de estado | Igual |
| Sin comando de "forzar encuentro" (para evitar trampas) | Igual: no existe en la versión final (solo en modo debug si hace falta) |
| Vista "Encuentro" en la barra lateral (webview) + "Mochila" | **Auspex** (encuentro/combate) + **Lista de Ejército** |
| Tienda abierta desde la barra de estado | **Armería / Requisición** |
| Generaciones que se desbloquean por progreso | **Facciones / unidades de élite** que se desbloquean por progreso |
| Shiny | Opcional: unidades **veteranas** o **reliquias** raras |

## Mecánicas

1. **Facción inicial**: al instalar, el usuario elige facción (p. ej. Imperio, Caos, Orkos, Necrones…). Define su ejército y qué enemigos le salen más.
2. **Contactos**: mientras se escribe hay una probabilidad de que aparezca una unidad enemiga en el Auspex, con un tiempo límite (barra que baja).
3. **Combate con dados** (funciones puras en `src/combat/`):
   - Impactar: d6 ≥ Habilidad de Proyectiles (HP) del atacante. Un 6 siempre impacta (crítico).
   - Herir: Fuerza (F) contra Resistencia (R):
     - F ≥ 2×R → 2+
     - F > R → 3+
     - F = R → 4+
     - F < R → 5+
     - F ≤ R/2 → 6+
   - Salvación: d6 ≥ Salvación del defensor modificada por el FP del arma (si se implementa).
   - Daño: cada herida no salvada resta el Daño del arma a las Heridas (H) del objetivo.
   - Acciones del usuario: **Abrir fuego** (una ronda de tiradas) y **Retirada**.
4. **Recompensa**: al eliminar al enemigo se ganan RP (y alguna vez la unidad queda disponible para reclutar).
5. **Lista de Ejército**: unidades reclutadas con su coste en puntos y un límite (500 / 1000 / 2000) que se amplía con el progreso.
6. **Corrupción del Caos** (mecánica propia, la más original): se lee `vscode.languages.getDiagnostics()`. Si hay muchos errores, sube un medidor de corrupción (barra de estado). Con nivel alto salen enemigos del Caos más duros. Al arreglar los errores, la corrupción baja ("purificación").

## Datos: Wahapedia

- No hay una API tipo PokéAPI. La fuente es el **data export de Wahapedia** (40K, edición actual): CSV enlazados por ID.
  Página: `https://wahapedia.ru/wh40k11ed/the-rules/data-export` (comprobar la URL de la edición vigente).
- Ficheros útiles (comprobar nombres reales): `Factions.csv`, `Datasheets.csv`, `Datasheets_models.csv` (M, R, Sv, H…), `Datasheets_wargear.csv` (armas: alcance, ataques, HP, F, FP, D), `Datasheets_models_cost.csv` (puntos).
- **Comprueba el separador y la codificación** antes de parsear (creo que Wahapedia usa `|`, no comas).
- Plan: un **script de importación** (`scripts/import-wahapedia.ts`) que lea los CSV descargados a mano en `data/raw/` y genere un JSON reducido en `data/units.json` con solo los campos y facciones necesarios. La extensión empaqueta ese JSON; **no descarga nada en tiempo de ejecución**.
- `data/raw/` va en `.gitignore`.

## Propiedad intelectual (importante)

- **Nada de imágenes, logos ni arte de Games Workshop.** Tampoco iconos de facción oficiales.
- Siluetas **genéricas por tipo de unidad** (infantería, monstruo, vehículo, personaje) en pixel art propio (SVG o PNG pequeños, 2-3 fotogramas), coloreadas por facción.
- Si algún día se publica: README con aviso de proyecto de fans no afiliado a Games Workshop. Para uso personal y compartir con compañeros no pasa nada.

## Estilo visual: "cogitador"

Hay una maqueta aprobada como punto de partida (Pablo ha dicho que hay que darle una vuelta):

- Fondo casi negro `#050705`, verde fósforo `#39ff7a`, verde apagado `#6fbf85` para etiquetas, bordes `#143d22`.
- Ámbar `#ffb347` para críticos y recompensas, rojo `#ff5a4f` para daño, vida y corrupción.
- Fuentes: **VT323** para títulos y dados, **IBM Plex Mono** para el texto (empaquetadas en la extensión: los webviews no deben depender de Google Fonts).
- Efectos CSS: líneas de escaneo, parpadeo suave, texto de registro con cursor `_`, dados que giran al tirar, 6 resaltados, temblor del panel al recibir daño, números de daño flotantes.
- El protagonista visual es el **combate con dados**, no el sprite.
- Respetar `prefers-reduced-motion`.

## Estructura propuesta

```
src/
  extension.ts            # solo activa y conecta módulos
  core/                   # partida, guardado, sincronización OneDrive, pausa
  economy/                # Puntos de Requisa + anti-abuso
  encounters/             # probabilidad y generación de contactos
  combat/                 # dados y reglas (funciones puras + tests)
  army/                   # lista de ejército, puntos, desbloqueos
  corruption/             # lectura de diagnósticos y nivel de corrupción
  data/                   # carga y tipos de units.json
  views/
    auspex/               # webview del encuentro (html, css, js)
    army/                 # vista de la lista de ejército
    armory/               # tienda
  statusbar/
scripts/import-wahapedia.ts
data/units.json
media/                    # siluetas, fuentes
```

## Fases (una cada vez, probando entre medias)

0. **Arranque**: proyecto con `yo code` (TypeScript), estructura de carpetas, y portar de pokemon-companion: guardado + sincronización OneDrive, Requisa + anti-abuso, pausa.
1. **Datos**: script de importación de Wahapedia → `units.json` con 2-3 facciones para empezar.
2. **Motor de combate**: funciones puras en `combat/` con tests unitarios (tabla F contra R, críticos, salvación).
3. **Auspex**: webview con el contacto, la ficha, los dados animados, Abrir fuego / Retirada, registro y barra de tiempo.
4. **Elección de facción** + **Lista de Ejército** + **Armería**.
5. **Corrupción del Caos** a partir de los diagnósticos.
6. **Desbloqueos** por progreso y unidades raras.
7. **Pulido**: animaciones, sonido opcional, empaquetado `.vsix`, README.

## Reglas para ti (Claude Code)

- Empieza leyendo este archivo y preguntando a Pablo por la ruta de pokemon-companion si no la tienes.
- No hagas commit ni push sin que Pablo lo pida.
- Mantén los webviews con CSP estricta y recursos locales (`asWebviewUri`).
- No metas dependencias pesadas si se puede hacer con TS y CSS nativos.
