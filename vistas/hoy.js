/* =============================================================================
   vistas/hoy.js  ·  PANTALLA «HOY»  (BUILD_SPEC_PANEL_ELITE.md §5.3)
   =============================================================================

   QUÉ HACE
   --------
   Pinta la pantalla anti-cuello-de-botella de PUBLICACIÓN: **solo lo que toca
   subir hoy**, por cuenta, en su hora, con la miniatura, el caption en un
   `textarea` de solo lectura y un botón «Copiar caption» a un toque.

   Existe porque el cuello medido no es producir, es PUBLICAR: hay decenas de
   piezas en PASS sin subir y el 5-ago se prometieron 3 posts y se publicó 1.
   Enseñar «toda la semana» a la hora de subir es demasiado: hay que buscar cuál
   toca, abrir la ficha y copiar el caption. Esta pantalla deja UNA lista.

   Lleva encima la regla 25 del equipo (Jordi, 16-jul): **se sube entre 19:00 y
   20:00**, el sábado la hora da igual. Una pieza de hoy con hora fuera de esa
   ventana sale marcada — el dato es de `p.hora`, no se inventa nada.

   LO QUE ESTA PANTALLA NO HACE
   ---------------------------
   No publica y no marca nada como publicado (§1 ley 3 · doctrina ley 8).
   Publicar es 100 % manual y con OK de Gerard pieza a pieza. Tampoco escribe en
   npoint: es una pantalla de SOLO LECTURA del estado vivo. Cero botones de
   decisión aquí — eso es «Por revisar» (§5.2).

   DE QUÉ DATOS VIVE  (§2 — el contrato es SAGRADO, los nombres son literales)
   --------------------------------------------------------------------------
   LECTURA (globals que este módulo NO declara; los pone index.html):

     DATOS      {generado, hoy, rango:{desde,hasta}, semana, dias[], dias_iso[],
                 piezas[], huecos[]}                            ← piezas.json
                pieza  = {id, cuenta:"JAVI"|"JORDI", tipo, fecha:"2026-08-25",
                          dia:"mar 25", hora:"19:30", etiqueta,
                          caption, archivos:[{archivo, poster, video?, peso_mb?}], …}
                hueco  = {dia, fecha, cuenta, hora, formato, motivo}
                ⚠ `archivos[]` es un array de OBJETOS. Nunca se interpola crudo
                  (bug §6.3: `src="[object Object]"`). Se lee `.video || .poster`.
                ⭐ QUÉ DÍA ES UNA PIEZA SALE DE `fecha` (ISO), no de `dia`. La
                  etiqueta "mar 25" no dice mes ni año: ver `fechaISOde()` y la
                  colisión de diciembre que arregló.
                Opcionales que se pintan SOLO si existen (cero inventar, ley 4):
                  f1 · f1_motivo · sin_caption · slides · verificada. Medido el
                  25-ago sobre las 94 piezas: `f1` no lo trae ninguna y 65 traen
                  `etiqueta:"SIN"`. Si el campo no está, no hay chip.
     E          estado vivo fusionado por leerBlob():
                {decisiones:{[id]:{estado,motivo,por,cuando}}, f1:{[id]:{estado,motivo}},
                 referentes:[], calendario:{}, hooks:[], notas:{}}
     CAL_AUTO   {generado, desde, dias, cuentas:{JAVI:{vacios:[{fecha,dia,slot,formato,motivo}]}}}
                Solo se usa de RESERVA si `DATOS.huecos` no existe.
     YO         "Gerard"|"Javi"|"Jordi"|"Santi"      FCUENTA "todo"|"JAVI"|"JORDI"
     TAB        pestaña activa (esta pantalla es "hoy")

   FUNCIONES DE index.html que se usan si están (y si no, hay reserva):
     filtrosHTML()  barra de filtros · aviso(t,mal) toast · render() repintado
     abreVisor(id)  visor §5.8 · deHoy()/hoyEtiqueta() ← LAS EXPORTA ESTE FICHERO

   ESCRITURA
   ---------
     NINGUNA. Este módulo no llama a `guardar()` ni a `guardarMio()`. Es la única
     pantalla del panel que no toca el estado del equipo, y así debe quedarse: si
     algún día se marca «ya lo subí», eso es una decisión de contrato (§2.B tiene
     `publicados` DECLARADO pero sin write-path) y se cierra en la spec primero.

   CÓMO SE ENGANCHA A index.html  (§3.4 · §6.1 · §6.2)
   ---------------------------------------------------
     <link rel="stylesheet" href="vistas/hoy.css">
     <script src="vistas/hoy.js"></script>     ← script CLÁSICO, no módulo ES.
     const VISTAS = { …, hoy: vistaHoy, … };
     app.innerHTML = (VISTAS[TAB] || vistaEspia)();
     function cablear(){ …; cablearHoy(); }

     Y el botón de la pestaña, BIEN FORMADO (bug §6.2 — hoy la pantalla es
     inalcanzable porque `<data-t="hoy">` es una etiqueta malformada dentro del
     botón «Ver todo»):
       <button data-t="hoy">Hoy <span id="nhoy"></span></button>

     El contador `#nhoy` de render() sale de `deHoy().length`, que exporta este
     fichero: así el número de la pestaña y la lista de la pantalla son EL MISMO
     cálculo y no pueden desincronizarse. index.html **no debe declarar sus
     propias `deHoy` / `hoyEtiqueta` / `vistaHoy`**, ni cablear a mano los
     `[data-hy-*]`: los lleva este fichero por delegación y se dispararían dos veces.
     Mantener la guarda `if(_e)` de render() para todo `$("#nXXX")`.

   TRES COSAS QUE AQUÍ NO SE REPITEN
   ---------------------------------
     §6.2  la pantalla es alcanzable y su contador cuadra con su lista.
     §6.3  la miniatura saca la ruta del OBJETO (`.video || .poster`), no el objeto.
     fecha la etiqueta del día y la fecha ISO se calculan en hora LOCAL, nunca con
           `toISOString()`: en España (UTC+2) el UTC ya es del día siguiente a
           partir de las 22:00, y esta pantalla se mira justo por la noche —
           habría enseñado el día equivocado en la franja de subir.
   ============================================================================= */

