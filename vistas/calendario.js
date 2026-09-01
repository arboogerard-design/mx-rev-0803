/* =============================================================================
   vistas/calendario.js  ·  CALENDARIO DE LA SEMANA  (BUILD_SPEC_PANEL_ELITE §5.4)
   =============================================================================

   QUÉ HACE
   --------
   Pinta la semana real de publicación en una rejilla [Sin fecha | 7 días]:

     · COLUMNA BACKLOG «Sin fecha (N)» — TODO lo que no tiene día, en dos grupos:
       las APROBADAS (se cogen y se sueltan en un hueco) y, plegadas debajo, las
       que siguen esperando decisión (se ven y se cuentan, pero no se colocan:
       una pieza entra en el calendario cuando alguien la aprueba). En móvil no
       hay drag: se TOCA la pieza (queda «cogida») y se TOCA el hueco. Mismo
       camino de código.
     · 7 COLUMNAS DÍA — lo que ya está colocado (hora · título · pill de cuenta ·
       formato) y, debajo, los huecos que el calendario de Santi pide para ese
       día con su motivo medido. El día de hoy va con borde de acento.
     · BARRA 50/30/20 por cuenta (`estrategia-contenido-santi.md` S1): de cada 10
       piezas, 5 TOFU · 3 MOFU · 2 BOFU. Enseña el mix actual contra el objetivo
       para ver el hueco de un vistazo. **Es orientación, no bloqueo** (§5.4).

   Programar aquí NO publica y no toca ninguna red: solo coloca la pieza en su
   día. Publicar sigue siendo manual y con OK de Gerard pieza a pieza (§1 ley 3).

   DE QUÉ DATOS VIVE  (§2 · el contrato es SAGRADO, los nombres son literales)
   --------------------------------------------------------------------------
   LECTURA — globals que este módulo NO declara; los pone index.html:

     DATOS       {generado, hoy, rango:{desde,hasta}, semana, dias[], dias_iso[],
                  piezas[], huecos[]}                         ← piezas.json
                 pieza = {id, cuenta:"JAVI"|"JORDI", tipo, fecha:"2026-08-25",
                          dia:"mar 25", hora, etiqueta:"TOFU"|…|"SIN",
                          caption, archivos:[{archivo, poster, video?, peso_mb?}]}
                 ⚠ archivos[] es un array de OBJETOS: se lee .poster/.video,
                   NUNCA se interpola el objeto crudo (bug §6.3).
                 ⭐ `fecha` es ISO y es LA FUENTE. `dia` es una ETIQUETA de
                   pintado ("mar 25"): no dice mes ni año y NO se usa para
                   decidir en qué día cae una pieza — ver `fechaISOde()` y el
                   bug que arregló (agosto repetido en las 52 semanas del año).
                 ⚠ MEDIDO el 25-ago sobre las **94** piezas del fichero:
                   **44 no traen fecha** (el 47 %) y **65 traen `etiqueta:"SIN"`**.
                   Por eso la barra 50/30/20 cuenta aparte las «sin clasificar»
                   en vez de repartirlas a ojo, y la columna «Sin fecha» enseña
                   las 44 (ley 4: lo que no se sabe se dice, no se rellena).
                 dias_iso[] = [{fecha:"2026-08-25", etiqueta:"mar 25"}] — el
                   Único sitio que traduce una etiqueta a una fecha de verdad.
                 huecos[] = {dia, fecha, cuenta, formato, hora, motivo}: el
                   motivo REAL de cada hueco, escrito a mano.
     CAL_AUTO    ← calendario.json, lo genera `calendario_auto.py`:
                 {generado, desde, dias, modo_f1,
                  cuentas:{JAVI|JORDI:{lm, feed, techo_lm, reparto:{TOFU..},
                    colocadas:[{fecha,dia,slot,formato_santi,id,etapa,formato,…}],
                    vacios:[{fecha,dia,slot,formato,motivo}], …}}}
                 De aquí salen LOS SLOTS de Santi (qué formato toca a cada hora)
                 y el motivo de los vacíos. Su `fecha` es ISO: es el único sitio
                 con fechas de verdad, porque `pieza.dia` solo trae "lun 24".
     E           estado vivo fusionado por leerBlob():
                 {decisiones:{[id]:{estado,motivo,por,cuando}}, referentes:[],
                  calendario:{}, f1:{}, hooks:[], notas:{}}
                 E.decisiones[id].estado === "aprobado"  →  entra en el backlog.
                 E.calendario                            →  ver ESCRITURA.
     YO · FCUENTA ("todo"|"JAVI"|"JORDI") · FETAPA · TAB
     esc(s) · aviso(t,mal) · render() · filtrosHTML()  (todos opcionales: si el
                 shell no los trae, este fichero cae a su propia versión y sigue)

   ESCRITURA (§2.B · el reparto se respeta EXACTO o se pierden votos)
     guardar(aplicar) → BLOB compartido. Aquí se escribe la clave `calendario`,
                        que YA existe en el esquema del BLOB (§2.B la declara
                        «objeto (histórico, hoy {})») y hoy no la usa nadie.
                        Forma que se le da, key-by-key por pieza para que dos
                        personas programando a la vez no se pisen (§3.3 · §6.5):
                          calendario[piezaId] = {fecha, hora, por, cuando}
                        `fecha` en ISO "YYYY-MM-DD".  `fecha:""` significa
                        EXPLÍCITAMENTE «sin fecha» y manda sobre el `dia` que
                        venga del disco: así se puede desprogramar una pieza que
                        piezas.json ya traía con día.
     NO se toca guardarMio()/`ordenes`: programar no es una orden para Claude,
     no la consume el productor (§7.3) y colarla ahí llenaría de ruido el
     WhatsApp que manda `panel_listener.py`.

   CÓMO SE ENGANCHA A index.html  (§3.4 · §6.1)  — este fichero NO toca el index
   -----------------------------------------------------------------------------
     <link rel="stylesheet" href="vistas/calendario.css">
     <script src="vistas/calendario.js"></script>   ← script CLÁSICO, no módulo:
                                                      el panel es HTML estático y
                                                      `type=module` cortaría el
                                                      acceso a los globals.
     const VISTAS = { …, calendario: vistaCalendario, … };
     app.innerHTML = (VISTAS[TAB] || vistaEspia)();
     function cablear(){ …; cablearCalendario(); }

   Todo el cableado va por DELEGACIÓN en `document` y es IDEMPOTENTE: se puede
   llamar a cablearCalendario() después de cada `innerHTML` sin duplicar
   listeners. Cero `onclick` inline. Todos los atributos van prefijados
   `data-cal*` para no chocar con los `data-rp`/`data-a`/`data-f` de las otras
   pantallas (dos handlers sobre el mismo atributo = dos escrituras por clic).

   DECISIONES QUE LA SPEC NO CIERRA (dichas en voz alta, no escondidas)
   -------------------------------------------------------------------
     · Las horas de los 3 slots son 19:00 · 19:30 · 20:00. No las inventa este
       fichero: son EXACTAMENTE las que trae piezas.json (8 · 6 · 6 piezas) y
       las que exige la regla 25 del equipo (subir entre 19:00 y 20:00). Cuando
       DATOS.huecos declara una hora para ese hueco, manda la suya.
     · La semana empieza en LUNES (el calendario de Santi y `DATOS.semana`
       — "24-30 agosto 2026" — son lunes→domingo), aunque CAL_AUTO arranque en
       domingo. Los días de CAL_AUTO se cruzan por fecha ISO, no por posición.
     · La etapa se codifica por PESO, no por color: nadie la ha decidido, así
       que no lleva color semántico (§4: el color aparece cuando alguien decide).
   ============================================================================= */

