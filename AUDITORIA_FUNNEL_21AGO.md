# AUDITORÍA TOFU/MOFU/BOFU del panel — 21-ago 23:1x

> Disparada por JAVI (22:04, literal): «Pero creo que está mal / Tema bofu y demás».
> Tenía razón, y ahora está medido. Ejecuta el encargo de Gerard del 13-ago
> («los clasificaré por TOFU, MOFU o BOFU») que llevaba 8 días sin hacerse.

## LO QUE ESTABA MAL (medido sobre las 71 piezas)
1. **13 piezas SIN etiqueta de funnel** (se veían como «SIN» en el panel).
2. **8 piezas con la etiqueta EQUIVOCADA** — p. ej. «Mi padre me dijo que estaba loco»
   marcada TOFU siendo historia/mentalidad (BOFU); el caso de éxito de Jordi («Empezó de
   cero en marzo») marcado MOFU siendo BOFU; los memes del producto por dentro marcados
   MOFU siendo BOFU. Eso es el «ni tofu ni mofu» de Javi: la etiqueta no correspondía.
3. **3 ads de testimonios mezclados en el funnel orgánico** → etiquetados AD, fuera.
4. **7 captions ROTAS**: enseñan texto interno («CAPTION (voz javi):», «CUENTA: @…»)
   en vez del caption real. Lista al final. Es lo primero que hace parecer «inventado».

## REPARTO REAL DEL FEED tras corregir (60 piezas, sin stories ni ads)
| | Real | Objetivo Santi | Veredicto |
|---|---|---|---|
| TOFU (problema) | 26 · **43%** | 50% | **FALTAN ~4-6 piezas de problema** |
| MOFU (solución) | 17 · **28%** | 30% | ok |
| BOFU | 17 · **28%** | 20% | **SOBRA producto-por-dentro; FALTA caso de éxito** |

**El matiz que no se ve en la tabla**: el BOFU de Javi está cargado de «producto por
dentro» (módulos, 64 herramientas, panel) y el de Jordi casi no tiene **casos de éxito**
(2 de sus 17 piezas). El BOFU que convierte según Santi es caso + objeción, no catálogo.

## QUÉ HAY QUE GRABAR (es lo que Gerard le dijo a Javi: «tenemos que grabar»)
El formato dominante de Ramiro (la fuente de la estrategia) es **talking head** (29 de 41),
y es justo lo que menos tenemos. Lista mínima para cuadrar el funnel:
1. **JAVI · 4-6 TH de TOFU-dolor con cifra** (regla 30: «facturas 30.000 y te queda 0»),
   hooks del BANCO_FORMULAS_EQUIPO_16AGO. 30-45 s, sin rótulo, subs grandes.
2. **JORDI · 2-3 BOFU de caso de éxito**: su cara + pantallazo ORG_ verificado
   (cifra DENTRO de la imagen), cierre con él (regla 20: un solo alumno por pieza).
3. **JAVI · 2 MOFU «qué hacer»** (sin el cómo — el cómo es el producto).
Con eso el feed queda ≈ 50/30/20 sin tirar nada de lo hecho.

## CAPTIONS A REESCRIBIR (7)
CARRUSEL_JAVI_MOROSO_20AGO · MEME_REPLICA_JAVI_DEV1K · JAVI_NICHO_MERCADO_20AGO ·
REEL_JAVI_EVENTO_ALUMNOS_20AGO · CARRUSEL_JORDI_FILTRO_2AGO · CARRUSEL_JORDI_MOROSO_20AGO ·
REEL_JORDI_RETARGETING_20AGO (este además con la palabra «retargeting» = jerga, regla 11).

## QUÉ SE HA TOCADO Y QUÉ NO
- Corregidas 21 etiquetas en `piezas.json` (backup: `piezas.json.bak_21ago_funnel`).
- **NO se ha denegado ni borrado ninguna pieza** — eso lo decide Gerard pieza a pieza.
- Registro de cambios completo: salida de `_auditar_funnel.py`.