(function () {
"use strict";

/* ------------------------------------------------------------- constantes */

/* Tienen que coincidir LETRA A LETRA con `p.dia` de piezas.json ("mar 25",
   "mié 26", "sáb 29"): el match es por string, y sin las tildes no casa nada. */
var DIAS_AB = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
var MESES_AB = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
var DIAS_LARGO = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

/* Regla 25 del equipo (Jordi, 16-jul): «no lo subas a las 11 de la noche /
   vamos a dejarlo todo listo subido 19-20:00». Sábado exento. */
var VENTANA = {desde: "19:00", hasta: "20:00"};

/* El equipo no piensa en siglas y la regla 11 prohíbe la jerga. */
var ETAPA_HUMANO = {TOFU: "Para que te descubran", MOFU: "Para que te consideren",
                    BOFU: "Para que compren"};
var TIPO_HUMANO = {reel: "Reel", carrusel: "Carrusel", meme: "Meme", ad: "Ad",
                   story: "Historia"};

var CUENTAS = ["JAVI", "JORDI"];

/* ---------------------------------------------------------- estado privado */

var MONTADO = false;
var FILTRO = {cuenta: "todo"};   /* solo si index.html no trae los suyos */
var PROPIOS = false;             /* ¿pinté yo los filtros? → entonces los cableo yo */

/* ------------------------------------------------- puentes con los globals */
/* Todo acceso a un global va por aquí: si index.html todavía no lo define, la
   pantalla degrada en vez de reventar. `typeof` sobre un identificador que no
   existe no lanza; leerlo a pelo sí. */

function _datos() { return (typeof DATOS !== "undefined" && DATOS) || {piezas: []}; }
function _est()   { return (typeof E     !== "undefined" && E)     || {}; }
function _cal()   { return (typeof CAL_AUTO !== "undefined" && CAL_AUTO) || null; }
function _tab()   { return (typeof TAB   !== "undefined" && TAB)   || "hoy"; }

function _fc() { try { if (typeof FCUENTA !== "undefined") return FCUENTA || "todo"; } catch (e) {} return FILTRO.cuenta; }
function _setCuenta(v) {
  FILTRO.cuenta = v;
  try { FCUENTA = v; } catch (e) { /* index.html no lo declara */ }
}

function avisar(t, mal) {
  if (typeof aviso === "function") { aviso(t, mal); return; }
  if (mal) console.warn("[hoy]", t); else console.log("[hoy]", t);
}
function pintar() {
  if (typeof render === "function") { render(); return; }
  var app = document.querySelector("#app");
  if (app) { app.innerHTML = vistaHoy(); montar(); }
}

/* ------------------------------------------------------------------ fechas */

/* Hora LOCAL siempre. Ver la nota de la cabecera: `toISOString()` aquí es un bug
   de un día entero a partir de las 22:00, justo en la franja de publicar. */
function hoyEtiqueta(d) {
  d = d || new Date();
  return DIAS_AB[d.getDay()] + " " + d.getDate();
}
function isoHoy(d) {
  d = d || new Date();
  var m = d.getMonth() + 1, dd = d.getDate();
  return d.getFullYear() + "-" + (m < 10 ? "0" : "") + m + "-" + (dd < 10 ? "0" : "") + dd;
}
function fechaLarga(d) {
  d = d || new Date();
  return DIAS_LARGO[d.getDay()] + " " + d.getDate() + " " + MESES_AB[d.getMonth()] + " " + d.getFullYear();
}
function esSabado(d) { return (d || new Date()).getDay() === 6; }

/* "19:30" → 1170. Devuelve null si no hay hora o no tiene forma de hora: sin
   dato NO se opina (una hora vacía no es una hora "mala"). */
function minutos(h) {
  var m = /^(\d{1,2}):(\d{2})$/.exec(String(h || "").trim());
  if (!m) return null;
  var v = (+m[1]) * 60 + (+m[2]);
  return (v >= 0 && v < 1440) ? v : null;
}
function horaFueraDeVentana(hora) {
  if (esSabado()) return false;                    /* el sábado la hora da igual */
  var v = minutos(hora);
  if (v === null) return false;                    /* sin dato, sin veredicto */
  return v < minutos(VENTANA.desde) || v > minutos(VENTANA.hasta);
}

/* ---------------------------------------------------------------- utilidad */

function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
  });
}

