/* =============================================================================
   vistas/revisar.js  ·  PANTALLA «POR REVISAR»  (BUILD_SPEC_PANEL_ELITE.md §5.2)
   =============================================================================

   QUÉ HACE
   --------
   Pinta la pantalla de velocidad del panel: la cola de piezas que nadie ha
   decidido todavía, en dos modos que se recuerdan en `localStorage.mx_modo`:

     · FOCO (por defecto) — una pieza a la vez, media grande CON SONIDO, barra
       «X de Y», comparación referente↔clon, 3 decisiones y teclado.
     · CUADRÍCULA — todas las pendientes agrupadas por etapa (TOFU/MOFU/BOFU/SIN),
       con «Aprobar toda esta sección» y las mismas 3 decisiones por tarjeta.

   Las 3 decisiones son Aprobar · Corregir · Denegar. **Aprobar NO publica**
   (§1 ley 3): marca la decisión y coloca la pieza en el calendario. Publicar
   sigue siendo manual y con OK de Gerard pieza a pieza.

   DE QUÉ DATOS VIVE  (§2 — el contrato es SAGRADO, los nombres son literales)
   --------------------------------------------------------------------------
   LECTURA (globals que este módulo NO declara; los pone index.html):

     DATOS        {generado, semana, dias[], piezas[]}   ← piezas.json
                  pieza = {id, cuenta:"JAVI"|"JORDI", tipo, dia, hora, caption,
                           archivos:[{archivo, poster, video?, peso_mb?}], …}
                  ⚠ archivos[] es un array de OBJETOS. Nunca se interpola crudo
                    (bug §6.3: `src="[object Object]"`). Se lee .video || .poster.
                  Opcionales que este módulo pinta SOLO si existen (cero inventar,
                  doctrina ley 4): etiqueta · porque · dur_s · f1 · f1_motivo · slides.
     E            estado vivo fusionado por leerBlob():
                  {decisiones:{[id]:{estado,motivo,por,cuando,motivo_slides?}},
                   referentes:[], calendario:{}, f1:{[id]:{estado,motivo}},
                   hooks:[], notas:{}}
     REFS_PAREJA  {[piezaId]:{pieza, ref, es_video, origen, como, …}} ← referentes.json .pares
     REFS_SIN     (opcional) [{pieza, motivo}]                        ← referentes.json .sin_referente
     YO           "Gerard"|"Javi"|"Jordi"|"Santi"
     FCUENTA      "todo"|"JAVI"|"JORDI"     FETAPA "todo"|"TOFU"|"MOFU"|"BOFU"
     TAB          la pestaña activa ("repasar" | "revisar")

   ESCRITURA (se respeta EXACTO el reparto del §2.B — cambiarlo pierde votos):
     guardar(fn)     → BLOB compartido. AQUÍ va `decisiones`. Server-first, ×3.
     guardarMio(fn)  → BINS[YO]. AQUÍ va SOLO `ordenes` (el bucle de corrección
                       del §7.1: {oid, tipo:"corregir", id, motivo, ejes[], por, cuando}).
                       El `oid` es estable (§7.2) para que el listener deduplique
                       por él y no por campos mutables.
     render()        → repinta el panel entero.
     aviso(t, mal)   → toast. abreVisor(id) → visor §5.8 (si no existe, hay
                       un visor mínimo de reserva dentro de este fichero).
     pendientes()    → la cola oficial. Si no existe, este módulo la calcula.
     filtrosHTML()   → barra cuenta+etapa. Si no existe, la pinta este módulo.

   CÓMO SE ENGANCHA A index.html  (§3.4 · §6.1)
   --------------------------------------------
     <link rel="stylesheet" href="vistas/revisar.css">
     <script src="vistas/revisar.js"></script>   ← script CLÁSICO, no módulo ES:
                                                   el panel es un HTML estático sin
                                                   build y `type=module` rompería
                                                   el acceso a los globals.
     const VISTAS = { repasar: vistaRepasar, revisar: vistaRevisar, … };
     app.innerHTML = (VISTAS[TAB] || vistaEspia)();
     function cablear(){ …; cablearRevisar(); }

   ⚠ index.html NO debe declarar sus propias `vistaRepasar`/`vistaRevisar` ni
     cablear a mano los `data-rp` / `data-a` / `data-fx` / `data-sec` de esta
     pantalla: los lleva este fichero por delegación y se dispararían dos veces
     (= dos escrituras por clic).

   BUGS DEL PANEL VIEJO QUE AQUÍ NO SE REPITEN
   -------------------------------------------
     §6.3  la comparación saca la ruta del OBJETO (.video || .poster), nunca el objeto.
     §6.6  tras decidir se COMPRUEBA que el voto aterrizó en E.decisiones antes de
           avanzar; si npoint está caído, no avanza y lo dice (solo-lectura visible).
     §6.5  «Aprobar toda esta sección» es UNA sola llamada a guardar() con las N
           decisiones dentro. La cola `guardando`/`pendiente` de guardar() descarta
           las llamadas intermedias, así que N llamadas seguidas perderían votos.
   ============================================================================= */

