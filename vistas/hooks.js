/* =============================================================================
   vistas/hooks.js  ·  PANTALLA «HOOKS»  (BUILD_SPEC_PANEL_ELITE.md §5.5)
   =============================================================================

   QUÉ HACE
   --------
   Pinta el BANCO DE GANCHOS: la lista de hooks con buscador, chips de filtro y
   un botón «Copiar» por fila, más las tres decisiones del equipo sobre cada
   gancho — Aprobar · Cambiar texto · Denegar.

   Existe por una regla del equipo con fecha y coste: Jordi paró la producción
   entera de reels el 14-ago («No subas mas reels hasta revisar bien los hooks…
   Que las views se van al suelo»). El gancho se decide ANTES de gastar una
   edición, no después. Y lo que se apruebe aquí es EXACTAMENTE el texto que se
   produce: por eso «Cambiar texto» guarda el texto literal, no una sugerencia.

   LO QUE ESTA PANTALLA NO HACE
   ---------------------------
   No publica nada, no encola órdenes en el bin y no toca piezas. Aprobar un
   gancho es una decisión sobre una FRASE (§1 ley 3 · doctrina ley 8). Tampoco
   inventa un solo dato: lo que no viene del almacén no se pinta (ley 4) — ver
   «CERO INVENTAR» abajo, que es la parte de este fichero que hay que leer antes
   de tocarlo.

   DE QUÉ DATOS VIVE  (§2 — el contrato es SAGRADO, los nombres son literales)
   --------------------------------------------------------------------------
   LECTURA (globals que este módulo NO declara; los pone index.html):

     E          estado vivo fusionado por leerBlob():
                { decisiones:{}, referentes:[], calendario:{}, f1:{},
                  hooks:[…], notas:{} }
                ⚠ `E.hooks` es un ARRAY en el BLOB y un OBJETO `{[id]:{…}}` en
                  los bins de persona (§2.B, incoherencia deliberada). Este
                  fichero NUNCA asume una forma: todo pasa por
                  hooksNormalizados() (§6.4).
     HOOKS_INI  semilla del banco, array. Solo se usa si `E.hooks` viene vacío.
     MIO        {decisiones,hooks,ordenes,publicados} — el bin de YO. De aquí
                solo se LEE `hooks`, para no enseñar en blanco un voto propio
                que el BLOB todavía no refleja.
     DATOS      {generado, semana, dias[], piezas[], huecos[]} ← piezas.json.
                Se usa SOLO para medir «usado en N piezas» (ver abajo).
     YO         "Gerard"|"Javi"|"Jordi"|"Santi"
     FCUENTA    "todo"|"JAVI"|"JORDI" — filtro de cuenta COMPARTIDO con el resto
                del panel: esta pantalla lo lee y lo escribe.

   FUNCIONES de index.html que se usan si están (y si no, hay reserva):
     guardar(aplicar)  ← escritura (ver abajo)   ·   aviso(t,mal)  toast
     render()          repintado completo del panel

   ESCRITURA  (§2.B «reparto de escrituras», respetado EXACTO)
   ----------------------------------------------------------
     SOLO `guardar()`, o sea SOLO el BLOB. El estado de un hook (estado, por,
     cuando, y el texto si se cambió) va al array `hooks` del BLOB — **nunca al
     bin** (§6.4, última línea). El bin es para `ordenes`, y esta pantalla no
     encola ninguna.

     El apply es el mismo que ya corre hoy en producción, letra por letra:

       guardar(srv => {
         srv.hooks = (srv.hooks && srv.hooks.length) ? srv.hooks : <copia de HOOKS_INI>;
         var k = srv.hooks.find(x => x.id === hid); if (!k) return;
         if (nuevo && nuevo !== k.texto) { k.texto = nuevo; k.editado = sello + " por " + YO; }
         k.estado = a; k.por = YO; k.cuando = sello;
       });

     `guardar()` es server-first con reintento ×3 y repinta él solo al terminar
     (§3.3): aquí NO se encadena `.then(render)` — encadenarlo repinta dos veces.

     ⚠ EL SELLO VA EN UTC (`toISOString().slice(0,16).replace("T"," ")`), igual
       que todo lo demás del contrato. La fusión de §2.B decide quién gana
       comparando `cuando` como STRING; poner aquí hora local y UTC en el resto
       haría que un voto de las 21:00 pareciera más viejo que uno de las 23:00
       UTC del día anterior. En la fila se enseña la hora local (title del
       span), pero lo que se ESCRIBE es UTC.

   CERO INVENTAR — TRES COSAS QUE LA SPEC PIDE Y LOS DATOS HOY NO TIENEN
   --------------------------------------------------------------------
   Medido el 25-ago-2026 contra el almacén vivo
   (`GET https://api.npoint.io/76533e2a465a894fc6f4`) y contra `piezas.json`:

     1. «Banco de 30» → **son 16** (8 JAVI + 8 JORDI), y los campos reales de
        cada uno son exactamente: id · cuenta · tipo · texto · angulo · fuente.
        Ninguno trae `estado`. Aquí no se rellena hasta 30 con ganchos
        inventados: el contador dice el número REAL que haya en el almacén.
     2. Chips «Objeción · Autoridad · Contraste · Historia · Winners» → **no
        existe ningún campo que los sostenga** (ni `formula`, ni `winner`).
        Clasificar 16 frases a ojo para poder pintar la barra sería fabricar un
        dato. Lo que se hace en su lugar: los chips se construyen de lo que HAY.
          · estado (Sin decidir / Aprobados / Denegados), que sí es real;
          · fórmula, con las etiquetas LITERALES de la spec, que aparecen solas
            en cuanto un gancho declare `formula:"objecion"|"autoridad"|…`;
          · «★ Winners» (verde) aparece solo si algún gancho trae `winner`.
        Y el ÁNGULO —que sí es un campo real— es clicable en cada fila y filtra.
     3. «· usado en N piezas» → no hay de dónde sacarlo: las piezas no llevan
        campo `hook` (0 de 64) y **ninguno de los 16 textos aparece en ningún
        caption** (medido). Se pinta solo si el gancho trae `usado_en`, o si su
        texto aparece LITERAL en el caption de alguna pieza. Hoy eso da 0 en los
        16, así que hoy no se pinta ni una vez. Un contador inventado a cero
        sería peor que no tenerlo.

   CÓMO SE ENGANCHA A index.html  (§3.4 · §6.1)
   -------------------------------------------
     <link rel="stylesheet" href="vistas/hooks.css">
     <script src="vistas/hooks.js"></script>      ← script CLÁSICO, no módulo ES.
     const VISTAS = { …, hooks: vistaHooks, … };
     app.innerHTML = (VISTAS[TAB] || vistaEspia)();
     function cablear(){ …; cablearHooks(); }

     Botón de pestaña:  <button data-t="hooks">Hooks <span id="nhk"></span></button>
     Y el contador, con la guarda `if(_e)` de §6.2:
       {var _e=$("#nhk"); if(_e)_e.textContent="("+hooksSinEstado().length+")";}
     Ese contador sale de ESTE fichero a propósito: así el número de la pestaña
     y la lista de la pantalla son el MISMO cálculo y no se desincronizan.

     index.html NO debe declarar sus propias `vistaHooks`/`hooksNormalizados`,
     ni cablear a mano los `[data-hk-*]`: van por delegación desde aquí y se
     dispararían dos veces.

     Atajo «/» (§4.3): esta pantalla NO lo secuestra, para no pelearse con el
     buscador de la topbar. Si index.html quiere enfocar el de aquí:
       var q=document.getElementById("hk-q"); if(q) q.focus();

   DETALLES QUE PARECEN TONTOS Y NO LO SON
   ---------------------------------------
     · El borrador de «Cambiar texto» sobrevive al repintado. `guardar()` llama
       a `render()` y eso rehace el `innerHTML` entero: sin conservar el
       borrador, el texto que alguien estuviera escribiendo se perdería cada vez
       que otro revisor vota. Se conserva hasta confirmar que el almacén lo tiene.
     · El buscador repinta SOLO la lista, no el panel: repintar todo en cada
       tecla le quitaría el foco al input y escribir sería imposible.
     · Sin `guardar()` (almacén caído, o el módulo suelto) la pantalla entra en
       SOLO LECTURA visible, con los botones deshabilitados y el aviso puesto.
       Nunca se acepta un voto que no se va a poder guardar (§1 ley 2).
   ============================================================================= */