(function () {
"use strict";

/* --------------------------------------------------------------- constantes */

/* Fijos, no dependientes del locale del navegador: tienen que casar letra a
   letra con las etiquetas de DATOS.dias ("lun 24", "mié 26", "sáb 29") y con el
   `dia` corto de CAL_AUTO ("dom", "lun", …). */
var DIA_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
var DIA_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
var MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/* Las 3 horas reales de publicación (ver cabecera). Índice = slot de CAL_AUTO. */
var HORA_SLOT = ["19:00", "19:30", "20:00"];

/* Reparto S1 de `estrategia-contenido-santi.md`: de cada 10, 5 · 3 · 2. */
var ETAPAS = ["TOFU", "MOFU", "BOFU"];
var MIX    = {TOFU: 0.5, MOFU: 0.3, BOFU: 0.2};

/* El equipo no piensa en siglas y la regla 11 prohíbe la jerga. */
var ETAPA_HUMANO = {TOFU: "Para que te descubran", MOFU: "Para que te consideren",
                    BOFU: "Para que compren", SIN: "Sin etapa"};

var CUENTA_HUMANO = {JAVI: "Javi", JORDI: "Jordi", "": "Sin cuenta"};

/* ---------------------------------------------------------- estado privado */

var SEM      = null;   /* lunes de la semana visible (Date). null = la de hoy */
var SEL      = null;   /* id de la pieza «cogida» del backlog (flujo táctil)  */
var MONTADO  = false;

/* -------------------------------------------------- puentes con los globals */
/* `typeof` sobre un identificador que no existe no lanza; leerlo a pelo sí. */

function _datos() { return (typeof DATOS    !== "undefined" && DATOS)    || {piezas: []}; }
function _est()   { return (typeof E        !== "undefined" && E)        || {}; }
function _cal()   { return (typeof CAL_AUTO !== "undefined" && CAL_AUTO) || {}; }
function _yo()    { return (typeof YO       !== "undefined" && YO)       || ""; }
function _fc()    { try { if (typeof FCUENTA !== "undefined") return FCUENTA || "todo"; } catch (e) {} return "todo"; }
function _fe()    { try { if (typeof FETAPA  !== "undefined") return FETAPA  || "todo"; } catch (e) {} return "todo"; }

function avisar(t, mal) {
  if (typeof aviso === "function") { aviso(t, mal); return; }
  if (mal) console.warn("[calendario]", t); else console.log("[calendario]", t);
}
function pintar() {
  if (typeof render === "function") { render(); return; }
  var app = document.querySelector("#app");
  if (app) { app.innerHTML = vistaCalendario(); montar(); }
}
function esc_(s) {
  if (typeof esc === "function") { try { return esc(s); } catch (e) {} }
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
  });
}
/* Mismo sello que el resto del panel: la fusión del §2.B elige por `cuando`
   comparando STRINGS. Cambiar el formato rompe el merge. */
function sello() { return new Date().toISOString().slice(0, 16).replace("T", " "); }

/* ------------------------------------------------------------------- fechas */

function pad(n) { return (n < 10 ? "0" : "") + n; }
function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
function hoyISO() { return iso(new Date()); }

function lunesDe(d) {
  var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));   /* getDay: 0=domingo */
  return x;
}
function semanaBase() { return SEM ? new Date(SEM) : lunesDe(new Date()); }

/* Las 7 columnas de la semana visible. */
function columnas() {
  var l = semanaBase(), out = [], i, d;
  for (i = 0; i < 7; i++) {
    d = new Date(l.getFullYear(), l.getMonth(), l.getDate() + i);
    out.push({d: d, iso: iso(d), corto: DIA_CORTO[d.getDay()], largo: DIA_LARGO[d.getDay()],
              num: d.getDate(), etiqueta: DIA_CORTO[d.getDay()] + " " + d.getDate()});
  }
  return out;
}
/* El AÑO va siempre. Un panel que dura años no puede tener una cabecera que no
   diga de qué año es la semana que estás mirando: "24 – 30 ago" es la misma
   frase en 2026 y en 2027, y navegando 52 semanas se pierde el norte. */
function rangoTexto(cols) {
  var a = cols[0].d, b = cols[6].d;
  if (a.getFullYear() !== b.getFullYear()) {
    return a.getDate() + " " + MES_CORTO[a.getMonth()] + " " + a.getFullYear() + " – " +
           b.getDate() + " " + MES_CORTO[b.getMonth()] + " " + b.getFullYear();
  }
  if (a.getMonth() === b.getMonth()) {
    return a.getDate() + " – " + b.getDate() + " " + MES_CORTO[b.getMonth()] + " " + b.getFullYear();
  }
  return a.getDate() + " " + MES_CORTO[a.getMonth()] + " – " +
         b.getDate() + " " + MES_CORTO[b.getMonth()] + " " + b.getFullYear();
}

/* ---- navegar un año entero sin ir a ciegas -------------------------------
   Con ‹ › solos, ir de agosto a diciembre son 17 clics sin saber si hay algo al
   otro lado. Estas dos funciones dan las dos únicas cosas que hacen falta: cuántas
   piezas tiene la semana visible, y a qué semana saltar si está vacía. */
