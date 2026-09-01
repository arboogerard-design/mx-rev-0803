/* ============================================================================
 * vistas/espia.js  ·  FABRICA / ESPIA  —  §5.1 de BUILD_SPEC_PANEL_ELITE.md
 * ============================================================================
 *
 * QUE HACE
 *   Pinta EL CORAZON del panel: la parrilla de referentes MEDIDOS con el boton
 *   REPLICAR. Un clic escribe una orden {tipo:"replicar"} en el bin npoint de
 *   quien pulsa; `panel_listener.py` la recoge cada 120 s y el productor (§7.3)
 *   monta el clon, que aparece solo en "Por revisar". El panel NO produce y NO
 *   publica: SOLO ENCOLA (ley 8 de la doctrina, §1.3 de la spec).
 *   Ademas: anadir un referente nuevo al espia (va al BLOB, clave `referentes`)
 *   y abrir el ANALISIS de cada molde — que se toca y que NO se toca.
 *
 * DE QUE DATOS VIVE  (todo real y medido; cero dato inventado — ley 4)
 *   referentes.json .medidos[]  134 referentes medidos en disco:
 *        {sc,url,fichero,carpeta,dur,cortes_s_030,cortes_s_012,n_030,n_012,
 *         familia,estado,medida,quien,bytes}
 *        familia: talking 65 · meme 29 · carrusel 26 · montaje 4 · "" 10
 *   referentes.json .pares[]    (= REFS_PAREJA) para saber si un molde YA se
 *        clono en una pieza nuestra y sacar su miniatura local de media/_ref/
 *   REFS_MEDIDOS   semilla inline (30) — UNICA fuente de likes/coms/autor
 *   ESPIA_ANALISIS semilla inline (10) — receta / TOCAR / NO TOCAR
 *   REFS_INI       semilla inline (12) — respaldo de E.referentes si el BLOB cae
 *   E.referentes   BLOB npoint (vivo): los links que va pegando el equipo
 *   MIO.ordenes    bin npoint de YO: para que "PEDIDO ✓" sobreviva a un F5
 *
 * CONSTANTES/FUNCIONES GLOBALES QUE ESPERA (contrato §2 y §3, nombres literales)
 *   E · MIO · YO · REFS_PAREJA · FETAPA          (estado)
 *   esc(s) · aviso(t,mal) · render()             (utilidades del shell)
 *   guardar(aplicar)     -> escribe el BLOB   (aqui: `referentes`)
 *   guardarMio(aplicar)  -> escribe BINS[YO]  (aqui: SOLO `ordenes`)
 *   REFS_MEDIDOS · ESPIA_ANALISIS · REFS_INI     (opcionales: si el shell las
 *        declara mandan las suyas; si no, manda el respaldo de aqui abajo)
 *   Si falta cualquiera de ellas el modulo NO revienta: cae al respaldo y avisa.
 *
 * QUE EXPORTA
 *   window.vistaEspia()    -> string con el HTML de la pantalla
 *   window.cablearEspia()  -> engancha la delegacion en #app (IDEMPOTENTE)
 *   window.nRefsEspia()    -> nº de referentes del radar, para el badge #nref
 *
 * NO TOCA index.html. Todos los eventos van por DELEGACION sobre #app: cero
 * onclick inline, y sobrevive a cada `app.innerHTML = vista()` sin recablear.
 * El acento violeta (--acc) es de la MAQUINA: aqui solo lo lleva REPLICAR.
 * ========================================================================= */