(function () {
"use strict";

/* ------------------------------------------------------------- constantes */

/* §5.5. Las etiquetas son las literales de la spec; la CLAVE es el valor que
   tendría que traer el gancho en `formula`. Mientras ninguno lo traiga, ningún
   chip de estos se pinta (ver «CERO INVENTAR» 2 en la cabecera). */
var FAMILIAS = {
  objecion:  "Objeción",
  autoridad: "Autoridad",
  contraste: "Contraste",
  historia:  "Historia"
};

/* `tipo` real de los datos: "hablado" | "leido". No es decoración — es la
   ventana del gate: hook LEÍDO 6,0-7,5 s · hook HABLADO 1,8-3,5 s. */
var TIPO_HUMANO = {leido: "se lee en pantalla", hablado: "se dice a cámara"};

var CUENTAS = ["todo", "JAVI", "JORDI"];
var CUENTA_LABEL = {todo: "Las dos cuentas", JAVI: "Javi", JORDI: "Jordi"};
var ESTADO_LABEL = {aprobado: "Aprobado", denegado: "Denegado"};

var MESES_AB = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/* ---------------------------------------------------------- estado privado */

var MONTADO   = false;   /* el listener de delegación se pone UNA vez */
var Q         = "";      /* texto del buscador */
var CHIP      = "todos"; /* chip activo */
var EDIT      = {};      /* {hookId: true} editores abiertos, sobreviven al repintado */
var BORRADOR  = {};      /* {hookId: texto} lo que hay escrito y aún no guardado */
var ENVIADO   = {};      /* {hookId: texto} lo mandado al almacén, pendiente de confirmar */
var FILTRO    = {cuenta: "todo"};  /* reserva, solo si index.html no declara FCUENTA */

/* ------------------------------------------------- puentes con los globals */
/* Todo acceso a un global va por aquí: si index.html todavía no lo define, la
   pantalla degrada en vez de reventar. `typeof` sobre un identificador que no
   existe no lanza; leerlo a pelo sí. */

function _est()  { return (typeof E !== "undefined" && E) || {}; }
function _ini()  { return (typeof HOOKS_INI !== "undefined" && HOOKS_INI) || []; }
function _mio()  { return (typeof MIO !== "undefined" && MIO) || {}; }
function _datos(){ return (typeof DATOS !== "undefined" && DATOS) || {piezas: []}; }
function _yo()   { try { if (typeof YO !== "undefined") return YO || ""; } catch (e) {} return ""; }

function _fc() { try { if (typeof FCUENTA !== "undefined") return FCUENTA || "todo"; } catch (e) {} return FILTRO.cuenta; }
function _setCuenta(v) {
  FILTRO.cuenta = v;
  try { FCUENTA = v; } catch (e) { /* index.html no lo declara: nos quedamos con el local */ }
}

function avisar(t, mal) {
  if (typeof aviso === "function") { aviso(t, mal); return; }
  if (mal) console.warn("[hooks]", t); else console.log("[hooks]", t);
}

/* ¿Se puede escribir de verdad? Sin `guardar` o sin YO, la pantalla es de solo
   lectura y lo DICE. Aceptar un clic que no se va a guardar es perder un voto
   en silencio, que es justo lo que §2 ley 2 prohíbe. */
function puedeEscribir() { return typeof guardar === "function" && !!_yo(); }

/* ------------------------------------------------------------------ utilidad */

function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
  });
}

