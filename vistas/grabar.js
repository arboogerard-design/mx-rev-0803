/* =============================================================================
   vistas/grabar.js  ·  PANTALLA «A GRABAR»  (BUILD_SPEC_PANEL_ELITE.md §5.6)
   =============================================================================

   QUÉ HACE
   --------
   Pinta los GUIONES QUE JAVI Y JORDI TIENEN QUE GRABAR. Cada ficha trae, en
   este orden y sin nada más que decidir:

     · ESCENA      dónde · plano · qué se ve · objeto en mano (atrezzo)
     · GUIÓN       los 5 bloques de color de Ramiro/Santi — ATENCIÓN · PROBLEMA
                   · SOLUCIÓN · PRUEBA SOCIAL · CTA — con el texto LITERAL, sus
                   segundos y la nota de dirección
     · MÚSICA · RÓTULO en pantalla · caption plegable

   Es la única pantalla del panel que no se lee sentado: se lee con el móvil en
   la mano y la cámara delante. De ahí las dos decisiones de forma:
     1. las fichas nacen PLEGADAS y la cabecera enseña ya lo que hace elegir
        (título, cuenta, etapa, duración y la frase literal del gancho). Con 21
        guiones abiertos de golpe, en un teléfono no se encuentra ninguno;
     2. «Copiar guion» deja el texto de los 5 bloques en el portapapeles de una
        vez, para pegarlo en el teleprompter o mandárselo por WhatsApp.

   LO QUE ESTA PANTALLA NO HACE
   ---------------------------
   NO ESCRIBE NADA. Ni en el BLOB, ni en los bins, ni en `ordenes`. Aquí no hay
   decisión que tomar: un guion no se aprueba ni se deniega, se GRABA. La
   pantalla que encola órdenes es «Guiones (cortes de podcast)» (§5.7) con su
   botón PRODUCIR — esa es otra, y ésta no la imita. Cero red, cero riesgo de
   corromper los votos del equipo.
   Tampoco inventa un solo campo: lo que no venga en los datos no se pinta
   (§1 ley 1 · doctrina ley 4). Ver «CERO INVENTAR» abajo.

   DE QUÉ DATOS VIVE  (§2 — el contrato es SAGRADO, los nombres son literales)
   --------------------------------------------------------------------------
   LECTURA (globals que este módulo NO declara; los pone index.html):

     GUIONES_GRABAR   array de guiones. ES LA ÚNICA FUENTE de esta pantalla.
                      Forma real, medida el 25-ago-2026 sobre los 21 guiones
                      publicados (21/21 traen los 11 campos, ninguno falta):
                        { id, cuenta:"JAVI"|"JORDI", etapa:"TOFU"|"MOFU"|"BOFU",
                          titulo, formula, duracion_s, musica, texto_en_pantalla,
                          caption,
                          escena:  { donde, plano, que_se_ve, atrezzo },
                          bloques: [ { bloque:"ATENCION"|"PROBLEMA"|"SOLUCION"|
                                                "PRUEBA SOCIAL"|"CTA",
                                       texto, segundos, nota_direccion } ] }
                      105 bloques en total = 5 por guion, los 5 nombres siempre.
     FCUENTA          "todo"|"JAVI"|"JORDI"  — filtro de cuenta COMPARTIDO con el
                      resto del panel: esta pantalla lo lee y lo escribe.
     FETAPA           "todo"|"TOFU"|"MOFU"|"BOFU" — ídem.

   FUNCIONES de index.html que se usan si están (y si no, hay reserva):
     filtrosHTML()   barra de filtros cuenta+etapa (§4.3)
     aviso(t, mal)   toast
     render()        repintado completo del panel

   ⚠ NINGUNA es obligatoria. Todo acceso a un global pasa por un puente con
     `typeof` (ver «puentes» más abajo): si index.html todavía no lo declara, la
     pantalla degrada — nunca revienta y nunca se lleva por delante el resto.

   ESCRITURA
   ---------
     Ninguna. Ni `guardar()` ni `guardarMio()`. Si algún día esta pantalla tiene
     que encolar algo, va al bin por `guardarMio()` y SOLO a `ordenes` (§2.B
     «reparto de escrituras»): meter una orden en el BLOB rompe el listener.

   ⛔ CÓMO LLEGA `GUIONES_GRABAR` A index.html — NO LO CAMBIES SIN LEER ESTO
   -------------------------------------------------------------------------
   Los guiones NO se cargan por `fetch`. Los incrusta
   `_SCRIPTS/guiones_grabar_publica.py` (verificado hoy en disco) buscando el
   hueco literal `/*__GUIONES_GRABAR__*\/` dentro del index.html del panel
   (la barra invertida es solo para no cerrar ESTE comentario: en el index.html va sin ella):

       const GUIONES_GRABAR=/*__GUIONES_GRABAR__*\/[ … ];

   El script reemplaza desde la marca hasta el primer `;`. **Si el index.html
   nuevo no lleva esa línea con esa marca exacta, el publicador muere con «el
   panel no tiene el hueco» y esta pantalla se queda vacía para siempre.** Su
   propia cabecera explica por qué va incrustado y no por `fetch`: el navegador
   bloquea las peticiones `file://` y desde el móvil el panel salía en blanco.
   Si algún día se emite como `data/guiones_grabar.json` (§2.A lo permite),
   index.html tiene que asignarlo a `window.GUIONES_GRABAR` ANTES del primer
   `render()`: esta vista es SÍNCRONA y no hace fetch a propósito.
   ⚠ Y entonces se quita el `const`. Medido hoy en el banco de pruebas: un
     `const GUIONES_GRABAR` de nivel superior crea un binding declarativo que
     **tapa** a `window.GUIONES_GRABAR`, así que la asignación se escribe, no
     falla y no la lee nadie. Una de las dos vías, nunca las dos.

   CERO INVENTAR — LO QUE SE PINTA SALE DEL DATO, Y SI NO HAY, NO SE PINTA
   ----------------------------------------------------------------------
   · Los minutos por cuenta son la suma de `duracion_s` REAL, no una estimación.
     Medido hoy: JAVI 11 guiones ≈ 13 min · JORDI 10 guiones ≈ 12 min.
   · `musica`, `texto_en_pantalla`, `formula`, `caption` y cada campo de
     `escena` se pintan solo si vienen. Un guion sin música no dice «sin
     música»: no enseña el bloque.
   · Si los segundos de los bloques NO suman la duración declarada, se dice con
     un aviso ámbar en la ficha. No se corrige el número por nuestra cuenta: se
     enseña la discrepancia (`estado-se-mide.md`). Hoy cuadran los 21 de 21.
   · La duración se enseña en NEUTRO. La orientación de 60-75 s de
     `estrategia-contenido-santi.md` S5 está marcada allí como ORIENTACIÓN y no
     como gate («ninguna pieza se bloquea por duración apoyándose en este
     dato»), así que aquí no se pinta en rojo lo que la propia regla dice que no
     bloquea. Dos guiones se van hoy a 76 s y 80 s: no es un error, es un dato.

   DOS AGUJEROS DEL PANEL VIEJO QUE AQUÍ NO SE REPITEN
   ---------------------------------------------------
   El `vistaGuionesGrabar()` de la versión anterior recorría a pelo
   `["JAVI","JORDI"]` y `["TOFU","MOFU","BOFU"]`. Consecuencia: **un guion con
   otra cuenta (Mentorium, una cuenta nueva) o sin etapa desaparecía de la
   pantalla sin decir nada** — el contador de la pestaña lo contaba y la lista
   no lo enseñaba. Aquí los grupos se construyen de lo que HAY en los datos:
   JAVI y JORDI primero (que es el orden del equipo), y detrás cualquier otra
   cuenta o etapa que aparezca, con su propio encabezado. Ningún guion se cae.

   CÓMO SE ENGANCHA A index.html  (§3.4 · §6.1)
   -------------------------------------------
     <link rel="stylesheet" href="vistas/grabar.css">
     <script src="vistas/grabar.js"></script>      ← script CLÁSICO, no módulo ES.
     const VISTAS = { …, grabar: vistaGuionesGrabar, … };
     app.innerHTML = (VISTAS[TAB] || vistaEspia)();

     Botón de pestaña (bien formado, §6.2):
       <button data-t="grabar">A grabar <span id="ngrab"></span></button>
     Y el contador, con la guarda `if(_e)`:
       {var _e=$("#ngrab"); if(_e)_e.textContent="("+guionesParaGrabar().length+")";}
     Ese cálculo sale de ESTE fichero a propósito, para que el número de la
     pestaña y la lista de la pantalla no puedan desincronizarse.

     index.html NO debe cablear a mano los `[data-gb-*]` ni declarar sus propias
     `vistaGuionesGrabar` / `fichaGuion` / `guionesParaGrabar`: van por
     delegación desde aquí y se dispararían dos veces.
     `cablear()` puede llamar a `cablearGrabar()` si quiere ser explícito, pero
     no hace falta: el módulo se engancha solo al cargarse (delegación en
     `document`, un único listener para toda la vida de la página).
   ============================================================================= */