(function () {
"use strict";

/* ---------------------------------------------------------------- constantes */

/* Chips de corrección rápida. No son genéricas: cada una es una queja MEDIDA del
   equipo en su WhatsApp (criterio-equipo-medido.md · edicion-viral-score.md).
   [etiqueta, texto que rellena el motivo, eje que vuelve a la fábrica §7.1]. */
var FIX_RAPIDO = [
  ["Letra pequeña",          "La letra es muy pequeña, súbela",                    "texto"],
  ["Hook flojo/infantil",    "El hook no engancha, hay que cambiarlo",             "hook"],
  ["Esa foto no",            "Esa foto no vale, usa otra",                         "foto"],
  ["Música aburrida",        "La música es aburrida, pon una viral",               "musica"],
  ["Portada sin dueño",      "En la portada tiene que salir el dueño de la cuenta","portada"],
  ["Muy lento / corta menos","Va muy lento: más cortes y más cortos",              "ritmo"],
  ["Falta CTA",              "Falta el CTA al final",                              "cta"],
  ["No es del nicho",        "Esto no es del nicho, no sirve",                     "tema"],
  ["Rótulo de arriba sobra", "El rótulo de arriba sobra, manda el subtítulo",      "rotulo"]
];

var SECCIONES = [["TOFU", "TOFU · problema / dolor"], ["MOFU", "MOFU · solución"],
                 ["BOFU", "BOFU · mentalidad / casos"], ["SIN", "Sin etapa asignada"]];

/* El equipo no piensa en siglas y nuestra propia regla 11 prohíbe la jerga. */
var ETAPA_HUMANO = {TOFU: "Para que te descubran", MOFU: "Para que te consideren",
                    BOFU: "Para que compren", SIN: "Sin etapa"};

/* Los 5 ejes del clon-check (§4.3 · §5.2). Se pintan SIEMPRE los 5; los que no
   tienen medición salen «sin medir», nunca con un ✓ o un % inventado (ley 4). */
var EJES = [["cortes", "cortes/s"], ["musica", "música"], ["portada", "portada"],
            ["color", "color"], ["hook", "hook"]];

/* ------------------------------------------------------------ estado privado */

var RVI = 0;          /* índice de la pieza en FOCO */
var SLIDE = {};       /* {piezaId: nº de slide visible en la galería} */
var BORRADOR = {};    /* {piezaId: motivo tecleado y aún no guardado} */
var EJES_SEL = {};    /* {piezaId: [ejes de los chips pulsados]} */
var ENVUELO = {};     /* {piezaId: true} mientras su voto está en el aire */
var FILTRO = {cuenta: "todo", etapa: "todo"};   /* solo si index.html no trae los suyos */
var MONTADO = false;
var HECHAS = {};      /* {piezaId: true} decididas EN ESTA PASADA (para la barra) */
var FIRMA0 = null;    /* firma del filtro con la que se está contando */

/* --------------------------------------------------- puentes con los globals */
/* Todo acceso a un global va por aquí: si index.html todavía no lo define, la
   pantalla degrada en vez de reventar. `typeof` sobre un identificador que no
   existe no lanza; leerlo a pelo sí. */

function _datos()  { return (typeof DATOS       !== "undefined" && DATOS)       || {piezas: []}; }
function _est()    { return (typeof E           !== "undefined" && E)           || {}; }
function _refs()   { return (typeof REFS_PAREJA !== "undefined" && REFS_PAREJA) || {}; }
function _refsSin(){ return (typeof REFS_SIN    !== "undefined" && REFS_SIN)    || []; }
function _yo()     { return (typeof YO          !== "undefined" && YO)          || ""; }
function _tab()    { return (typeof TAB         !== "undefined" && TAB)         || "repasar"; }

function _fc() { try { if (typeof FCUENTA !== "undefined") return FCUENTA || "todo"; } catch (e) {} return FILTRO.cuenta; }
function _fe() { try { if (typeof FETAPA  !== "undefined") return FETAPA  || "todo"; } catch (e) {} return FILTRO.etapa; }
function _setFiltro(k, v) {
  FILTRO[k] = v;
  HECHAS = {};     /* otra cola = otra pasada; si no, la barra contaría contra la anterior */
  try { if (k === "cuenta") FCUENTA = v; else FETAPA = v; } catch (e) { /* no lo declara index.html */ }
}

function _modo() { return localStorage.getItem("mx_modo") === "cuadricula" ? "cuadricula" : "foco"; }
function _setModo(m) {
  localStorage.setItem("mx_modo", m);
  try { MODO = m; } catch (e) {}
}

function avisar(t, mal) {
  if (typeof aviso === "function") { aviso(t, mal); return; }
  if (mal) console.warn("[revisar]", t); else console.log("[revisar]", t);
}
function pintar() {
  if (typeof render === "function") { render(); return; }
  var app = document.querySelector("#app");
  if (app) { app.innerHTML = vistaRepasar(); montar(); }
}

/* ------------------------------------------------------------------ utilidad */

function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
  });
}
/* Mismo formato de sello que el panel vivo. La fusión del §2.B elige la decisión
   por `cuando` comparando STRINGS: cambiar el formato rompe el merge. */