/* Minúsculas y sin tildes, para buscar. «Objeción» tiene que encontrarse
   escribiendo «objecion», y los ángulos reales llevan tildes y «≠». */
function norm(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* UTC, y no es un descuido: ver la cabecera (ESCRITURA). */
function sello() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

/* "2026-08-25 12:00" (UTC) → "25-ago 14:00" en hora local, para leerlo. Si la
   cadena no tiene esa forma, se devuelve tal cual: nunca se adivina una fecha. */
function cuandoHumano(s) {
  var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(s || ""));
  if (!m) return String(s || "");
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]));
  if (isNaN(d.getTime())) return String(s || "");
  var hh = d.getHours(), mm = d.getMinutes();
  return d.getDate() + "-" + MESES_AB[d.getMonth()] + " " +
         (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
}

function clon(o) { return JSON.parse(JSON.stringify(o)); }

/* --------------------------------------------- §6.4 · NORMALIZAR LOS HOOKS */
/* Devuelve SIEMPRE un array de objetos con la misma forma, vengan de donde
   vengan. Es la única puerta de lectura del banco: ningún otro sitio de este
   fichero mira `E.hooks` a pelo.

   Reglas de fusión, las mismas que usa leerBlob() (§2.B):
     · base = `E.hooks` si trae algo; si no, `HOOKS_INI`.
     · si la base viene como OBJETO (forma de bin), se convierte a array
       casando por `id` contra HOOKS_INI y conservando los ids desconocidos.
     · encima se aplica `MIO.hooks` (objeto), y gana el `cuando` más reciente.
   NUNCA muta la fuente: se trabaja sobre copia. */
function hooksNormalizados() {
  var E_ = _est();
  var base = E_.hooks;
  var lista = [];
  var porId = {};
  var i, h, k;

  function mete(o) {
    if (!o || !o.id) return;
    if (porId[o.id]) { Object.assign(porId[o.id], o); return; }
    porId[o.id] = o;
    lista.push(o);
  }

  if (Array.isArray(base) && base.length) {
    for (i = 0; i < base.length; i++) mete(clon(base[i]));
  } else if (base && typeof base === "object" && !Array.isArray(base) && Object.keys(base).length) {
    /* forma de bin en el sitio del BLOB: se rehidrata contra la semilla */
    var ini = _ini();
    for (i = 0; i < ini.length; i++) mete(clon(ini[i]));
    Object.keys(base).forEach(function (hid) {
      var d = base[hid] || {};
      if (porId[hid]) Object.assign(porId[hid], d);
      else mete(Object.assign({id: hid}, clon(d)));
    });
  } else {
    var s = _ini();
    for (i = 0; i < s.length; i++) mete(clon(s[i]));
  }

  /* voto propio todavía no reflejado en el BLOB: gana el más reciente */
  var mh = _mio().hooks;
  if (mh && typeof mh === "object" && !Array.isArray(mh)) {
    Object.keys(mh).forEach(function (hid) {
      var d = mh[hid] || {};
      k = porId[hid];
      if (!k) return;                                   /* mismo criterio que leerBlob */
      if (!k.cuando || (d.cuando || "") > (k.cuando || "")) {
        Object.assign(k, d, {por: d.por || _yo()});
      }
    });
  }

  /* forma garantizada: quien consuma esto no tiene que defenderse de nada */
  for (i = 0; i < lista.length; i++) {
    h = lista[i];
    h.id      = String(h.id || "");
    h.cuenta  = String(h.cuenta || "").toUpperCase();
    h.tipo    = String(h.tipo || "");
    h.texto   = String(h.texto || "");
    h.angulo  = String(h.angulo || "");
    h.fuente  = String(h.fuente || "");
    h.estado  = String(h.estado || "");
    h.por     = String(h.por || "");
    h.cuando  = String(h.cuando || "");
    h.formula = String(h.formula || h.familia || "");
  }
  return lista;
}