function fechasConPieza() {
  var l = piezas(), vis = {}, i, f;
  for (i = 0; i < l.length; i++) {
    if (!pasaCuenta(l[i])) continue;
    f = fechaISOde(l[i]);
    if (f) vis[f] = 1;
  }
  return Object.keys(vis);
}
/* Lunes más cercano (antes o después) que tenga alguna pieza. "" si no hay ninguna. */
function lunesConPieza(refLunes) {
  var f = fechasConPieza(), best = "", bd = Infinity, i, lun, d;
  for (i = 0; i < f.length; i++) {
    lun = lunesDe(new Date(f[i] + "T00:00:00"));
    d = Math.abs(lun.getTime() - refLunes.getTime());
    if (d > 0 && d < bd) { bd = d; best = iso(lun); }
  }
  return best;
}

/* ---------------------------------------------------------- lecturas de dato */

function piezas()    { return _datos().piezas || []; }
function piezaDe(id) { var l = piezas(), i; for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
function decDe(id)   { return (_est().decisiones || {})[id] || null; }
function calDe(id)   { return (_est().calendario || {})[id] || null; }

function aprobada(id) {
  var d = decDe(id);
  return !!(d && String(d.estado || "").toLowerCase() === "aprobado");
}

/* Bug §6.3: un item de archivos[] es SIEMPRE un objeto — se lee .poster, nunca
   se interpola el objeto (así salía src="[object Object]" en el panel viejo).
   `video` y `peso_mb` pueden faltar; `poster` es la miniatura y siempre existe. */
function miniDe(p) {
  var a = (p.archivos || [])[0];
  if (!a) return "";
  if (typeof a === "string") return /\.(mp4|mov|webm)$/i.test(a) ? "" : a;
  return a.poster || "";
}

/* Título: la primera línea del caption, que es lo que el equipo reconoce de un
   vistazo. Sin caption se enseña el id tal cual — nunca un título inventado. */
function tituloDe(p) {
  var l = String(p.caption || "").split("\n"), i, t;
  for (i = 0; i < l.length; i++) { t = l[i].trim(); if (t) break; }
  if (!t) return p.id;
  return t.length > 72 ? t.slice(0, 70) + "…" : t;
}

/* La etapa sale del dato, de donde exista. Si no existe en ningún sitio es
   "SIN" y se cuenta aparte en la barra: no se reparte a ojo (ley 4). */
function etapaDe(p) {
  var e = String(p.etiqueta || "").toUpperCase();
  if (ETAPAS.indexOf(e) >= 0) return e;
  var c = colocadaDe(p.id);
  if (c) { e = String(c.etapa || "").toUpperCase(); if (ETAPAS.indexOf(e) >= 0) return e; }
  return "SIN";
}
function colocadaDe(id) {
  var cu = _cal().cuentas || {}, k, l, i;
  for (k in cu) {
    if (!Object.prototype.hasOwnProperty.call(cu, k)) continue;
    l = (cu[k] || {}).colocadas || [];
    for (i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
  }
  return null;
}

/* ⛔ LA ETIQUETA "dom 23" NO ES UNA FECHA — y tratarla como si lo fuera hacía
   que el calendario REPITIERA AGOSTO ENTERO en las 52 semanas del año.
   Medido el 25-ago en el navegador: abriendo la semana del **21-27 sep**
   salían **21 de 23 piezas que son de agosto** — `dom 23` (2026-08-23)
   aterrizaba el miércoles **23 de septiembre**. La causa era esta función:
   sacaba el número del día con /(\d{1,2})\s*$/ y lo casaba contra la columna
   que tuviera ese mismo número EN LA SEMANA QUE SE ESTUVIERA MIRANDO, o sea
   ignorando el mes. Y no es solo pintado: la barra 50/30/20 contaba esas
   piezas fantasma, así que el reparto de CUALQUIER semana era el de agosto.
   Es exactamente la queja de Gerard — «un panel para siempre» — porque todas
   las semanas se veían iguales.

   Ahora la fecha sale SIEMPRE de un ISO real, en este orden:
     1. `E.calendario[id].fecha`  — lo que alguien programó aquí (manda siempre;
        "" significa EXPLÍCITAMENTE «devuelta a Sin fecha»).
     2. `pieza.fecha`             — ISO del generador (50 de las 94 lo traen hoy).
     3. la etiqueta `pieza.dia` resuelta contra `DATOS.dias_iso`, que es el
        ÚNICO sitio del contrato que dice de qué mes es «dom 23».
   Si no se resuelve por ninguna de las tres, la pieza NO tiene fecha y se dice:
   el mes no se adivina (ley 4). */

/* Mapa etiqueta → ISO, de `DATOS.dias_iso`. Se cachea contra el propio array:
   si el shell recarga los datos, el mapa se rehace solo. */
var _MAPA = null, _MAPA_SRC = null;
function mapaDias() {
  var l = _datos().dias_iso || [];
  if (_MAPA && _MAPA_SRC === l) return _MAPA;
  var m = {}, i, e;
  for (i = 0; i < l.length; i++) {
    e = String(l[i].etiqueta || "").trim();
    if (!e || !l[i].fecha) continue;
    /* Etiqueta repetida dentro del rango cargado ("mié 23" de dos meses) =
       ambigua: se deja SIN resolver. Elegir una de las dos a cara o cruz es
       justo el bug que se está arreglando. */
    m[e] = Object.prototype.hasOwnProperty.call(m, e) ? "" : l[i].fecha;
  }
  _MAPA = m; _MAPA_SRC = l;
  return m;
}

/* Fecha ISO efectiva de una pieza, o "" si no tiene. NO depende de qué semana
   se esté mirando — por eso ya no puede cambiar al navegar. */
function fechaISOde(p) {
  var c = calDe(p.id), lab;
  if (c && typeof c.fecha === "string") return c.fecha;      /* "" = desprogramada a mano */
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(p.fecha || ""))) return p.fecha;
  lab = String(p.dia || "").trim();
  if (!lab || /^sin/i.test(lab)) return "";
  return mapaDias()[lab] || "";
}

/* {iso, fuera} respecto a la semana visible:
     iso ""  + fuera false  → sin fecha (columna «Sin fecha»)
     iso ISO + fuera false  → cae en una columna de esta semana
     iso ""  + fuera true   → tiene fecha, pero de otra semana */
