# CLAUDE.md — Extensión de VS Code con temática Warhammer 40K

> Nombre: **warhammer-companion** (confirmado por Pablo). Repo: `github.com/pablofdez-git/warHammer-vs`.
>
> **Si vienes de otro dispositivo o de otra conversación, lee primero la sección "Estado del proyecto".**

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

## Estado del proyecto

> Esta sección es la memoria del proyecto entre dispositivos y conversaciones.
> **Se actualiza al terminar cada fase y cada vez que se tome una decisión importante** (ver "Reglas para ti").

**Última actualización:** 2026-11-26 · **Último commit:** Fase 2 (`3530926`)

### Hecho

| Fase | Estado | Resumen |
|---|---|---|
| 0. Arranque | ✅ probada y subida | Config copiada de pokemon-companion (no se usó `yo code`). Partida + sincronización OneDrive (`OneDrive\WarhammerCompanion\partida.json`) con combinación en conflictos, RP con anti-abuso, botón de pausa, contador `🛡 N RP`. Comandos: `warhammerCompanion.togglePause`, `.syncNow`, `.resetProgress`. |
| 1. Datos | ✅ probada y subida | `npm run import-data` → `data/units.json` (SM 190, CSM 88, ORK 65 unidades; una por línea). Tipos compartidos en `src/data/types.ts`, cargador `src/data/units.ts`. |
| 2. Combate | ✅ probada y subida | `src/combat/`: dados inyectados (`D6Roller`), tabla F/R, críticos, salvación con FP e invulnerable, reglas de arma, ráfaga por fases y ronda de "Abrir fuego". |

Tests: `npm test` → 30 del importador (`node --test`) + 74 de la extensión (`vscode-test`), todos pasan.

### Decisiones tomadas (no volver a discutirlas sin motivo)

- **Facciones iniciales:** SM, CSM, ORK. Para añadir otra: su id en `FACTIONS` de `scripts/import-wahapedia.ts` y reimportar.
- **Puntos:** solo el **primer tramo** de precio (en 11ª ed. repetir unidad sale más caro); se ignoran `WARGEAR OPTIONS` (mejoras de equipo). Si en la Fase 4 se quiere el recargo por repetir, hay que importarlo.
- **Loadout:** cada `ModelProfile` guarda las armas que lleva **por defecto**; el combate solo elige entre esas (antes toda la escuadra disparaba el arma especial). 18 perfiles no se pueden leer y usan todas.
- **Combate:**
  - Una unidad es un grupo de miniaturas iguales (perfil de menos heridas, tamaño mínimo de escuadra). El daño que sobra al matar una miniatura se pierde.
  - Cada ráfaga usa **una** arma: la de más daño esperado contra ese objetivo (a distancia si tiene; si no, cuerpo a cuerpo), × miniaturas vivas.
  - Reglas implementadas: Torrent, Sustained Hits, Lethal Hits, Devastating Wounds, Anti-X, Twin-linked (con condiciones tipo `: non-monster/vehicle`). Ignoradas (dependen de distancia o movimiento): Rapid Fire, Melta, Blast, Heavy, etc.
  - Ronda: dispara el jugador; si el enemigo sobrevive, responde.
- **Scripts** (`scripts/`): TypeScript ejecutado directamente por Node 24, ESM (`scripts/package.json`), tsconfig propio sin emitir. El `tsconfig.json` raíz solo incluye `src/`.

### Lo siguiente: Fase 3 (Auspex)

Pendiente de diseñar con Pablo antes de programar:

1. **Elegir enemigos según los puntos** de la unidad del jugador. La simulación lo demostró: Intercessors contra Land Raider = 0 % de victorias, y contra Boyz = 98 %.
2. Como aún no hay elección de facción (Fase 4), decidir qué unidad usa el jugador mientras tanto.
3. Webview con el contacto, la ficha, los dados animados por fases (`VolleyResult` ya trae impactos, heridas y salvaciones por separado), botones Abrir fuego / Retirada, registro y barra de tiempo.
4. Las recompensas en RP al ganar.