/* Bug §6.3: un item de archivos[] es SIEMPRE un objeto. Se saca la ruta, nunca
   el objeto. `video` y `peso_mb` son opcionales; `poster` es el fallback. */
function rutaDe(a) {
  if (!a) return {src: "", poster: "", video: false};
  if (typeof a === "string") return {src: a, poster: "", video: /\.(mp4|mov|webm)$/i.test(a)};
  return {src: a.video || a.poster || "", poster: a.poster || "", video: !!a.video};
}
function portadaDe(p) { return rutaDe((p.archivos || [])[0]); }

function decDe(id)  { return (_est().decisiones || {})[id] || null; }
function f1De(p)    { var v = (_est().f1 || {})[p.id]; return v ? (v.estado || "") : (p.f1 || ""); }
function etapaDe(p) { return String(p.etiqueta || "").toUpperCase(); }   /* "" si no hay dato */
function tipoDe(p)  {
  var t = String(p.tipo || "").toLowerCase();
  return TIPO_HUMANO[t] || p.tipo || "";
}
/* Primera línea con texto del caption: es lo que identifica la pieza de un
   vistazo mucho mejor que su id en MAYÚSCULAS_CON_GUIONES. */
function hookDe(p) {
  var ls = String(p.caption || "").split("\n");
  var l = "";
  for (var i = 0; i < ls.length; i++) { if (ls[i].trim()) { l = ls[i].trim(); break; } }
  return l.length > 110 ? l.slice(0, 108) + "…" : l;
}

/* ------------------------------------------------------------- la lista §5.3 */

/* ⛔ «mar 25» NO ES UNA FECHA, y esta pantalla la usaba como si lo fuera.
   `p.dia` es una etiqueta día-de-la-semana + número: no dice ni mes ni año. El
   día que coincidan el nombre y el número, una pieza vieja sale como «hay que
   subirla hoy». Medido el 25-ago en el navegador: el **23-dic-2026** (miércoles
   23) `hoyEtiqueta()` devuelve "mié 23" y casa con `FAB_JORDI_MULTITAREA`, que
   es del **23-sep**. Tres meses de diferencia, y el panel lo pone en la lista de
   publicar de esa noche. Hoy (25-ago) acertaba de casualidad.

   Y había un segundo desacuerdo, este de todos los días: si alguien arrastraba
   una pieza a HOY en el Calendario, esa fecha se guarda en `E.calendario` y esta
   pantalla **no la miraba**. Las dos pantallas del mismo panel decían cosas
   distintas del mismo día.

   Las dos se arreglan con la misma función: la fecha efectiva es un ISO, y sale
   de `E.calendario` → `p.fecha` → la etiqueta resuelta contra `DATOS.dias_iso`.
   Es EXACTAMENTE el mismo orden que usa `vistas/calendario.js`, a propósito:
   dos criterios distintos para «qué día es esta pieza» es cómo se vuelve a
   desincronizar. */