(function () {
"use strict";

/* ------------------------------------------------------------- constantes */

/* Los 5 bloques y su orden son la estructura de Ramiro Cubría, que es de donde
   sale la estrategia de Santi. `n` y `d` son los rótulos LITERALES del panel
   que el equipo ya conoce; no se retocan por gusto.
   ⚠ El COLOR no está aquí: vive en grabar.css como familia de tokens
     `--bl-*` y se aplica por `data-bl="<slug>"`. Así no hay ni un color a pelo
     en el JS (§4.1) y el violeta de la máquina y el verde/ámbar/rojo de las
     decisiones siguen significando SOLO lo suyo. */
var COLOR_BLOQUE = {
  "ATENCION":      {slug: "atencion", n: "1 · ATENCIÓN",      d: "rompe el scroll"},
  "PROBLEMA":      {slug: "problema", n: "2 · PROBLEMA",      d: "baja al barro, comportamientos concretos"},
  "SOLUCION":      {slug: "solucion", n: "3 · SOLUCIÓN",      d: "un paradigma, NO el paso a paso"},
  "PRUEBA SOCIAL": {slug: "prueba",   n: "4 · PRUEBA SOCIAL", d: "resultado real y medible"},
  "CTA":           {slug: "cta",      n: "5 · CTA",           d: "recurso nombrado, sin prometer privado"}
};

/* El equipo no piensa en siglas, y la regla 11 («escribe como para un novato»)
   prohíbe la jerga. Mismo diccionario que el resto del panel. */
var ETAPA_HUMANO = {TOFU: "Para que te descubran", MOFU: "Para que te consideren",
                    BOFU: "Para que compren"};

var CUENTAS_ORDEN = ["JAVI", "JORDI"];
var ETAPAS_ORDEN  = ["TOFU", "MOFU", "BOFU"];

/* Las etiquetas de `escena`, en el orden en que se leen antes de rodar. */
var ESCENA_CAMPOS = [
  {k: "donde",     l: "Dónde"},
  {k: "plano",     l: "Plano"},
  {k: "que_se_ve", l: "Se ve"},
  {k: "atrezzo",   l: "Objeto en mano"}
];

/* Tolerancia al comparar los segundos de los bloques con `duracion_s`. Un
   segundo de diferencia es redondeo; tres es que alguien editó un bloque y no
   tocó el total. */
var TOLERANCIA_S = 2;

/* --------------------------------------------------------- estado privado */

var MONTADO = false;
var ABIERTAS = {};                 /* {idGuion: true} — sobrevive a los repintados */
var FILTRO = {cuenta: "todo", etapa: "todo"};   /* solo si index.html no trae los suyos */
var PROPIOS = false;               /* ¿pinté yo los filtros? → entonces los cableo yo */
var BUSCA   = "";                  /* buscador local — sobrevive a los repintados */

/* ------------------------------------------------- puentes con los globals */
/* `typeof` sobre un identificador que no existe no lanza; leerlo a pelo sí. */

function _guiones() {
  try {
    if (typeof GUIONES_GRABAR !== "undefined" && GUIONES_GRABAR && GUIONES_GRABAR.length) {
      return GUIONES_GRABAR;
    }
  } catch (e) {}
  return [];
}
function _fc() { try { if (typeof FCUENTA !== "undefined") return FCUENTA || "todo"; } catch (e) {} return FILTRO.cuenta; }
function _fe() { try { if (typeof FETAPA  !== "undefined") return FETAPA  || "todo"; } catch (e) {} return FILTRO.etapa; }

function _setCuenta(v) { FILTRO.cuenta = v; try { FCUENTA = v; } catch (e) {} }
function _setEtapa(v)  { FILTRO.etapa  = v; try { FETAPA  = v; } catch (e) {} }

function avisar(t, mal) {
  if (typeof aviso === "function") { aviso(t, mal); return; }
  if (mal) console.warn("[grabar]", t); else console.log("[grabar]", t);
}
function pintar() {
  if (typeof render === "function") { render(); return; }
  var app = document.querySelector("#app");
  if (app) app.innerHTML = vistaGuionesGrabar();
}

/* ------------------------------------------------------------- utilidades */

function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
  });
}