Ideas aparcadas para más adelante:
- El cuerpo a cuerpo como acción. Los Orkos disparando pierden mucho: Boyz contra Legionaries = 13 %.
- Que una unidad dispare todas sus armas, no solo una.

### Entorno y particularidades (para no volver a tropezar)

- **pokemon-companion** está en `C:\Users\Alumno\Documents\proyVsCode\pokemon-companion` (en el ordenador del centro). También está instalado como extensión, por eso `.vscode/launch.json` lleva `--disable-extensions`: sin eso, F5 carga también Ctrl+Catch.
- **PowerShell bloquea `npm`** (política de ejecución): usar **`npm.cmd`** (`npm.cmd test`, `npm.cmd run import-data`) o una terminal Command Prompt.
- **`data/raw/` no está en git.** En un dispositivo nuevo, para reimportar hay que descargar los 7 CSV (lista en "Datos: Wahapedia"). La extensión funciona sin ellos, porque `data/units.json` sí está en git.
- Alguna red bloquea `wahapedia.ru` (la DNS la manda a `10.10.10.1`, con un certificado no válido). No saltarse el TLS: cambiar de red.
- Si aparecen `.js` dentro de `scripts/`, sobran (los genera el `npm run watch` del F5). Ya están en `.gitignore`.
- En un dispositivo nuevo: `git clone`, luego `npm.cmd install`, y F5 o `npm.cmd test`.

## Qué reutilizar de pokemon-companion

Ruta local: `C:\Users\Alumno\Documents\proyVsCode\pokemon-companion` (si no existe en este dispositivo, pídesela a Pablo o clona `github.com/pablofdez-git/pokemon-companion`). Revisa estas partes antes de reescribirlas:

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

- No hay una API tipo PokéAPI. La fuente es el **data export de Wahapedia** (11ª edición): CSV enlazados por ID.
  Página: `https://wahapedia.ru/wh40k11ed/the-rules/data-export/`. Especificación: `https://wahapedia.ru/wh40k11ed/Export%20Data%20Specs.xlsx`.
- **Ficheros que se usan** (en `data/raw/`, descarga en `https://wahapedia.ru/wh40k11ed/<Nombre>.csv`): `Factions`, `Datasheets`, `Datasheets_models`, `Datasheets_wargear`, `Datasheets_models_cost`, `Datasheets_keywords`, `Last_update`.
- **Formato comprobado:**
  - Separador `|`, UTF-8 **con BOM**, y **cada línea termina en `|`**.
  - A, F y D pueden ser dados (`D6`, `2D6+3`). La HP es un número o `-` (Torrent).
  - La tabla de puntos tiene filas de título sin precio (tramos de precio, `WARGEAR OPTIONS`, composición).
  - `Datasheets.loadout` es HTML con el equipo por defecto.
- El **script de importación** (`scripts/import-wahapedia.ts`) genera `data/units.json`. La extensión empaqueta ese JSON y **no descarga nada en tiempo de ejecución**.
- `data/raw/` va en `.gitignore`.
- Wahapedia pide mencionarla (*"powered by Wahapedia"*) si se publica: hay que ponerlo en el README (Fase 7).

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

- Empieza leyendo este archivo, sobre todo **"Estado del proyecto"**, para continuar por donde se quedó.
- **Mantén "Estado del proyecto" al día siempre, sin que Pablo tenga que pedirlo.** Actualízalo:
  - al terminar cada fase (qué se hizo, cómo se probó, fecha);
  - cuando se tome una decisión de diseño o se descarte una idea;
  - cuando aparezca un problema del entorno y su solución;
  - antes de cada commit, para que el commit lleve el estado actualizado (incluido el hash del último commit cuando se conozca).
  Mantenlo corto: es un resumen para retomar el trabajo, no un diario. Si algo deja de ser cierto, corrígelo o bórralo.
- No hagas commit ni push sin que Pablo lo pida.
- Mantén los webviews con CSP estricta y recursos locales (`asWebviewUri`).
- No metas dependencias pesadas si se puede hacer con TS y CSS nativos.