function calDe(id) { return (_est().calendario || {})[id] || null; }

/* Mapa etiqueta → ISO, de `DATOS.dias_iso`. Etiqueta repetida en el rango
   cargado = ambigua: se deja sin resolver antes que adivinar el mes (ley 4). */
var _MAPA = null, _MAPA_SRC = null;
function mapaDias() {
  var l = _datos().dias_iso || [];
  if (_MAPA && _MAPA_SRC === l) return _MAPA;
  var m = {}, i, e;
  for (i = 0; i < l.length; i++) {
    e = String(l[i].etiqueta || "").trim();
    if (!e || !l[i].fecha) continue;
    m[e] = Object.prototype.hasOwnProperty.call(m, e) ? "" : l[i].fecha;
  }
  _MAPA = m; _MAPA_SRC = l;
  return m;
}

/* Fecha ISO efectiva de una pieza, o "" si no tiene ninguna. */
function fechaISOde(p) {
  var c = calDe(p.id), lab;
  if (c && typeof c.fecha === "string") return c.fecha;      /* "" = desprogramada a mano */
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(p.fecha || ""))) return p.fecha;
  lab = String(p.dia || "").trim();
  if (!lab || /^sin/i.test(lab)) return "";
  return mapaDias()[lab] || "";
}

/* TODAS las piezas que toca publicar HOY, decididas o no. */
function todasDeHoy() {
  var h = isoHoy();
  return (_datos().piezas || []).filter(function (p) { return fechaISOde(p) === h; });
}
/* Una pieza retirada (denegada por alguien, o con la portada denegada en f1) NO
   toca subirla hoy. Sale de la lista principal, pero NO desaparece: se enseña
   plegada abajo con quién la retiró. Nada se pierde en silencio (§1 ley 2). */
function retirada(p) {
  var d = decDe(p.id);
  return (d && d.estado === "denegado") || f1De(p) === "denegado";
}
/* La cola oficial de la pantalla y del contador `#nhoy`. */
function deHoy() {
  return todasDeHoy().filter(function (p) { return !retirada(p); });
}
function retiradasHoy() {
  return todasDeHoy().filter(retirada);
}
/* La hora también puede venir de una programación del Calendario, igual que la
   fecha: si se colocó la pieza en el hueco de las 20:00, aquí sale a las 20:00. */
function horaDe(p) {
  var c = calDe(p.id);
  if (c && c.hora) return c.hora;
  return String(p.hora || "");
}

function porCuenta(ps, c) {
  return ps.filter(function (p) { return String(p.cuenta || "").toUpperCase() === c; })
           .sort(function (a, b) {
             var x = minutos(horaDe(a)), y = minutos(horaDe(b));
             if (x === null && y === null) return 0;
             if (x === null) return 1;             /* sin hora, al final */
             if (y === null) return -1;
             return x - y;
           });
}

/* Los huecos de hoy = lo que el calendario dice que falta. Fuente preferente:
   `DATOS.huecos` (mismo fichero que las piezas, así que nunca va desfasado
   respecto a ellas). CAL_AUTO solo de reserva, y avisando de su fecha. */
function huecosHoy() {
  var et = hoyEtiqueta();
  var hs = _datos().huecos;
  if (hs && hs.length) {
    /* Los huecos ya traen `fecha` ISO en piezas.json: se casa por fecha y la
       etiqueta queda solo de reserva para ficheros viejos. */
    return hs.filter(function (h) { return h.fecha ? String(h.fecha) === isoHoy() : String(h.dia || "") === et; })
             .map(function (h) {
               return {cuenta: String(h.cuenta || "").toUpperCase(), hora: h.hora || "",
                       formato: h.formato || "", motivo: h.motivo || "", fuente: ""};
             });
  }
  var cal = _cal();
  if (!cal || !cal.cuentas) return [];
  var iso = isoHoy(), out = [];
  Object.keys(cal.cuentas).forEach(function (c) {
    ((cal.cuentas[c] || {}).vacios || []).forEach(function (v) {
      if (String(v.fecha || "") !== iso) return;
      out.push({cuenta: String(c).toUpperCase(), hora: "", formato: v.formato || "",
                motivo: v.motivo || "", fuente: cal.generado || ""});
    });
  });
  return out;
}

/* ¿El plan cargado cubre el día de hoy? Si `DATOS.dias` no contiene la etiqueta,
   una lista vacía NO significa «no hay nada programado»: significa que el
   fichero es de otra semana. Decirlo es la diferencia entre informar y mentir. */
