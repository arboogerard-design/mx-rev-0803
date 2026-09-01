/* =============================================================================
   vistas/guiones.js  ·  PANTALLA «GUIONES (cortes de podcast)»
                         BUILD_SPEC_PANEL_ELITE.md §5.7
   =============================================================================

   QUÉ HACE
   --------
   Enseña los cortes del podcast YA GRABADO que están mapeados frase a frase, y
   pone al lado de cada uno un botón **PRODUCIR**. Pulsarlo NO produce nada aquí:
   escribe una orden `{tipo:"producir_guion", id, …}` en TU bin de npoint, que es
   de donde la recoge `panel_listener.py`. El botón pasa a **EN COLA ✓** y la
   pieza aparecerá en «Por revisar» cuando el productor la haya montado y el gate
   la haya promovido (§7.3).

   Es la mitad «material ya grabado» de la Fábrica: en §5.1 se clona un referente
   de fuera; aquí se corta lo que Javi y Jordi ya dijeron delante de la cámara.
   La diferencia con «A grabar» (§5.6, `vistas/grabar.js`) es total y conviene no
   confundirlas: allí hay un guion para RODAR y cero red; aquí hay un corte que
   YA EXISTE y una orden que se escribe.

   ⛔ ESTA PANTALLA NO PUBLICA NADA (§1 ley 3 · doctrina ley 8). Encolar ≠ subir.
      Todo microcopy de este fichero lo dice de forma explícita, a propósito.

   DE QUÉ DATOS VIVE  (§2 — CONTRATO SAGRADO, los nombres son LITERALES)
   ---------------------------------------------------------------------
   LECTURA (globals que este módulo NO declara; los pone index.html):

     GUIONES   array. ES LA ÚNICA FUENTE de esta pantalla. Forma real, MEDIDA el
               25-ago-2026 sobre los 42 cortes publicados (42/42 traen los 8
               campos, ninguno falta):
                 { id:        "QA03" | "JUNTOS14"      (42 ids únicos)
                   hook:      "Tenemos alumnos que han facturado…"  (55-158 car.)
                   dur:       20.1                     (segundos, 20,1 → 54,2)
                   t1:        1662.9                   (seg. en el podcast)
                   t2:        1683.0                   (t1 + dur)
                   etapa:     "TOFU" | "MOFU" | "BOFU" (11 · 7 · 24)
                   estructura:"pregunta (…) → Javi (…)"(42/42 con texto)
                   porque:    ""                       (42/42 VACÍO, ver abajo) }

               ⚠ **`GUIONES` NO trae campo `cuenta`.** Está medido: los 42
                 objetos tienen exactamente esas 8 claves. Ver «CERO INVENTAR».

     MIO       `{decisiones, hooks, ordenes[], publicados}` — MI bin ya fusionado
               por `leerBlob()`. De aquí sale qué guiones están YA en cola:
               `MIO.ordenes` filtrado por `tipo === "producir_guion"`.
     YO        "Gerard"|"Javi"|"Jordi"|"Santi" — va en el campo `por` de la orden.
     FCUENTA   "todo"|"JAVI"|"JORDI" — se LEE (ver «el filtro de cuenta» abajo).
     FETAPA    "todo"|"TOFU"|"MOFU"|"BOFU" — se lee y se escribe.

   FUNCIONES de index.html que se usan si están (y si no, hay reserva):
     guardarMio(aplicar)  ⭐ ESCRITURA. Bin de `BINS[YO]`, reintento ×3.
     filtrosHTML()        barra de filtros cuenta+etapa (§4.3)
     aviso(t, mal)        toast
     render()             repintado completo del panel
     esc(s)               escape XSS (hay copia local idéntica de reserva)

   ⚠ NINGUNA es obligatoria. Todo acceso a un global pasa por un puente con
     `typeof`: si index.html todavía no lo declara, la pantalla degrada a
     SOLO-LECTURA y lo DICE en la cara del botón — nunca revienta, y nunca
     pierde una orden en silencio (§6.6).

   ESCRITURA — el reparto del §2.B, respetado al pie de la letra
   -------------------------------------------------------------
     `guardarMio()` → `BINS[YO]` → **SOLO la clave `ordenes`**. Nada más.
     NUNCA `guardar()`, nunca el BLOB, nunca `decisiones`: mover una orden al
     BLOB o una decisión al bin rompe el listener y la fusión (§6.5).

     La orden que se escribe, campo a campo:
       { oid:    "…"                  ← NUEVO, ver «el oid» abajo
         tipo:   "producir_guion",    ← literal
         id:     <g.id>,              ← literal
         por:    YO,
         cuando: new Date().toISOString().slice(0,16).replace("T"," ") }

     El formato de `cuando` es LITERAL del panel vivo y **no se toca**: el
     listener deduplica con él. (Sí, es UTC y no hora local: en España se ve 2 h
     atrás. Cambiarlo desde aquí desincronizaría la dedup del listener con las
     órdenes ya escritas — se arregla en el listener y en el front a la vez, o
     no se arregla. Anotado, no parcheado.)

   ⭐ EL `oid` — ARREGLA UN BUG MEDIDO DEL LISTENER (§7.2)
   ------------------------------------------------------
   `panel_listener.py` deduplica por `f"{quien}:{tipo}:{url}:{cuando}"`. Una
   orden `producir_guion` **no tiene `url`**, así que esa clave colapsa a
   `quien:producir_guion::cuando` — y `cuando` tiene precisión de MINUTO. O sea:
   **dos guiones distintos pedidos en el mismo minuto se deduplican mal y uno se
   pierde.** Y esta pantalla es exactamente donde eso pasa: son 42 cortes en una
   lista y se piden a ráfagas.
   Por eso cada orden nace con `oid` (`crypto.randomUUID()`, con reserva para
   iPhones viejos). Es **aditivo**: el listener actual ignora las claves que no
   conoce, así que escribirlo no rompe nada hoy y desbloquea el arreglo de
   mañana (deduplicar por `oid`, no por campos mutables).

   CERO INVENTAR — LO QUE NO ESTÁ EN EL DATO, NO SE PINTA (§1 ley 1 · ley 4)
   ------------------------------------------------------------------------
   ⛔ **La versión anterior pintaba `<span class="tag cuenta">JAVI</span>` en los
      42 cortes, a pelo, sin que `GUIONES` tenga campo `cuenta`.** 28 de esos 42
      son `JUNTOS*` (el podcast con los dos). Es decir: la pantalla afirmaba que
      28 cortes eran de Javi sin ningún dato que lo sostenga. Eso es identidad
      cruzada, que es NIVEL 1 (`identidad-javi-jordi.md`), no un detalle de UI.
      **Aquí no se pinta ninguna cuenta.** Se pinta la familia del id (`QA` /
      `JUNTOS`), que sí sale del dato, y una línea que dice en voz alta que el
      corte no declara quién habla. Quien produzca lo comprueba con
      `verify_identity_face.py`, como manda la regla 25.
      (Y el aviso vale doble: `pipeline-reels.md` deja medido que la ficha del
      reel #14 de JUNTOS atribuye a Jordi un tramo que es turno de Javi.)
   · `porque` está VACÍO en los 42. La cadena `estructura || porque` se conserva
     por contrato, pero no se pinta un bloque «Por qué» fantasma.
   · La duración se enseña en NEUTRO. La orientación de 60-75 s de
     `estrategia-contenido-santi.md` S5 está marcada ALLÍ como orientación y no
     como gate, así que aquí no se pinta en rojo lo que la propia regla dice que
     no bloquea.
   · Los totales (nº de cortes, minutos de material) se CUENTAN en tiempo de
     render sobre `GUIONES`. Cero número escrito a mano (`estado-se-mide.md`).

   EL FILTRO DE CUENTA — por qué esta pantalla lo declara «no aplica»
   ------------------------------------------------------------------
   §5 dice que todas las pantallas reusan `filtrosHTML()`, y se reusa. Pero
   `GUIONES` no trae `cuenta`: filtrar por Javi/Jordi aquí solo puede hacer dos
   cosas, y las dos son mentir — vaciar la lista (los 42 «no son de nadie») o
   enseñarlos todos fingiendo que el filtro hizo algo. **La versión anterior
   hacía lo segundo**: pintaba la barra y luego recorría `GUIONES` entero.
   Aquí el filtro de ETAPA funciona de verdad, y cuando `FCUENTA` no es "todo"
   se dice en una línea que el filtro no aplica a esta pantalla y por qué. Es
   feo y es honesto; lo otro era bonito y falso.

   TRES AGUJEROS DEL PANEL VIEJO QUE AQUÍ NO SE REPITEN
   ----------------------------------------------------
   1. **EN COLA ✓ se perdía en cada repintado.** El estado vivía solo en el DOM
      (`b.textContent="EN COLA ✓"`), así que al volver a la pestaña los cortes ya
      pedidos volvían a decir PRODUCIR e invitaban a pedirlos otra vez. Aquí el
      estado sale de `MIO.ordenes`, que es el dato de verdad, y sobrevive al
      repintado, al F5 y al cambio de dispositivo.
   2. **El botón cantaba victoria ANTES de que el POST confirmara** — el mismo
      patrón que §6.6 prohíbe. Aquí el botón pasa por «Enviando…», se espera a
      que `guardarMio()` resuelva y **se VERIFICA que el `oid` está en el bin**
      antes de decir EN COLA ✓. Si no está, vuelve a PRODUCIR y avisa en rojo.
   3. **`ngui` se calculaba en index.html sobre `GUIONES.length`** y la lista se
      pintaba aquí: dos cálculos que se pueden desincronizar. Ahora el número
      sale de `guionesPodcast()`, exportado desde este mismo fichero.

   CÓMO SE ENGANCHA A index.html  (§3.4 · §6.1)
   -------------------------------------------
     <link rel="stylesheet" href="vistas/guiones.css">
     <script src="vistas/guiones.js"></script>      ← script CLÁSICO, no módulo ES.
     const VISTAS = { …, guiones: vistaGuiones, … };
     app.innerHTML = (VISTAS[TAB] || vistaEspia)();

     Botón de pestaña (bien formado, §6.2 — nada de `<data-t="…">` suelto):
       <button data-t="guiones">Guiones <span id="ngui"></span></button>
     Y el contador, con la guarda `if(_e)`:
       {var _e=$("#ngui"); if(_e)_e.textContent="("+guionesPodcast().length+")";}

     ⛔ index.html **NO** debe cablear `.gprod` ni los `[data-gp-*]`, ni declarar
        su propia `vistaGuiones`. Van por delegación desde aquí y se dispararían
        dos veces. La clase `.gprod` y el `data-gid` del botón se conservan por
        fidelidad al §5.7 y compatibilidad, pero el que manda es `data-gp-prod`.
        (Aun así hay red de seguridad: un candado en vuelo por `id` hace que un
        doble disparo escriba UNA sola orden.)
     `cablear()` puede llamar a `cablearGuiones()` si quiere ser explícito, pero
     no hace falta: el módulo se engancha solo al cargarse (un único listener
     sobre `document`, para toda la vida de la página).

   MÓVIL PRIMERO (§3.6) — el equipo revisa desde el teléfono
   ---------------------------------------------------------
   Una columna, PRODUCIR a ancho completo y 46 px de alto en la zona del pulgar,
   buscador de ancho completo y chips con scroll horizontal. El detalle de forma
   está en `vistas/guiones.css`. Verificado a 375 px y a 1280 px.
   ============================================================================= */