/* Contador de la pestaña `#nhk` (§5.5): ganchos SIN decidir. */
function hooksSinEstado() {
  return hooksNormalizados().filter(function (h) { return !h.estado; });
}

/* ------------------------------------------------- «usado en N piezas» (medido) */
/* Ver «CERO INVENTAR» 3. Dos vías, las dos reales:
     a) el gancho declara `usado_en` (número, o lista de ids de pieza);
     b) su texto aparece LITERAL en el caption de alguna pieza de piezas.json.
   Si las dos dan 0, no se pinta nada. */
var _capCache = null, _capSello = null;
function _captions() {
  var d = _datos();
  var sello_ = String(d.generado || "") + "|" + ((d.piezas || []).length);
  if (_capCache && _capSello === sello_) return _capCache;
  _capCache = (d.piezas || []).map(function (p) { return norm(p.caption || ""); });
  _capSello = sello_;
  return _capCache;
}
function usosDe(h) {
  if (typeof h.usado_en === "number") return h.usado_en;
  if (Array.isArray(h.usado_en)) return h.usado_en.length;
  var t = norm(h.texto);
  if (t.length < 12) return 0;              /* un fragmento corto casaría con cualquier cosa */
  var caps = _captions(), n = 0;
  for (var i = 0; i < caps.length; i++) if (caps[i].indexOf(t) !== -1) n++;
  return n;
}

/* --------------------------------------------------------------- filtrado */

function porCuenta(l) {
  var c = _fc();
  if (c === "todo") return l;
  return l.filter(function (h) { return h.cuenta === c; });
}

function busca(l) {
  var q = norm(Q);
  if (!q) return l;
  var partes = q.split(" ").filter(Boolean);
  return l.filter(function (h) {
    var heno = norm([h.texto, h.angulo, h.fuente, h.cuenta, h.id, h.tipo, h.formula].join(" "));
    for (var i = 0; i < partes.length; i++) if (heno.indexOf(partes[i]) === -1) return false;
    return true;
  });
}

/* Los chips que EXISTEN hoy. Cada uno lleva su cuenta ya hecha para que el
   número del chip y la lista no se puedan contradecir. */
function chipsDe(l) {
  var c = [{id: "todos", txt: "Todos", n: l.length}];
  var sin = l.filter(function (h) { return !h.estado; }).length;
  var ap  = l.filter(function (h) { return h.estado === "aprobado"; }).length;
  var dn  = l.filter(function (h) { return h.estado === "denegado"; }).length;

  c.push({id: "sin", txt: "Sin decidir", n: sin});
  if (ap) c.push({id: "aprobado", txt: "Aprobados", n: ap, tono: "ok"});
  if (dn) c.push({id: "denegado", txt: "Denegados", n: dn, tono: "no"});

  /* fórmulas: SOLO las que algún gancho declara (§ CERO INVENTAR 2) */
  var vistas = {};
  l.forEach(function (h) { if (h.formula) vistas[h.formula] = (vistas[h.formula] || 0) + 1; });
  Object.keys(vistas).sort().forEach(function (f) {
    c.push({id: "f:" + f, txt: FAMILIAS[f] || (f.charAt(0).toUpperCase() + f.slice(1)), n: vistas[f]});
  });

  var w = l.filter(function (h) { return !!h.winner; }).length;
  if (w) c.push({id: "winner", txt: "★ Winners", n: w, tono: "ok"});
  return c;
}

function aplicaChip(l) {
  if (CHIP === "todos")    return l;
  if (CHIP === "sin")      return l.filter(function (h) { return !h.estado; });
  if (CHIP === "aprobado") return l.filter(function (h) { return h.estado === "aprobado"; });
  if (CHIP === "denegado") return l.filter(function (h) { return h.estado === "denegado"; });
  if (CHIP === "winner")   return l.filter(function (h) { return !!h.winner; });
  if (CHIP.indexOf("f:") === 0) {
    var f = CHIP.slice(2);
    return l.filter(function (h) { return h.formula === f; });
  }
  return l;
}

/* La lista que se pinta. El orden es el del almacén a propósito: si al votar
   los ganchos se reordenaran, el siguiente saltaría bajo el dedo — en el móvil
   eso es votar el que no era. */
function visibles() { return aplicaChip(busca(porCuenta(hooksNormalizados()))); }

/* ------------------------------------------------------------------ texto */
/* El texto EFECTIVO de un gancho: lo que hay escrito sin guardar manda sobre lo
   guardado, porque es lo que la persona está viendo. */
function textoDe(h) {
  return (Object.prototype.hasOwnProperty.call(BORRADOR, h.id)) ? BORRADOR[h.id] : h.texto;
}