function planCubreHoy() {
  var d = _datos(), h = isoHoy(), i;
  /* Por FECHA, no por etiqueta: es la misma corrección que `todasDeHoy`. */
  if (d.dias_iso && d.dias_iso.length) {
    for (i = 0; i < d.dias_iso.length; i++) if (d.dias_iso[i].fecha === h) return true;
    return false;
  }
  if (d.rango && d.rango.desde && d.rango.hasta) return h >= d.rango.desde && h <= d.rango.hasta;
  if (d.dias && d.dias.length) return d.dias.indexOf(hoyEtiqueta()) >= 0;
  return true;                                     /* sin dato, no se afirma nada */
}

/* Qué rango de días cubren los datos cargados, en cristiano. Se usa SOLO para
   explicar un vacío — nunca como identidad de la pantalla. */
function rangoTexto() {
  var d = _datos();
  if (d.rango && d.rango.desde && d.rango.hasta) return d.rango.desde + " → " + d.rango.hasta;
  if (d.dias_iso && d.dias_iso.length)
    return d.dias_iso[0].fecha + " → " + d.dias_iso[d.dias_iso.length - 1].fecha;
  return "";
}

/* ----------------------------------------------------------- componentes UI */

function filtros() {
  if (typeof filtrosHTML === "function") {
    try { PROPIOS = false; return filtrosHTML(); } catch (e) {}
  }
  PROPIOS = true;
  var fc = _fc();
  return '<div class="hy-filtros">' + ["todo", "JAVI", "JORDI"].map(function (c) {
    return '<button data-hy-f="' + c + '" class="' + (fc === c ? "on" : "") + '">' +
           (c === "todo" ? "Las dos" : c === "JAVI" ? "Javi" : "Jordi") + "</button>";
  }).join("") + "</div>";
}

function pill(c) {
  var cls = c === "JAVI" ? "javi" : c === "JORDI" ? "jordi" : "";
  return '<span class="hy-pill ' + cls + '">' + esc_(c || "sin cuenta") + "</span>";
}

/* Chips de estado. Todos salen SOLO si el dato existe (ley 4): una pieza sin
   `etiqueta` no lleva chip de etapa, no lleva un "SIN" de relleno. */
function chips(p) {
  var h = "";
  var t = tipoDe(p);
  if (t) h += '<span class="hy-chip">' + esc_(t) + (p.slides ? " · " + (+p.slides) + " slides" : "") + "</span>";

  var et = etapaDe(p);
  if (et) h += '<span class="hy-chip">' + esc_(ETAPA_HUMANO[et] || et) + "</span>";

  var f = f1De(p);
  if (f === "pendiente") h += '<span class="hy-chip warn">portada pendiente</span>';
  else if (f === "aprobado") h += '<span class="hy-chip ok">portada ok</span>';
  else if (f === "denegado") h += '<span class="hy-chip no">portada denegada</span>';

  var d = decDe(p.id);
  if (d && d.estado === "aprobado") h += '<span class="hy-chip ok">aprobada' + (d.por ? " · " + esc_(d.por) : "") + "</span>";
  else if (d && d.estado === "corregir") h += '<span class="hy-chip warn">pendiente de corregir</span>';
  else if (d && d.estado === "denegado") h += '<span class="hy-chip no">denegada' + (d.por ? " · " + esc_(d.por) : "") + "</span>";
  else if (!d) h += '<span class="hy-chip">sin votar</span>';

  if (p.sin_caption) h += '<span class="hy-chip warn">falta caption</span>';
  if (horaFueraDeVentana(horaDe(p))) h += '<span class="hy-chip warn">fuera de 19-20</span>';
  return h;
}

/* Una fila = una pieza que toca subir. Móvil primero (§3.6): en pantalla
   estrecha la miniatura va arriba, el caption ocupa el ancho y el botón de
   copiar es una barra a lo ancho, en la zona del pulgar. */