(function () {
  "use strict";

  /* ======================================================================
     1 · SEMILLAS  (copiadas LITERALES del index.html de 1.371 lineas contra
         el que se midio la spec; §2.A "seeds sin fichero de disco propio")
     ================================================================== */

  /* likes/coms/autor: NO estan en ningun .json de disco, solo aqui. */
  const SEED_MEDIDOS = [{"etapa": "TOFU", "sc": "DbPXWbuz3rB", "likes": 144, "coms": 87, "autor": "ramiro.cubria"}, {"etapa": "TOFU", "sc": "Dat6ISIz2o2", "likes": 1050, "coms": 137, "autor": "ramiro.cubria"}, {"etapa": "TOFU", "sc": "DaRljBWT-6v", "likes": 214, "coms": 77, "autor": "ramiro.cubria"}, {"etapa": "MOFU", "sc": "DbV_iq7zwVP", "likes": 420, "coms": 110, "autor": "ramiro.cubria"}, {"etapa": "MOFU", "sc": "DbD6TNeTOoj", "likes": 387, "coms": 112, "autor": "ramiro.cubria"}, {"etapa": "MOFU", "sc": "Da3DHH_lMDR", "likes": 1247, "coms": 377, "autor": "ramiro.cubria"}, {"etapa": "BOFU", "sc": "DUN7gu6DT1p", "likes": 24, "coms": 5, "autor": "64639108237"}, {"etapa": "BOFU", "sc": "Da1FtiugJhd", "likes": 262, "coms": 3, "autor": "ramiro.cubria"}, {"etapa": "BOFU", "sc": "DbY_gjPTpaW", "likes": 168, "coms": 3, "autor": "ramiro.cubria"}, {"etapa": "BOFU", "sc": "DbQqHCxz4Pm", "likes": 572, "coms": 31, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DXpX3NgD4OM", "likes": 51528, "coms": 273, "autor": "arz.urus"}, {"etapa": "", "sc": "DVb2nT3jHO8", "likes": 26173, "coms": 73, "autor": "arz.urus"}, {"etapa": "", "sc": "DV_iaVjkbkg", "likes": 2931, "coms": 1797, "autor": "herasmedia"}, {"etapa": "", "sc": "DVtUufRDAZD", "likes": 5158, "coms": 1933, "autor": "jaimehigueraes"}, {"etapa": "", "sc": "DV54ns0ClFB", "likes": 20816, "coms": 1589, "autor": "javiniguezoficial"}, {"etapa": "", "sc": "DXwRG9nKd0J", "likes": 1129, "coms": 392, "autor": "javiniguezoficial"}, {"etapa": "", "sc": "DZU9zA2CUQh", "likes": 259, "coms": 650, "autor": "jesusorozcomo"}, {"etapa": "", "sc": "DWZhstNiv74", "likes": 184, "coms": 7, "autor": "jesusorozcomo"}, {"etapa": "", "sc": "DYnQZQFRob8", "likes": 830, "coms": 6, "autor": "marcverdu_"}, {"etapa": "", "sc": "DZuwXlmiyo2", "likes": 775, "coms": 50, "autor": "marcverdu_"}, {"etapa": "", "sc": "DZXwuEmjboX", "likes": 291, "coms": 142, "autor": "mpelaezecom"}, {"etapa": "", "sc": "DZaHhkGEbUM", "likes": 160, "coms": 38, "autor": "mpelaezecom"}, {"etapa": "", "sc": "DWM-BHBCZ61", "likes": 444, "coms": 880, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DVtVNLSDpTV", "likes": 333, "coms": 1, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DW65chdCcLY", "likes": 157, "coms": 47, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DX5PDMcnJ0c", "likes": 108, "coms": 34, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DZGssIvk8Nm", "likes": 66, "coms": 13, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DXzpkyanD6b", "likes": 58, "coms": 10, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DZdt6-XHAm1", "likes": 44, "coms": 8, "autor": "ramiro.cubria"}, {"etapa": "", "sc": "DZi8pm_k9U1", "likes": 35, "coms": 3, "autor": "ramiro.cubria"}];

  /* receta + que tocar + que NO tocar, por shortcode. */
  const SEED_ANALISIS = {"DbPXWbuz3rB": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "Dat6ISIz2o2": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "DaRljBWT-6v": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "DbV_iq7zwVP": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "DbD6TNeTOoj": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "Da3DHH_lMDR": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "Da1FtiugJhd": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "DbY_gjPTpaW": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "DbQqHCxz4Pm": {"receta": "Carrusel 8 slides · molde verde #BAFC68 · titular 2-4 palabras/línea · cifra DENTRO de la imagen · CTA comenta palabra clave", "tocar": ["La ESTRUCTURA slide a slide (hook → 3-5 pasos → prueba → CTA)", "El copy: inspirarse, tema nuestro (dolor dueño de tienda)", "La estética completa (regla 18 de Santi: se copia)"], "evitar": ["Cambiar el molde/tipografía (réplica-100: si no cabe, se acorta el TEXTO)", "Poner la cifra en el caption (va dentro de la imagen)", "Jerga: ROAS/CPA/funnel fuera (regla 11)"]}, "Db1IqIop5hM": {"receta": "Meme co1e0 8,0 s · plano fijo 0 cortes · banda + texto arriba · foto fija · música fija · fade oscuro→claro 2 s (medido en el clon LIQUIDEZ)", "tocar": ["SOLO el texto de la banda (frase entendible por novato)", "El caption corto tipo remate"], "evitar": ["La foto (fija por persona, exenta de cooldown)", "La música y el efecto de arranque (Jordi: «siempre me pasas todo cambiado»)", "Meter cortes (0 cortes ES el formato)"]}};

  /* respaldo de E.referentes cuando npoint no responde (solo-lectura, §6.6). */
  const SEED_REFS_INI = [{"url": "https://www.instagram.com/reel/DaqvZzYO_Iv/", "quien": "Jordi", "fecha": "2026-08-08 13:48", "nota": "https://www.instagram.com/reel/DaqvZzYO_Iv/?igsh=MTloNzNidzFyeGsxaQ==", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/reel/DbTnQUesFoM/", "quien": "Jordi", "fecha": "2026-08-08 11:36", "nota": "https://www.instagram.com/reel/DbTnQUesFoM/?igsh=ZzRpODFsMmY3bmM3", "etapa": "", "estado": "sin analizar"}, {"url": "https://vm.tiktok.com/ZN8R2emMF/", "quien": "Javi", "fecha": "2026-08-07 22:52", "nota": "https://vm.tiktok.com/ZN8R2emMF/", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/reel/DZVg160Av8T/", "quien": "Jordi", "fecha": "2026-08-05 19:34", "nota": "https://www.instagram.com/reel/DZVg160Av8T/?igsh=bnN3NWd3NHdpYzFr", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/reel/DboRmIVmE_T/", "quien": "Jordi", "fecha": "2026-08-05 18:57", "nota": "https://www.instagram.com/reel/DboRmIVmE_T/?igsh=eHBvaHRhN3FrNnpt", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/reel/DboGwoJpEkN/", "quien": "Javi", "fecha": "2026-08-04 22:30", "nota": "https://www.instagram.com/reel/DboGwoJpEkN/?igsh=anZ5NnFicTF0anp0", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/p/DbluprHjJci/", "quien": "Javi", "fecha": "2026-08-03 22:30", "nota": "https://www.instagram.com/p/DbluprHjJci/?img_index=3&igsh=MWZnamszdGIyOG05cA==", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/p/DbCMsQZs-CY/", "quien": "Javi", "fecha": "2026-07-30 17:21", "nota": "https://www.instagram.com/p/DbCMsQZs-CY/?igsh=eXgzc3hra2Fxcms=", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/reel/DU9CyYnic7e/", "quien": "Jordi", "fecha": "2026-07-29 21:38", "nota": "https://www.instagram.com/reel/DU9CyYnic7e/?igsh=MW5ybnBiMDVwNWVqMQ==", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/reel/DbTmnMfpbIE/", "quien": "Jordi", "fecha": "2026-07-29 21:35", "nota": "https://www.instagram.com/reel/DbTmnMfpbIE/?igsh=MTNvN3p6bWp0MXdoNg==", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/reel/DbT72A9MVHH/", "quien": "Jordi", "fecha": "2026-07-28 19:39", "nota": "https://www.instagram.com/reel/DbT72A9MVHH/?igsh=MXJ3M2hiOHo2dTlyeg==", "etapa": "", "estado": "sin analizar"}, {"url": "https://www.instagram.com/p/Da0Ul55ANXx/", "quien": "Javi", "fecha": "2026-07-26 22:55", "nota": "https://www.instagram.com/p/Da0Ul55ANXx/?igsh=MXMyZTF1amd6MXQ4Mw==", "etapa": "", "estado": "sin analizar"}];

  /* Gerard 15-ago: "aqui SOLO competencia — ni Santi ni nuestras cuentas".
     Se filtra por autor Y por quien lo paso. */
  const ESPIA_FUERA = new Set(["santiagovilatta", "64639108237", "duartesanti_",
    "duartesanti", "jordigarcia89", "javier.sanchezecom"]);

  /* ======================================================================
     2 · PUENTES CON EL CONTRATO GLOBAL
         Todo acceso a un global va envuelto: si el shell aun no lo declaro
         (o esta en TDZ) devolvemos respaldo en vez de tirar la pantalla.
     ================================================================== */

  /* Los globales del shell son `let`/`const`/`function` de nivel raíz: NO cuelgan
     de window, así que hay que nombrarlos uno a uno. El try/catch cubre el caso
     de que este fichero cargue ANTES que index.html (TDZ) o de que el shell no
     los declare: entonces el módulo cae al respaldo en vez de tirar la pantalla.
     Cero `eval` a propósito — un CSP estricto lo bloquearía (§3.5). */
  const GLOBAL = {
    E:          () => { try { return typeof E          !== "undefined" ? E          : undefined; } catch (e) {} },
    MIO:        () => { try { return typeof MIO        !== "undefined" ? MIO        : undefined; } catch (e) {} },
    YO:         () => { try { return typeof YO         !== "undefined" ? YO         : undefined; } catch (e) {} },
    FETAPA:     () => { try { return typeof FETAPA     !== "undefined" ? FETAPA     : undefined; } catch (e) {} },
    REFS_PAREJA:() => { try { return typeof REFS_PAREJA!== "undefined" ? REFS_PAREJA: undefined; } catch (e) {} },
    REFS_MEDIDOS:()=> { try { return typeof REFS_MEDIDOS!=="undefined" ? REFS_MEDIDOS:undefined; } catch (e) {} },
    ESPIA_ANALISIS:()=>{ try { return typeof ESPIA_ANALISIS!=="undefined"?ESPIA_ANALISIS:undefined; } catch (e) {} },
    REFS_INI:   () => { try { return typeof REFS_INI   !== "undefined" ? REFS_INI   : undefined; } catch (e) {} },
    esc:        () => { try { return typeof esc        !== "undefined" ? esc        : undefined; } catch (e) {} },
    aviso:      () => { try { return typeof aviso      !== "undefined" ? aviso      : undefined; } catch (e) {} },
    render:     () => { try { return typeof render     !== "undefined" ? render     : undefined; } catch (e) {} },
    guardar:    () => { try { return typeof guardar    !== "undefined" ? guardar    : undefined; } catch (e) {} },
    guardarMio: () => { try { return typeof guardarMio !== "undefined" ? guardarMio : undefined; } catch (e) {} }
  };
  function g(nombre) { const f = GLOBAL[nombre]; return f ? f() : undefined; }
  const _escFallback = s => String(s == null ? "" : s)
    .replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function X(s) { const f = g("esc"); return (typeof f === "function" ? f : _escFallback)(s); }
  function toast(t, mal) {
    const f = g("aviso");
    if (typeof f === "function") return f(t, mal);
    if (mal) console.warn("[espia]", t); else console.log("[espia]", t);
  }
  function repinta() {
    /* SOLO si mi pantalla esta puesta. El shell precalienta los modulos por
       detras (`calienta()`) mientras el equipo trabaja en OTRA pestana, y este
       fichero llama a repinta() cuando le resuelve un fetch — justo durante ese
       precalentamiento. Un render() de mas repinta #app ENTERO y borra el motivo
       que estuvieras escribiendo en "Corregir" (el propio index.html lo avisa en
       el comentario de `calienta`). Si no estoy en pantalla, refresco solo el
       badge #nref, que es lo unico mio que se ve desde fuera. */
    if (!document.querySelector(".fab")) {
      if (typeof window.pintaContadores === "function")
        try { window.pintaContadores(); } catch (e) {}
      return;
    }
    const f = g("render");
    if (typeof f === "function") return f();
    const nodo = document.querySelector(".fab");            // shell minimo: repinto lo mio
    if (nodo) nodo.outerHTML = vistaEspia();
  }
  function yo() { return g("YO") || ""; }
  function ahora() {                        // formato literal del contrato: "YYYY-MM-DD HH:MM"
    return new Date().toISOString().slice(0, 16).replace("T", " ");
  }
  /* §7.2: el listener deduplica por campos mutables y dos guiones pedidos el
     mismo minuto colisionan. El front escribe un id ESTABLE por orden. */
  function nuevoOid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "o" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  const MEDIDOS = () => { const v = g("REFS_MEDIDOS"); return (Array.isArray(v) && v.length) ? v : SEED_MEDIDOS; };
  const ANALISIS = () => { const v = g("ESPIA_ANALISIS"); return (v && typeof v === "object") ? v : SEED_ANALISIS; };
  const REFS_BLOB = () => {
    const e = g("E");
    const vivos = (e && Array.isArray(e.referentes)) ? e.referentes : null;
    if (vivos && vivos.length) return vivos;
    const ini = g("REFS_INI");
    return (Array.isArray(ini) && ini.length) ? ini : SEED_REFS_INI;   // npoint caido
  };
  const HAY_BLOB = () => { const e = g("E"); return !!(e && Array.isArray(e.referentes) && e.referentes.length); };

  /* FETAPA es un `let` global: se puede leer y escribir, pero puede no existir.
     Guardamos un espejo local para que el filtro funcione igual en solitario. */
  let ETAPA_LOCAL = "todo";
  function etapaActiva() { const v = g("FETAPA"); return v || ETAPA_LOCAL || "todo"; }
  function setEtapa(v) {
    ETAPA_LOCAL = v;
    try { if (typeof FETAPA !== "undefined") FETAPA = v; } catch (e) {}
  }

  /* ======================================================================
     3 · DATOS DE DISCO — referentes.json
         El shell ya hace este mismo fetch para REFS_PAREJA (§2.A). Lo
         repetimos aqui para que el modulo sea AUTONOMO: es el mismo fichero
         cacheable, y en cuanto llega repintamos. Mismo patron que usaba el
         index.html viejo con REFS_PAREJA.
     ================================================================== */
  let MEDIDOS_DISCO = [];        // referentes.json .medidos
  let PARES_DISCO = [];          // referentes.json .pares (respaldo de REFS_PAREJA)
  let DISCO_ESTADO = "cargando"; // cargando | ok | sin-fichero

  fetch("referentes.json").then(r => r.ok ? r.json() : null).then(d => {
    if (!d) { DISCO_ESTADO = "sin-fichero"; return; }
    MEDIDOS_DISCO = Array.isArray(d.medidos) ? d.medidos : [];
    PARES_DISCO = Array.isArray(d.pares) ? d.pares : [];
    DISCO_ESTADO = "ok";
    repinta();
  }).catch(() => { DISCO_ESTADO = "sin-fichero"; });

  /* moldes.json — LA RECETA DEL CLON, y estaba muerta en el repo.
     26 KB ya publicados junto al index.html que —medido con grep el 25-ago— no
     leia NADIE: ni el shell ni ninguna de las 7 vistas. Cubre 98 de los 134
     referentes y trae justo los ejes con los que se clona 1:1 y con los que se
     revisa despues (`refHTML`, §5.2): cuando ENTRA LA MUSICA (76 medidos),
     donde cae el PRIMER CORTE (69) y la BANDA del meme —%, y su hex— (76),
     que es el canon que Gerard midio el 14-ago (Javi negra / Jordi blanca).
     Sin esto la tarjeta solo sabia decir duracion y cortes/s. */
  let MOLDES = {};
  fetch("moldes.json").then(r => r.ok ? r.json() : null).then(d => {
    if (d && typeof d === "object" && !Array.isArray(d)) { MOLDES = d; repinta(); }
  }).catch(() => {});
  const molde = sc => MOLDES[sc] || {};

  function pares() {
    const v = g("REFS_PAREJA");                       // el shell lo indexa por pieza
    if (v && typeof v === "object" && Object.keys(v).length) return Object.values(v);
    return PARES_DISCO;
  }

  /* De un par (pieza <-> referente) se saca el shortcode que se clono:
     `como` viene como "shortcode DK7yeriOaKU bajado en CARRUSELES". */
  function scDelPar(p) {
    const m = String((p && p.como) || "").match(/shortcode\s+([A-Za-z0-9_-]+)/);
    if (m) return m[1];
    /* `como` no siempre lo dice: 21 de los 71 pares ponen solo "ruta local
       verificada". Pero `origen` guarda el fichero del que se clono y muchas
       veces ES el shortcode ("DZXwuEmjboX.mp4"). Medido: recupera 4 moldes mas,
       uno de ellos el unico par de JAVI_NICHO_MERCADO_20AGO — sin esto esa
       tarjeta no sabia que su clon YA existe. */
    const o = String((p && p.origen) || "").match(/^([A-Za-z0-9_-]{8,20})\.[A-Za-z0-9]{3,4}$/);
    return o ? o[1] : null;
  }
  /* §5.1 / §6.3: el shortcode de una URL de Instagram (reel o post). */
  function scDe(url) {
    const m = String(url || "").match(/instagram\.com\/(?:reel|p|tv)\/([A-Za-z0-9_-]+)/);
    return m ? m[1] : null;
  }

  /* ======================================================================
     4 · EL RADAR — se une TODO por shortcode
         disco (molde medido) + semilla (likes/coms/autor) + BLOB (lo que
         pega el equipo) + pares (lo que ya se clono).
     ================================================================== */
  function radar() {
    const por = new Map();
    const mete = sc => {
      if (!por.has(sc)) por.set(sc, { sc: sc, url: "", clonado: [] });
      return por.get(sc);
    };

    for (const m of MEDIDOS_DISCO) {                 // 1 · el molde MEDIDO
      if (!m || !m.sc) continue;
      const t = mete(m.sc);
      t.url = m.url || t.url;
      t.familia = m.familia || "";
      t.dur = (typeof m.dur === "number") ? m.dur : null;
      t.cortes = (typeof m.cortes_s_030 === "number") ? m.cortes_s_030 : null;
      t.n_cortes = (typeof m.n_030 === "number") ? m.n_030 : null;
      t.estado = m.estado || "";
      t.carpeta = m.carpeta || "";
      if (m.quien) t.quien = m.quien;
    }
    for (const m of MEDIDOS()) {                     // 2 · likes / coms / autor
      if (!m || !m.sc) continue;
      const t = mete(m.sc);
      t.autor = m.autor || t.autor || "";
      t.likes = (typeof m.likes === "number") ? m.likes : (t.likes != null ? t.likes : null);
      t.coms = (typeof m.coms === "number") ? m.coms : (t.coms != null ? t.coms : null);
      t.etapa = (m.etapa || t.etapa || "").toUpperCase();
    }
    for (const r of REFS_BLOB()) {                   // 3 · lo que pega el equipo
      const sc = scDe(r && r.url); if (!sc) continue;
      const t = mete(sc);
      t.url = t.url || (r.url || "");
      t.quien = r.quien || t.quien || "";
      t.nota = r.nota || t.nota || "";
      t.etapa = (r.etapa || t.etapa || "").toUpperCase();
      if (!t.estado) t.estado = r.estado || "";
    }
    for (const p of pares()) {                       // 4 · ya clonado + miniatura
      const sc = scDelPar(p); if (!sc || !por.has(sc)) continue;
      const t = por.get(sc);
      t.clonado.push(p.pieza);
      if (!t.thumb && p.ref) { t.thumb = p.ref; t.thumb_video = !!p.es_video; }
    }

    /* Gerard 15-ago: el espia es SOLO competencia. */
    const fuera = v => ESPIA_FUERA.has(String(v || "").toLowerCase());
    return [...por.values()].filter(t => !fuera(t.autor) && !fuera(t.quien));
  }

  /* Los 5 chips de §5.1. `filtra` sobre el radar, `ordena` decide el ranking.
     ⚠ "Mas guardados" de la spec se pinta como MAS COMENTADOS: en disco no
     existe ningun campo de guardados y poner un numero de comentarios bajo
     una etiqueta de guardados seria un dato inventado (ley 4). Ademas
     `estado-se-mide.md` fija que la metrica que manda son los COMENTARIOS. */
  const CHIPS = [
    { id: "radar", txt: "Radar", pie: "todo lo medido, por comentarios" },
    { id: "comentados", txt: "Más comentados", pie: "solo lo que tiene comentarios medidos" },
    { id: "carruseles", txt: "Carruseles", pie: "familia carrusel" },
    { id: "memes", txt: "Memes", pie: "familia meme" },
    { id: "reels", txt: "Reels", pie: "familia talking y montaje" }
  ];
  let RADAR = "radar";

  function aplicaChip(lista) {
    if (RADAR === "comentados") return lista.filter(t => typeof t.coms === "number");
    if (RADAR === "carruseles") return lista.filter(t => t.familia === "carrusel");
    if (RADAR === "memes") return lista.filter(t => t.familia === "meme");
    if (RADAR === "reels") return lista.filter(t => t.familia === "talking" || t.familia === "montaje");
    return lista;
  }
  /* Orden declarado, no un score inventado: primero lo que TIENE comentarios
     medidos (de mas a menos), luego lo que solo tiene likes, y detras lo que
     aun no se ha medido. */
  function ordena(lista) {
    const n = v => (typeof v === "number" ? v : -1);
    return lista.slice().sort((a, b) =>
      n(b.coms) - n(a.coms) || n(b.likes) - n(a.likes) ||
      (b.dur ? 1 : 0) - (a.dur ? 1 : 0) || String(a.sc).localeCompare(String(b.sc)));
  }
  function conMetrica(t) { return typeof t.coms === "number" || typeof t.likes === "number"; }

  function lista() {
    const et = etapaActiva();
    let l = aplicaChip(radar());
    if (et && et !== "todo") l = l.filter(t => (t.etapa || "") === et);
    return ordena(l);
  }

  /* badge #nref del shell. Nombre literal del contrato viejo. */
  function nRefsEspia() { try { return radar().length; } catch (e) { return 0; } }

  /* ======================================================================
     4-bis · EL CICLO DE UNA ORDEN  —  pedido · produciendo · clonado
     ------------------------------------------------------------------
     Gerard pide ver el estado del bucle, y el estado YA EXISTE en los datos:
     nadie lo estaba pintando. Medido hoy en el bin de Gerard (GET, 25-ago):
     8 ordenes, 7 de tipo `replicar`, y 6 de ellas llevan un campo `estado` que
     escribe quien produce — "en cola — manana toca carrusel" x4 y
     "produciendo — pantalla dividida Javi (2026-08-20 15:45)" x2. El panel las
     pintaba TODAS con el mismo "PEDIDO ✓" plano, asi que daba igual que una
     llevara 7 dias parada y otra estuviera renderizando.
     Y al reves: `referentes.json` marca 3 moldes como `estado:"clonado"` y 71
     pares dicen que pieza salio de que molde — tampoco se veia.
     Regla de desempate: MANDA LA MEDICION DEL DISCO sobre la nota de la orden
     (`estado-se-mide.md`). Caso real: DZXwuEmjboX tiene una orden que dice
     "produciendo" del 20-ago y el disco dice que su clon
     (JAVI_NICHO_MERCADO_20AGO) ya existe. Se pinta CLONADO.
     ================================================================== */

  /* Las ordenes de los DEMAS: `leerBlob()` del shell solo copia MI bin a MIO,
     asi que hasta ahora una orden de Javi era invisible para Jordi y los dos
     podian pedir el mismo clon. Aqui se LEEN los 4 bins — GET y solo GET, nunca
     un POST desde esta pantalla (§2.B: `guardarMio` es el unico que escribe). */
  let ORD_EQUIPO = [];              // [{...orden, quien}]
  let ORD_ESTADO = "no";            // no | pidiendo | ok | fallo
  function binsDelShell() { try { return typeof BINS !== "undefined" ? BINS : null; } catch (e) {} }
  function pideOrdenes() {
    const B = binsDelShell();
    if (!B || ORD_ESTADO === "pidiendo" || ORD_ESTADO === "ok") return;
    ORD_ESTADO = "pidiendo";
    const y = yo();
    /* mi bin NO se vuelve a pedir: `leerBlob()` ya lo ha dejado en MIO y ahi
       esta mas fresco que cualquier copia (se actualiza al escribir). */
    Promise.all(Object.keys(B).filter(q => q !== y).map(q =>
      fetch(B[q], { cache: "no-store" })
        .then(r => r.ok ? r.json() : null).then(b => [q, b]).catch(() => [q, null])
    )).then(res => {
      const out = []; let vivo = false;
      for (const par of res) {
        const q = par[0], b = par[1];
        if (!b) continue;
        vivo = true;
        const o = Array.isArray(b.ordenes) ? b.ordenes : [];
        for (const x of o) if (x) out.push(Object.assign({ quien: q }, x));
      }
      ORD_EQUIPO = out;
      ORD_ESTADO = vivo ? "ok" : "fallo";
      repinta();
    }).catch(() => { ORD_ESTADO = "fallo"; });
  }

  /* Mi bin manda sobre la copia leida (MIO se actualiza al escribir; la copia
     es de cuando se abrio la pantalla). */
  function ordenes() {
    const mio = g("MIO"), y = yo();
    const mias = (mio && Array.isArray(mio.ordenes) ? mio.ordenes : [])
      .map(o => Object.assign({ quien: y || "tú" }, o));
    return mias.concat(ORD_EQUIPO.filter(o => o.quien !== y));
  }
  function scDeOrden(o) { return (o && o.sc) || scDe(o && o.url) || null; }

  function ordenDe(sc) {
    let mejor = null;
    for (const o of ordenes()) {
      if (!o || o.tipo !== "replicar" || scDeOrden(o) !== sc) continue;
      if (!mejor || String(o.cuando || "") > String(mejor.cuando || "")) mejor = o;
    }
    return mejor;
  }

  function diasDesde(cuando) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(cuando || ""));
    if (!m) return null;
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    return Math.round((hoy - new Date(+m[1], +m[2] - 1, +m[3])) / 86400000);
  }
  function haceTxt(cuando) {
    const d = diasDesde(cuando);
    if (d == null) return "";
    if (d <= 0) return "hoy";
    if (d === 1) return "ayer";
    return "hace " + d + " días";
  }

  /* La nota que escribe quien produce viene como "cabeza — cola". */
  function parteEstado(est) {
    const s = String(est || "").trim();
    const i = s.indexOf("—");
    return i >= 0
      ? { cabeza: s.slice(0, i).trim(), cola: s.slice(i + 1).trim() }
      : { cabeza: s, cola: "" };
  }

  /* Devuelve null cuando no hay NADA que contar (ni orden ni clon ni descarga):
     una tarjeta en reposo no lleva chip, y asi el que si lo lleva canta. */
  function cicloDe(t) {
    const o = ordenDe(t.sc);
    const p = parteEstado(o && o.estado);
    const clonado = (t.clonado && t.clonado.length) || t.estado === "clonado";

    if (clonado) {
      const n = (t.clonado || []).length;
      return {
        k: "clonado", txt: "CLONADO",
        pie: n ? (n === 1 ? "1 pieza salió de este molde" : n + " piezas salieron de este molde")
               : "el disco lo da por clonado",
        piezas: t.clonado || []
      };
    }
    if (o && /^produciendo/i.test(p.cabeza))
      return { k: "produciendo", txt: "CLONANDO AHORA", pie: p.cola || ("lo pidió " + (o.quien || o.por || "alguien")), orden: o };
    if (o) {
      const dias = diasDesde(o.cuando);
      return {
        k: "cola", txt: "PEDIDO · EN COLA",
        pie: "lo pidió " + (o.quien || o.por || "alguien") + " " + haceTxt(o.cuando) +
             (p.cola ? " · " + p.cola : ""),
        viejo: dias != null && dias >= 3, orden: o
      };
    }
    if (t.estado === "bajado")
      return { k: "bajado", txt: "REFERENTE YA BAJADO", pie: "el vídeo está en disco: clonarlo no cuesta descarga" };
    return null;
  }

  /* ======================================================================
     5 · HTML
     ================================================================== */
  const NUM = n => Number(n).toLocaleString("es-ES");
  const DEC = (n, d) => Number(n).toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d });

  const FAMILIA_HUMANO = {
    carrusel: "Carrusel", meme: "Meme", talking: "Talking-head",
    montaje: "Montaje de clips"
  };
  const ETAPA_HUMANO_LOCAL = {
    TOFU: "Para que te descubran", MOFU: "Para que te consideren", BOFU: "Para que compren"
  };

  /* La linea MOLDE: solo numeros MEDIDOS. Si no hay medida, se dice. */
  function moldeHTML(t) {
    const p = [];
    if (t.familia) p.push(X(FAMILIA_HUMANO[t.familia] || t.familia));
    if (typeof t.dur === "number") p.push(DEC(t.dur, 1) + " s");
    if (typeof t.cortes === "number") p.push(DEC(t.cortes, 2) + " cortes/s");
    if (!p.length) return '<p class="ref-molde ref-molde-sin">Molde sin medir todavía</p>';

    /* segunda linea: los ejes de moldes.json con los que se clona y se revisa.
       Solo se pinta el eje que EXISTE medido para este molde (ley 4). */
    const m = molde(t.sc), q = [];
    if (typeof m.musica_entra_s === "number") q.push("música entra " + DEC(m.musica_entra_s, 1) + " s");
    if (typeof m.primer_corte_s === "number") q.push("1er corte " + DEC(m.primer_corte_s, 1) + " s");
    /* La banda SOLO en los memes. En un talking-head `banda_pct` es cuanto
       ocupa la franja plana del encuadre y no se puede hacer nada con ese
       numero; en un meme co1e0 la banda ES el formato, y su color es canon de
       identidad (Javi negra/texto blanco · Jordi blanca/texto negro), asi que
       ahi si dice algo al que va a clonarlo. */
    if (t.familia === "meme" && typeof m.banda_pct === "number")
      q.push((m.hex_banda ? '<i class="ref-tinta" style="background:' + X(m.hex_banda) + '"></i>' : "") +
             "banda " + DEC(m.banda_pct, 0) + " %");

    return '<p class="ref-molde"><b>Molde:</b> <span class="num">' + p.join(" · ") + "</span></p>" +
      (q.length ? '<p class="ref-ejes num">' + q.join(" · ") + "</p>" : "");
  }

  function metricaHTML(t) {
    if (!conMetrica(t)) return '<span class="ref-badge ref-sinmedir">SIN MEDIR</span>';
    const p = [];
    if (typeof t.coms === "number") p.push('<span class="num" title="comentarios medidos — la métrica que manda">' + NUM(t.coms) + " comentarios</span>");
    if (typeof t.likes === "number") p.push('<span class="num">' + NUM(t.likes) + " me gusta</span>");
    return '<p class="ref-metrica">' + p.join(" · ") + "</p>";
  }

  function thumbHTML(t) {
    if (t.thumb) {
      const inner = t.thumb_video
        ? '<video src="' + X(t.thumb) + '" preload="metadata" muted playsinline controls></video>'
        : '<img src="' + X(t.thumb) + '" loading="lazy" alt="referente ' + X(t.sc) + '">';
      return '<div class="ref-thumb">' + inner + "</div>";
    }
    /* Sin miniatura local, el original solo se ve con el embed oficial de IG.
       NO se cargan 130 iframes de golpe (movil): se carga al pedirlo. */
    return '<div class="ref-thumb ref-thumb-vacio" data-ver="' + X(t.sc) + '" role="button" tabindex="0" ' +
      'aria-label="Ver el original de ' + X(t.sc) + ' en Instagram">' +
      '<span class="ref-sc num">' + X(t.sc) + "</span>" +
      '<span class="ref-thumb-pie">Ver el original</span></div>';
  }

  function analisisHTML(t) {
    const a = ANALISIS()[t.sc];
    if (!a) return '<p class="ref-sinana">Sin análisis todavía · el molde no se ha desmontado</p>';
    const ul = arr => "<ul>" + (arr || []).map(x => "<li>" + X(x) + "</li>").join("") + "</ul>";
    return '<details class="ref-ana"><summary>Ver análisis</summary>' +
      '<p class="ref-receta">' + X(a.receta) + "</p>" +
      '<div class="ref-ana-col ref-tocar"><b>SE TOCA</b>' + ul(a.tocar) + "</div>" +
      '<div class="ref-ana-col ref-evitar"><b>NO SE TOCA</b>' + ul(a.evitar) + "</div>" +
      "</details>";
  }

  /* El chip del ciclo. Es lo unico que se mueve de sitio en la tarjeta: va
     PEGADO al boton, porque la pregunta que contesta ("¿esto ya lo pedi?") se
     hace justo antes de pulsarlo. */
  function cicloHTML(c) {
    if (!c) return "";
    const pie = c.pie
      ? '<span class="ref-ciclo-pie' + (c.viejo ? " ref-ciclo-viejo" : "") + '">' + X(c.pie) + "</span>"
      : "";
    return '<p class="ref-ciclo ref-ciclo-' + c.k + '"><span class="ref-luz"></span>' +
      "<b>" + X(c.txt) + "</b>" + pie + "</p>";
  }

  function tarjeta(t, rank) {
    const b = [];
    if (t.etapa && ETAPA_HUMANO_LOCAL[t.etapa])
      b.push('<span class="ref-badge et-' + X(t.etapa) + '" title="' + X(ETAPA_HUMANO_LOCAL[t.etapa]) + '">' + X(t.etapa) + "</span>");
    if (t.autor) b.push('<span class="ref-badge">@' + X(t.autor) + "</span>");
    if (t.quien) b.push('<span class="ref-badge">lo pasó ' + X(t.quien) + "</span>");
    if (rank) b.push('<span class="ref-rank num">#' + rank + " del radar</span>");

    const c = cicloDe(t);
    const abierta = !!(c && (c.k === "cola" || c.k === "produciendo"));
    const yaClon = !!(c && c.k === "clonado");

    /* Tres botones posibles, nunca dos veces el mismo trabajo:
         orden abierta -> PEDIDO ✓ (muerto, con el chip explicando en que va)
         ya clonado    -> "Replicar otra vez" + salto a la pieza en Por revisar
         en reposo     -> ⚡ Replicar
       Una orden solo BLOQUEA el boton mientras siga PENDIENTE. Un molde ya
       clonado se vuelve a pedir: 32 de nuestras piezas salieron de DbUIat6HOLY
       y 8 de DK7yeriOaKU — repetir un molde ganador es el trabajo, no un error.
       Antes la primera orden dejaba ese boton muerto para siempre. */
    let cta;
    if (abierta) {
      cta = '<button type="button" class="repl hecho" data-sc="' + X(t.sc) + '" disabled>PEDIDO ✓</button>';
    } else {
      cta = '<button type="button" class="repl" data-sc="' + X(t.sc) + '">' +
        (yaClon ? "⚡ Replicar otra vez" : "⚡ Replicar") + "</button>";
      if (yaClon && c.piezas && c.piezas.length)
        cta += '<button type="button" class="ref-ir" data-ir="1" title="' + X(c.piezas.join(" · ")) +
          '">Ver el clon</button>';
    }

    return '<article class="ref" data-sc="' + X(t.sc) + '">' +
      thumbHTML(t) +
      '<div class="ref-body">' +
      '<div class="ref-badges">' + b.join("") + "</div>" +
      metricaHTML(t) +
      (t.nota ? '<p class="ref-nota">“' + X(t.nota) + '”</p>' : "") +
      moldeHTML(t) +
      analisisHTML(t) +
      "</div>" +
      cicloHTML(c) +
      '<div class="ref-cta">' + cta + "</div></article>";
  }

  function chipsHTML() {
    const c = CHIPS.map(c =>
      '<button type="button" class="fab-chip' + (RADAR === c.id ? " on" : "") + '" data-radar="' + c.id + '" title="' + X(c.pie) + '">' + X(c.txt) + "</button>").join("");
    const et = etapaActiva();
    const e = ["todo", "TOFU", "MOFU", "BOFU"].map(x =>
      '<button type="button" class="fab-chip fab-chip-et' + (et === x ? " on" : "") + '" data-etapa="' + x + '">' +
      (x === "todo" ? "Todas las etapas" : x) + "</button>").join("");
    return '<nav class="fab-chips" aria-label="Radar de referentes">' +
      '<div class="fab-chipgrupo">' + c + "</div>" +
      '<div class="fab-chipgrupo">' + e + "</div></nav>";
  }

  /* La cola, en una linea y con numeros medidos. Es la que delata que el bucle
     esta parado: §7.2 de la spec dice que HOY nadie consume `_ORDENES_PANEL.jsonl`,
     y sin esta linea el panel enseñaba 7 "PEDIDO ✓" verdes como si todo fuera
     bien. Si algo lleva dias en cola, aqui se ve. */
  function colaHTML() {
    const r = radar();
    let pedidos = 0, produciendo = 0, listos = 0, masViejo = null;
    for (const t of r) {
      const c = cicloDe(t);
      if (!c) continue;
      if (c.k === "clonado") { if (ordenDe(t.sc)) listos++; continue; }
      if (c.k === "produciendo") { produciendo++; continue; }
      if (c.k === "cola") {
        pedidos++;
        const d = diasDesde(c.orden && c.orden.cuando);
        if (d != null && (masViejo == null || d > masViejo)) masViejo = d;
      }
    }
    if (!pedidos && !produciendo && !listos) return "";
    const p = [];
    if (pedidos) p.push('<b class="num">' + NUM(pedidos) + "</b> esperando en cola" +
      (masViejo != null && masViejo >= 3
        ? ' <span class="fab-cola-viejo">(el más viejo, hace ' + masViejo + " días)</span>"
        : ""));
    if (produciendo) p.push('<b class="num">' + NUM(produciendo) + "</b> clonándose ahora");
    if (listos) p.push('<b class="num">' + NUM(listos) + "</b> ya en “Por revisar”");
    return '<p class="fab-cola">Tus órdenes: ' + p.join(" · ") +
      (ORD_ESTADO === "fallo"
        ? ' <span class="fab-cola-viejo">· no se han podido leer las de los demás</span>' : "") +
      "</p>";
  }

  function vistaEspia() {
    pideOrdenes();                       // ordenes del equipo: GET perezoso, no bloquea
    const l = lista();
    const total = radar().length;
    const medidos = l.filter(conMetrica).length;

    let h = '<section class="fab">';

    h += '<header class="vhead">' +
      "<h2>Fábrica · el espía</h2>" +
      "<p>El referente manda. Pulsa Replicar y el molde se clona en tu cola de revisión. " +
      "Cero pieza desde cero.</p></header>";

    /* Aviso honesto de estado de datos — nunca un cero silencioso (§6.6). */
    if (DISCO_ESTADO === "cargando")
      h += '<p class="fab-aviso">Midiendo el radar… (cargando <code>referentes.json</code>)</p>';
    else if (DISCO_ESTADO === "sin-fichero")
      h += '<p class="fab-aviso fab-aviso-mal">No se pudo leer <code>referentes.json</code>: ' +
        "faltan los moldes medidos. Lo que ves es solo la semilla.</p>";
    if (!HAY_BLOB())
      h += '<p class="fab-aviso fab-aviso-mal">El almacén no responde: los referentes del equipo ' +
        "salen del respaldo y <b>no se puede añadir ninguno</b> ahora mismo.</p>";

    /* Añadir referente espía (§5.1, #raddr -> guardar() -> BLOB.referentes) */
    h += '<div class="fab-add">' +
      '<input id="rurl" type="url" inputmode="url" autocomplete="off" spellcheck="false" ' +
      'placeholder="https://www.instagram.com/reel/…">' +
      '<input id="rnota" type="text" autocomplete="off" placeholder="Nota: qué te gusta de éste (opcional)">' +
      '<button type="button" id="raddr">Añadir al espía</button></div>';

    h += chipsHTML();

    h += '<p class="fab-cuenta"><span class="num">' + NUM(l.length) + "</span> referentes en pantalla · " +
      '<span class="num">' + NUM(medidos) + "</span> con métrica medida · " +
      '<span class="num">' + NUM(total) + "</span> en el radar entero</p>";

    h += colaHTML();

    if (!l.length) {
      /* Decir POR QUE esta vacio. Medido: solo 10 de los 137 referentes traen
         etapa (las 10 de la semilla); el resto la tiene a "". Filtrar por TOFU/
         MOFU/BOFU vacia la pantalla y sin esta linea no hay forma de saber si
         es que no hay nada o si es que el panel esta roto — el mismo agujero
         que el aviso `sinEtapa()` del shell tapa en "Por revisar". */
      const et = etapaActiva(), r = radar();
      const conEtapa = r.filter(t => t.etapa).length;
      h += '<p class="fab-vacio">';
      if (et !== "todo" && conEtapa === 0)
        h += "<b>Ningún referente trae etapa en los datos</b>, así que filtrar por " + X(et) +
          " deja esto vacío — no es que no haya moldes.";
      else if (et !== "todo")
        h += "Ninguno de los <b>" + NUM(r.length) + "</b> referentes del radar es " + X(et) +
          " con este chip. Solo <b>" + NUM(conEtapa) + "</b> traen etapa medida.";
      else
        h += "Nada aquí con estos filtros.";
      h += " Cambia de chip, o pega arriba el link del referente que quieras clonar.</p></section>";
      return h;
    }

    let rank = 0;
    h += '<div class="grid-ref">' +
      l.map(t => tarjeta(t, conMetrica(t) ? ++rank : 0)).join("") +
      "</div>";

    h += '<p class="fab-pie">Replicar <b>encola</b>: lo produce Claude y cae en “Por revisar”. ' +
      "Desde aquí no se publica nada.</p>";
    return h + "</section>";
  }

  /* ======================================================================
     6 · HANDLERS — delegacion sobre #app, cero onclick inline
     ================================================================== */

  function contenedor() { return document.getElementById("app") || document.body; }

  /* Un solo nodo escuchando a la vez. Si el modulo arranca antes de que exista
     #app se engancha a <body> y se MUEVE en cuanto #app aparece: con dos nodos
     ligados a la vez un clic en REPLICAR mandaria DOS ordenes. */
  let NODO_LIGADO = null;
  function cablearEspia() {
    const c = contenedor();
    if (!c || NODO_LIGADO === c) return;             // idempotente
    if (NODO_LIGADO) {
      NODO_LIGADO.removeEventListener("click", alClic);
      NODO_LIGADO.removeEventListener("keydown", alTeclado);
    }
    NODO_LIGADO = c;
    c.addEventListener("click", alClic);
    c.addEventListener("keydown", alTeclado);
  }

  function alTeclado(e) {
    const t = e.target;
    if (!t || !t.closest) return;
    if (e.key === "Enter" && (t.id === "rurl" || t.id === "rnota")) {
      e.preventDefault(); anadeReferente(); return;
    }
    if ((e.key === "Enter" || e.key === " ") && t.closest("[data-ver]")) {
      e.preventDefault(); alClic(e);
    }
  }

  function alClic(e) {
    const t = e.target;
    if (!t || !t.closest || !t.closest(".fab")) return;     // fuera de mi pantalla, ni me entero

    const chip = t.closest("[data-radar]");
    if (chip) { RADAR = chip.dataset.radar; repinta(); return; }

    const et = t.closest("[data-etapa]");
    if (et) { setEtapa(et.dataset.etapa); repinta(); return; }

    const ver = t.closest("[data-ver]");
    if (ver) { cargaEmbed(ver); return; }

    const add = t.closest("#raddr");
    if (add) { anadeReferente(); return; }

    const ir = t.closest("[data-ir]");
    if (ir) { vePorRevisar(); return; }

    const rep = t.closest(".repl");
    if (rep) { replicar(rep); return; }
  }

  /* El clon ya existe: se salta a la cola de revision. No hay deep-link a una
     pieza concreta en el contrato del shell (el hash solo guarda la pestaña),
     asi que se abre "Por revisar" y ya. Si el shell no expone `fijaTab`, se
     avisa en vez de fingir que se ha ido a algun sitio. */
  function vePorRevisar() {
    const fija = window.fijaTab, pinta = window.render;
    if (typeof fija === "function" && typeof pinta === "function") {
      fija("repasar"); pinta(); return;
    }
    toast("Abre “Por revisar”: el clon de este molde ya está ahí.", false);
  }

  /* El embed oficial de IG funciona sin login y es la unica forma de ver el
     original sin bajarlo. Se carga UNO, al pedirlo. */
  function cargaEmbed(caja) {
    const sc = caja.dataset.ver;
    if (!sc || caja.dataset.cargado === "1") return;
    caja.dataset.cargado = "1";
    caja.classList.remove("ref-thumb-vacio");
    caja.innerHTML = '<iframe src="https://www.instagram.com/p/' + encodeURIComponent(sc) +
      '/embed/captioned/" loading="lazy" frameborder="0" scrolling="no" ' +
      'title="Referente ' + X(sc) + '"></iframe>';
  }

  /* §5.1 + §7.1 — REPLICAR. Escribe SOLO en `ordenes` del bin de YO.
     El boton no canta "PEDIDO ✓" hasta que la orden esta REALMENTE en el bin:
     guardarMio() no devuelve exito/fallo, asi que se comprueba mirando MIO
     despues (ley 1: verificar antes de decir hecho). */
  async function replicar(btn) {
    const sc = btn.dataset.sc;
    if (!sc || btn.disabled) return;
    if (!yo()) { toast("Entra con tu nombre antes de pedir un clon.", true); return; }

    const t = radar().find(x => x.sc === sc) || { sc: sc };
    /* La URL REAL medida en disco. El contrato viejo montaba siempre
       /reel/<sc>/ y para un carrusel (que vive en /p/<sc>/) eso es un 404:
       el productor no podria bajarlo. Mismo campo, valor correcto. */
    const url = t.url || ("https://www.instagram.com/reel/" + sc + "/");
    const oid = nuevoOid();

    const txt0 = btn.textContent;
    btn.disabled = true;
    btn.classList.add("cargando");
    btn.textContent = "Clonando…";

    const guardarMioFn = g("guardarMio");
    if (typeof guardarMioFn !== "function") {
      btn.disabled = false; btn.classList.remove("cargando"); btn.textContent = txt0;
      toast("No hay almacén conectado: la orden no se ha enviado.", true);
      return;
    }
    /* Campos AÑADIDOS, nunca renombrados (§2.B es sagrado): el listener
       deduplica por `oid` y no mira el resto. Van los tres datos que le ahorran
       trabajo al productor y que ya estan medidos en disco — de que familia es
       el molde, y DONDE esta ya bajado el video (25 referentes tienen
       estado "bajado": si se sabe, no hay que volver a descargarlo). */
    const extra = {};
    if (t.familia) extra.familia = t.familia;
    if (t.carpeta) extra.carpeta = t.carpeta;
    if (t.estado) extra.estado_ref = t.estado;

    await guardarMioFn(mio => {
      mio.ordenes.push(Object.assign(
        { oid: oid, tipo: "replicar", sc: sc, url: url, por: yo(), cuando: ahora() }, extra));
    });

    const mio = g("MIO");
    const ok = !!(mio && Array.isArray(mio.ordenes) && mio.ordenes.some(o => o && o.oid === oid));
    btn.classList.remove("cargando");
    if (ok) {
      btn.textContent = "PEDIDO ✓";
      btn.classList.add("hecho");
      toast("Orden enviada a Claude: replicar " + sc);
      refrescaTarjeta(sc);          // para que salga el chip del ciclo, no solo el boton
    } else {
      btn.disabled = false;
      btn.textContent = txt0;
      toast("No se pudo enviar la orden (almacén caído). No se ha perdido nada: vuelve a pulsar.", true);
    }
  }

  /* Repinta UNA tarjeta y la linea de cola, no la pantalla entera: con 137
     tarjetas un render() completo tras cada clic te mueve el scroll de sitio
     justo cuando estas repasando el radar en el movil. */
  function refrescaTarjeta(sc) {
    const caja = document.querySelector(".fab");
    if (!caja) return;
    const art = caja.querySelector('article.ref[data-sc="' + sc + '"]');
    if (art) {
      const l = lista();
      let rank = 0, html = null;
      for (const t of l) {
        const r = conMetrica(t) ? ++rank : 0;
        if (t.sc === sc) { html = tarjeta(t, r); break; }
      }
      if (html) art.outerHTML = html;
    }
    const vieja = caja.querySelector(".fab-cola");
    const nueva = colaHTML();
    if (vieja) { if (nueva) vieja.outerHTML = nueva; else vieja.remove(); }
    else if (nueva) {
      const ancla = caja.querySelector(".fab-cuenta");
      if (ancla) ancla.insertAdjacentHTML("afterend", nueva);
    }
  }

  /* §5.1 — añadir referente espía. Va al BLOB (`referentes`), no al bin. */
  function anadeReferente() {
    const iu = document.getElementById("rurl");
    const inn = document.getElementById("rnota");
    const u = ((iu || {}).value || "").trim();
    const nota = ((inn || {}).value || "").trim();     // el index viejo petaba aquí:
                                                       // $("#rnota") no existía en esta pantalla
    if (!/^https?:\/\//.test(u)) { toast("Pega un link válido", true); return; }

    const guardarFn = g("guardar");
    if (typeof guardarFn !== "function") { toast("No hay almacén conectado: no se ha guardado.", true); return; }

    guardarFn(srv => {
      srv.referentes = srv.referentes || [];
      srv.referentes.push({
        url: u.split("?")[0], quien: yo(), nota: nota,
        fecha: ahora(), etapa: "", estado: "sin analizar"
      });
    });
    if (iu) iu.value = "";
    if (inn) inn.value = "";
  }

  /* ======================================================================
     7 · EXPORT
     ================================================================== */
  window.vistaEspia = vistaEspia;
  window.cablearEspia = cablearEspia;
  window.nRefsEspia = nRefsEspia;

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", cablearEspia);
  else cablearEspia();
})();