/* Un id de guion ("JAVI-TOFU-01") va a parar a un atributo `id` del DOM: se
   limpia por si algún día trae un carácter raro. */
function slug_(s) { return String(s == null ? "" : s).replace(/[^A-Za-z0-9_-]+/g, "_"); }

/* "ATENCIÓN" y "ATENCION" son el mismo bloque. Los datos de hoy vienen sin
   tildes, pero quien escriba un guion a mano las va a poner. */
function claveBloque(nombre) {
  var s = String(nombre == null ? "" : nombre).toUpperCase();
  if (s.normalize) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s.replace(/\s+/g, " ").trim();
}
function metaBloque(nombre) {
  var k = COLOR_BLOQUE[claveBloque(nombre)];
  /* Bloque desconocido: se enseña con su nombre tal cual y sin color. Nunca se
     tira: un guion con un bloque nuevo se sigue pudiendo grabar. */
  return k || {slug: "otro", n: String(nombre || "BLOQUE"), d: ""};
}

function segundosDeclarados(g) { return (+g.duracion_s) || 0; }
function segundosSumados(g) {
  return (g.bloques || []).reduce(function (a, b) { return a + ((+b.segundos) || 0); }, 0);
}
/* Para el total de un grupo manda lo declarado; si no lo hay, la suma. */
function segundosDe(g) { return segundosDeclarados(g) || segundosSumados(g); }
function minutos(seg) { return Math.round(seg / 60); }
/* Un grupo de un solo guion corto sumaba «0 min», que es falso. Por debajo
   del minuto se dicen los segundos, que es el dato que hay. */
function duracionHumana(seg) {
  seg = (+seg) || 0;
  if (!seg) return "";
  return seg < 60 ? (seg + " s") : (minutos(seg) + " min");
}

function cuentaDe(g) { return String(g.cuenta || "").toUpperCase(); }
function etapaDe(g)  { return String(g.etapa  || "").toUpperCase(); }

/* Los grupos salen de los DATOS, no de una lista fija: JAVI y JORDI delante
   (es el orden del equipo) y detrás lo que haya. Así ningún guion se cae de la
   pantalla en silencio — que es lo que hacía la versión anterior. */
function gruposDe(gs, campo) {
  var orden = campo === "cuenta" ? CUENTAS_ORDEN : ETAPAS_ORDEN;
  var lee = campo === "cuenta" ? cuentaDe : etapaDe;
  var vistos = {}, extra = [];
  gs.forEach(function (g) {
    var v = lee(g);
    if (vistos[v]) return;
    vistos[v] = true;
    if (orden.indexOf(v) < 0) extra.push(v);
  });
  var out = orden.filter(function (v) { return vistos[v]; });
  extra.sort();
  return out.concat(extra);
}

/* --------------------------------------------------------------- selección */

/* §5.6: el contador de la pestaña es `guionesParaGrabar().length`, o sea TODOS
   los guiones publicados — no los que deje ver el filtro. Si el filtro está en
   JAVI, el número de la pestaña no puede bajar: la faena de Jordi sigue ahí. */
function guionesParaGrabar() { return _guiones(); }