/* Se llama en cada pintado: si el almacén ya tiene lo que mandamos, se cierra
   el editor y se suelta el borrador. Si NO lo tiene (el POST falló y `guardar`
   ya avisó en rojo), el texto se queda en pantalla para no perderlo. */
function conciliaBorradores(lista) {
  lista.forEach(function (h) {
    if (Object.prototype.hasOwnProperty.call(ENVIADO, h.id) && h.texto === ENVIADO[h.id]) {
      delete ENVIADO[h.id];
      delete BORRADOR[h.id];
      delete EDIT[h.id];
    }
    if (Object.prototype.hasOwnProperty.call(BORRADOR, h.id) && BORRADOR[h.id] === h.texto) {
      delete BORRADOR[h.id];                 /* volvió a ser igual: no hay borrador que guardar */
    }
  });
}

/* =========================================================================== */
/*                                    HTML                                     */
/* =========================================================================== */

function cabeceraHTML(total, sin) {
  var ro = puedeEscribir() ? "" :
    '<p class="hk-ro" role="status">Almacén no disponible: <b>solo lectura</b>. ' +
    'Puedes leer y copiar ganchos; los votos no se guardarían.</p>';
  return '' +
    '<header class="hk-cab">' +
      '<h2 class="hk-h2">Ganchos</h2>' +
      '<p class="hk-sub">El gancho se decide <b>antes</b> de editar ningún vídeo. ' +
        'Aprueba el que quieras que se produzca, cámbiale el texto si lo quieres distinto ' +
        '—lo que escribas es exactamente el que se usa— y deniega el que no.</p>' +
      '<p class="hk-cifras"><span class="num">' + total + '</span> en el banco · ' +
        '<b class="num">' + sin + '</b> sin decidir</p>' +
      ro +
    '</header>';
}

function cuentasHTML() {
  var c = _fc();
  return '<div class="hk-cuentas" role="group" aria-label="Cuenta">' +
    CUENTAS.map(function (x) {
      return '<button type="button" class="hk-cuenta' + (c === x ? " on" : "") + '"' +
             ' data-hk-cuenta="' + x + '"' + (c === x ? ' aria-pressed="true"' : '') + '>' +
             esc_(CUENTA_LABEL[x]) + '</button>';
    }).join("") + '</div>';
}

function buscadorHTML() {
  return '<div class="hk-busca">' +
    '<label class="hk-lupa" for="hk-q" aria-hidden="true">⌕</label>' +
    '<input id="hk-q" type="search" class="hk-q" autocomplete="off" spellcheck="false"' +
      ' placeholder="Buscar por texto, ángulo o de dónde sale…"' +
      ' aria-label="Buscar en el banco de ganchos" value="' + esc_(Q) + '">' +
    (Q ? '<button type="button" class="hk-limpia" data-hk-limpia="1" aria-label="Limpiar búsqueda">✕</button>' : '') +
  '</div>';
}

function chipsHTML(l) {
  var c = chipsDe(l);
  return '<nav class="hk-chips" aria-label="Filtros del banco">' +
    c.map(function (x) {
      return '<button type="button" class="hk-chip' + (CHIP === x.id ? " on" : "") +
        (x.tono ? " t-" + x.tono : "") + '" data-hk-chip="' + esc_(x.id) + '"' +
        (CHIP === x.id ? ' aria-pressed="true"' : '') + '>' +
        esc_(x.txt) + ' <span class="num">' + x.n + '</span></button>';
    }).join("") + '</nav>';
}

function tagsHTML(h) {
  var t = '';
  t += '<span class="hk-pill hk-' + (h.cuenta === "JORDI" ? "jordi" : "javi") + '">' +
       esc_(h.cuenta === "JORDI" ? "Jordi" : h.cuenta === "JAVI" ? "Javi" : h.cuenta) + '</span>';
  if (h.tipo) {
    t += '<span class="hk-tag" title="' + esc_(TIPO_HUMANO[h.tipo] || "") + '">' +
         esc_(h.tipo === "leido" ? "se lee" : h.tipo === "hablado" ? "se dice" : h.tipo) + '</span>';
  }
  if (h.angulo) {
    t += '<button type="button" class="hk-tag hk-tag-b" data-hk-ang="' + esc_(h.angulo) + '"' +
         ' title="Filtrar por este ángulo">' + esc_(h.angulo) + '</button>';
  }
  if (h.formula) {
    t += '<span class="hk-tag">' + esc_(FAMILIAS[h.formula] || h.formula) + '</span>';
  }
  if (h.winner) {
    t += '<span class="hk-win">★ Winner' + (h.cuenta ? " " + esc_(h.cuenta === "JORDI" ? "Jordi" : "Javi") : "") + '</span>';
  }
  if (h.estado) {
    t += '<span class="hk-est hk-e-' + (h.estado === "aprobado" ? "ok" : "no") + '"' +
         (h.cuando ? ' title="' + esc_(h.cuando) + ' UTC, tal como se guarda en el almacén"' : '') + '>' +
         esc_(ESTADO_LABEL[h.estado] || h.estado) +
         (h.por ? ' · ' + esc_(h.por) : '') +
         (h.cuando ? ' · <span class="num">' + esc_(cuandoHumano(h.cuando)) + '</span>' : '') +
         '</span>';
  }
  return '<div class="hk-tags">' + t + '</div>';
}