function fila(p, idTa) {
  var m = portadaDe(p);
  var mini = m.poster || (m.video ? "" : m.src);
  return '' +
  '<article class="hy-fila" data-hy-pieza="' + esc_(p.id) + '">' +
    '<button class="hy-mini" data-hy-ver="' + esc_(p.id) + '" ' +
            'title="Ver la pieza"' + (m.src ? "" : " disabled") + '>' +
      (mini ? '<img src="' + esc_(mini) + '" alt="" loading="lazy">'
            : '<span class="hy-sinmedia">sin<br>media</span>') +
      (m.video ? '<span class="hy-play" aria-hidden="true">▶</span>' : "") +
    '</button>' +
    '<div class="hy-cuerpo">' +
      '<div class="hy-linea1">' +
        '<b class="hy-hora">' + esc_(horaDe(p) || "sin hora") + "</b>" +
        pill(String(p.cuenta || "").toUpperCase()) +
      "</div>" +
      '<div class="hy-chips">' + chips(p) + "</div>" +
      '<h4 class="hy-tit">' + esc_(hookDe(p) || p.id) + "</h4>" +
      '<div class="hy-id">' + esc_(p.id) + "</div>" +
      '<label class="hy-lab" for="' + idTa + '">Lo que se publica</label>' +
      '<textarea class="hy-cap" id="' + idTa + '" readonly rows="4" ' +
                'placeholder="— esta pieza no trae caption —">' + esc_(p.caption || "") + "</textarea>" +
      '<div class="hy-acc">' +
        '<button class="copiacap hy-copia" data-hy-cap="' + idTa + '">Copiar caption</button>' +
      "</div>" +
    "</div>" +
  "</article>";
}

function bloqueCuenta(c, ps) {
  var h = '<section class="hy-cuenta">' +
          '<h3 class="hy-h3">' + pill(c) +
          '<span class="hy-cnt">' + (ps.length ? ps.length + (ps.length === 1 ? " pieza" : " piezas") : "sin pieza para hoy") + "</span>" +
          "</h3>";
  if (!ps.length) {
    h += '<p class="hy-nada">Hoy no sale nada en esta cuenta.</p>';
  } else {
    ps.forEach(function (p, i) { h += fila(p, "hycap-" + c + "-" + i); });
  }
  return h + "</section>";
}

function bloqueHuecos(hs) {
  if (!hs.length) return "";
  var fuente = hs[0].fuente;
  var h = '<section class="hy-huecos"><h3 class="hy-h3">Huecos de hoy' +
          '<span class="hy-cnt">' + hs.length + "</span></h3>";
  hs.forEach(function (x) {
    h += '<div class="hy-hueco">' +
           '<div class="hy-hueco-t">' + (x.hora ? '<b class="hy-hora">' + esc_(x.hora) + "</b> · " : "") +
             esc_(x.cuenta) + " · " + esc_(x.formato || "sin formato") + "</div>" +
           (x.motivo ? '<p class="hy-hueco-m">' + esc_(x.motivo) + "</p>" : "") +
         "</div>";
  });
  if (fuente) h += '<p class="hy-nota-min">reparto del plan generado el ' + esc_(fuente) + "</p>";
  return h + "</section>";
}

function bloqueRetiradas(ps) {
  if (!ps.length) return "";
  var h = '<details class="hy-retiradas"><summary>' + ps.length +
          (ps.length === 1 ? " pieza retirada" : " piezas retiradas") +
          " de hoy (denegadas — no se suben)</summary>";
  ps.forEach(function (p) {
    var d = decDe(p.id);
    h += '<div class="hy-ret">' +
           "<b>" + esc_(horaDe(p) || "sin hora") + "</b> · " + esc_(p.cuenta || "") + " · " +
           esc_(hookDe(p) || p.id) +
           (d && d.por ? '<span class="hy-ret-q"> — denegada por ' + esc_(d.por) + "</span>" : "") +
           (d && d.motivo ? '<p class="hy-ret-m">' + esc_(d.motivo) + "</p>" : "") +
         "</div>";
  });
  return h + "</details>";
}