/* ------------------------------------------------------------- el buscador */
/* Por qué existe: son 21 guiones y cada uno trae escena + 5 bloques + música +
   rótulo + caption. Plegados no se ve el contenido, y abiertos son ~1.400 líneas
   de scroll. Sin buscador, encontrar «el de la calculadora» o «el de los 423 €»
   era bajar ficha a ficha — y el equipo hace esto desde el móvil. Se busca en
   TODO lo que un humano recuerda de un guion: el título, el rótulo, lo que se
   dice en los bloques y lo que se ve en la escena. */
function normBusca(s) {
  var q = String(s == null ? "" : s).toLowerCase().trim();
  if (q.normalize) q = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return q.replace(/\s+/g, " ");
}
var _hene = {};   /* {idGuion: texto buscable} — se calcula una vez por guion */
function textoBuscable(g) {
  var k = g.id || g.titulo || "";
  if (_hene[k] != null) return _hene[k];
  var e = g.escena || {};
  var partes = [g.id, g.titulo, g.cuenta, g.etapa, g.formula, g.musica,
                g.texto_en_pantalla, g.caption,
                e.donde, e.plano, e.que_se_ve, e.atrezzo];
  (g.bloques || []).forEach(function (b) {
    partes.push(b.bloque, b.texto, b.nota_direccion);
  });
  _hene[k] = normBusca(partes.join(" "));
  return _hene[k];
}
function coincide(g, q) { return !q || textoBuscable(g).indexOf(q) >= 0; }

function visibles() {
  var fc = _fc(), fe = _fe(), q = normBusca(BUSCA);
  return guionesParaGrabar().filter(function (g) {
    if (fc !== "todo" && cuentaDe(g) !== String(fc).toUpperCase()) return false;
    if (fe !== "todo" && etapaDe(g)  !== String(fe).toUpperCase()) return false;
    return coincide(g, q);
  });
}

/* --------------------------------------------------------- componentes UI */