function filaHTML(h) {
  var esc_id   = esc_(h.id);
  var abierto  = !!EDIT[h.id];
  var sucio    = Object.prototype.hasOwnProperty.call(BORRADOR, h.id);
  var txt      = textoDe(h);
  var n        = usosDe(h);
  var rw       = puedeEscribir();
  var dis      = rw ? "" : " disabled";
  var clase    = "hk-fila" +
                 (h.estado === "aprobado" ? " es-ok" : h.estado === "denegado" ? " es-no" : "") +
                 (abierto ? " editando" : "") +
                 (Object.prototype.hasOwnProperty.call(ENVIADO, h.id) ? " enviando" : "");

  var html = '<article class="' + clase + '" data-hk-id="' + esc_id + '">' +
    '<div class="hk-comilla" aria-hidden="true">”</div>' +
    '<div class="hk-cuerpo">' +
      '<p class="hk-texto">' + esc_(txt) + (sucio ? ' <span class="hk-sucio">sin guardar</span>' : '') + '</p>' +
      tagsHTML(h) +
      (h.fuente ? '<p class="hk-fuente">' + esc_(h.fuente) + '</p>' : '') +
      (h.editado ? '<p class="hk-fuente hk-editado">Texto cambiado ' + esc_(h.editado) + '</p>' : '') +
      (n > 0 ? '<p class="hk-uso" title="Medido: este texto aparece literal en el caption de ' + n +
               ' pieza' + (n === 1 ? "" : "s") + '">· usado en <span class="num">' + n +
               '</span> pieza' + (n === 1 ? "" : "s") + '</p>' : '');

  html +=
      '<div class="hk-editor"' + (abierto ? '' : ' hidden') + '>' +
        '<textarea class="hk-edit" data-hk-ta="' + esc_id + '" rows="3"' +
          ' aria-label="Texto del gancho">' + esc_(txt) + '</textarea>' +
        '<p class="hk-ayuda">Esto es <b>literalmente</b> el gancho que se produce. ' +
          'Enter aprueba · Esc cancela.</p>' +
      '</div>' +
      '<div class="hk-acc">' +
        '<button type="button" class="hk-b hk-b-copiar" data-hk-copiar="' + esc_id + '">Copiar</button>' +
        '<button type="button" class="hk-b hk-b-ok' + (h.estado === "aprobado" ? " on" : "") + '"' +
          ' data-hk-a="aprobado" data-hk-id="' + esc_id + '"' + dis + '>Aprobar</button>' +
        '<button type="button" class="hk-b hk-b-fix' + (abierto ? " on" : "") + '"' +
          ' data-hk-a="editar" data-hk-id="' + esc_id + '"' + dis + '>Cambiar texto</button>' +
        '<button type="button" class="hk-b hk-b-no' + (h.estado === "denegado" ? " on" : "") + '"' +
          ' data-hk-a="denegado" data-hk-id="' + esc_id + '"' + dis + '>Denegar</button>' +
      '</div>' +
    '</div>' +
  '</article>';
  return html;
}

function listaHTML(l) {
  if (!l.length) {
    var hay = hooksNormalizados().length;
    if (!hay) {
      return '<div class="hk-vacio"><p>El banco está vacío.</p>' +
             '<p class="hk-vacio-p">No hay ganchos en el almacén ni semilla cargada. ' +
             'Se siembran desde el PC; aquí no se inventa ninguno.</p></div>';
    }
    return '<div class="hk-vacio"><p>Ningún gancho con este filtro.</p>' +
           '<p class="hk-vacio-p">Prueba otro chip, otra cuenta, o ' +
           '<button type="button" class="hk-link" data-hk-reset="1">quita los filtros</button>.</p></div>';
  }
  return l.map(filaHTML).join("");
}

function vistaHooks() {
  var todos = hooksNormalizados();
  conciliaBorradores(todos);
  var base  = busca(porCuenta(todos));      /* los chips cuentan sobre lo buscado */
  var l     = aplicaChip(base);
  return '<section class="hk-root">' +
    cabeceraHTML(todos.length, todos.filter(function (h) { return !h.estado; }).length) +
    '<div class="hk-barra">' + cuentasHTML() + buscadorHTML() + '</div>' +
    chipsHTML(base) +
    '<div class="hk-lista" id="hk-lista">' + listaHTML(l) + '</div>' +
  '</section>';
}

/* Repintado PARCIAL: solo chips + lista. El buscador no se toca, así no pierde
   el foco ni el cursor mientras se escribe. Si la pantalla no está montada
   (otra pestaña), no hace nada. */