function fechaDe(p, cols) {
  var f = fechaISOde(p), i;
  if (!f) return {iso: "", fuera: false};
  for (i = 0; i < cols.length; i++) if (cols[i].iso === f) return {iso: f, fuera: false};
  return {iso: "", fuera: true};
}
function horaDe(p) {
  var c = calDe(p.id);
  if (c && c.hora) return c.hora;
  return String(p.hora || "");
}

/* Los dos filtros de la topbar (`filtrosHTML`) se respetan de verdad. El de
   etapa se aplica aunque hoy deje la semana casi vacía: eso NO es un fallo, es
   la respuesta correcta —ninguna pieza trae etapa en piezas.json— y la vista lo
   dice con un contador de ocultas en vez de aparentar que el filtro no hace
   nada (un control muerto es peor que un resultado incómodo). */
function pasaCuenta(p) { var fc = _fc(); return fc === "todo" || (p.cuenta || "") === fc; }
function pasaEtapa(p)  { var fe = _fe(); return fe === "todo" || etapaDe(p) === fe; }
function pasaFiltro(p) { return pasaCuenta(p) && pasaEtapa(p); }

/* Cuentas que se pintan. JAVI y JORDI siempre; "" solo si de verdad hay alguna
   pieza sin cuenta declarada (hoy hay 1 en piezas.json) — no se le adjudica
   dueño a nadie. */
function cuentasVisibles() {
  var fc = _fc(), base = ["JAVI", "JORDI"], hay = false, l = piezas(), i;
  for (i = 0; i < l.length; i++) if (!l[i].cuenta) { hay = true; break; }
  if (hay) base.push("");
  if (fc !== "todo") base = base.filter(function (c) { return c === fc; });
  return base;
}

/* Reparto de las piezas de la semana por columna y cuenta. Una sola pasada. */
/* La columna «Sin fecha» enseña TODO lo que no tiene día, no solo lo aprobado.
   Antes solo entraban las aprobadas y el resultado medido era un contador que
   ponía **1** habiendo **44 piezas sin fecha**: las otras 43 no existían para
   nadie que mirara el calendario, que es justo donde se planifica. Ahora salen
   las dos cosas, separadas, porque no son lo mismo:
     · `backlog` — APROBADAS: se arrastran y se colocan.
     · `espera`  — sin fecha y sin aprobar (sin votar o «corregir»): se ven y se
                   cuentan, pero NO se colocan. Una pieza entra en el calendario
                   cuando alguien la aprueba (§1 ley 3), y eso no se toca.
   Las denegadas se cuentan aparte y no se listan: ya se decidió que no van. */
function repartir(cols) {
  var idx = {}, back = [], espera = [], fuera = 0, negadas = 0, ocultaSem = 0, ocultaSin = 0, i, j, p, f, est, d;
  for (i = 0; i < cols.length; i++) idx[cols[i].iso] = {};
  var l = piezas();
  for (j = 0; j < l.length; j++) {
    p = l[j];
    if (!pasaCuenta(p)) continue;
    if (!pasaEtapa(p)) {                       /* contar lo que esconde el filtro */
      f = fechaDe(p, cols);
      if (f.iso) ocultaSem++;                  /* estaba en la rejilla de esta semana */
      else if (!f.fuera) ocultaSin++;          /* estaba en «Sin fecha» */
      continue;
    }
    f = fechaDe(p, cols);
    if (f.fuera) { fuera++; continue; }
    if (f.iso) {
      var c = p.cuenta || "";
      (idx[f.iso][c] = idx[f.iso][c] || []).push(p);
      continue;
    }
    d = decDe(p.id);
    est = d ? String(d.estado || "").toLowerCase() : "";
    if (est === "aprobado") back.push(p);
    else if (est === "denegado") negadas++;
    else espera.push(p);
  }
  for (i = 0; i < cols.length; i++) {
    for (var k in idx[cols[i].iso]) {
      idx[cols[i].iso][k].sort(function (a, b) { return String(horaDe(a)).localeCompare(String(horaDe(b))); });
    }
  }
  var porCuentaLuegoId = function (a, b) {
    return String(a.cuenta).localeCompare(String(b.cuenta)) || String(a.id).localeCompare(String(b.id));
  };
  back.sort(porCuentaLuegoId);
  espera.sort(porCuentaLuegoId);
  return {porDia: idx, backlog: back, espera: espera, fuera: fuera, negadas: negadas,
          sinDecidir: espera.length, ocultaSem: ocultaSem, ocultaSin: ocultaSin,
          ocultas: ocultaSem + ocultaSin};
}

/* ------------------------------------------------- el plan de Santi (CAL_AUTO) */

/* Slots que el calendario de Santi pide ese día para esa cuenta, en orden. */
function planDe(isoFecha, cuenta) {
  var cu = (_cal().cuentas || {})[cuenta];
  if (!cu) return [];
  var out = [];
  (cu.colocadas || []).forEach(function (x) {
    if (x.fecha === isoFecha) out.push({slot: x.slot, formato: x.formato_santi || x.formato || "", motivo: "", id: x.id || ""});
  });
  (cu.vacios || []).forEach(function (x) {
    if (x.fecha === isoFecha) out.push({slot: x.slot, formato: x.formato || "", motivo: x.motivo || "", id: ""});
  });
  out.sort(function (a, b) { return (a.slot | 0) - (b.slot | 0); });
  return out;
}

/* DATOS.huecos trae el motivo REAL escrito a mano y, a veces, la hora buena.
   Se cruza por FECHA + cuenta + primera palabra del formato.
   ⚠ Antes se cruzaba por ETIQUETA ("mié 26") y es el mismo agujero que
   `fechaDe`: la etiqueta se repite cada pocos meses, así que el motivo de un
   hueco de agosto se colaba en un día de otro mes. Los huecos ya traen `fecha`
   ISO; la etiqueta queda solo de reserva para ficheros viejos. */
function huecoDisco(col, cuenta, formato) {
  var l = _datos().huecos || [], i, h, f0 = String(formato || "").split(/[\s/]+/)[0].toLowerCase();
  var cand = null;
  if (!col) return null;
  for (i = 0; i < l.length; i++) {
    h = l[i];
    if (h.fecha ? String(h.fecha) !== col.iso : String(h.dia || "").trim() !== col.etiqueta) continue;
    if (String(h.cuenta || "") !== cuenta) continue;
    if (!cand) cand = h;
    if (f0 && String(h.formato || "").toLowerCase().indexOf(f0) === 0) return h;
  }
  return cand;
}