(function () {
"use strict";

/* ------------------------------------------------------------- constantes */

/* El equipo no piensa en siglas y la regla 11 del `criterio-equipo-medido.md`
   («escribe como para un novato absoluto») prohíbe la jerga. Mismo diccionario
   que el resto del panel. */
var ETAPA_HUMANO = {
  TOFU: "Para que te descubran",
  MOFU: "Para que te consideren",
  BOFU: "Para que compren"
};

var ETAPAS_ORDEN = ["TOFU", "MOFU", "BOFU"];

/* Familias de corte. Salen del PREFIJO DEL ID, que sí está en el dato — no de
   suponer quién habla. Medido hoy: 14 ids `QA*` y 28 ids `JUNTOS*`.
   `d` es lo único que se afirma de cada familia, y es factual. */
var FAMILIAS = {
  QA:     {n: "Q-A",    d: "pregunta y respuesta del podcast"},
  JUNTOS: {n: "Juntos", d: "tramo del podcast a dos"}
};

/* Qué tipo de orden escribe esta pantalla. Literal del §2.B / §7.1. */
var TIPO_ORDEN = "producir_guion";

/* --------------------------------------------------------- estado privado */

var MONTADO  = false;
var BUSCA    = "";      /* texto del buscador local — sobrevive a los repintados */
var EN_VUELO = {};      /* {idGuion:true} candado anti doble clic / doble handler */
var FALLIDOS = {};      /* {idGuion:true} el POST no se pudo verificar */
var FILTRO   = {etapa: "todo"};   /* reserva, solo si index.html no trae FETAPA */
var PROPIOS  = false;   /* ¿pinté yo los filtros? → entonces los cableo yo */

/* ------------------------------------------------- puentes con los globals */
/* `typeof` sobre un identificador inexistente no lanza; leerlo a pelo sí. */

function _guiones() {
  try {
    if (typeof GUIONES !== "undefined" && GUIONES && GUIONES.length) return GUIONES;
  } catch (e) {}
  return [];
}
function _mio() {
  try { if (typeof MIO !== "undefined" && MIO) return MIO; } catch (e) {}
  return null;
}
function _yo() {
  try { if (typeof YO !== "undefined" && YO) return YO; } catch (e) {}
  return "";
}
function _fc() { try { if (typeof FCUENTA !== "undefined") return FCUENTA || "todo"; } catch (e) {} return "todo"; }
function _fe() { try { if (typeof FETAPA  !== "undefined") return FETAPA  || "todo"; } catch (e) {} return FILTRO.etapa; }
function _setEtapa(v) { FILTRO.etapa = v; try { FETAPA = v; } catch (e) {} }

/* ¿Se puede escribir? Si no hay `guardarMio` o no hay YO, la pantalla entra en
   SOLO-LECTURA y lo dice — jamás un botón que parece que funciona y no escribe. */
function _puedeEncolar() {
  try { if (typeof guardarMio !== "function") return false; } catch (e) { return false; }
  return !!_yo();
}

function avisar(t, mal) {
  try { if (typeof aviso === "function") { aviso(t, mal); return; } } catch (e) {}
  if (mal) console.warn("[guiones]", t); else console.log("[guiones]", t);
}
function pintar() {
  try { if (typeof render === "function") { render(); return; } } catch (e) {}
  var app = document.querySelector("#app");
  if (app) { app.innerHTML = vistaGuiones(); }
}

/* ------------------------------------------------------------- utilidades */

/* Copia local IDÉNTICA al `esc()` de index.html (§3.4: TODO texto de datos que
   entre en un template pasa por aquí). Local para que la vista funcione aunque
   se cargue antes que index.html. */
function esc_(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
    return {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c];
  });
}