function repinta() {
  var raiz = document.querySelector(".hk-root");
  if (!raiz) return;
  var todos = hooksNormalizados();
  conciliaBorradores(todos);
  var base = busca(porCuenta(todos));
  var l = aplicaChip(base);

  var chips = raiz.querySelector(".hk-chips");
  if (chips) chips.outerHTML = chipsHTML(base);
  var lista = raiz.querySelector("#hk-lista");
  if (lista) lista.innerHTML = listaHTML(l);
  var cuentas = raiz.querySelector(".hk-cuentas");
  if (cuentas) cuentas.outerHTML = cuentasHTML();
  var limpia = raiz.querySelector(".hk-limpia");
  if (Q && !limpia) {
    var caja = raiz.querySelector(".hk-busca");
    if (caja) caja.insertAdjacentHTML("beforeend",
      '<button type="button" class="hk-limpia" data-hk-limpia="1" aria-label="Limpiar búsqueda">✕</button>');
  } else if (!Q && limpia) {
    limpia.remove();
  }
}

/* =========================================================================== */
/*                                 ESCRITURA                                   */
/* =========================================================================== */

/* La ÚNICA escritura de esta pantalla. Va al BLOB por `guardar()` (§2.B). */
function decide(hid, accion) {
  if (!puedeEscribir()) { avisar("Almacén no disponible: el voto no se guardaría", true); return; }

  var lista = hooksNormalizados();
  var h = null;
  for (var i = 0; i < lista.length; i++) if (lista[i].id === hid) { h = lista[i]; break; }
  if (!h) { avisar("Ese gancho ya no está en el banco", true); return; }

  var nuevo = String(textoDe(h) || "").trim();
  if (!nuevo) { avisar("El gancho no puede quedarse vacío", true); return; }

  var yo = _yo();
  var marca = sello();
  var semilla = clon(_ini());

  ENVIADO[hid] = nuevo;                      /* se suelta cuando el almacén lo confirme */

  var p;
  try {
    p = guardar(function (srv) {
      srv.hooks = (srv.hooks && srv.hooks.length) ? srv.hooks : semilla;
      var k = null;
      for (var j = 0; j < srv.hooks.length; j++) if (srv.hooks[j].id === hid) { k = srv.hooks[j]; break; }
      if (!k) return;
      if (nuevo && nuevo !== k.texto) { k.texto = nuevo; k.editado = marca + " por " + yo; }
      k.estado = accion; k.por = yo; k.cuando = marca;
    });
  } catch (e) { p = null; }
  /* Sin `.then(render)`: `guardar()` repinta él solo al resolver (§3.3).
     Lo que SÍ hace falta es soltar el «enviando» cuando el guardado NO fue.
     ⛔ Ley 1: que llegue el `.then` no prueba nada — `guardar()` resuelve
     IGUAL después de fallar sus 3 reintentos (avisa en rojo y hace `return`).
     Medido el 25-ago bloqueando el POST: la fila se quedaba a `opacity:.55`
     («parece que sigue enviando») para siempre, y si además le habías cambiado
     el texto, `conciliaBorradores` nunca podía soltarlo, porque compara contra
     un `h.texto` que el almacén jamás llegó a recibir. Se comprueba contra el
     estado ya releído, y si no está, se suelta y se repinta. */
  Promise.resolve(p).then(function () {
    var l = hooksNormalizados(), k = null;
    for (var i = 0; i < l.length; i++) if (l[i].id === hid) { k = l[i]; break; }
    var ok = !!(k && k.estado === accion && k.texto === nuevo);
    if (!ok && Object.prototype.hasOwnProperty.call(ENVIADO, hid)) { delete ENVIADO[hid]; repinta(); }
  }, function () {
    delete ENVIADO[hid];
    repinta();
  });
}

/* ------------------------------------------------------------------ copiar */
/* `navigator.clipboard` necesita contexto seguro (https o localhost). En
   GitHub Pages lo hay; abriendo el fichero con file:// no, y por eso se queda
   la vía vieja de reserva. Si las dos fallan, el texto queda SELECCIONADO para
   que Ctrl+C funcione: nunca se dice «Copiado» sin haber copiado. */
function copiar(txt, btn) {
  function fin(ok) {
    if (!btn) { avisar(ok ? "Copiado" : "No se pudo copiar", !ok); return; }
    var antes = btn.getAttribute("data-antes") || btn.textContent;
    btn.setAttribute("data-antes", antes);
    btn.textContent = ok ? "Copiado ✓" : "Ctrl+C";
    btn.classList.toggle("hecho", ok);
    clearTimeout(btn._t);
    btn._t = setTimeout(function () {
      btn.textContent = antes; btn.classList.remove("hecho");
    }, 1600);
    avisar(ok ? "Gancho copiado" : "No se pudo copiar: usa Ctrl+C", !ok);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(function () { fin(true); },
                                            function () { fin(legacyCopy(txt)); });
    return;
  }
  fin(legacyCopy(txt));
}
function legacyCopy(txt) {
  try {
    var ta = document.createElement("textarea");
    ta.value = txt;
    ta.setAttribute("readonly", "readonly");
    ta.style.position = "fixed"; ta.style.top = "-1000px"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select(); ta.setSelectionRange(0, ta.value.length);
    var ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return !!ok;
  } catch (e) { return false; }
}