function cabecera(lista) {
  var sab = esSabado();
  var h = '<header class="hy-cab">' +
    '<h2 class="hy-h2">Hoy</h2>' +
    /* ⛔ Aquí ponía «· semana <DATOS.semana>». Es la misma enfermedad que Gerard
       cantó en la cabecera del panel: un rótulo de SEMANA como identidad de una
       pantalla que es de HOY — y encima hoy `DATOS.semana` ya no es una semana,
       vale "23 ago → 24 sep 2026", que son 33 días. Lo que importa aquí es la
       fecha de hoy, con su año. El rango de los datos solo aparece cuando hace
       falta para explicar un vacío (ver `vacio()`). */
    '<p class="hy-sub">' + esc_(fechaLarga()) + "</p>" +
    '<p class="hy-horario' + (sab ? " libre" : "") + '">' +
      (sab ? "Hoy es <b>sábado</b>: la hora da igual."
           : "Se sube entre <b>" + VENTANA.desde + " y " + VENTANA.hasta + "</b>. Nunca a las 23 h.") +
    "</p>";
  if (lista.length) {
    /* «sin votar» no es un adorno: una pieza programada para hoy que nadie ha
       aprobado está a punto de subirse sin el OK que exige la doctrina (ley 8).
       El chip de cada fila se queda neutro —en reposo la pantalla no grita— y el
       recuento agregado, que es el que hace falta a las 19:00, va en ámbar. */
    var sinVoto = lista.filter(function (p) { return !decDe(p.id); }).length;
    h += '<p class="hy-total"><b>' + lista.length + "</b> " +
         (lista.length === 1 ? "pieza" : "piezas") + " para subir hoy" +
         (sinVoto ? ' · <span class="hy-alerta">' + sinVoto + " sin votar</span>" : "") +
         "</p>";
  }
  h += "</header>";
  return h;
}

/* Dos vacíos distintos, y la diferencia importa: «no hay nada programado» es un
   problema de producción (regla 32) y «el plan es de otra semana» es un problema
   del fichero. Enseñar el primero cuando pasa el segundo sería mentir. */
function vacio() {
  if (!planCubreHoy()) {
    var rg = rangoTexto();
    return '<div class="hy-vacio">' +
      "<h3>Los datos cargados no llegan a hoy</h3>" +
      "<p>Hoy es <b>" + esc_(isoHoy()) + "</b> y <code>piezas.json</code> cubre " +
      (rg ? "<b>" + esc_(rg) + "</b>" : "otros días") + "." +
      " No es que no haya nada programado: es que el fichero se quedó atrás. Hay que " +
      "regenerarlo (<code>_gen_piezas.py</code>).</p></div>";
  }
  return '<div class="hy-vacio">' +
    "<h3>Hoy no hay nada programado</h3>" +
    "<p>Si esto sale vacío un día entre semana, la semana no está preparada — " +
    "es la <b>regla 32</b>: el contenido se deja listo y programado con antelación " +
    "para revisarlo el lunes.</p></div>";
}

/* ------------------------------------------------------------------- vista */

function vistaHoy() {
  var lista = deHoy();
  var fc = _fc();
  var cuentas = (fc === "JAVI" || fc === "JORDI") ? [fc] : CUENTAS;
  var hs = huecosHoy().filter(function (x) { return cuentas.indexOf(x.cuenta) >= 0 || !x.cuenta; });
  var rets = retiradasHoy().filter(function (p) {
    return fc === "todo" || String(p.cuenta || "").toUpperCase() === fc;
  });

  var h = '<div class="hy hy-root">' + cabecera(lista) + filtros();

  var enVista = 0;
  cuentas.forEach(function (c) { enVista += porCuenta(lista, c).length; });

  /* Las piezas de una cuenta que no es JAVI ni JORDI existirían en los datos y
     no se verían nunca: se listan aparte en vez de desaparecer. */
  var otras = lista.filter(function (p) {
    return CUENTAS.indexOf(String(p.cuenta || "").toUpperCase()) < 0;
  });

  if (!lista.length && !hs.length) {
    h += vacio();
  } else {
    cuentas.forEach(function (c) { h += bloqueCuenta(c, porCuenta(lista, c)); });
    if (fc === "todo" && otras.length) {
      h += '<section class="hy-cuenta"><h3 class="hy-h3">Otras cuentas' +
           '<span class="hy-cnt">' + otras.length + "</span></h3>";
      otras.forEach(function (p, i) { h += fila(p, "hycap-OTRAS-" + i); });
      h += "</section>";
    }
    h += bloqueHuecos(hs);
    h += bloqueRetiradas(rets);
  }

  h += '<p class="hy-pie">Esta pantalla no publica nada. Publicar es manual y con ' +
       "OK de Gerard, pieza a pieza.</p>";
  return h + "</div>";
}

/* ---------------------------------------------------------------- handlers */
/* Delegación en `document`, acotada a `.hy-root` para no pisar a las demás
   pantallas. Es idempotente: `cablearHoy()` se puede llamar tras cada repintado
   sin duplicar listeners (que es como se acaba guardando dos veces por clic). */

/* Deja el caption MARCADO en su textarea. Es la red de seguridad de todo lo de
   abajo: si el navegador no deja copiar, al menos el texto queda seleccionado y
   se copia con Ctrl+C / ⌘C. `readOnly=false` momentáneo porque iOS no selecciona
   un textarea de solo lectura. */