/* Un id de guion acaba en un atributo del DOM: se limpia por si algún día trae
   un carácter raro. */
function slug_(s) { return String(s == null ? "" : s).replace(/[^A-Za-z0-9_-]+/g, "_"); }

/* Identificador único y estable por orden (§7.2). `crypto.randomUUID` no existe
   en iOS < 15.4 y el equipo revisa desde el móvil: hay dos reservas, y la última
   sigue siendo única en la práctica (id del guion + reloj + aleatorio). */
function oid_() {
  try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
  try {
    if (window.crypto && crypto.getRandomValues) {
      var a = new Uint8Array(16); crypto.getRandomValues(a);
      a[6] = (a[6] & 0x0f) | 0x40; a[8] = (a[8] & 0x3f) | 0x80;
      var h = []; for (var i = 0; i < 16; i++) h.push((a[i] + 0x100).toString(16).slice(1));
      return h.slice(0,4).join("") + "-" + h.slice(4,6).join("") + "-" + h.slice(6,8).join("") +
             "-" + h.slice(8,10).join("") + "-" + h.slice(10,16).join("");
    }
  } catch (e) {}
  return "oid-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

/* Formato LITERAL del panel vivo. No se toca: el listener deduplica con él. */
function cuandoAhora() {
  return new Date().toISOString().slice(0, 16).replace("T", " ");
}

/* Segundos del podcast → "27:42". `tabular-nums` en el CSS evita que las cifras
   bailen al repintar (§4). */
function mmss(s) {
  var t = Math.max(0, Math.floor(+s || 0));
  return Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0");
}
function segRedondo(s) { return Math.round(+s || 0); }

function etapaDe(g) { return String(g.etapa || "").toUpperCase(); }

/* La familia sale del PREFIJO DEL ID (dato real), nunca de suponer quién habla. */
function familiaDe(g) {
  var id = String(g.id || "");
  var m = id.match(/^[A-Za-z]+/);
  var k = m ? m[0].toUpperCase() : "";
  return FAMILIAS[k] ? {k: k, n: FAMILIAS[k].n, d: FAMILIAS[k].d}
                     : {k: k || "OTRO", n: k || "Corte", d: ""};
}

/* --------------------------------------------------- lo que ya está en cola */

/* La verdad de «esto ya lo pedí» está en el bin, no en el DOM.
   ⚠ Solo se ven MIS órdenes: `leerBlob()` copia el bin entero a `MIO` únicamente
     cuando `quien === YO`, y `ordenes` no se fusiona en la base. Así que si Javi
     encoló un corte, en la pantalla de Jordi sigue diciendo PRODUCIR. Es una
     limitación REAL del contrato de hoy, no un despiste: arreglarla es fusionar
     `ordenes` en `leerBlob()`, y eso toca index.html, no esta vista. Se dice en
     la propia pantalla en vez de fingir que el estado es de todos. */
function ordenesMias() {
  var m = _mio();
  var arr = (m && m.ordenes) || [];
  var out = {};
  for (var i = 0; i < arr.length; i++) {
    var o = arr[i];
    if (!o || o.tipo !== TIPO_ORDEN || !o.id) continue;
    /* Si hay varias del mismo corte, manda la más reciente por `cuando`. */
    if (!out[o.id] || String(o.cuando || "") > String(out[o.id].cuando || "")) out[o.id] = o;
  }
  return out;
}
function enCola(g, mapa) { return !!(mapa || ordenesMias())[g.id]; }

/* --------------------------------------------------------------- selección */

/* §5.7: el contador de la pestaña es `GUIONES.length` — TODOS los cortes, no
   los que deje ver el filtro. Si el filtro está en BOFU, el número de la pestaña
   no puede bajar: los TOFU siguen ahí. */
function guionesPodcast() { return _guiones(); }

function coincide(g, q) {
  if (!q) return true;
  var t = (String(g.id || "") + " " + String(g.hook || "") + " " +
           String(g.estructura || g.porque || "") + " " + String(g.etapa || "")).toLowerCase();
  if (t.normalize) t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return t.indexOf(q) >= 0;
}
function normBusca(s) {
  var q = String(s || "").toLowerCase().trim();
  if (q.normalize) q = q.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return q;
}

function visibles() {
  var fe = String(_fe()).toUpperCase(), q = normBusca(BUSCA);
  /* El filtro de CUENTA no se aplica a propósito: `GUIONES` no trae `cuenta`.
     Ver la cabecera, «EL FILTRO DE CUENTA». */
  return guionesPodcast().filter(function (g) {
    if (fe !== "TODO" && etapaDe(g) !== fe) return false;
    return coincide(g, q);
  });
}

/* Grupos construidos desde los DATOS, no desde una lista fija: TOFU/MOFU/BOFU
   delante y detrás cualquier etapa nueva (o vacía) con su encabezado. Así ningún
   corte desaparece de la pantalla en silencio mientras el contador lo cuenta. */
function gruposDe(gs) {
  var vistos = {}, extra = [];
  gs.forEach(function (g) {
    var v = etapaDe(g);
    if (vistos[v]) return;
    vistos[v] = true;
    if (ETAPAS_ORDEN.indexOf(v) < 0) extra.push(v);
  });
  extra.sort();
  return ETAPAS_ORDEN.filter(function (v) { return vistos[v]; }).concat(extra);
}

/* --------------------------------------------------------- componentes UI */

function filtros() {
  try {
    if (typeof filtrosHTML === "function") { PROPIOS = false; return filtrosHTML(); }
  } catch (e) {}
  /* Reserva: solo ETAPA, que es lo único que esta pantalla puede filtrar de
     verdad. No se pinta un segmentado de cuenta que no haría nada. */
  PROPIOS = true;
  var fe = String(_fe()).toUpperCase();
  var h = '<div class="gp-filtros"><div class="gp-seg" role="group" aria-label="Etapa">';
  h += ["TODO", "TOFU", "MOFU", "BOFU"].map(function (e) {
    var on = fe === e;
    return '<button type="button" data-gp-e="' + (e === "TODO" ? "todo" : e) + '"' +
           ' class="' + (on ? "on" : "") + '" aria-pressed="' + (on ? "true" : "false") + '">' +
           (e === "TODO" ? "Todas" : e) + "</button>";
  }).join("");
  return h + "</div></div>";
}

/* Cabecera: qué es esta pantalla y qué hace el botón — incluido lo que NO hace. */
function cabecera(total, visto, minutos, nCola) {
  var h = '<div class="gp-head">';
  h += '<h2 class="gp-h2">Guiones (cortes de podcast)</h2>';
  h += '<p class="gp-sub">Cortes del podcast <b>ya grabado</b>, mapeados frase a frase: ' +
       'cada uno trae el gancho <b>literal</b> dicho a cámara, su minuto exacto y su etapa. ' +
       'Toca <b>PRODUCIR</b> y se encola una orden para Claude: se corta, se subtitula y ' +
       'aparece en «Por revisar». <b>Encolar no publica nada</b> — publicar sigue siendo ' +
       'manual y con tu OK, pieza a pieza.</p>';

  h += '<div class="gp-cifras">';
  h += '<span class="gp-cifra"><b>' + total + '</b> cortes mapeados</span>';
  h += '<span class="gp-cifra"><b>' + minutos + '</b> min de material</span>';
  if (nCola) h += '<span class="gp-cifra gp-cifra-cola"><b>' + nCola + '</b> en cola</span>';
  if (visto !== total) h += '<span class="gp-cifra gp-cifra-filtro">viendo <b>' + visto + '</b></span>';
  h += "</div>";

  /* Solo-lectura visible, nunca pérdida silenciosa (§6.6). */
  if (!_puedeEncolar()) {
    h += '<p class="gp-nota gp-nota-alerta"><b>Solo lectura.</b> No hay conexión con tu ' +
         'almacén' + (_yo() ? "" : " (no has entrado con tu nombre)") + ': puedes leer los ' +
         'cortes, pero <b>ninguna orden se guardaría</b>. Los botones están desactivados a ' +
         'propósito para que no creas que se envió algo que no se envió.</p>';
  }

  /* El filtro de cuenta: se dice que no aplica en vez de fingir que filtró. */
  if (String(_fc()).toLowerCase() !== "todo") {
    h += '<p class="gp-nota">El filtro <b>' + esc_(_fc()) + '</b> no se aplica aquí: estos ' +
         'cortes salen del podcast y <b>no declaran de quién es cada frase</b>, así que ' +
         'filtrarlos por cuenta sería inventarlo. Se enseñan todos y se filtra por etapa.</p>';
  }

  h += '<p class="gp-nota gp-nota-id">Quién habla en cada corte <b>se comprueba antes de ' +
       'cortar</b>, no se deduce del nombre: los mapas del podcast marcan el hablante «por ' +
       'contexto» y ya se ha medido al menos un tramo mal atribuido.</p>';
  h += "</div>";
  return h;
}

/* El ✕ y el contador «N de 42» se emiten SIEMPRE y se pliegan con `hidden`.
   Antes se emitían solo `if (BUSCA)`, y como el buscador filtra sobre el DOM ya
   pintado (para no perderle el foco al input), NUNCA llegaba un repintado que
   pudiera crearlos mientras escribías: medido el 25-ago tecleando «millon» sobre
   los 42 cortes → 3 fichas visibles, `.gp-busca-n` = null y `[data-gp-limpiar]`
   = null. O sea: el contador y el botón de limpiar solo existían cuando ya no
   hacían falta, y para vaciar la búsqueda en el móvil había que borrar a mano
   letra a letra. Existiendo desde el primer pintado, `onInput` solo los enseña. */
function buscador(visto, total) {
  var hay = !!BUSCA;
  var h = '<div class="gp-busca-fila">';
  h += '<div class="gp-busca">';
  h += '<input type="search" class="gp-input" data-gp-busca placeholder="Buscar en los ganchos, el id o la estructura…" ' +
       'value="' + esc_(BUSCA) + '" aria-label="Buscar entre los cortes de podcast" autocomplete="off">';
  h += '<button type="button" class="gp-x" data-gp-limpiar aria-label="Limpiar la búsqueda"' +
       (hay ? "" : " hidden") + ">&times;</button>";
  h += "</div>";
  h += '<span class="gp-busca-n"' + (hay ? "" : " hidden") + ">" + visto + " de " + total + "</span>";
  return h + "</div>";
}

/* «No hay resultados». Se pinta dos veces con el mismo texto a propósito: una
   visible (cuando el repintado ya llega sin nada) y otra plegada, que es la que
   enseña el buscador al vuelo. Un solo sitio con el texto = no pueden divergir. */
function vacioBusqueda(total, plegado) {
  return '<p class="gp-vacio gp-nada"' + (plegado ? " hidden" : "") + '>' +
         "<b>Ningún corte encaja con lo que buscas.</b> " +
         '<button type="button" class="gp-link" data-gp-reset>Ver los ' + total + " cortes</button></p>";
}

/* --------------------------------------------------------------- la ficha */

function ficha(g, mapa) {
  var id    = g.id || "";
  var sid   = slug_(id);
  var fam   = familiaDe(g);
  var et    = etapaDe(g);
  var ya    = enCola(g, mapa);
  var orden = ya ? mapa[id] : null;
  var puede = _puedeEncolar();
  var mal   = !!FALLIDOS[id];

  var h = '<article class="gp-card' + (ya ? " gp-card-cola" : "") + '" id="gp-' + sid + '">';

  /* --- gancho: es lo que se lee primero y lo que hace elegir --- */
  h += '<blockquote class="gp-hook">' + esc_(g.hook || "") + "</blockquote>";

  /* --- meta: TODO sale del dato. Cero cuenta inventada. --- */
  h += '<div class="gp-meta">';
  if (et) {
    h += '<span class="gp-tag gp-etapa" data-et="' + esc_(et) + '">' + esc_(et) +
         (ETAPA_HUMANO[et] ? ' <i>· ' + esc_(ETAPA_HUMANO[et]) + "</i>" : "") + "</span>";
  }
  h += '<span class="gp-tag gp-fam"' + (fam.d ? ' title="' + esc_(fam.d) + '"' : "") + ">" +
       esc_(fam.n) + "</span>";
  if (g.dur)  h += '<span class="gp-tag gp-num">' + segRedondo(g.dur) + " s ya grabados</span>";
  if (g.t1 != null) {
    h += '<span class="gp-tag gp-num" title="Minuto exacto dentro del podcast">min ' + mmss(g.t1) +
         (g.t2 != null ? " – " + mmss(g.t2) : "") + "</span>";
  }
  if (id) h += '<span class="gp-tag gp-id">' + esc_(id) + "</span>";
  h += "</div>";

  /* --- estructura: el texto literal del mapeo. `porque` está vacío en los 42,
         pero la cadena se conserva por contrato. --- */
  var por = g.estructura || g.porque || "";
  if (por) h += '<p class="gp-estructura">' + esc_(por) + "</p>";

  /* --- la acción --- */
  h += '<div class="gp-acc">';
  if (ya) {
    h += '<button type="button" class="gp-btn gp-btn-hecho gprod" disabled ' +
         'data-gid="' + esc_(id) + '" aria-disabled="true">EN COLA &#10003;</button>';
    h += '<span class="gp-pedido">Lo pediste tú' +
         (orden && orden.cuando ? " · " + esc_(orden.cuando) : "") + "</span>";
  } else if (!puede) {
    h += '<button type="button" class="gp-btn gp-btn-off gprod" disabled ' +
         'data-gid="' + esc_(id) + '" aria-disabled="true">Sin conexión</button>';
  } else {
    h += '<button type="button" class="gp-btn gp-btn-prod gprod" data-gp-prod="' + esc_(id) + '" ' +
         'data-gid="' + esc_(id) + '">PRODUCIR</button>';
  }
  h += "</div>";

  if (mal) {
    h += '<p class="gp-error" role="status">No se pudo guardar la orden (almacén caído). ' +
         "<b>No está en cola.</b> Vuelve a intentarlo.</p>";
  }

  return h + "</article>";
}

/* ------------------------------------------------------------- LA VISTA */

function vistaGuiones() {
  var todos = guionesPodcast();
  var vs    = visibles();
  var mapa  = ordenesMias();
  var nCola = todos.filter(function (g) { return !!mapa[g.id]; }).length;
  var mins  = Math.round(todos.reduce(function (a, g) { return a + (+g.dur || 0); }, 0) / 60);

  var h = '<section class="gp-root">';
  h += cabecera(todos.length, vs.length, mins, nCola);

  if (!todos.length) {
    h += '<p class="gp-vacio"><b>No hay cortes cargados.</b> Esta pantalla vive de la ' +
         'constante <code>GUIONES</code>; si está vacía, no hay nada que mapear todavía.</p>';
    return h + "</section>";
  }

  h += filtros();
  h += buscador(vs.length, todos.length);

  if (!vs.length) {
    h += vacioBusqueda(todos.length, false);
    return h + "</section>";
  }

  /* El mismo aviso, pero PLEGADO. El buscador filtra sobre el DOM ya pintado
     (para no perder el foco del input), así que si dejas la lista a cero al
     teclear no hay repintado que pueda añadirlo: tiene que estar ya ahí.
     Sin esto, escribir algo que no existe deja una pantalla en blanco sin una
     sola palabra de explicación — que es como se lee «el panel está roto». */
  h += vacioBusqueda(todos.length, true);

  gruposDe(vs).forEach(function (et) {
    var lote = vs.filter(function (g) { return etapaDe(g) === et; });
    if (!lote.length) return;
    h += '<h3 class="gp-sec"><span class="gp-sec-n">' + esc_(et || "Sin etapa") + "</span>" +
         (ETAPA_HUMANO[et] ? '<span class="gp-sec-d">' + esc_(ETAPA_HUMANO[et]) + "</span>" : "") +
         '<span class="gp-sec-c">' + lote.length + "</span></h3>";
    h += '<div class="gp-lista">';
    lote.forEach(function (g) { h += ficha(g, mapa); });
    h += "</div>";
  });

  return h + "</section>";
}

/* -------------------------------------------------------- ENCOLAR (§7.1) */

/* El único punto de escritura del fichero. Escribe SOLO en `ordenes` del bin de
   YO, por `guardarMio()` — nunca en el BLOB (§2.B). */
function encolar(gid, btn) {
  if (!gid) return;

  /* Candado en vuelo: red de seguridad contra el doble clic Y contra que
     index.html cablee `.gprod` por su cuenta. Con esto, un doble disparo escribe
     UNA orden, no dos — que es justo lo que el `oid` existe para evitar. */
  if (EN_VUELO[gid]) return;
  if (!_puedeEncolar()) {
    avisar("Sin conexión con tu almacén: la orden NO se ha enviado.", true);
    return;
  }

  EN_VUELO[gid] = true;
  delete FALLIDOS[gid];

  var previo = null;
  if (btn) {
    previo = btn.innerHTML;
    btn.disabled = true;
    btn.classList.add("gp-btn-espera");
    btn.textContent = "Enviando…";
  }

  var oid = oid_();
  var orden = {
    oid:    oid,                 /* §7.2 — dedup estable del listener */
    tipo:   TIPO_ORDEN,          /* literal */
    id:     gid,                 /* literal */
    por:    _yo(),
    cuando: cuandoAhora()        /* formato literal del panel vivo */
  };

  var p;
  try { p = guardarMio(function (mio) { mio.ordenes.push(orden); }); } catch (e) { p = null; }

  Promise.resolve(p).then(function () {
    /* ⛔ NO se canta victoria por que el `.then` haya llegado: `guardarMio()`
       resuelve igual cuando los 3 reintentos fallan (avisa y hace `return`).
       Se VERIFICA que la orden está en el bin ya releído. Doctrina, ley 1. */
    var m = _mio();
    var ok = !!(m && m.ordenes && m.ordenes.some(function (o) { return o && o.oid === oid; }));
    if (ok) {
      avisar("Orden enviada: producir " + gid);
    } else {
      FALLIDOS[gid] = true;
      avisar("No se pudo encolar «" + gid + "». NO está en cola.", true);
    }
  }).catch(function () {
    FALLIDOS[gid] = true;
    avisar("No se pudo encolar «" + gid + "». NO está en cola.", true);
  }).then(function () {
    delete EN_VUELO[gid];
    /* Repintar es lo correcto aquí: el estado del botón sale de `MIO.ordenes`,
       así que el repintado lo deja bien tanto si fue como si no. Si `render()`
       no existiera, se restaura el botón a mano para no dejarlo en «Enviando…». */
    var hayRender = false;
    try { hayRender = typeof render === "function"; } catch (e) {}
    if (hayRender) { pintar(); }
    else if (btn) {
      btn.classList.remove("gp-btn-espera");
      if (FALLIDOS[gid]) { btn.disabled = false; btn.innerHTML = previo; }
      else { btn.textContent = "EN COLA ✓"; btn.classList.add("gp-btn-hecho"); }
    }
  });
}

/* -------------------------------------------------- delegación de eventos */
/* UN solo listener sobre `document` (§3.4). Nada de `onclick` inline. */

function onClick(ev) {
  var root = ev.target && ev.target.closest ? ev.target.closest(".gp-root") : null;
  if (!root) return;
  var b = ev.target.closest("button");
  if (!b) return;

  if (b.hasAttribute("data-gp-prod")) {
    ev.preventDefault();
    encolar(b.getAttribute("data-gp-prod"), b);
    return;
  }
  if (b.hasAttribute("data-gp-limpiar")) { BUSCA = ""; pintar(); return; }
  if (b.hasAttribute("data-gp-reset"))   { BUSCA = ""; _setEtapa("todo"); pintar(); return; }

  /* Filtros: SOLO los de reserva. Si los pintó `filtrosHTML()` de index.html,
     los cablea index.html; cablearlos aquí también repintaría dos veces. */
  if (PROPIOS && b.hasAttribute("data-gp-e")) { _setEtapa(b.getAttribute("data-gp-e")); pintar(); return; }
}

/* El buscador filtra al teclear, pero repintar la vista entera en cada tecla
   mataría el foco del input. Se filtra en el DOM ya pintado (enseñar/ocultar) y
   solo se guarda el texto para que sobreviva al siguiente repintado de verdad. */
function onInput(ev) {
  var i = ev.target;
  if (!i || !i.hasAttribute || !i.hasAttribute("data-gp-busca")) return;
  BUSCA = i.value;
  var q = normBusca(BUSCA), gs = _guiones(), porId = {};
  gs.forEach(function (g) { porId[slug_(g.id)] = g; });

  var vistos = 0;
  document.querySelectorAll(".gp-root .gp-card").forEach(function (c) {
    var g = porId[String(c.id).replace(/^gp-/, "")];
    var fe = String(_fe()).toUpperCase();
    var ok = !!g && coincide(g, q) && (fe === "TODO" || etapaDe(g) === fe);
    c.hidden = !ok;
    if (ok) vistos++;
  });
  /* Las cabeceras de etapa que se quedan sin fichas visibles se esconden: si no,
     queda un «BOFU 24» encabezando una lista vacía. */
  document.querySelectorAll(".gp-root .gp-lista").forEach(function (l) {
    var quedan = l.querySelector(".gp-card:not([hidden])");
    l.hidden = !quedan;
    var sec = l.previousElementSibling;
    if (sec && sec.classList.contains("gp-sec")) {
      sec.hidden = !quedan;
      var c = sec.querySelector(".gp-sec-c");
      if (c) c.textContent = l.querySelectorAll(".gp-card:not([hidden])").length;
    }
  });
  var n = document.querySelector(".gp-root .gp-busca-n");
  if (n) { n.textContent = vistos + " de " + gs.length; n.hidden = !q; }
  var x = document.querySelector(".gp-root [data-gp-limpiar]");
  if (x) x.hidden = !q;
  /* Cero resultados sin una palabra que lo explique se lee como «se ha roto». */
  var nada = document.querySelector(".gp-root .gp-nada");
  if (nada) nada.hidden = vistos > 0;
}

function montar() {
  if (MONTADO) return;
  MONTADO = true;
  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
}

/* ---------------------------------------------------------------- salida */

window.vistaGuiones    = vistaGuiones;
window.cablearGuiones  = montar;
/* `render()` lo usa para el contador `#ngui` (§5.7). Se exporta desde aquí para
   que el número de la pestaña y la lista sean el MISMO cálculo. */
window.guionesPodcast  = guionesPodcast;
window.VISTA_GUIONES = {
  vistaGuiones: vistaGuiones, cablear: montar,
  guionesPodcast: guionesPodcast, visibles: visibles,
  ficha: ficha, encolar: encolar, ordenesMias: ordenesMias,
  ETAPA_HUMANO: ETAPA_HUMANO, FAMILIAS: FAMILIAS, TIPO_ORDEN: TIPO_ORDEN
};

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", montar);
else montar();

})();