/* -------------------------------------------------------- barra 50/30/20 §5.4 */

function objetivo(total) {
  var t = Math.round(total * MIX.TOFU), m = Math.round(total * MIX.MOFU);
  if (t + m > total) m = Math.max(0, total - t);
  return {TOFU: t, MOFU: m, BOFU: Math.max(0, total - t - m)};
}

function mixHTML(cols, rep) {
  var cuentas = cuentasVisibles().filter(function (c) { return c !== ""; });
  if (!cuentas.length) cuentas = ["JAVI", "JORDI"];

  var filas = cuentas.map(function (cu) {
    /* ⛔ EL REPARTO SE MIDE SOBRE LA SEMANA ENTERA, NUNCA SOBRE LO FILTRADO.
       Antes contaba `rep.porDia`, que YA viene filtrado por FETAPA — así que con
       el filtro «TOFU» puesto salía **«TOFU 3/2 +1»** (medido 25-ago): 3 TOFU
       sobre un total de 3, o sea un supuesto SUPERÁVIT, cuando la semana real
       tiene 28 piezas y el objetivo de TOFU son 14. Un reparto de una etapa
       contra sí misma no es un reparto: es un espejo. El filtro de etapa sirve
       para BUSCAR piezas; el 50/30/20 responde «¿cómo va la semana?» y esa
       pregunta no depende de lo que esté filtrado.
       El filtro de CUENTA sí manda, porque el reparto ES por cuenta (S1). */
    var cnt = {TOFU: 0, MOFU: 0, BOFU: 0, SIN: 0}, total = 0;
    var l = piezas(), i, p, f;
    for (i = 0; i < l.length; i++) {
      p = l[i];
      if ((p.cuenta || "") !== cu) continue;
      f = fechaDe(p, cols);
      if (!f.iso || f.fuera) continue;
      cnt[etapaDe(p)]++; total++;
    }
    var obj = objetivo(total);

    if (!total) {
      return '<div class="cal-mixfila" data-cal-cuenta="' + esc_(cu) + '">' +
        '<span class="cal-pill cal-' + esc_(cu.toLowerCase()) + '">' + esc_(CUENTA_HUMANO[cu] || cu) + '</span>' +
        '<p class="cal-mixvacio">Nada programado esta semana. El reparto pide, de cada 10: ' +
        '<b>5 TOFU · 3 MOFU · 2 BOFU</b>.</p></div>';
    }

    var barra = ETAPAS.map(function (e) {
      if (!cnt[e]) return "";
      return '<span class="cal-seg cal-seg-' + e.toLowerCase() + '" style="width:' +
             (cnt[e] * 100 / total).toFixed(2) + '%" title="' + e + ' · ' + ETAPA_HUMANO[e] + '"></span>';
    }).join("") + (cnt.SIN ? '<span class="cal-seg cal-seg-sin" style="width:' +
             (cnt.SIN * 100 / total).toFixed(2) + '%" title="Sin etapa en los datos"></span>' : "");

    var cifras = ETAPAS.map(function (e) {
      var d = cnt[e] - obj[e], sufijo = d === 0 ? "" : (d > 0 ? " +" + d : " " + d);
      return '<span class="cal-cifra' + (d === 0 ? " ok" : "") + '">' + e + ' <b>' + cnt[e] + '/' + obj[e] + '</b>' +
             '<i>' + esc_(sufijo) + '</i></span>';
    }).join('<span class="cal-sep">·</span>');

    return '<div class="cal-mixfila" data-cal-cuenta="' + esc_(cu) + '">' +
      '<span class="cal-pill cal-' + esc_(cu.toLowerCase()) + '">' + esc_(CUENTA_HUMANO[cu] || cu) + '</span>' +
      '<div class="cal-barra" role="img" aria-label="Reparto de ' + esc_(CUENTA_HUMANO[cu] || cu) + '">' + barra + '</div>' +
      '<div class="cal-mixnum">' + cifras +
        (cnt.SIN ? '<span class="cal-sep">·</span><span class="cal-cifra sin"><b>' + cnt.SIN + '</b> sin clasificar</span>' : "") +
      '</div></div>';
  }).join("");

  return '<section class="cal-mix">' +
    '<h3 class="cal-h3">Reparto de la semana <small>50 / 30 / 20 — orientación, no bloqueo' +
      (_fe() !== "todo" ? " · cuenta la semana entera, no el filtro " + esc_(_fe()) : "") +
    '</small></h3>' +
    filas +
    '<p class="cal-nota">«Sin clasificar» son piezas que no traen etapa en los datos. No se reparten a ojo: ' +
    'se enseñan como lo que son.</p></section>';
}

/* ----------------------------------------------------------------- tarjetas */

function pillCuenta(c) {
  var k = c || "";
  return '<span class="cal-pill cal-' + esc_((k || "sin").toLowerCase()) + '">' + esc_(CUENTA_HUMANO[k] || k) + '</span>';
}

function eventoHTML(p) {
  var th = miniDe(p), etapa = etapaDe(p), hora = horaDe(p);
  return '<article class="cal-ev' + (SEL === p.id ? " cogida" : "") + '" draggable="true"' +
      ' data-cal-id="' + esc_(p.id) + '" title="' + esc_(tituloDe(p) + " · " + p.id) + '">' +
    '<div class="cal-ev-top">' +
      '<span class="cal-hora">' + esc_(hora || "sin hora") + '</span>' + pillCuenta(p.cuenta) +
    '</div>' +
    '<div class="cal-ev-cuerpo">' +
      (th ? '<img class="cal-th" src="' + esc_(th) + '" alt="" loading="lazy" decoding="async">' : '<span class="cal-th cal-th-no"></span>') +
      '<span class="cal-tit">' + esc_(tituloDe(p)) + '</span>' +
    '</div>' +
    '<div class="cal-ev-pie">' +
      '<span class="cal-fmt">' + esc_(p.tipo || "pieza") + '</span>' +
      (etapa !== "SIN" ? '<span class="cal-etapa">' + esc_(etapa) + '</span>' : '<span class="cal-etapa sin">sin etapa</span>') +
      '<button type="button" class="cal-quitar" data-cal-quitar="' + esc_(p.id) + '"' +
        ' title="Quitar la fecha y devolverla a «Sin fecha»">Quitar</button>' +
    '</div>' +
  '</article>';
}