function sello() { return new Date().toISOString().slice(0, 16).replace("T", " "); }
function oid() {
  try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  return "oid-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/* Quita la frase de un chip del motivo sin destrozar lo escrito a mano: se
   prueban primero las dos formas con separador que inserta el propio chip. */
function quitarFrase(txt, frase) {
  var s = String(txt || "");
  s = s.split(frase + ". ").join("");
  s = s.split(". " + frase).join("");
  s = s.split(frase).join("");
  return s.trim();
}

function decDe(id)   { return (_est().decisiones || {})[id] || null; }
function etapaDe(p)  { return String(p.etiqueta || "").toUpperCase() || "SIN"; }
function f1De(p)     { var v = (_est().f1 || {})[p.id]; return v ? (v.estado || "") : (p.f1 || ""); }
function piezaDe(id) { return (_datos().piezas || []).find(function (x) { return x.id === id; }) || null; }
function hookDe(p) {
  var l = String(p.caption || "").split("\n").find(function (x) { return x.trim(); }) || "";
  l = l.trim();
  return l.length > 120 ? l.slice(0, 118) + "…" : l;
}
/* Bug §6.3: un item de archivos[] es SIEMPRE un objeto. Se saca la ruta, nunca el objeto. */
function rutaDe(a) {
  if (!a) return {src: "", poster: "", video: false};
  if (typeof a === "string") return {src: a, poster: "", video: /\.(mp4|mov|webm)$/i.test(a)};
  return {src: a.video || a.poster || "", poster: a.poster || "", video: !!a.video};
}

/* --------------------------------------------------------------- la cola §5.2 */

function lista() {
  var base = null;
  if (typeof pendientes === "function") { try { base = pendientes(); } catch (e) { base = null; } }
  if (!base) {
    base = (_datos().piezas || []).filter(function (p) { return !decDe(p.id); });
  }
  var fc = _fc(), fe = _fe();
  return base.filter(function (p) {
    if (fc !== "todo" && p.cuenta !== fc) return false;
    if (fe !== "todo" && etapaDe(p) !== fe) return false;
    return true;
  });
}

/* ------------------------------------------------------------- componentes UI */

function filtros() {
  if (typeof filtrosHTML === "function") { try { return filtrosHTML(); } catch (e) {} }
  var fc = _fc(), fe = _fe();
  return '<div class="rv-filtros">' +
    ["todo", "JAVI", "JORDI"].map(function (c) {
      return '<button data-f="' + c + '" class="' + (fc === c ? "on" : "") + '">' +
             (c === "todo" ? "Las dos" : c === "JAVI" ? "Javi" : "Jordi") + "</button>";
    }).join("") +
    '<span class="rv-sep"></span>' +
    ["todo", "TOFU", "MOFU", "BOFU"].map(function (e) {
      return '<button data-e="' + e + '" class="' + (fe === e ? "on" : "") + '">' +
             (e === "todo" ? "Todas" : e) + "</button>";
    }).join("") + "</div>";
}

function pill(p) {
  var c = String(p.cuenta || "").toUpperCase();
  var cls = c === "JAVI" ? "javi" : c === "JORDI" ? "jordi" : "";
  return '<span class="rv-pill ' + cls + '">' + esc_(c || "sin cuenta") + "</span>";
}

function badgeF1(p) {
  var f = f1De(p);
  if (!f) return "";                              /* sin dato = no se pinta nada */
  if (f === "pendiente") return '<span class="rv-badge warn">portada pendiente</span>';
  if (f === "aprobado")  return '<span class="rv-badge ok">portada ok</span>';
  if (f === "denegado")  return '<span class="rv-badge no">portada denegada</span>';
  return '<span class="rv-badge">' + esc_(f) + "</span>";
}

/* El estado del referente, visible SIN desplegar nada. En el móvil nadie abre un
   drawer para enterarse de que no hay con qué comparar, y esa es justo la pieza
   que hay que mirar con más cuidado antes de aprobar. */
function badgeRef(p) {
  if (_refs()[p.id]) return "";
  var sin = _refsSin().find(function (x) { return x.pieza === p.id; });
  return '<span class="rv-badge warn">' + (sin ? "sin referente" : "sin emparejar") + "</span>";
}

/* Galería multi-slide. `grande` = modo foco (media grande, con sonido). */
function mediaHTML(p, i, grande) {
  var arr = p.archivos || [], n = arr.length;
  if (i == null || i < 0 || i >= n) i = 0;
  var a = rutaDe(arr[i]);
  var dentro;
  if (!a.src) {
    dentro = '<div class="rv-nomedia">sin vista previa</div>';
  } else if (a.video) {
    dentro = '<video src="' + esc_(a.src) + '" poster="' + esc_(a.poster) + '" controls playsinline ' +
             'preload="' + (grande ? "metadata" : "none") + '"></video>';
  } else {
    dentro = '<img src="' + esc_(a.src) + '" loading="lazy" alt="">';
  }
  var nav = "";
  if (n > 1) {
    nav = '<button class="rv-nav izq" data-n="-1" aria-label="anterior">‹</button>' +
          '<button class="rv-nav der" data-n="1" aria-label="siguiente">›</button>' +
          '<span class="rv-cnt">' + (i + 1) + "/" + n + "</span>" +
          '<button class="rv-ver" data-ver="1">Ver las ' + n + " con música</button>";
  }
  var son = a.video ? '<span class="rv-son">vídeo con sonido</span>' : "";
  return '<div class="rv-med' + (grande ? " grande" : "") + '" data-med="' + esc_(p.id) +
         '" data-i="' + i + '" data-grande="' + (grande ? 1 : 0) + '">' + dentro + nav + son + "</div>";
}

/* --------------------------------------- comparación referente ↔ clon (§5.2) */

/* Un eje puede venir como booleano, como "ok"/"mal" o como
   {ok:bool, ref:<medida del referente>, mio:<la nuestra>}. Si no viene, sale
   «sin medir» — nunca un ✓ de adorno. */
function ejeHTML(clave, etiq, ejes) {
  var v = ejes ? ejes[clave] : undefined, estado = "nd", marca = "–", detalle = "";
  if (v !== undefined && v !== null) {
    var ok = (typeof v === "object") ? v.ok : v;
    if (ok === true || ok === "ok" || ok === "si") { estado = "si"; marca = "✓"; }
    else if (ok === false || ok === "mal" || ok === "no") { estado = "no"; marca = "✕"; }
    if (typeof v === "object" && (v.ref != null || v.mio != null)) {
      detalle = '<i>' + esc_(v.ref == null ? "–" : v.ref) + " → " +
                        esc_(v.mio == null ? "–" : v.mio) + "</i>";
    }
  }
  return '<li class="rv-eje ' + estado + '"><b>' + marca + "</b><span>" + esc_(etiq) + "</span>" + detalle + "</li>";
}

/* Nombre del molde que se está clonando. Solo sale si el dato EXISTE de verdad:
   un `como` del tipo "ruta local verificada" no lleva molde y aquí no se
   inventa uno sacando la primera palabra larga (ley 4). */
function moldeDe(r) {
  if (!r) return "";
  if (r.molde) return String(r.molde);
  if (r.autor) return "@" + String(r.autor);
  var s = String(r.url || r.como || "");
  var m = s.match(/instagram\.com\/(?:reels?|p)\/([A-Za-z0-9_-]{5,})/) ||
          s.match(/shortcode\s+([A-Za-z0-9_-]{5,})/i);
  return m ? m[1] : "";
}

/* SIN REFERENTE — el drawer NO desaparece, lo dice.
   Medido el 25-ago sobre los datos vivos: de las 91 piezas de la cola, 22 no
   tienen pareja en `referentes.json`. Con el código de antes esas 22 perdían el
   control «Comparar con el referente» — no salía nada donde en la pieza anterior
   había un desplegable. Y la pieza que todavía no está catalogada en NINGUNA de
   las dos listas (`pares` ni `sin_referente`) devolvía `""`: ni drawer, ni aviso,
   ni una línea. Reproducido quitando una pieza de REFS_SIN y repintando.
   Ese es el estado por defecto de toda pieza recién producida hasta que alguien
   regenera `referentes.json`, así que no es un caso raro: es el caso nuevo.

   Se distinguen los dos motivos porque NO son lo mismo (ley 4, cero inventar):
   una pieza catalogada «sin referente» sabemos que no salió de ninguno; una que
   no aparece en ninguna lista puede tenerlo y faltar solo el cruce. Decir «no
   tiene referente» de la segunda sería inventarse un hecho. */
function sinRefHTML(p) {
  var sin = _refsSin().find(function (x) { return x.pieza === p.id; });
  var titulo, cuerpo;
  if (sin) {
    titulo = "Sin referente con el que comparar";
    cuerpo = "Esta pieza no salió de ningún referente" +
             (sin.motivo ? " — " + esc_(sin.motivo) : "") + ". No hay original que " +
             "poner al lado, así que júzgala sola: hook, tamaño de letra, ritmo y CTA. " +
             "Si algo falla, escríbelo en Corregir.";
  } else {
    titulo = "Referente todavía sin emparejar";
    cuerpo = "Esta pieza aún no está cruzada con su referente, así que el panel no " +
             "tiene con qué compararla. Puede que sí lo tenga y falte solo el cruce: " +
             "el panel no lo sabe y no se lo inventa.";
  }
  return '<details class="rv-cmp sinref"><summary>' + titulo + "</summary>" +
         '<p class="rv-cmpnota">' + cuerpo + "</p></details>";
}

function comparaHTML(p) {
  var r = _refs()[p.id];
  if (!r) return sinRefHTML(p);
  var m = rutaDe((p.archivos || [])[0]);   /* §6.3: ruta del objeto, no el objeto */
  var izq = r.ref
    ? (r.es_video
        ? '<video src="' + esc_(r.ref) + '" controls playsinline preload="metadata"></video>'
        : '<img src="' + esc_(r.ref) + '" loading="lazy" alt="referente">')
    : '<div class="rv-nomedia">sin copia del referente</div>';
  var der = m.src
    ? (m.video
        ? '<video src="' + esc_(m.src) + '" poster="' + esc_(m.poster) + '" controls playsinline preload="metadata"></video>'
        : '<img src="' + esc_(m.src) + '" loading="lazy" alt="lo nuestro">')
    : '<div class="rv-nomedia">sin vista previa</div>';

  var hayEjes = !!(r.ejes && Object.keys(r.ejes).length);
  var fila = '<ul class="rv-ejes">' + EJES.map(function (e) { return ejeHTML(e[0], e[1], r.ejes); }).join("") + "</ul>";
  var par = "";
  if (typeof r.parecido === "number") {
    var v = Math.max(0, Math.min(100, Math.round(r.parecido)));
    par = '<div class="rv-par"><span>parecido</span><span class="rv-parbar"><i style="width:' + v +
          '%"></i></span><b>' + v + "%</b></div>";
  }
  var nota = hayEjes
    ? "Mira lo mismo en los dos: tipografía, tamaño de letra, dónde cae el corte y cuándo entra la música. Si algo no cuadra, escríbelo en Corregir."
    : "Los ejes de esta pieza no están medidos todavía, así que salen en blanco: el panel no inventa un ✓. Compáralos tú en los dos vídeos — tipografía, tamaño de letra, dónde cae el corte y cuándo entra la música.";

  return '<details class="rv-cmp"><summary>Comparar con el referente</summary>' +
    '<div class="rv-cmpgrid">' +
      "<figure><figcaption>Referente" + (moldeDe(r) ? " · " + esc_(moldeDe(r)) : "") + "</figcaption>" + izq + "</figure>" +
      "<figure><figcaption>Lo nuestro</figcaption>" + der + "</figure>" +
    "</div>" + fila + par +
    '<p class="rv-cmpnota">' + nota + "</p></details>";
}

/* ------------------------------------------------ corrección: chips + motivo */

function correccionHTML(p, d) {
  var sel = EJES_SEL[p.id] || [];
  var txt = BORRADOR[p.id] != null ? BORRADOR[p.id] : ((d && d.motivo) || "");
  var abierto = (d && d.estado === "corregir") || !!txt;
  return '<details class="rv-corr"' + (abierto ? " open" : "") + ">" +
    "<summary>Escribir una corrección</summary>" +
    '<div class="fixr">' + FIX_RAPIDO.map(function (f, i) {
      return '<button data-fx="' + i + '" class="' + (sel.indexOf(f[2]) >= 0 ? "on" : "") + '">' + esc_(f[0]) + "</button>";
    }).join("") + "</div>" +
    '<textarea class="motivo" data-motivo="' + esc_(p.id) + '" ' +
    'placeholder="¿Qué está mal? Escríbelo tal cual — esto es lo que leo yo para no repetirlo.">' +
    esc_(txt) + "</textarea></details>";
}

function accionesHTML(p, d, attr) {
  var e = d && d.estado;
  return '<div class="rpacc">' +
    '<button class="acc ok'   + (e === "aprobado" ? " sel" : "") + '" ' + attr + '="aprobado">Aprobar</button>' +
    '<button class="acc fix'  + (e === "corregir" ? " sel" : "") + '" ' + attr + '="corregir">Corregir</button>' +
    '<button class="acc no'   + (e === "denegado" ? " sel" : "") + '" ' + attr + '="denegado">Denegar</button>' +
    "</div>";
}

/* ============================================================== VISTA: FOCO */

function foco(ps) {
  if (RVI >= ps.length) RVI = ps.length - 1;
  if (RVI < 0) RVI = 0;
  var p = ps[RVI], d = decDe(p.id), et = etapaDe(p);

  /* La barra estaba SIEMPRE al 0 %. `pct` salía de RVI/ps.length, pero la pieza
     decidida sale de la cola, así que RVI se queda en 0 y la cola encoge: medido
     el 25-ago, tras aprobar la barra pasaba de «1 de 91» a «1 de 90» con el
     relleno clavado en width:0%. Repasar 40 piezas seguidas sin ver moverse la
     barra ni una vez es peor que no tenerla.

     Se cuentan las decididas EN ESTA PASADA, una por una. El primer intento las
     dedujo restando (cola inicial − cola actual) y salió mal, medido en una carga
     limpia: la cola inicial se fija en el primer render, que ocurre ANTES de que
     lleguen las decisiones de npoint, así que los 13 votos que el equipo ya tenía
     guardados se contaban como trabajo de esta sesión y la barra abría en «7 de
     94». Contar lo que de verdad se decide aquí no depende del orden de carga. */
  var firma = _fc() + "|" + _fe();
  /* Los filtros de arriba los pinta y CABLEA index.html (`filtrosHTML`), así que
     `_setFiltro` de este módulo no siempre se entera; la firma sí se ve al pintar.
     Otra cola = otra pasada: el recuento se reinicia. */
  if (firma !== FIRMA0) { FIRMA0 = firma; HECHAS = {}; }
  var hechas = Object.keys(HECHAS).length;
  var total = ps.length + hechas;
  var puesto = Math.min(hechas + RVI + 1, total);
  var pct = total ? Math.round(((puesto - 1) / total) * 100) : 0;
  var r = _refs()[p.id];
  var clon = r
    ? '<div class="rv-clon">Clon de <b>' + esc_(p.cuenta || "") + "</b>" +
      (moldeDe(r) ? " · <b>" + esc_(moldeDe(r)) + "</b>" : "") + "</div>"
    : "";

  return '<article class="rv-foco">' +
    '<div class="rv-prog"><span class="rv-cifra">' + puesto + " de " + total + "</span>" +
      '<span class="rv-progbar"><i style="width:' + pct + '%"></i></span>' +
      '<span class="rv-quedan">quedan ' + ps.length + "</span></div>" +
    clon +
    mediaHTML(p, SLIDE[p.id] || 0, true) +
    '<h2 class="rv-tit">' + esc_(hookDe(p) || p.id) + "</h2>" +
    '<div class="rv-meta">' + pill(p) +
      '<span class="rv-tag">' + esc_(p.tipo || "") + "</span>" +
      '<span class="rv-tag">' + esc_(ETAPA_HUMANO[et] || et) + ' <i>' + esc_(et) + "</i></span>" +
      (p.dia ? '<span class="rv-tag">' + esc_(p.dia) + (p.hora ? " · " + esc_(p.hora) : "") + "</span>" : "") +
      ((p.archivos || []).length > 1 ? '<span class="rv-tag">' + p.archivos.length + " slides</span>" : "") +
      badgeF1(p) + badgeRef(p) +
    "</div>" +
    '<div class="rv-id">' + esc_(p.id) + "</div>" +
    comparaHTML(p) +
    "<details><summary>Qué se publica</summary><div class=\"rv-cont\">" +
      esc_(p.caption || "(sin caption)") + "</div></details>" +
    (p.porque ? "<details><summary>Por qué esta pieza</summary><div class=\"rv-cont\">" +
      esc_(p.porque) + "</div></details>" : "") +
    correccionHTML(p, d) +
    '<div class="rv-nav2"><button data-rpnav="-1">‹ Anterior</button>' +
      '<button data-rpnav="1">Saltar ›</button></div>' +
    accionesHTML(p, d, "data-rp") +
    '<div class="rv-tecla">1 aprobar · 2 corregir · 3 denegar · ← → moverte · O abrir la pieza entera<br>' +
      "<b>Aprobar</b> coloca la pieza en el calendario. No publica nada.</div>" +
    "</article>";
}

/* ======================================================== VISTA: CUADRÍCULA */

function cardHTML(p) {
  var d = decDe(p.id);
  return '<article class="rv-card" data-id="' + esc_(p.id) + '">' +
    mediaHTML(p, SLIDE[p.id] || 0, false) +
    '<div class="rv-cuerpo">' +
      '<div class="rv-meta">' + pill(p) +
        '<span class="rv-tag">' + esc_(p.tipo || "") + "</span>" +
        '<span class="rv-tag">' + esc_(etapaDe(p)) + "</span>" +
        (p.hora ? '<span class="rv-tag">' + esc_(p.hora) + "</span>" : "") +
        badgeF1(p) + badgeRef(p) +
      "</div>" +
      '<h3 class="rv-tit2">' + esc_(hookDe(p) || p.id) + "</h3>" +
      '<div class="rv-id">' + esc_(p.id) + "</div>" +
      (p.porque ? '<div class="rv-porque"><b>por qué existe</b>' + esc_(p.porque) + "</div>" : "") +
      '<div class="rv-cap">' + esc_(p.caption || "") + "</div>" +
      comparaHTML(p) +
      accionesHTML(p, d, "data-a") +
      correccionHTML(p, d) +
    "</div></article>";
}

function cuadricula(ps) {
  var out = "";
  SECCIONES.forEach(function (s) {
    var trozo = ps.filter(function (p) { return etapaDe(p) === s[0]; });
    if (!trozo.length) return;
    out += '<div class="rv-sec"><h2>' + esc_(s[1]) + ' <span>' + trozo.length + "</span></h2>" +
           '<button class="secacc" data-sec="' + esc_(s[0]) + '">Aprobar toda esta sección</button></div>' +
           '<div class="rv-grid">' + trozo.map(cardHTML).join("") + "</div>";
  });
  return out || '<div class="rv-vacio">Nada con estos filtros.</div>';
}

/* ================================================================ LAS VISTAS */

function vistaRepasar() {
  var ps = lista();
  var modo = _modo();
  var cab = '<div class="rv-cab">' +
      '<div class="vermodo">' +
        '<button data-modo="foco" class="'       + (modo === "foco"       ? "on" : "") + '">Foco</button>' +
        '<button data-modo="cuadricula" class="' + (modo === "cuadricula" ? "on" : "") + '">Cuadrícula</button>' +
      "</div>" + filtros() + "</div>";

  if (!ps.length) {
    return '<section class="rv rv-root">' + cab +
      '<div class="rv-fin"><div class="rv-fin-ico">✓</div><h2>Cola limpia.</h2>' +
      "<p>Ve a la Fábrica y clona el próximo referente.</p></div></section>";
  }
  return '<section class="rv rv-root">' + cab + (modo === "cuadricula" ? cuadricula(ps) : foco(ps)) + "</section>";
}

/* La pestaña «Ver todo» del §6.1: la misma cola, siempre en cuadrícula. */
function vistaRevisar() {
  var ps = lista();
  var cab = '<div class="rv-cab">' + filtros() + "</div>";
  if (!ps.length) {
    return '<section class="rv rv-root">' + cab +
      '<div class="rv-fin"><div class="rv-fin-ico">✓</div><h2>Cola limpia.</h2>' +
      "<p>Ve a la Fábrica y clona el próximo referente.</p></div></section>";
  }
  return '<section class="rv rv-root">' + cab + cuadricula(ps) + "</section>";
}

/* ================================================================= GUARDADO */

/* decisiones → BLOB (guardar). ordenes → BINS[YO] (guardarMio). §2.B, sin mezclar. */
async function decidir(p, estado, motivo, ejes) {
  motivo = String(motivo || "").trim();
  if (estado === "corregir" && !motivo) { avisar("Escribe qué hay que corregir", true); return false; }
  if (typeof guardar !== "function") { avisar("Panel en solo-lectura: no hay guardado", true); return false; }

  /* Candado por PIEZA, no por botón. Medido en el probe: deshabilitar el botón
     no basta — cualquier render() de fondo (el fetch de referentes.json, el
     guardado de otra persona) repinta un botón nuevo ya habilitado mientras el
     POST sigue en el aire, y el segundo toque decide OTRA VEZ la misma pieza:
     dos votos y, si es «corregir», DOS órdenes a la fábrica con el mismo id. */
  if (ENVUELO[p.id]) return false;
  ENVUELO[p.id] = true;
  try {
    var cuando = sello(), yo = _yo();
    await guardar(function (srv) {
      srv.decisiones = srv.decisiones || {};
      var ant = srv.decisiones[p.id] || {};
      var d = {estado: estado, motivo: motivo, por: yo, cuando: cuando};
      /* las notas por slide del visor (§5.8) son trabajo del equipo: no se pisan */
      if (ant.motivo_slides && Object.keys(ant.motivo_slides).length) d.motivo_slides = ant.motivo_slides;
      srv.decisiones[p.id] = d;
    });

    /* §6.6 + doctrina ley 1: verificar antes de dar por hecho. Si npoint está
       caído, guardar() ya avisó; aquí NO se avanza y la pieza sigue en la cola. */
    var puesta = decDe(p.id);
    if (!puesta || puesta.estado !== estado) {
      avisar("No se guardó el voto. El panel sigue en solo-lectura.", true);
      return false;
    }
    delete BORRADOR[p.id];
    delete EJES_SEL[p.id];
    HECHAS[p.id] = true;          /* cuenta para la barra: decidida en esta pasada */

    if (estado === "corregir") await ordenCorregir(p, motivo, ejes);
    return true;
  } finally {
    delete ENVUELO[p.id];
  }
}

/* §7.1 — el bucle de corrección: los ejes que fallan vuelven a la fábrica. */
async function ordenCorregir(p, motivo, ejes) {
  if (typeof guardarMio !== "function") return;
  try {
    await guardarMio(function (mio) {
      mio.ordenes = mio.ordenes || [];
      mio.ordenes.push({oid: oid(), tipo: "corregir", id: p.id, motivo: motivo,
                        ejes: ejes || [], por: _yo(), cuando: sello()});
    });
  } catch (e) {
    avisar("La corrección se guardó, pero no llegó a la cola de la fábrica", true);
  }
}

/* §6.5 — UNA sola escritura con las N decisiones. N llamadas seguidas a guardar()
   se pisarían: su cola `guardando`/`pendiente` descarta las intermedias. */
async function aprobarSeccion(ps) {
  if (typeof guardar !== "function") { avisar("Panel en solo-lectura: no hay guardado", true); return; }
  var cuando = sello(), yo = _yo();
  await guardar(function (srv) {
    srv.decisiones = srv.decisiones || {};
    ps.forEach(function (p) {
      srv.decisiones[p.id] = {estado: "aprobado", motivo: "", por: yo, cuando: cuando};
    });
  });
  ps.forEach(function (p) { if ((decDe(p.id) || {}).estado === "aprobado") HECHAS[p.id] = true; });
  var faltan = ps.filter(function (p) { var d = decDe(p.id); return !d || d.estado !== "aprobado"; });
  if (faltan.length) avisar("No se guardaron " + faltan.length + " de " + ps.length, true);
  else avisar("Aprobadas " + ps.length);
  pintar();
}

/* =================================================== VISOR (§5.8, de reserva) */
/* Si index.html trae `abreVisor(id)` se usa ese. Este es el mínimo para que el
   botón «Ver las N con música» no quede muerto: todas las slides con scroll-snap,
   vídeo CON sonido y una nota por slide → decisiones[id].motivo_slides[k]. */

function verPieza(id) {
  if (typeof abreVisor === "function") { abreVisor(id); return; }
  var p = piezaDe(id); if (!p) return;
  var arr = p.archivos || [], d = decDe(id) || {}, notas = d.motivo_slides || {};
  var box = document.querySelector("#rv-visor");
  if (!box) {
    box = document.createElement("div");
    box.id = "rv-visor";
    box.innerHTML = '<div class="rv-vtop"><span id="rv-vtit"></span><button id="rv-vcerrar">✕</button></div>' +
                    '<div class="rv-vpistas" id="rv-vpistas"></div>';
    document.body.appendChild(box);
    box.addEventListener("click", function (ev) {
      if (ev.target === box || ev.target.id === "rv-vcerrar") cerrarVisor();
    });
  }
  document.querySelector("#rv-vtit").textContent = p.id + " · " + arr.length + (arr.length === 1 ? " pieza" : " slides");
  document.querySelector("#rv-vpistas").innerHTML = arr.map(function (a, k) {
    var m = rutaDe(a);
    var vis = m.src
      ? (m.video ? '<video src="' + esc_(m.src) + '" poster="' + esc_(m.poster) + '" controls playsinline preload="metadata"></video>'
                 : '<img src="' + esc_(m.src) + '" alt="">')
      : '<div class="rv-nomedia">sin vista previa</div>';
    return '<div class="rv-vslide">' + vis + '<span class="rv-vn">' + (k + 1) + " / " + arr.length + "</span>" +
      '<textarea class="snota" data-snota="' + esc_(id) + '" data-k="' + k + '" ' +
      'placeholder="¿falla algo en ESTA slide? escríbelo">' + esc_(notas[k] || "") + "</textarea></div>";
  }).join("");
  box.classList.add("on");
  document.body.style.overflow = "hidden";
}

function cerrarVisor() {
  var box = document.querySelector("#rv-visor"); if (!box) return;
  box.querySelectorAll("video").forEach(function (v) { try { v.pause(); } catch (e) {} });
  box.classList.remove("on");
  box.querySelector("#rv-vpistas").innerHTML = "";
  document.body.style.overflow = "";
}

function guardarNotaSlide(id, k, txt) {
  if (typeof guardar !== "function") { avisar("Panel en solo-lectura", true); return; }
  guardar(function (srv) {
    srv.decisiones = srv.decisiones || {};
    var d = srv.decisiones[id] || {estado: "corregir", motivo: "", por: _yo(), cuando: ""};
    d.motivo_slides = d.motivo_slides || {};
    if (txt) d.motivo_slides[k] = txt; else delete d.motivo_slides[k];
    if (Object.keys(d.motivo_slides).length && d.estado !== "denegado") d.estado = "corregir";
    d.por = _yo(); d.cuando = sello();
    srv.decisiones[id] = d;
  });
}

/* ================================================ CABLEADO (delegación, §3.4) */
/* Un solo listener de click y uno de input sobre `document`, filtrados por
   `.rv-root`: sobreviven a cada innerHTML sin volver a colgarse, y no tocan
   nada de lo que pinten las otras pantallas. */

function piezaDelEvento(t) {
  var card = t.closest(".rv-card");
  if (card) return piezaDe(card.dataset.id);
  var ps = lista();
  return ps[RVI] || null;
}
function motivoDe(t, p) {
  var raiz = t.closest(".rv-card") || t.closest(".rv-foco");
  var ta = raiz && raiz.querySelector(".motivo");
  if (ta) return ta.value;
  return BORRADOR[p.id] || "";
}

function onClick(ev) {
  var t = ev.target;
  if (t.closest && t.closest("#rv-visor")) return;
  if (!t.closest || !t.closest(".rv-root")) return;
  var b = t.closest("button");
  if (!b) {
    var cap = t.closest(".rv-cap");
    if (cap) cap.classList.toggle("abierta");
    return;
  }

  /* modo foco / cuadrícula */
  if (b.hasAttribute("data-modo")) { _setModo(b.dataset.modo); RVI = 0; pintar(); return; }

  /* filtros de reserva (si index.html trae los suyos, este bloque no se usa) */
  if (b.hasAttribute("data-f")) { _setFiltro("cuenta", b.dataset.f); RVI = 0; pintar(); return; }
  if (b.hasAttribute("data-e")) { _setFiltro("etapa",  b.dataset.e); RVI = 0; pintar(); return; }

  /* galería */
  if (b.hasAttribute("data-n")) {
    var med = b.closest("[data-med]"); if (!med) return;
    var p0 = piezaDe(med.dataset.med); if (!p0) return;
    var n = (p0.archivos || []).length; if (!n) return;
    var i = ((+med.dataset.i) + (+b.dataset.n) + n) % n;
    SLIDE[p0.id] = i;
    med.outerHTML = mediaHTML(p0, i, med.dataset.grande === "1");
    return;
  }
  if (b.hasAttribute("data-ver")) {
    var med2 = b.closest("[data-med]"); if (med2) verPieza(med2.dataset.med);
    return;
  }

  /* navegación del foco */
  if (b.hasAttribute("data-rpnav")) { RVI += (+b.dataset.rpnav); pintar(); return; }

  /* Chips de corrección: rellenan el motivo, no deciden nada. Y AHORA SE
     DESMARCAN. Antes solo sumaban: un chip pulsado por error se quedaba pegado,
     y su eje viajaba igual en la orden que vuelve a la fábrica (§7.1) — o sea,
     se re-producía un eje que nadie quería tocar. Medido el 25-ago: dos clics
     en el mismo chip dejaban `chips_on` en 2 y el texto sin cambiar. */
  if (b.hasAttribute("data-fx")) {
    var f = FIX_RAPIDO[+b.dataset.fx]; if (!f) return;
    var pc = piezaDelEvento(b); if (!pc) return;
    var raiz = b.closest(".rv-card") || b.closest(".rv-foco");
    var ta = raiz && raiz.querySelector(".motivo");
    var sel = EJES_SEL[pc.id] = EJES_SEL[pc.id] || [];
    var txt = ta ? ta.value : (BORRADOR[pc.id] || "");
    var pos = sel.indexOf(f[2]);

    if (pos >= 0) {
      sel.splice(pos, 1);
      txt = quitarFrase(txt, f[1]);
      b.classList.remove("on");
    } else {
      sel.push(f[2]);
      if (txt.indexOf(f[1]) < 0) {
        /* se quita la puntuación final antes de unir: si no, un motivo escrito a
           mano que ya acaba en punto salía como «…a mano.. La letra es…» */
        var base = txt.trim().replace(/[.,;:\s]+$/, "");
        txt = base ? base + ". " + f[1] : f[1];
      }
      b.classList.add("on");
    }
    if (ta) { ta.value = txt; ta.focus(); }
    BORRADOR[pc.id] = txt;
    return;
  }

  /* aprobar toda una sección */
  if (b.hasAttribute("data-sec")) {
    var sec = b.dataset.sec;
    var trozo = lista().filter(function (x) { return etapaDe(x) === sec; });
    if (!trozo.length) return;
    if (!confirm("¿Aprobar las " + trozo.length + " piezas de esta sección? Míralas antes: en lote es donde se cuela algo sin ver.")) return;
    b.disabled = true;
    aprobarSeccion(trozo);
    return;
  }

  /* las 3 decisiones — foco (data-rp) y cuadrícula (data-a) */
  var estado = b.getAttribute("data-rp") || b.getAttribute("data-a");
  if (!estado) return;
  var p = piezaDelEvento(b); if (!p) return;
  var enFoco = !!b.getAttribute("data-rp");
  b.disabled = true;
  decidir(p, estado, motivoDe(b, p), (EJES_SEL[p.id] || []).slice()).then(function (ok) {
    b.disabled = false;
    /* En FOCO la pieza decidida sale de la cola, así que el mismo índice ya es la
       siguiente: solo hay que repintar. Es el «avanza solo» del §5.2, y solo
       ocurre si el voto se guardó de verdad. */
    if (ok && enFoco) { var n = lista().length; if (RVI >= n) RVI = Math.max(0, n - 1); }
    pintar();
  }, function (err) {
    /* sin este brazo, un fallo inesperado deja el botón muerto sin decir nada */
    b.disabled = false;
    avisar("No se pudo decidir: " + (err && err.message ? err.message : err), true);
    pintar();
  });
}

function onInput(ev) {
  var t = ev.target;
  if (t.matches && t.matches("textarea[data-motivo]")) { BORRADOR[t.dataset.motivo] = t.value; }
}
function onChange(ev) {
  var t = ev.target;
  if (t.matches && t.matches("textarea[data-snota]")) {
    guardarNotaSlide(t.dataset.snota, t.dataset.k, t.value.trim());
  }
}

function onTecla(ev) {
  if (_tab() !== "repasar" || _modo() !== "foco") return;
  /* Con el foco en un control, el teclado es suyo: Enter sobre un botón ya es un
     clic y Enter en un textarea es un salto de línea. Pero el filtro de antes,
     /(input|textarea|select|button|a)/i, NO estaba anclado: la alternativa suelta
     `a` casa con CUALQUIER etiqueta que lleve una «a» — SUMMARY, SPAN, ARTICLE,
     DETAILS, LABEL.
     Medido el 25-ago en el navegador: al pulsar «Comparar con el referente» el
     foco se queda en su <summary>, y desde ahí 1/2/3 y las flechas dejaban de
     responder. O sea: abrir la comparación —lo que esta pantalla existe para que
     hagas antes de decidir— apagaba el teclado, y sin decir nada.
     Ahora se separan los dos casos de verdad. */
  var tag = String(ev.target.tagName || "").toUpperCase();
  if (ev.target.isContentEditable) return;
  /* se comen TODA tecla: se está escribiendo dentro */
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  /* se activan con Enter/Espacio: esas dos teclas son suyas, las demás no */
  if ((tag === "BUTTON" || tag === "SUMMARY" || tag === "A") &&
      (ev.key === "Enter" || ev.key === " " || ev.key === "Spacebar")) return;
  var box = document.querySelector("#rv-visor");
  if (box && box.classList.contains("on")) { if (ev.key === "Escape") cerrarVisor(); return; }
  if (!document.querySelector(".rv-foco")) return;

  if (ev.key === "ArrowRight") { RVI++; pintar(); }
  else if (ev.key === "ArrowLeft") { RVI--; pintar(); }
  else if (ev.key === "1" || ev.key === "2" || ev.key === "3") {
    var m = {"1": "aprobado", "2": "corregir", "3": "denegado"};
    var b = document.querySelector('[data-rp="' + m[ev.key] + '"]');
    if (b) { ev.preventDefault(); b.click(); }
  } else if (ev.key === "o" || ev.key === "O" || ev.key === "Enter") {
    var ps = lista(), p = ps[RVI];
    if (p) { ev.preventDefault(); verPieza(p.id); }
  }
}

/* Idempotente: se puede llamar desde cablear() tras cada repintado sin duplicar
   listeners. Se llama sola al cargar por si index.html se olvida. */
function montar() {
  if (MONTADO) return;
  MONTADO = true;
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  document.addEventListener("keydown", onTecla);
}

/* ------------------------------------------------------------------- salida */

window.vistaRepasar    = vistaRepasar;
window.vistaRevisar    = vistaRevisar;
window.cablearRevisar  = montar;
window.VISTA_REVISAR   = {
  vistaRepasar: vistaRepasar, vistaRevisar: vistaRevisar, cablear: montar,
  verPieza: verPieza, cerrarVisor: cerrarVisor,
  FIX_RAPIDO: FIX_RAPIDO, SECCIONES: SECCIONES, ETAPA_HUMANO: ETAPA_HUMANO, EJES: EJES,
  indice: function () { return RVI; },
  irA: function (i) { RVI = i | 0; pintar(); }
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
else montar();

})();