/* =========================================================================== */
/*                                  EVENTOS                                    */
/* =========================================================================== */
/* Delegación sobre `document`, acotada a `.hk-root`: sobrevive a cada
   repintado y no pisa el `#app.onclick` que index.html asigna por propiedad
   (asignar `onclick` y añadir un listener conviven; no se sustituyen). */

function onClick(ev) {
  var t = ev.target;
  if (!t || !t.closest) return;
  var raiz = t.closest(".hk-root");
  if (!raiz) return;

  var b = t.closest("button");
  if (!b) return;

  /* --- filtros ------------------------------------------------------- */
  if (b.hasAttribute("data-hk-cuenta")) {
    _setCuenta(b.getAttribute("data-hk-cuenta"));
    repinta();
    return;
  }
  if (b.hasAttribute("data-hk-chip")) {
    CHIP = b.getAttribute("data-hk-chip");
    repinta();
    return;
  }
  if (b.hasAttribute("data-hk-ang")) {
    Q = b.getAttribute("data-hk-ang") || "";
    CHIP = "todos";
    var q1 = document.getElementById("hk-q");
    if (q1) q1.value = Q;
    repinta();
    return;
  }
  if (b.hasAttribute("data-hk-limpia")) {
    Q = "";
    var q2 = document.getElementById("hk-q");
    if (q2) { q2.value = ""; q2.focus(); }
    repinta();
    return;
  }
  if (b.hasAttribute("data-hk-reset")) {
    Q = ""; CHIP = "todos"; _setCuenta("todo");
    var q3 = document.getElementById("hk-q");
    if (q3) q3.value = "";
    repinta();
    return;
  }

  /* --- copiar -------------------------------------------------------- */
  if (b.hasAttribute("data-hk-copiar")) {
    var hid = b.getAttribute("data-hk-copiar");
    var l = hooksNormalizados(), h = null;
    for (var i = 0; i < l.length; i++) if (l[i].id === hid) { h = l[i]; break; }
    if (!h) { avisar("Ese gancho ya no está", true); return; }
    copiar(textoDe(h), b);
    return;
  }

  /* --- las tres decisiones ------------------------------------------- */
  if (b.hasAttribute("data-hk-a")) {
    var id = b.getAttribute("data-hk-id");
    var a  = b.getAttribute("data-hk-a");
    if (!id) return;
    if (a === "editar") { abreEditor(id, !EDIT[id]); return; }
    decide(id, a);
    return;
  }
}

function abreEditor(hid, abrir) {
  if (abrir) EDIT[hid] = true; else { delete EDIT[hid]; delete BORRADOR[hid]; }
  repinta();
  if (!abrir) return;
  var ta = document.querySelector('[data-hk-ta="' + (window.CSS && CSS.escape ? CSS.escape(hid) : hid) + '"]');
  if (!ta) {
    /* sin CSS.escape utilizable, se busca a mano por atributo */
    var todos = document.querySelectorAll("[data-hk-ta]");
    for (var i = 0; i < todos.length; i++) if (todos[i].getAttribute("data-hk-ta") === hid) { ta = todos[i]; break; }
  }
  if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
}

function onInput(ev) {
  var t = ev.target;
  if (!t || !t.closest || !t.closest(".hk-root")) return;

  if (t.id === "hk-q") { Q = t.value || ""; repinta(); return; }

  if (t.hasAttribute && t.hasAttribute("data-hk-ta")) {
    /* Solo se apunta el borrador: NO se repinta, o el textarea perdería el
       cursor en cada tecla. La fila se refresca al votar o al filtrar. */
    BORRADOR[t.getAttribute("data-hk-ta")] = t.value;
    return;
  }
}

function onKeydown(ev) {
  var t = ev.target;
  if (!t || !t.closest || !t.closest(".hk-root")) return;

  if (t.id === "hk-q" && ev.key === "Escape") {
    if (!Q) return;
    Q = ""; t.value = ""; repinta(); ev.preventDefault();
    return;
  }
  if (!t.hasAttribute || !t.hasAttribute("data-hk-ta")) return;

  var hid = t.getAttribute("data-hk-ta");
  if (ev.key === "Enter" && !ev.shiftKey) {         /* Enter aprueba (lo de siempre) */
    ev.preventDefault();
    BORRADOR[hid] = t.value;
    decide(hid, "aprobado");
    return;
  }
  if (ev.key === "Escape") {                        /* Esc cancela y tira el borrador */
    ev.preventDefault();
    abreEditor(hid, false);
  }
}

function montar() {
  if (MONTADO) return;
  MONTADO = true;
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKeydown);
}

/* ------------------------------------------------------------------ salida */

window.vistaHooks       = vistaHooks;
window.cablearHooks     = montar;
/* El contador `#nhk` de render() sale de aquí: mismo cálculo que la lista. */
window.hooksNormalizados = hooksNormalizados;
window.hooksSinEstado    = hooksSinEstado;
window.VISTA_HOOKS       = {
  vistaHooks: vistaHooks, cablear: montar,
  hooksNormalizados: hooksNormalizados, hooksSinEstado: hooksSinEstado,
  usosDe: usosDe, visibles: visibles, chipsDe: chipsDe, FAMILIAS: FAMILIAS,
  repinta: repinta
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
else montar();

})();