function backHTML(p) {
  var th = miniDe(p), etapa = etapaDe(p);
  return '<article class="cal-ev cal-ev-back' + (SEL === p.id ? " cogida" : "") + '" draggable="true"' +
      ' data-cal-id="' + esc_(p.id) + '" data-cal-pick="' + esc_(p.id) + '"' +
      ' title="' + esc_(tituloDe(p) + " · " + p.id) + '">' +
    '<div class="cal-ev-top">' + pillCuenta(p.cuenta) +
      '<span class="cal-fmt">' + esc_(p.tipo || "pieza") + '</span>' +
      (etapa !== "SIN" ? '<span class="cal-etapa">' + esc_(etapa) + '</span>' : "") +
    '</div>' +
    '<div class="cal-ev-cuerpo">' +
      (th ? '<img class="cal-th" src="' + esc_(th) + '" alt="" loading="lazy" decoding="async">' : '<span class="cal-th cal-th-no"></span>') +
      '<span class="cal-tit">' + esc_(tituloDe(p)) + '</span>' +
    '</div>' +
    '<p class="cal-coger">' + (SEL === p.id ? "Cogida · toca un hueco" : "Tocar para colocarla") + '</p>' +
  '</article>';
}

/* ⛔ `calendario.json` cubre SOLO la semana que generó `calendario_auto.py`
   (medido: 2026-08-23 → 2026-08-29, 7 días). Fuera de ahí `planDe()` devuelve []
   y no se pintaba ningún «+ Programar»: en el móvil, donde NO hay drag y solo
   existe el flujo tocar-pieza → tocar-hueco, el calendario era de **solo lectura
   en 51 semanas de 52**. Un panel «para siempre» que solo deja programar una
   semana no es un panel para siempre.
   Los huecos genéricos son las 3 horas de la regla 25 del equipo (19:00 · 19:30
   · 20:00, subir entre 19 y 20) y se etiquetan como lo que son: hueco libre SIN
   formato asignado. No se inventa el formato de Santi para un día que su plan
   no cubre. */
function slotsGenericos(yaPuestas) {
  var out = [], i;
  for (i = yaPuestas; i < HORA_SLOT.length; i++) {
    out.push({slot: i, formato: "", motivo: "", id: "", generico: true});
  }
  return out;
}

function slotHTML(col, cuenta, plan) {
  var h = huecoDisco(col, cuenta, plan.formato);
  var hora = (h && h.hora) || HORA_SLOT[plan.slot | 0] || "";
  var motivo = (h && h.motivo) || plan.motivo || "";
  return '<button type="button" class="cal-slot' + (SEL ? " listo" : "") + '"' +
      ' data-cal-slot="' + esc_(col.iso) + '" data-cal-cuenta="' + esc_(cuenta) + '"' +
      ' data-cal-hora="' + esc_(hora) + '">' +
    '<span class="cal-mas">+ Programar</span>' +
    '<span class="cal-slotfmt">' + esc_(plan.formato || (plan.generico ? "hueco libre" : "sin formato asignado")) +
      (hora ? ' · <b>' + esc_(hora) + '</b>' : "") + '</span>' +
    (motivo ? '<span class="cal-motivo" title="' + esc_(motivo) + '">' + esc_(motivo) + '</span>' : "") +
  '</button>';
}

/* ---------------------------------------------------------------- columnas */

function columnaDia(col, rep) {
  var esHoy = col.iso === hoyISO();
  var bloques = cuentasVisibles().map(function (cu) {
    var evs = (rep.porDia[col.iso] || {})[cu] || [];
    if (cu === "" && !evs.length) return "";          /* «sin cuenta» solo si tiene algo */
    var plan = planDe(col.iso, cu);
    /* Con plan de Santi: el plan menos lo ya puesto. Sin plan (cualquier semana
       fuera de la que generó calendario_auto.py): las 3 horas de la regla 25. */
    var libres = plan.length ? plan.slice(evs.length) : slotsGenericos(evs.length);
    return '<div class="cal-bloque">' + pillCuenta(cu) +
      evs.map(eventoHTML).join("") +
      libres.map(function (pl) { return slotHTML(col, cu, pl); }).join("") +
      (!evs.length && !libres.length ? '<p class="cal-vacio">Los 3 huecos de este día ya están cubiertos.</p>' : "") +
    '</div>';
  }).join("");

  return '<section class="cal-col cal-dia' + (esHoy ? " hoy" : "") + '" data-cal-dia="' + esc_(col.iso) + '">' +
    '<header class="cal-colhead">' +
      '<span class="cal-diasem">' + esc_(col.corto) + '</span>' +
      '<span class="cal-dianum">' + col.num + '</span>' +
      (esHoy ? '<span class="cal-hoymark">Hoy</span>' : "") +
    '</header>' + bloques + '</section>';
}

/* Fila compacta de una pieza SIN fecha y SIN aprobar. Sin miniatura y sin
   `draggable`: se ve y se cuenta, pero no se puede colocar. El estado va escrito
   — «sin votar» no es lo mismo que «pendiente de corregir». */
function esperaHTML(p) {
  var d = decDe(p.id), est = d ? String(d.estado || "").toLowerCase() : "";
  var txt = est === "corregir" ? "pendiente de corregir" : "sin votar";
  return '<div class="cal-esp" title="' + esc_(tituloDe(p) + " · " + p.id) + '">' +
    '<div class="cal-esp-top">' + pillCuenta(p.cuenta) +
      '<span class="cal-fmt">' + esc_(p.tipo || "pieza") + '</span>' +
      '<span class="cal-esp-est' + (est === "corregir" ? " corregir" : "") + '">' + txt + '</span>' +
    '</div>' +
    '<span class="cal-esp-tit">' + esc_(tituloDe(p)) + '</span>' +
  '</div>';
}