function seleccionar(ta) {
  try {
    var ro = ta.readOnly;
    ta.readOnly = false;
    ta.focus();
    ta.setSelectionRange(0, ta.value.length);
    ta.readOnly = ro;
    return ta.selectionEnd - ta.selectionStart === ta.value.length;
  } catch (e) { return false; }
}

function copiar(ta, btn) {
  var txt = ta.value || "";
  var orig = btn.getAttribute("data-hy-txt") || btn.textContent;
  btn.setAttribute("data-hy-txt", orig);

  var fin = function (ok) {
    /* Copiar puede fallar por el navegador, no por nosotros: la API pide
       contexto seguro Y documento con foco, y `execCommand` pide activación del
       usuario. Medido en el banco de pruebas con la pestaña sin foco: los dos
       caminos devuelven NotAllowedError / false con el código correcto.
       Por eso el fallo NO es un callejón sin salida: se deja el texto marcado y
       se dice cómo terminar a mano. */
    if (!ok) seleccionar(ta);
    btn.textContent = ok ? "Copiado ✓" : "Marcado · Ctrl+C";
    btn.classList.toggle("ok", !!ok);
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.textContent = orig; btn.classList.remove("ok"); }, 2200);
    avisar(ok ? "Caption copiado" : "No se pudo copiar solo: está marcado, pulsa Ctrl+C", !ok);
  };

  if (!txt.trim()) {
    btn.textContent = "Sin caption";
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.textContent = orig; }, 2200);
    avisar("Esta pieza no tiene caption todavía", true);
    return;
  }

  /* Vía moderna primero; la de reserva es la que usaba el panel viejo y funciona
     también fuera de contexto seguro (file://, http). */
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function () { fin(true); }, function () { fin(legacy(ta)); });
    return;
  }
  fin(legacy(ta));
}

function legacy(ta) {
  try {
    if (!seleccionar(ta)) return false;
    var ok = document.execCommand("copy");
    if (ok) ta.blur();               /* si falló, la selección se queda para Ctrl+C */
    return !!ok;
  } catch (e) { return false; }
}

function onClick(ev) {
  var t = ev.target;
  if (!t || !t.closest || !t.closest(".hy-root")) return;
  var b = t.closest("button");
  if (!b) return;

  if (b.hasAttribute("data-hy-cap")) {
    var ta = document.getElementById(b.getAttribute("data-hy-cap"));
    if (ta) copiar(ta, b);
    return;
  }
  if (b.hasAttribute("data-hy-ver")) {
    var id = b.getAttribute("data-hy-ver");
    if (typeof abreVisor === "function") { abreVisor(id); return; }
    /* sin visor todavía: al menos que se pueda MIRAR la pieza antes de subirla */
    var ps = (_datos().piezas || []).filter(function (x) { return x.id === id; });
    var m = ps.length ? portadaDe(ps[0]) : null;
    if (m && m.src) window.open(m.src, "_blank", "noopener");
    else avisar("Esta pieza no tiene media que abrir", true);
    return;
  }
  /* Filtros: SOLO los de reserva. Si los pintó `filtrosHTML()` de index.html,
     los cablea index.html y aquí no se toca — cablearlos dos veces repinta dos
     veces por clic. */
  if (PROPIOS && b.hasAttribute("data-hy-f")) {
    _setCuenta(b.getAttribute("data-hy-f"));
    pintar();
    return;
  }
}

function montar() {
  if (MONTADO) return;
  MONTADO = true;
  document.addEventListener("click", onClick);
}

/* ------------------------------------------------------------------ salida */

window.vistaHoy     = vistaHoy;
window.cablearHoy   = montar;
/* render() los usa para el contador `#nhoy` (§6.2). Se exportan desde aquí para
   que el número de la pestaña y la lista de la pantalla sean el MISMO cálculo. */
window.deHoy        = deHoy;
window.hoyEtiqueta  = hoyEtiqueta;
window.VISTA_HOY    = {
  vistaHoy: vistaHoy, cablear: montar,
  deHoy: deHoy, todasDeHoy: todasDeHoy, retiradasHoy: retiradasHoy,
  huecosHoy: huecosHoy, hoyEtiqueta: hoyEtiqueta, isoHoy: isoHoy,
  planCubreHoy: planCubreHoy, VENTANA: VENTANA,
  fechaISOde: fechaISOde, horaDe: horaDe, rangoTexto: rangoTexto
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
else montar();

})();