function filtros() {
  if (typeof filtrosHTML === "function") {
    try { PROPIOS = false; return filtrosHTML(); } catch (e) {}
  }
  PROPIOS = true;
  var fc = _fc(), fe = _fe();
  var h = '<div class="gb-filtros">';
  h += '<div class="gb-seg" role="group" aria-label="Cuenta">' +
       ["todo", "JAVI", "JORDI"].map(function (c) {
         return '<button type="button" data-gb-f="' + c + '" class="' + (fc === c ? "on" : "") +
                '"' + (fc === c ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
                (c === "todo" ? "Las dos" : c === "JAVI" ? "Javi" : "Jordi") + "</button>";
       }).join("") + "</div>";
  h += '<div class="gb-seg" role="group" aria-label="Etapa">' +
       ["todo", "TOFU", "MOFU", "BOFU"].map(function (e) {
         return '<button type="button" data-gb-e="' + e + '" class="' + (fe === e ? "on" : "") +
                '"' + (fe === e ? ' aria-pressed="true"' : ' aria-pressed="false"') + '>' +
                (e === "todo" ? "Todas" : e) + "</button>";
       }).join("") + "</div>";
  return h + "</div>";
}

/* El ✕ y el «N de 21» se emiten SIEMPRE y se pliegan con `hidden`: el buscador
   filtra sobre el DOM ya pintado (si repintara, el input perdería el foco en
   cada tecla), así que ningún repintado va a crearlos mientras escribes. Es el
   mismo fallo que se midió en `guiones.js` el 25-ago; aquí no se repite. */
function buscadorHTML(visto, total) {
  var hay = !!normBusca(BUSCA);
  return '<div class="gb-busca-fila">' +
    '<div class="gb-busca">' +
      '<input type="search" class="gb-input" data-gb-busca autocomplete="off" spellcheck="false"' +
        ' placeholder="Buscar: «calculadora», «423», un rótulo, una frase del guion…"' +
        ' aria-label="Buscar entre los guiones a grabar" value="' + esc_(BUSCA) + '">' +
      '<button type="button" class="gb-x" data-gb-x aria-label="Limpiar la búsqueda"' +
        (hay ? "" : " hidden") + ">&times;</button>" +
    "</div>" +
    '<span class="gb-busca-n"' + (hay ? "" : " hidden") + ">" + visto + " de " + total + "</span>" +
  "</div>";
}

function pillCuenta(c) {
  var cls = c === "JAVI" ? "javi" : c === "JORDI" ? "jordi" : "";
  return '<span class="gb-pill ' + cls + '">' + esc_(c || "sin cuenta") + "</span>";
}

/* La barra de ritmo: cada bloque ocupa el ancho de SUS segundos. De un vistazo
   se ve si el guion es todo problema y el CTA dura un suspiro. Ancho calculado
   sobre datos reales; si un guion no declara segundos, no hay barra. */
function barraRitmo(g) {
  var total = segundosSumados(g);
  if (!total) return "";
  var h = '<div class="gb-ritmo" aria-hidden="true">';
  (g.bloques || []).forEach(function (b) {
    var s = (+b.segundos) || 0;
    if (!s) return;
    var k = metaBloque(b.bloque);
    h += '<i data-bl="' + k.slug + '" style="width:' + ((s / total) * 100).toFixed(2) + '%"' +
         ' title="' + esc_(k.n + " — " + s + " s") + '"></i>';
  });
  return h + "</div>";
}

/* El aviso de descuadre. No corrige nada: enseña los dos números y deja que lo
   arregle quien escribió el guion. */
function avisoSegundos(g) {
  var dec = segundosDeclarados(g), sum = segundosSumados(g);
  if (!dec || !sum) return "";
  if (Math.abs(dec - sum) <= TOLERANCIA_S) return "";
  return '<p class="gb-descuadre">Los bloques suman <b>' + sum + ' s</b> y la ficha declara <b>' +
         dec + ' s</b>. Uno de los dos está mal: se arregla en el guion, no aquí.</p>';
}

function bloqueHTML(b) {
  var k = metaBloque(b.bloque);
  var s = (+b.segundos) || 0;
  var h = '<div class="gb-bloque" data-bl="' + k.slug + '">' +
          '<div class="gb-bhead"><span class="gb-bname">' + esc_(k.n) + "</span>" +
          (k.d ? '<span class="gb-bdesc">· ' + esc_(k.d) + "</span>" : "") +
          (s ? '<span class="gb-bseg">' + s + " s</span>" : "") +
          "</div>" +
          '<p class="gb-btexto">' + esc_(b.texto || "") + "</p>";
  if (b.nota_direccion) h += '<p class="gb-bnota">' + esc_(b.nota_direccion) + "</p>";
  return h + "</div>";
}

function escenaHTML(g) {
  var e = g.escena || {};
  var filas = ESCENA_CAMPOS.filter(function (c) { return e[c.k]; });
  if (!filas.length) return "";
  return '<section class="gb-caja gb-escena">' +
         '<h4 class="gb-cabecilla">Escena — qué se graba</h4>' +
         '<dl class="gb-dl">' + filas.map(function (c) {
           return "<dt>" + esc_(c.l) + "</dt><dd>" + esc_(e[c.k]) + "</dd>";
         }).join("") + "</dl></section>";
}

/* §5.6 · ficha completa de un guion. */
function fichaGuion(g) {
  var id = g.id || g.titulo || "";
  var sid = slug_(id);
  var c = cuentaDe(g), et = etapaDe(g);
  var abierta = !!ABIERTAS[id];
  var seg = segundosDe(g);
  var gancho = ((g.bloques || [])[0] || {}).texto || "";

  /* `data-gb-id` lo usa el buscador para saber QUÉ guion es cada tarjeta sin
     tener que leerle el HTML. Es el mismo id que el toggle. */
  var h = '<article class="gb-ficha' + (abierta ? " abierta" : "") + '" data-cuenta="' + esc_(c) +
          '" data-gb-id="' + esc_(id) + '">';

  /* --- cabecera: es un botón entero, para que en el móvil se abra con el
         pulgar sin apuntar a un icono de 12 px --- */
  h += '<button type="button" class="gb-cab" data-gb-toggle="' + esc_(id) + '"' +
       ' aria-expanded="' + (abierta ? "true" : "false") + '" aria-controls="gb-c-' + sid + '">' +
       '<span class="gb-cab-l1">' +
         '<span class="gb-titulo">' + esc_(g.titulo || id) + "</span>" +
         pillCuenta(c) +
         (et ? '<span class="gb-chip" title="' + esc_(ETAPA_HUMANO[et] || et) + '">' + esc_(et) + "</span>" : "") +
         (seg ? '<span class="gb-chip seg">' + seg + " s</span>" : "") +
       "</span>";
  if (gancho) h += '<span class="gb-gancho">' + esc_(gancho) + "</span>";
  h += barraRitmo(g);
  h += '<span class="gb-flecha" aria-hidden="true"></span>';
  h += "</button>";

  /* --- cuerpo: siempre se emite y se pliega con `hidden`. Abrir una ficha es
         entonces un atributo, no un repintado: no se pierde el scroll --- */
  h += '<div class="gb-cuerpo" id="gb-c-' + sid + '"' + (abierta ? "" : " hidden") + ">";

  if (et && ETAPA_HUMANO[et]) {
    h += '<p class="gb-para">' + esc_(ETAPA_HUMANO[et]) + "</p>";
  }
  if (g.formula) h += '<p class="gb-formula"><b>Fórmula:</b> ' + esc_(g.formula) + "</p>";

  h += avisoSegundos(g);
  h += escenaHTML(g);

  var bloques = g.bloques || [];
  if (bloques.length) {
    h += '<h4 class="gb-cabecilla gb-cabecilla-sola">Guión — lo que dice, en orden</h4>';
    h += bloques.map(bloqueHTML).join("");
  }

  /* --- música y rótulo: dos cajas al mismo nivel, cada una solo si hay dato --- */
  var pie = "";
  if (g.musica) {
    pie += '<section class="gb-caja"><h4 class="gb-cabecilla">Música</h4>' +
           '<p class="gb-plano">' + esc_(g.musica) + "</p></section>";
  }
  if (g.texto_en_pantalla) {
    pie += '<section class="gb-caja"><h4 class="gb-cabecilla">Rótulo en pantalla</h4>' +
           '<p class="gb-rotulo">' + esc_(g.texto_en_pantalla) + "</p></section>";
  }
  if (pie) h += '<div class="gb-duo">' + pie + "</div>";

  if (g.caption) {
    h += '<details class="gb-caption"><summary>Caption</summary>' +
         '<textarea class="gb-ta" id="gb-cap-' + sid + '" readonly rows="6">' +
         esc_(g.caption) + "</textarea>" +
         '<button type="button" class="gb-btn" data-gb-copiacap="' + esc_(id) + '">Copiar caption</button>' +
         "</details>";
  }

  /* Barra de acción abajo del todo = zona del pulgar (§3.6). */
  h += '<div class="gb-acciones">' +
       '<button type="button" class="gb-btn ancho" data-gb-copia="' + esc_(id) + '">Copiar guion</button>' +
       "</div>";

  return h + "</div></article>";
}

/* --------------------------------------------------------------- la vista */

function vistaGuionesGrabar() {
  var todos = guionesParaGrabar();

  var h = '<div class="gb">';
  h += '<header class="gb-cabeza">' +
       '<h2 class="gb-h2">A grabar</h2>' +
       '<p class="gb-sub">Lo que <b>Javi y Jordi</b> tienen que ponerse delante de la cámara y ' +
       'grabar. Cada ficha trae la <b>escena</b>, el <b>guión</b> literal por bloques con sus ' +
       'segundos y la <b>música</b>. Se lee y se graba, sin preguntar nada.</p>';

  if (!todos.length) {
    /* Vacío honesto: se dice por qué está vacío y el comando exacto que lo
       llena, con la ruta absoluta (doctrina ley 3: Gerard copia y pega). */
    h += "</header>" +
         '<div class="gb-vacio">' +
         "<p><b>Todavía no hay guiones publicados.</b></p>" +
         "<p>Se publican desde el PC, leyendo " +
         "<code>OBSIDIAN_2CEREBRO/_contexto/GUIONES_GRABAR.json</code>:</p>" +
         '<pre class="gb-pre">cd "C:\\Users\\PC\\Desktop\\MENTORIUM\\MENTORIUM_SISTEMA_UNIFICADO"\n' +
         "python _SCRIPTS/guiones_grabar_publica.py</pre>" +
         "</div></div>";
    return h;
  }

  var vs = visibles();
  var segTot = vs.reduce(function (a, g) { return a + segundosDe(g); }, 0);

  h += '<p class="gb-total"><b>' + vs.length + "</b> guion" + (vs.length === 1 ? "" : "es") +
       (segTot ? " · <b>" + duracionHumana(segTot) + "</b> de grabación" : "") +
       (vs.length !== todos.length ? ' <span class="gb-de">de ' + todos.length + " publicados</span>" : "") +
       "</p>";

  /* Abrir/cerrar todo: con 21 fichas, plegar a mano una a una es peor que el
     problema que resuelve el plegado. */
  var abiertasVisibles = vs.filter(function (g) { return ABIERTAS[g.id || g.titulo]; }).length;
  var todasAbiertas = vs.length > 0 && abiertasVisibles === vs.length;
  h += '<div class="gb-acc-todo">' +
       '<button type="button" class="gb-btn" data-gb-todo="' + (todasAbiertas ? "cerrar" : "abrir") + '">' +
       (todasAbiertas ? "Cerrar todas" : "Abrir todas") + "</button></div>";

  h += "</header>";
  h += filtros();
  h += buscadorHTML(vs.length, todos.length);

  if (!vs.length) {
    h += '<div class="gb-vacio">' +
         "<p><b>Ningún guion con este filtro.</b></p>" +
         "<p>Hay " + todos.length + " publicados en total.</p>" +
         '<button type="button" class="gb-btn" data-gb-limpiar="1">Ver todos</button>' +
         "</div></div>";
    return h;
  }

  /* El mismo «no hay nada», pero PLEGADO. Al teclear no hay repintado que pueda
     añadirlo, así que tiene que estar ya en el DOM: dejar la pantalla en blanco
     sin una palabra se lee como «el panel está roto». */
  h += '<div class="gb-vacio gb-nada" hidden>' +
       "<p><b>Ningún guion dice eso.</b></p>" +
       '<button type="button" class="gb-btn" data-gb-x>Ver los ' + todos.length + " guiones</button>" +
       "</div>";

  gruposDe(vs, "cuenta").forEach(function (c) {
    var mios = vs.filter(function (g) { return cuentaDe(g) === c; });
    if (!mios.length) return;
    var seg = mios.reduce(function (a, g) { return a + segundosDe(g); }, 0);

    h += '<h3 class="gb-h3" data-cuenta="' + esc_(c) + '">' + esc_(c || "sin cuenta") +
         '<span class="gb-h3-sub"> · ' + mios.length + " guion" + (mios.length === 1 ? "" : "es") +
         (seg ? " · " + duracionHumana(seg) + " de grabación" : "") + "</span></h3>";

    gruposDe(mios, "etapa").forEach(function (et) {
      var ge = mios.filter(function (g) { return etapaDe(g) === et; });
      if (!ge.length) return;
      var seg2 = ge.reduce(function (a, g) { return a + segundosDe(g); }, 0);
      h += '<h4 class="gb-etapa">' + esc_(et || "sin etapa") +
           (ETAPA_HUMANO[et] ? '<span class="gb-etapa-hum"> · ' + esc_(ETAPA_HUMANO[et]) + "</span>" : "") +
           '<span class="gb-etapa-n">' + ge.length + (seg2 ? " · " + duracionHumana(seg2) : "") + "</span></h4>";
      ge.forEach(function (g) { h += fichaGuion(g); });
    });
  });

  return h + "</div>";
}

/* ------------------------------------------------------------- portapapeles */

/* El texto que se copia es EL GUION, tal cual se graba: escena, los 5 bloques
   con sus segundos y sus notas de dirección, música y rótulo. Nada de ids ni
   de siglas internas — esto acaba en un teleprompter o en un WhatsApp. */
function textoDeGuion(g) {
  var L = [];
  var cab = [g.titulo || g.id, cuentaDe(g), etapaDe(g)].filter(Boolean).join(" · ");
  var seg = segundosDe(g);
  L.push(cab + (seg ? " · " + seg + " s" : ""));
  L.push("");

  var e = g.escena || {};
  var filas = ESCENA_CAMPOS.filter(function (c) { return e[c.k]; });
  if (filas.length) {
    L.push("ESCENA");
    filas.forEach(function (c) { L.push(c.l + ": " + e[c.k]); });
    L.push("");
  }

  (g.bloques || []).forEach(function (b) {
    var k = metaBloque(b.bloque);
    var s = (+b.segundos) || 0;
    L.push(k.n + (s ? " (" + s + " s)" : ""));
    L.push(b.texto || "");
    if (b.nota_direccion) L.push("(dirección: " + b.nota_direccion + ")");
    L.push("");
  });

  if (g.musica) L.push("MÚSICA: " + g.musica);
  if (g.texto_en_pantalla) L.push("RÓTULO: " + g.texto_en_pantalla);
  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function marcar(ta) {
  try { ta.removeAttribute("hidden"); ta.focus(); ta.select();
        ta.setSelectionRange(0, (ta.value || "").length); } catch (e) {}
}

/* Copiar puede fallar por el navegador, no por nosotros: la API moderna pide
   contexto seguro Y documento con foco, y `execCommand` pide activación del
   usuario. Por eso el fallo no es un callejón sin salida: se deja el texto
   seleccionado y se dice cómo terminar a mano. Mismo camino que «Hoy». */
function copiarTexto(txt, btn, queEs) {
  var orig = btn.getAttribute("data-gb-txt") || btn.textContent;
  btn.setAttribute("data-gb-txt", orig);

  if (!String(txt || "").trim()) {
    btn.textContent = "Sin texto";
    clearTimeout(btn._t);
    btn._t = setTimeout(function () { btn.textContent = orig; }, 2200);
    avisar("Aquí no hay " + queEs + " que copiar", true);
    return;
  }

  var fin = function (ok, ta) {
    if (!ok && ta) marcar(ta);
    btn.textContent = ok ? "Copiado ✓" : "Marcado · Ctrl+C";
    btn.classList.toggle("ok", !!ok);
    clearTimeout(btn._t);
    btn._t = setTimeout(function () {
      btn.textContent = orig; btn.classList.remove("ok");
    }, 2200);
    avisar(ok ? (queEs.charAt(0).toUpperCase() + queEs.slice(1) + " copiado")
              : "No se pudo copiar solo: está marcado, pulsa Ctrl+C", !ok);
  };

  var reserva = function () {
    /* `execCommand` necesita un nodo real y visible en el documento. */
    var ta = document.createElement("textarea");
    ta.className = "gb-ta gb-ta-tmp";
    ta.value = txt;
    ta.setAttribute("readonly", "readonly");
    (btn.parentNode || document.body).appendChild(ta);
    ta.focus(); ta.select();
    var ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    if (ok) { ta.parentNode.removeChild(ta); fin(true, null); }
    else { fin(false, ta); setTimeout(function () {
      if (ta.parentNode) ta.parentNode.removeChild(ta); }, 12000); }
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function () { fin(true, null); }, reserva);
  } else {
    reserva();
  }
}

function porId(id) {
  var gs = guionesParaGrabar();
  for (var i = 0; i < gs.length; i++) {
    if ((gs[i].id || gs[i].titulo) === id) return gs[i];
  }
  return null;
}

/* ------------------------------------------------------------- delegación */
/* Un solo listener en `document` para toda la vida de la página (§3.4): así
   `cablear()` puede repintar `#app` las veces que quiera sin acumular
   handlers ni dejar ninguno colgando de un nodo que ya no existe. */

function onClick(ev) {
  var b = ev.target && ev.target.closest ? ev.target.closest("[data-gb-toggle],[data-gb-todo],[data-gb-copia],[data-gb-copiacap],[data-gb-f],[data-gb-e],[data-gb-limpiar],[data-gb-x]") : null;
  if (!b) return;

  /* Limpiar la búsqueda: se vacía el input y se vuelve a filtrar en el DOM. NO
     se repinta — repintar aquí cerraría las fichas que tuvieras abiertas. */
  if (b.hasAttribute("data-gb-x")) {
    BUSCA = "";
    var inp = document.querySelector("[data-gb-busca]");
    if (inp) { inp.value = ""; inp.focus(); }
    filtraDOM();
    return;
  }

  /* Plegar / desplegar una ficha: se toca el DOM, no se repinta el panel. */
  if (b.hasAttribute("data-gb-toggle")) {
    var id = b.getAttribute("data-gb-toggle");
    var art = b.closest(".gb-ficha");
    var cuerpo = art ? art.querySelector(".gb-cuerpo") : null;
    if (!cuerpo) return;
    var abrir = cuerpo.hasAttribute("hidden");
    if (abrir) { cuerpo.removeAttribute("hidden"); ABIERTAS[id] = true; }
    else { cuerpo.setAttribute("hidden", "hidden"); delete ABIERTAS[id]; }
    art.classList.toggle("abierta", abrir);
    b.setAttribute("aria-expanded", abrir ? "true" : "false");
    sincronizaBotonTodo();
    return;
  }

  if (b.hasAttribute("data-gb-todo")) {
    var abrirTodo = b.getAttribute("data-gb-todo") === "abrir";
    visibles().forEach(function (g) {
      var k = g.id || g.titulo;
      if (abrirTodo) ABIERTAS[k] = true; else delete ABIERTAS[k];
    });
    document.querySelectorAll(".gb .gb-ficha").forEach(function (art) {
      var cab = art.querySelector(".gb-cab"), cuerpo = art.querySelector(".gb-cuerpo");
      if (!cab || !cuerpo) return;
      if (abrirTodo) cuerpo.removeAttribute("hidden"); else cuerpo.setAttribute("hidden", "hidden");
      art.classList.toggle("abierta", abrirTodo);
      cab.setAttribute("aria-expanded", abrirTodo ? "true" : "false");
    });
    b.setAttribute("data-gb-todo", abrirTodo ? "cerrar" : "abrir");
    b.textContent = abrirTodo ? "Cerrar todas" : "Abrir todas";
    return;
  }

  if (b.hasAttribute("data-gb-copia")) {
    var g1 = porId(b.getAttribute("data-gb-copia"));
    copiarTexto(g1 ? textoDeGuion(g1) : "", b, "guion");
    return;
  }

  if (b.hasAttribute("data-gb-copiacap")) {
    var g2 = porId(b.getAttribute("data-gb-copiacap"));
    copiarTexto(g2 ? (g2.caption || "") : "", b, "caption");
    return;
  }

  if (b.hasAttribute("data-gb-limpiar")) {
    _setCuenta("todo"); _setEtapa("todo"); pintar();
    return;
  }

  /* Filtros: SOLO los de reserva. Si los pintó `filtrosHTML()` de index.html,
     los cablea index.html; cablearlos aquí también repintaría dos veces. */
  if (PROPIOS && b.hasAttribute("data-gb-f")) { _setCuenta(b.getAttribute("data-gb-f")); pintar(); return; }
  if (PROPIOS && b.hasAttribute("data-gb-e")) { _setEtapa(b.getAttribute("data-gb-e")); pintar(); return; }
}

/* El botón «Abrir/Cerrar todas» tiene que decir la verdad después de plegar una
   ficha a mano; si no, dice «cerrar» cuando ya no quedan abiertas. */
function sincronizaBotonTodo() {
  var b = document.querySelector(".gb [data-gb-todo]");
  if (!b) return;
  var vs = visibles();
  var n = vs.filter(function (g) { return ABIERTAS[g.id || g.titulo]; }).length;
  var todas = vs.length > 0 && n === vs.length;
  b.setAttribute("data-gb-todo", todas ? "cerrar" : "abrir");
  b.textContent = todas ? "Cerrar todas" : "Abrir todas";
}

/* --------------------------------------------------------- buscar al teclear */
/* Se enseña/esconde sobre el DOM ya pintado, nunca se repinta: repintar en cada
   tecla le quita el foco al input y escribir se vuelve imposible. Los
   encabezados que se quedan sin fichas se pliegan con su ficha, o queda un
   «JAVI · 11 guiones» encabezando el vacío. */
function filtraDOM() {
  var raiz = document.querySelector(".gb");
  if (!raiz) return;
  var q = normBusca(BUSCA);
  var porId = {}, gs = guionesParaGrabar();
  gs.forEach(function (g) { porId[g.id || g.titulo] = g; });

  var vistos = 0;
  raiz.querySelectorAll(".gb-ficha").forEach(function (art) {
    var g = porId[art.getAttribute("data-gb-id")];
    var ok = !!g && coincide(g, q);
    art.hidden = !ok;
    if (ok) vistos++;
  });

  /* Un encabezado manda sobre las fichas que van DETRÁS hasta el siguiente
     encabezado del mismo nivel o superior: no hay contenedor por sección. */
  function repasa(sel, corta) {
    raiz.querySelectorAll(sel).forEach(function (hd) {
      var n = 0, s = hd.nextElementSibling;
      while (s && !corta(s)) {
        if (s.classList.contains("gb-ficha") && !s.hidden) n++;
        s = s.nextElementSibling;
      }
      hd.hidden = n === 0;
    });
  }
  repasa(".gb-etapa", function (s) { return s.classList.contains("gb-etapa") || s.classList.contains("gb-h3"); });
  repasa(".gb-h3",    function (s) { return s.classList.contains("gb-h3"); });

  /* Los recuentos de cada encabezado («JAVI · 11 guiones · 13 min») se calculan
     al pintar y al filtrar quedarían mintiendo. Se ESCONDEN mientras se busca en
     vez de reescribirlos: el número que manda entonces es el «N de 21» de arriba,
     que sí está medido sobre lo que se ve. Cero cifra falsa en pantalla (ley 4). */
  raiz.classList.toggle("gb-buscando", !!q);

  var n = raiz.querySelector(".gb-busca-n");
  if (n) { n.textContent = vistos + " de " + gs.length; n.hidden = !q; }
  var x = raiz.querySelector("[data-gb-x]");
  if (x) x.hidden = !q;
  var nada = raiz.querySelector(".gb-nada");
  if (nada) nada.hidden = vistos > 0;
}

function onInput(ev) {
  var i = ev.target;
  if (!i || !i.hasAttribute || !i.hasAttribute("data-gb-busca")) return;
  BUSCA = i.value;
  filtraDOM();
}

function montar() {
  if (MONTADO) return;
  MONTADO = true;
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
}

/* ---------------------------------------------------------------- salida */

window.vistaGuionesGrabar = vistaGuionesGrabar;
window.cablearGrabar      = montar;
/* `render()` lo usa para el contador `#ngrab` (§5.6). Se exporta desde aquí
   para que el número de la pestaña y la lista sean el MISMO cálculo. */
window.guionesParaGrabar  = guionesParaGrabar;
window.fichaGuion         = fichaGuion;
window.VISTA_GRABAR = {
  vistaGuionesGrabar: vistaGuionesGrabar, cablear: montar,
  guionesParaGrabar: guionesParaGrabar, visibles: visibles,
  fichaGuion: fichaGuion, textoDeGuion: textoDeGuion,
  COLOR_BLOQUE: COLOR_BLOQUE, ETAPA_HUMANO: ETAPA_HUMANO
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
else montar();

})();