function columnaBacklog(rep) {
  var n = rep.backlog.length, m = rep.espera.length, tot = n + m;
  return '<section class="cal-col cal-back" data-cal-dia="">' +
    '<header class="cal-colhead cal-backhead">' +
      '<span class="cal-diasem">Sin fecha</span><span class="cal-dianum">' + tot + '</span>' +
    '</header>' +
    '<p class="cal-subhead">' + n + ' lista' + (n === 1 ? "" : "s") + ' para colocar' +
      (m ? ' · ' + m + ' esperando decisión' : "") + '</p>' +
    (n ? rep.backlog.map(backHTML).join("")
       : '<p class="cal-vacio">Ninguna <b>aprobada</b> esperando fecha.</p>') +
    (m ? '<details class="cal-espera"' + (n ? "" : " open") + '>' +
           '<summary>' + m + ' sin fecha y sin aprobar</summary>' +
           rep.espera.map(esperaHTML).join("") +
           '<p class="cal-nota">Se aprueban en <b>Por revisar</b>. Desde aquí no se colocan: ' +
           'una pieza entra en el calendario cuando alguien la aprueba.</p>' +
         '</details>' : "") +
    (rep.negadas ? '<p class="cal-nota">' + rep.negadas + ' denegada' + (rep.negadas === 1 ? "" : "s") +
                   ' sin fecha, no se listan.</p>' : "") +
    (rep.fuera ? '<p class="cal-nota">+' + rep.fuera + ' ya con fecha en otra semana.</p>' : "") +
    '<p class="cal-nota">Programar coloca la pieza en su día: <b>no publica nada</b>.</p>' +
  '</section>';
}

/* ------------------------------------------------------------------- vista */

function vistaCalendario() {
  var cols = columnas(), rep = repartir(cols);
  var cal = _cal();

  /* Cuántas piezas tiene la semana visible, y a dónde saltar si no tiene ninguna
     (ver `lunesConPieza`: navegar 52 semanas a ciegas es lo que hace inservible
     un calendario anual). */
  var nSem = 0;
  cols.forEach(function (c) {
    var porC = rep.porDia[c.iso] || {};
    Object.keys(porC).forEach(function (k) { nSem += porC[k].length; });
  });
  var salto = nSem ? "" : lunesConPieza(semanaBase());

  var filtros = "";
  if (typeof filtrosHTML === "function") { try { filtros = filtrosHTML() || ""; } catch (e) { filtros = ""; } }

  var sel = SEL ? piezaDe(SEL) : null;

  return '<div class="cal">' +
    '<header class="cal-top">' +
      '<div class="cal-wknav">' +
        '<button type="button" class="cal-nav" data-cal-wk="-1" aria-label="Semana anterior">‹</button>' +
        '<b class="cal-rango">' + esc_(rangoTexto(cols)) + '</b>' +
        '<button type="button" class="cal-nav" data-cal-wk="1" aria-label="Semana siguiente">›</button>' +
        '<button type="button" class="cal-hoybtn" data-cal-wk="0">Hoy</button>' +
        (nSem
          ? '<span class="cal-nsem"><b>' + nSem + '</b> ' + (nSem === 1 ? "pieza" : "piezas") + '</span>'
          : '<span class="cal-nsem vacia">semana vacía' +
            (salto ? ' · <button type="button" class="cal-ir" data-cal-ir="' + esc_(salto) +
                     '">ir a la más cercana con piezas</button>' : "") + '</span>') +
      '</div>' +
      '<p class="cal-sub">Arrastra una pieza aprobada de <b>Sin fecha</b> al hueco que quieras. ' +
      'En el móvil, tócala y toca el hueco. Programar <b>no publica</b>.</p>' +
      filtros +
      (_fe() !== "todo" && rep.ocultas
        ? '<p class="cal-filtroaviso">Filtro <b>' + esc_(_fe()) + '</b>: se ocultan <b>' +
          rep.ocultaSem + '</b> de esta semana y <b>' + rep.ocultaSin + '</b> sin fecha. ' +
          'El reparto de abajo sigue contando la semana entera.</p>' : "") +
    '</header>' +

    mixHTML(cols, rep) +

    '<div class="cal-scroll">' +
      '<div class="cal-grid">' +
        columnaBacklog(rep) +
        cols.map(function (c) { return columnaDia(c, rep); }).join("") +
      '</div>' +
    '</div>' +

    '<p class="cal-fuente">Formatos por día: <code>calendario.json</code>' +
      (cal.generado ? ' · medido el ' + esc_(String(cal.generado).slice(0, 10)) : "") +
      (cal.desde ? ' · cubre ' + esc_(cal.desde) + ' + ' + (cal.dias || 7) + ' días' : "") +
      '. Fuera de ese rango los huecos son las 3 horas de siempre, <b>sin formato ' +
      'asignado</b>: no se inventa el plan de Santi. Publicación 19:00-20:00 (regla 25).</p>' +

    (sel ? '<div class="cal-cogida" role="status">' +
        '<span>Moviendo <b>' + esc_(tituloDe(sel)) + '</b> — toca un hueco</span>' +
        '<button type="button" class="cal-cancel" data-cal-cancel="1">Cancelar</button>' +
      '</div>' : "") +
  '</div>';
}

/* ------------------------------------------------------------- escrituras */

/* Programa (o desprograma con fecha "") una pieza. Server-first vía guardar():
   la clave `calendario` del BLOB se toca key-by-key por pieza para que dos
   personas a la vez no se pisen (§3.3 · §6.5). */
function programar(id, fechaISO, hora, cuentaHueco) {
  var p = piezaDe(id);
  if (!p) { avisar("Esa pieza ya no está en los datos.", true); return; }

  if (typeof guardar !== "function") {
    avisar("No hay almacén conectado: el panel está en solo-lectura y NO se ha programado.", true);
    SEL = null; pintar(); return;
  }

  var ent = {fecha: fechaISO || "", hora: fechaISO ? (hora || "") : "", por: _yo(), cuando: sello()};
  guardar(function (srv) {
    srv.calendario = srv.calendario || {};
    srv.calendario[id] = ent;
  });

  /* Espejo local para que la rejilla se mueva ya; el próximo leerBlob() manda. */
  var e = _est();
  e.calendario = e.calendario || {};
  e.calendario[id] = ent;

  SEL = null;
  if (fechaISO) {
    var d = new Date(fechaISO + "T00:00:00");
    var txt = "Programada: " + DIA_CORTO[d.getDay()] + " " + d.getDate() + (ent.hora ? " · " + ent.hora : "");
    /* Identidad Javi/Jordi es NIVEL 1: si el hueco era de otra cuenta se dice en
       voz alta. Programar coloca día y hora — la cuenta de una pieza no se toca
       nunca desde aquí, y menos se le adjudica dueño a la que no lo declara. */
    if (cuentaHueco && (p.cuenta || "") !== cuentaHueco) {
      avisar(txt + " — OJO: la pieza es de " + (CUENTA_HUMANO[p.cuenta || ""] || p.cuenta) +
             " y ese hueco era de " + (CUENTA_HUMANO[cuentaHueco] || cuentaHueco) +
             ". Se coloca el día y la hora; la cuenta NO se toca.", true);
    } else {
      avisar(txt);
    }
  } else {
    avisar("Devuelta a «Sin fecha»");
  }
  pintar();
}

/* Hora que le toca a una pieza si se suelta en una columna sin apuntar a un
   hueco concreto: el primer slot libre del plan de esa cuenta ese día. */
function horaLibre(isoFecha, cuenta, cols) {
  var rep = repartir(cols), evs = (rep.porDia[isoFecha] || {})[cuenta || ""] || [];
  var plan = planDe(isoFecha, cuenta), libre = plan[evs.length];
  if (libre) {
    var col = null, i;
    for (i = 0; i < cols.length; i++) if (cols[i].iso === isoFecha) col = cols[i];
    var h = huecoDisco(col, cuenta, libre.formato);
    if (h && h.hora) return h.hora;
    return HORA_SLOT[libre.slot | 0] || HORA_SLOT[HORA_SLOT.length - 1];
  }
  return HORA_SLOT[Math.min(evs.length, HORA_SLOT.length - 1)];
}

/* ------------------------------------------------------------------ eventos */

function cerca(t, attr) {
  while (t && t !== document) {
    if (t.getAttribute && t.getAttribute(attr) !== null) return t;
    t = t.parentNode;
  }
  return null;
}
function limpiaSobre() {
  var l = document.querySelectorAll(".cal .sobre"), i;
  for (i = 0; i < l.length; i++) l[i].classList.remove("sobre");
}

function onClick(ev) {
  var t = ev.target, n;

  n = cerca(t, "data-cal-wk");
  if (n) {
    ev.preventDefault();
    var v = parseInt(n.getAttribute("data-cal-wk"), 10) || 0;
    if (v === 0) SEM = null;
    else { var b = semanaBase(); b.setDate(b.getDate() + v * 7); SEM = b; }
    pintar(); return;
  }

  n = cerca(t, "data-cal-ir");
  if (n) {
    ev.preventDefault();
    var f = n.getAttribute("data-cal-ir");
    if (f) { SEM = lunesDe(new Date(f + "T00:00:00")); pintar(); }
    return;
  }

  n = cerca(t, "data-cal-cancel");
  if (n) { ev.preventDefault(); SEL = null; pintar(); return; }

  n = cerca(t, "data-cal-quitar");
  if (n) { ev.preventDefault(); programar(n.getAttribute("data-cal-quitar"), "", ""); return; }

  n = cerca(t, "data-cal-slot");
  if (n) {
    ev.preventDefault();
    if (!SEL) { avisar("Primero toca una pieza de «Sin fecha».", true); return; }
    programar(SEL, n.getAttribute("data-cal-slot"), n.getAttribute("data-cal-hora"),
              n.getAttribute("data-cal-cuenta"));
    return;
  }

  n = cerca(t, "data-cal-pick");
  if (n) {
    ev.preventDefault();
    var id = n.getAttribute("data-cal-pick");
    SEL = (SEL === id) ? null : id;
    pintar(); return;
  }
}

function onTecla(ev) {
  if (ev.key === "Escape" && SEL) { SEL = null; pintar(); }
}

/* --- drag nativo (escritorio). El táctil va por el flujo tocar-tocar de arriba,
       que no depende de la API de drag & drop (inexistente en móvil). --- */
function onDragStart(ev) {
  var n = cerca(ev.target, "data-cal-id");
  if (!n) return;
  SEL = n.getAttribute("data-cal-id");
  try {
    ev.dataTransfer.setData("text/plain", SEL);
    ev.dataTransfer.effectAllowed = "move";
  } catch (e) {}
  n.classList.add("arrastrando");
}
function onDragEnd(ev) {
  var n = cerca(ev.target, "data-cal-id");
  if (n) n.classList.remove("arrastrando");
  limpiaSobre();
}
function onDragOver(ev) {
  var s = cerca(ev.target, "data-cal-slot"), d = cerca(ev.target, "data-cal-dia");
  if (!s && !d) return;
  ev.preventDefault();
  try { ev.dataTransfer.dropEffect = "move"; } catch (e) {}
  var z = s || d;
  if (!z.classList.contains("sobre")) { limpiaSobre(); z.classList.add("sobre"); }
}
function onDrop(ev) {
  var s = cerca(ev.target, "data-cal-slot"), d = cerca(ev.target, "data-cal-dia");
  if (!s && !d) return;
  ev.preventDefault();
  var id = "";
  try { id = ev.dataTransfer.getData("text/plain") || ""; } catch (e) {}
  id = id || SEL;
  if (!id) return;

  if (s) {
    programar(id, s.getAttribute("data-cal-slot"), s.getAttribute("data-cal-hora"),
              s.getAttribute("data-cal-cuenta"));
    return;
  }

  var isoFecha = d.getAttribute("data-cal-dia");
  if (!isoFecha) { programar(id, "", ""); return; }        /* soltada en «Sin fecha» */
  var p = piezaDe(id);
  programar(id, isoFecha, horaLibre(isoFecha, (p && p.cuenta) || "", columnas()));
}

/* Idempotente: se puede llamar desde cablear() tras cada repintado. */
function montar() {
  if (MONTADO) return;
  MONTADO = true;
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", onTecla);
  document.addEventListener("dragstart", onDragStart);
  document.addEventListener("dragend", onDragEnd);
  document.addEventListener("dragover", onDragOver);
  document.addEventListener("drop", onDrop);
}

/* ------------------------------------------------------------------ salida */

window.vistaCalendario   = vistaCalendario;
window.cablearCalendario = montar;
/* Para un badge en la barra lateral, si el shell lo quiere. */
/* El badge de la pestaña cuenta TODO lo que no tiene día (aprobado o no), que es
   el número por el que Gerard preguntó. Las denegadas no cuentan: ya se decidió. */
window.nSinFecha = function () {
  var r = repartir(columnas());
  return r.backlog.length + r.espera.length;
};
window.VISTA_CALENDARIO = {
  vistaCalendario: vistaCalendario, cablear: montar,
  programar: programar, columnas: columnas, repartir: repartir,
  HORA_SLOT: HORA_SLOT, MIX: MIX, ETAPA_HUMANO: ETAPA_HUMANO,
  semana: function () { return SEM; },
  irASemana: function (d) { SEM = d ? lunesDe(new Date(d)) : null; pintar(); }
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
else montar();

})();
