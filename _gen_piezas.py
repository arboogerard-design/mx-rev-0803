# -*- coding: utf-8 -*-
"""_gen_piezas.py — regenera piezas.json del panel mx-rev-0803 DESDE DISCO.

Fuente unica (ESTANDAR_ELITE_22AGO seccion 3): el panel enseñaba una copia embebida
congelada del 20-ago con 30 piezas mientras el disco tenia 138+ PASS. Este script:

  1. Barre PARA_REVISAR/ (carpetas con _gate/REPORTE.md en VEREDICTO PASS; salta _BLOQUEADAS)
     + las carpetas de pieza de _CONTENIDO_JAVI_JORDI_HOY/1_JAVI y 2_JORDI (sin gate, 21-ago).
  2. Caption REAL desde _CAPTION.txt / CAPTION.txt (limpia la primera linea si empieza por
     "CAPTION ("). Sin fichero = caption vacia. JAMAS texto interno.
  3. Etiqueta funnel: hereda la corregida del piezas.json actual (21-ago) si la pieza ya
     estaba; si no, linea "etapa:" de _FORMATO.txt; ads por nombre = AD.
  4. FECHA ISO por pieza (25-ago): manda `_contexto/CALENDARIO_MES.json` (30 dias, fecha
     de verdad, slot 1=19:00 2=19:30 3=20:00 — regla 25 de Jordi: publicar 19-20h). El
     plan semanal solo rellena lo que el mes no cubre, y sus etiquetas ("DOM 23") se
     convierten a fecha contra el ancla que el propio plan declara. Sin fecha resuelta,
     la pieza sale SIN fecha y se dice; no se adivina el mes.
  5. Medias a media/: poster siempre (ffmpeg -ss 1 -frames:v 1 si falta); el mp4 entero
     SOLO si pesa <8MB, si no solo poster. Idempotente: no re-copia lo que ya esta.
  6. `referentes.json` (.pares / .sin_referente): empareja cada pieza con el referente que
     declara en su `_REFERENTE.txt` / `_MOLDE.txt`, resolviendolo con el mismo criterio
     que el gate. Se hace AQUI, sobre la misma lista de piezas, para que no puedan volver
     a desincronizarse (ver `emparejar_referentes`).

EL PANEL NO TIENE SEMANA (Gerard, 25-ago: «un panel para siempre»). Aqui ya no hay
constantes de semana horneadas a mano: el horizonte (`rango`, `dias_iso`) se MIDE de las
fechas que hay en disco.

Uso:  python _gen_piezas.py [--dry-run]
"""
import datetime
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import unicodedata

PANEL = os.path.dirname(os.path.abspath(__file__))
MEDIA = os.path.join(PANEL, "media")
INDEX = os.path.join(PANEL, "index.html")
PIEZAS_JSON = os.path.join(PANEL, "piezas.json")

BASE = r"C:\Users\PC\Desktop\MENTORIUM\MENTORIUM_SISTEMA_UNIFICADO"
PR = os.path.join(BASE, "PARA_REVISAR")
HOY = r"C:\Users\PC\Desktop\_CONTENIDO_JAVI_JORDI_HOY"
DOCS = r"C:\Users\PC\Desktop\_DOCS_VIVOS"


def _plan_mas_reciente():
    """El plan semanal vivo, sea cual sea su nombre. Estaba clavado a
    `PLAN_SEMANA_24_30.md`: un fichero con la SEMANA en el nombre caduca cada lunes y el
    generador se quedaba mudo sin decirlo. Un panel «para siempre» no puede depender de un
    nombre de fichero fechado."""
    try:
        cand = [f for f in os.listdir(DOCS)
                if re.match(r"PLAN_SEMANA_.*\.md$", f, re.I)]
    except OSError:
        return os.path.join(DOCS, "PLAN_SEMANA_24_30.md")
    if not cand:
        return os.path.join(DOCS, "PLAN_SEMANA_24_30.md")
    cand.sort(key=lambda f: os.path.getmtime(os.path.join(DOCS, f)), reverse=True)
    return os.path.join(DOCS, cand[0])


PLAN = _plan_mas_reciente()

LIM_MB = 8.0                      # techo de video que viaja al repo (GitHub Pages)
# 1-3 = franja de prime que pide Jordi (19-20 h). 4-5 = los extra del dia, repartidos
# a mediodia/tarde para no apilar 5 posts en una hora (regla 25: nunca a las 23 h).
HORAS_SLOT = {1: "19:00", 2: "19:30", 3: "20:00", 4: "12:00", 5: "15:00"}

# ── EL PANEL NO TIENE SEMANA (25-ago-2026) ────────────────────────────────────────────
# Gerard, mirando la cabecera: «deberia ser para todo el año, un panel para siempre, no
# tiene logica asi». Aqui habia dos constantes horneadas a mano —SEMANA="24-30 agosto
# 2026" y DIAS=[..., "dom 23", ...]— y de ellas salian tres bugs medidos el 25-ago:
#   1. el panel se declaraba de UNA semana y caducaba solo cada lunes;
#   2. "dom 23" viajaba DENTRO de la semana "24-30": un dia ANTERIOR a la que decia
#      mostrar (viene de la seccion «0-bis. HOY · DOMINGO 23» del plan, que es de otra
#      semana). Gerard lo vio en su pantalla;
#   3. "dom 23" es una ETIQUETA, no una fecha: no dice ni mes ni año. El front tenia que
#      adivinar el mes cruzando el numero contra la semana visible (`calendario.js`
#      fechaDe(): «el numero de dia se resuelve contra la semana que se esta mirando»).
# Ahora manda la FECHA: cada pieza lleva `fecha` ISO (YYYY-MM-DD) + `fecha_fuente`, y las
# etiquetas ("mié 26") se DERIVAN de la fecha en un unico sitio (`etiqueta_dia`). El
# horizonte del panel es el que haya en disco, no una semana escrita a mano.
DOW = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]   # 0 = lunes (datetime.weekday())
MESES3 = {"ENE": 1, "FEB": 2, "MAR": 3, "ABR": 4, "MAY": 5, "JUN": 6,
          "JUL": 7, "AGO": 8, "SEP": 9, "SET": 9, "OCT": 10, "NOV": 11, "DIC": 12}
#: calendario del MES con fecha ISO por slot — lo escribe `_SCRIPTS/calendario_mes.py`
#: (30 dias x 2 cuentas x 3 slots). Es la fuente de fechas: ya viene en ISO, cubre un mes
#: y se regenera desde disco. El plan semanal queda solo como respaldo para los dias que
#: el mes no cubre.
CAL_MES = os.path.join(BASE, "OBSIDIAN_2CEREBRO", "_contexto", "CALENDARIO_MES.json")
MEDIA_EXT = (".mp4", ".png", ".jpg", ".jpeg")
NO_WIN = 0x08000000 if os.name == "nt" else 0   # CREATE_NO_WINDOW (protocolo-torre 5)


def norm(s):
    """minusculas sin acentos, para casar 'MIÉ 26' del plan con 'mié 26' del panel."""
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


def etiqueta_dia(iso):
    """'2026-08-26' -> 'mié 26'. UNICO sitio del generador donde se fabrica una etiqueta
    de dia. Antes cada trozo se inventaba la suya y por eso 'dom 23' podia acabar dentro
    de la semana '24-30' sin que nada chirriase: una etiqueta no se puede comparar con
    una fecha, una fecha si."""
    d = fecha_de(iso)
    return "%s %d" % (DOW[d.weekday()], d.day) if d else ""


def fecha_de(iso):
    """'2026-08-26' -> datetime.date, o None. Nunca revienta con basura."""
    try:
        return datetime.date.fromisoformat(str(iso)[:10])
    except (ValueError, TypeError):
        return None


def rango_humano(desde, hasta):
    """('2026-08-23','2026-09-24') -> '23 ago → 24 sep 2026'. Con MES y AÑO: una cabecera
    que solo dice 'dom 23 → jue 24' es justo el problema que se esta arreglando."""
    a, b = fecha_de(desde), fecha_de(hasta)
    if not a or not b:
        return "sin fechas en disco"
    mes = [k.lower() for k, v in sorted(MESES3.items(), key=lambda kv: kv[1]) if k != "SET"]
    return "%d %s → %d %s %d" % (a.day, mes[a.month - 1], b.day, mes[b.month - 1], b.year)


def iso_de_etiqueta(dow3, num, ancla):
    """('DOM', 23, date(2026,8,30)) -> '2026-08-23'.

    Convierte la etiqueta suelta de un plan escrito a mano en una fecha real: busca en
    +-10 dias alrededor del ancla (la fecha que el propio plan declara en su titulo) el
    unico dia que casa NUMERO y DIA DE SEMANA. Si no casa ninguno devuelve "" — no se
    adivina el mes, que es exactamente el bug 3 (ley 4: cero inventar)."""
    if not ancla:
        return ""
    dow3 = norm(dow3)[:3]
    for delta in range(-10, 11):
        d = ancla + datetime.timedelta(days=delta)
        if d.day == num and norm(DOW[d.weekday()])[:3] == dow3:
            return d.isoformat()
    return ""


def ancla_del_plan(txt):
    """Fecha declarada en el titulo del plan ('… DOM 30 AGO 2026') -> date. Sin titulo
    legible, el mtime del fichero; sin fichero, None (y el plan no aporta fechas)."""
    m = re.search(r"(\d{1,2})\s+([A-Za-zÁÉÍÓÚáéíóú]{3})\w*\.?\s+(\d{4})", txt[:400])
    if m and norm(m.group(2)).upper() in MESES3:
        try:
            return datetime.date(int(m.group(3)), MESES3[norm(m.group(2)).upper()],
                                 int(m.group(1)))
        except ValueError:
            pass
    try:
        return datetime.date.fromtimestamp(os.path.getmtime(PLAN))
    except OSError:
        return None


def fechas_del_mes():
    """CALENDARIO_MES.json -> ({id_pieza: {fecha, hora, casilla, cuenta}}, [isos]).

    Es la fuente ISO que el generador ignoraba: `calendario_mes.py` la escribe leyendo el
    disco y el calendario de Santi, con `fecha` de verdad y 30 dias de horizonte. Mientras
    tanto aqui se leia solo un plan de UNA semana con etiquetas ("dom 23"), que es de
    donde salieron los bugs 2-4. La hora sale del SLOT (1/2/3 -> 19:00/19:30/20:00) porque
    el JSON del mes guarda la VENTANA ("19:00-20:00") y el panel ordena por hora exacta."""
    slots, horizonte = {}, []
    if not os.path.isfile(CAL_MES):
        print("AVISO: calendario del mes no encontrado:", CAL_MES)
        return slots, horizonte
    try:
        with io.open(CAL_MES, encoding="utf-8", errors="replace") as f:
            doc = json.load(f)
    except (OSError, ValueError) as e:
        print("AVISO: calendario del mes ilegible (%s)" % str(e)[:60])
        return slots, horizonte
    for x in doc.get("calendario", []):
        iso = str(x.get("fecha") or "")[:10]
        if not fecha_de(iso):
            continue
        if iso not in horizonte:
            horizonte.append(iso)
        pid = x.get("pieza")
        if not pid or pid in slots:          # primera asignacion manda, como en el plan
            continue
        slots[pid] = {"fecha": iso,
                      "hora": HORAS_SLOT.get(x.get("slot"), ""),
                      "casilla": x.get("casilla") or "",
                      "cuenta": (x.get("cuenta") or "").upper()}
    horizonte.sort()
    return slots, horizonte


def leer_huecos_plan():
    """Filas «FALTA...» de la seccion 1 del plan → lista de huecos honestos por dia/cuenta.
    El plan es la unica fuente; si no hay plan, no hay huecos que contar."""
    huecos = []
    if not os.path.isfile(PLAN):
        return huecos
    with io.open(PLAN, encoding="utf-8", errors="replace") as f:
        txt = f.read()
    m = re.search(r"^## 0-bis\..*?(?=^## 2\.)", txt, re.M | re.S) or re.search(r"^## 1\..*?(?=^## 2\.)", txt, re.M | re.S)
    if not m:
        return huecos
    ancla = ancla_del_plan(txt)
    cuenta = ""
    dia = fecha = ""
    for ln in m.group(0).splitlines():
        mc = re.search(r"###\s+(JAVI|JORDI)", ln)
        if mc:
            cuenta = mc.group(1)
            dia = fecha = ""
            continue
        celdas = [c.strip() for c in ln.split("|")]
        if len(celdas) < 6:
            continue
        md = re.search(r"(LUN|MAR|MI\S|JUE|VIE|S\SB|DOM)\s*(\d+)", celdas[1], re.I)
        if md:
            fecha = iso_de_etiqueta(md.group(1), int(md.group(2)), ancla)
            # el hueco viaja con FECHA; la etiqueta se deriva de ella y solo cae al texto
            # del plan si el ancla no resolvio (entonces se ve que es una etiqueta suelta)
            dia = etiqueta_dia(fecha) or (md.group(1)[:3] + " " + md.group(2)).lower()
        if "FALTA" in celdas[5].upper() and cuenta and dia:
            motivo = re.sub(r"\*+|`", "", celdas[5])
            motivo = re.sub(r"^\s*FALTA PRODUCIR\s*[—-]?\s*", "", motivo, flags=re.I).strip()
            huecos.append({"dia": dia, "fecha": fecha, "cuenta": cuenta,
                           "formato": re.sub(r"\*+", "", celdas[3]).strip(),
                           "hora": HORAS_SLOT.get(int(celdas[2]) if celdas[2].isdigit() else 0, ""),
                           "motivo": motivo[:160]})
    return huecos


def veredicto_pass(carpeta):
    rep = os.path.join(carpeta, "_gate", "REPORTE.md")
    if not os.path.isfile(rep):
        return False
    try:
        with io.open(rep, encoding="utf-8", errors="replace") as f:
            txt = f.read()
    except OSError:
        return False
    m = re.search(r"^##\s*VEREDICTO:\s*(\S+)", txt, re.M)
    return bool(m) and m.group(1).upper().startswith("PASS")


def leer_caption(carpeta):
    for nombre in ("_CAPTION.txt", "CAPTION.txt"):
        ruta = os.path.join(carpeta, nombre)
        if os.path.isfile(ruta):
            with io.open(ruta, encoding="utf-8", errors="replace") as f:
                lineas = f.read().strip().splitlines()
            if lineas and lineas[0].strip().upper().startswith("CAPTION ("):
                lineas = lineas[1:]
            return "\n".join(lineas).strip()
    return ""   # sin fichero = vacia. JAMAS texto interno.


def leer_etapa(carpeta):
    """(etiqueta, fuente) de la pieza. 'SIN' cuando la pieza no declara etapa.

    P15 (22-ago, Javi: «mientes en todo el panel con el tofu/mofu/bofu») pedia que una
    etiqueta no apareciese sin poder decir DE DONDE sale, y lo implemento exigiendo una
    linea `etapa_fuente:` en `_FORMATO.txt`. MEDIDO HOY (25-ago) sobre las 170 carpetas de
    PARA_REVISAR: **102 declaran `etapa:` y CERO declaran `etapa_fuente:`** — ningun motor
    de produccion escribe ese campo. Es decir: la puerta no la podia cruzar nadie, las 102
    salian "SIN CLASIFICAR" y ademas el campo se caia del JSON (P16), asi que **ninguna de
    las 64 piezas del panel llevaba `etiqueta`** y el filtro TOFU/MOFU/BOFU de la topbar no
    filtraba nada (bug 5).

    El arreglo cumple P15 sin dejar el campo muerto: la etiqueta viaja SIEMPRE con su
    fuente al lado (`etiqueta_fuente`), asi que es comprobable abriendo el fichero que se
    cita. Lo que NO se hace es deducirla del nombre, del tipo ni del dia: sin linea
    `etapa:` la pieza sale "SIN" y el panel lo dice (ley 4, cero inventar)."""
    ruta = os.path.join(carpeta, "_FORMATO.txt")
    if not os.path.isfile(ruta):
        return "SIN", ""
    etapa = fuente = ""
    with io.open(ruta, encoding="utf-8", errors="replace") as f:
        for ln in f:
            m = re.match(r"\s*etapa\s*:\s*(\w+)", ln, re.I)
            if m and m.group(1).upper() in ("TOFU", "MOFU", "BOFU", "AD"):
                etapa = m.group(1).upper()
            m2 = re.match(r"\s*etapa_fuente\s*:\s*(.+)", ln, re.I)
            if m2 and m2.group(1).strip():
                fuente = m2.group(1).strip()
    if not etapa:
        return "SIN", ""
    return etapa, fuente or (os.path.basename(carpeta) + "/_FORMATO.txt")


def leer_voz(carpeta):
    """linea `voz: javi|jordi` de _FORMATO.txt — fuente de cuenta cuando el nombre no la lleva."""
    ruta = os.path.join(carpeta, "_FORMATO.txt")
    if not os.path.isfile(ruta):
        return ""
    with io.open(ruta, encoding="utf-8", errors="replace") as f:
        for ln in f:
            m = re.match(r"\s*voz\s*:\s*(\w+)", ln, re.I)
            if m:
                v = m.group(1).upper()
                if v in ("JAVI", "JORDI"):
                    return v
    return ""


def cuenta_de(nombre, defecto=""):
    n = nombre.upper()
    if "JAVI" in n and "JORDI" not in n:
        return "JAVI"
    if "JORDI" in n and "JAVI" not in n:
        return "JORDI"
    return defecto


ES_AD = re.compile(r"(HOOKAD|ADS_|_AD\b|ADS\b|^V_JAVI_|^V_JORDI_)", re.I)


def tipo_de(nombre):
    n = nombre.upper()
    if "STORIES" in n or "STORY" in n:
        return "story"
    if "MEME" in n:
        return "meme"
    if "CARRUSEL" in n or n.startswith("CARR_"):
        return "carrusel"
    if ES_AD.search(n):
        return "reel"
    return "reel"


def tipo_medido(nombre, archivos):
    """Mesa 2.0 (23-ago): el TIPO sale de los FICHEROS reales, no del nombre.
    2+ imagenes = carrusel · si no, lo que diga el nombre (meme/story) · resto = reel.
    Causa: BSEM_* y CLON_* salian como «REEL» en la mesa por adivinar del nombre —
    Gerard 23-ago: «el panel ahora es peor que nunca»."""
    imgs = sum(1 for a in archivos if not a.get("video") and not a["archivo"].lower().endswith(".mp4"))
    por_nombre = tipo_de(nombre)
    if por_nombre in ("story", "meme"):
        return por_nombre
    if imgs >= 2:
        return "carrusel"
    return "reel"


def parsear_plan():
    """Tabla seccion 1 del plan semanal → {nombre_carpeta: {fecha ISO, hora}}.

    RESPALDO, no fuente principal: el plan cubre una semana y escribe los dias como
    etiquetas ("**DOM 23**"). Aqui se convierten a fecha real contra el ancla que el propio
    plan declara en su titulo; una etiqueta que no resuelva se descarta en vez de viajar
    sin mes (bug 3). Filas FALTA PRODUCIR se saltan."""
    slots = {}
    if not os.path.isfile(PLAN):
        print("AVISO: plan semanal no encontrado:", PLAN)
        return slots
    with io.open(PLAN, encoding="utf-8", errors="replace") as f:
        txt = f.read()
    m = re.search(r"^## 0-bis\..*?(?=^## 2\.)", txt, re.M | re.S) or re.search(r"^## 1\..*?(?=^## 2\.)", txt, re.M | re.S)
    if not m:
        print("AVISO: seccion 1 del plan no localizada")
        return slots
    ancla = ancla_del_plan(txt)
    if not ancla:
        print("AVISO: el plan no declara fecha en su titulo -> no aporta fechas")
        return slots
    dia = None
    for ln in m.group(0).splitlines():
        if not ln.startswith("|"):
            continue
        celdas = [c.strip() for c in ln.strip("|").split("|")]
        if len(celdas) < 5:
            continue
        md = re.match(r"\*\*([A-ZÁÉÍÓÚ]{3})\s+(\d+)\*\*", celdas[0])
        if md:
            dia = iso_de_etiqueta(md.group(1), int(md.group(2)), ancla) or None
        if dia is None:
            continue
        try:
            slot = int(celdas[1])
        except ValueError:
            continue
        pieza = celdas[4]
        if "FALTA PRODUCIR" in pieza:
            continue
        mm = re.search(r"`([^`]+)`", pieza)
        if not mm:
            continue
        ruta = mm.group(1).strip().strip("/")
        # el nombre de carpeta de pieza es el primer segmento "gordo" tras PARA_REVISAR/
        # o tras 1_JAVI / 2_JORDI en _CONTENIDO...
        partes = [p for p in ruta.split("/") if p]
        carpeta = None
        for i, p in enumerate(partes):
            if p in ("PARA_REVISAR", "1_JAVI", "2_JORDI") and i + 1 < len(partes):
                carpeta = partes[i + 1]
                break
        if carpeta is None:
            carpeta = partes[0]
        carpeta = carpeta.strip()
        if carpeta.startswith("_"):
            continue          # `_SCRIPTS`, `_panel_mx`… rutas de herramienta, no piezas
        if carpeta and carpeta not in slots:      # primera asignacion manda
            slots[carpeta] = {"fecha": dia, "hora": HORAS_SLOT.get(slot, "19:30"),
                              "casilla": "", "cuenta": ""}
    return slots


def ffmpeg_poster(src, dst):
    """Frame a ~1s como poster jpg. Si el video es mas corto cae a 0s."""
    for ss in ("1", "0"):
        cmd = ["ffmpeg", "-y", "-v", "error", "-ss", ss, "-i", src,
               "-frames:v", "1", "-vf", "scale='min(1080,iw)':-2", "-q:v", "4", dst]
        try:
            r = subprocess.run(cmd, capture_output=True, timeout=120, creationflags=NO_WIN)
        except Exception:
            return False
        if r.returncode == 0 and os.path.isfile(dst) and os.path.getsize(dst) > 0:
            return True
    return False


def ffmpeg_jpg(src, dst):
    """png/jpg de slide → jpg de poster (reescala a max 1080 de ancho)."""
    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src,
           "-vf", "scale='min(1080,iw)':-2", "-q:v", "4", dst]
    try:
        r = subprocess.run(cmd, capture_output=True, timeout=120, creationflags=NO_WIN)
    except Exception:
        return False
    return r.returncode == 0 and os.path.isfile(dst) and os.path.getsize(dst) > 0


def listar_media(carpeta):
    """Ficheros de pieza en el orden del panel: _PREVIEW.mp4 primero, luego el resto ordenado.
    Se excluye todo lo interno (_gate, _seq, _CLON_CHECK, .txt...)."""
    out = []
    try:
        nombres = sorted(os.listdir(carpeta))
    except OSError:
        return out
    for n in nombres:
        ruta = os.path.join(carpeta, n)
        if not os.path.isfile(ruta):
            continue
        ext = os.path.splitext(n)[1].lower()
        if ext not in MEDIA_EXT:
            continue
        if n.startswith("_") and n != "_PREVIEW.mp4":
            continue
        if "CLON_CHECK" in n.upper() or "_qa_" in n.lower():
            continue
        out.append(n)
    out.sort(key=lambda n: (0 if n == "_PREVIEW.mp4" else 1, n))
    return out


def media_pieza(pid, carpeta, dry):
    """Copia/genera medias a media/ y devuelve la lista archivos[] del esquema del panel."""
    archivos = []
    stats = {"videos": 0, "posters": 0, "omitidos": 0, "mb": 0.0}
    for i, n in enumerate(listar_media(carpeta)):
        src = os.path.join(carpeta, n)
        ext = os.path.splitext(n)[1].lower()
        base = "%s__%02d" % (pid, i)
        poster_rel = "media/%s.jpg" % base
        poster_abs = os.path.join(MEDIA, base + ".jpg")
        ent = {"archivo": n, "poster": poster_rel}
        if ext == ".mp4":
            mb = round(os.path.getsize(src) / 1048576.0, 2)
            ent["peso_mb"] = mb
            video_abs = os.path.join(MEDIA, base + ".mp4")
            if mb < LIM_MB:
                ent["video"] = "media/%s.mp4" % base
                if not dry and (not os.path.isfile(video_abs) or os.path.getsize(video_abs) != os.path.getsize(src)):
                    shutil.copy2(src, video_abs)
                    stats["videos"] += 1
                    stats["mb"] += mb
            else:
                # Mesa 2.0 (23-ago): un reel que no se puede VER no se puede votar.
                # Los >LIM_MB no se tiran: se les hace preview 720p comprimida.
                ent["video"] = "media/%s.mp4" % base
                if not dry and not os.path.isfile(video_abs):
                    cmd = ["ffmpeg", "-y", "-v", "error", "-i", src,
                           "-vf", "scale='min(720,iw)':-2", "-c:v", "libx264",
                           "-preset", "veryfast", "-crf", "28", "-movflags", "+faststart",
                           "-c:a", "aac", "-b:a", "96k", video_abs]
                    try:
                        r = subprocess.run(cmd, capture_output=True, timeout=600, creationflags=NO_WIN)
                        if r.returncode == 0 and os.path.isfile(video_abs) and os.path.getsize(video_abs) > 0:
                            stats["videos"] += 1
                            stats["mb"] += os.path.getsize(video_abs) / 1048576.0
                        else:
                            ent.pop("video", None)
                            stats["omitidos"] += 1
                    except Exception:
                        ent.pop("video", None)
                        stats["omitidos"] += 1
            if not dry and not os.path.isfile(poster_abs):
                if ffmpeg_poster(src, poster_abs):
                    stats["posters"] += 1
                else:
                    ent.pop("poster", None)
        else:  # png / jpg
            if not dry and not os.path.isfile(poster_abs):
                if ffmpeg_jpg(src, poster_abs):
                    stats["posters"] += 1
                else:
                    ent.pop("poster", None)
        archivos.append(ent)
    return archivos, stats


ESTADO_PIEZAS = os.path.join(
    "C:/Users/PC/Desktop/MENTORIUM/MENTORIUM_SISTEMA_UNIFICADO",
    "OBSIDIAN_2CEREBRO", "_contexto", "ESTADO_PIEZAS.json")


def denegadas():
    """Los ids que Gerard ya tumbo en el filtro 1. NO vuelven al panel.

    EL BUG QUE ESTO CIERRA (medido 23-ago): el panel ensenaba 145 piezas y 88 estaban DENEGADAS
    por Gerard — el 61 % era contenido que el ya habia tumbado, algunas del 1 de agosto. Su queja
    literal: «en el panel aun veo todo el contenido antiguo mal hecho».

    La causa era de diseno: este generador barre PARA_REVISAR buscando VEREDICTO PASS, y el gate
    tecnico no sabe nada de los votos. Una pieza denegada conserva su PASS en disco, asi que
    volvia al panel en CADA regeneracion, para siempre. Denegar no servia de nada.

    Los ids casan 1:1 entre ESTADO_PIEZAS.json y piezas.json (comprobado: 145 de 145), asi que el
    filtro es exacto y no hay que adivinar nombres.

    Las piezas NO se borran del disco: solo dejan de ensenarse (mover/ocultar, nunca rm).
    """
    try:
        with io.open(ESTADO_PIEZAS, encoding="utf-8") as f:
            d = json.load(f)
    except Exception as e:
        print("AVISO: no pude leer los votos (%s) -> no se filtra nada" % str(e)[:60])
        return set()
    return set(x["id"] for x in d.get("piezas", [])
               if (x.get("f1") or {}).get("estado") == "denegado")


REFERENTES_JSON = os.path.join(PANEL, "referentes.json")
REF_DEST = os.path.join(MEDIA, "_ref")
REF_IMG = (".jpg", ".jpeg", ".png", ".webp")
REF_VID = (".mp4", ".mov", ".webm", ".mkv")


def _sha12(ruta):
    """12 hex del SHA256 del fichero. Se lee a trozos: hay referentes de 32 MB."""
    h = hashlib.sha256()
    with io.open(ruta, "rb") as f:
        for trozo in iter(lambda: f.read(1 << 20), b""):
            h.update(trozo)
    return h.hexdigest()[:12]


def emparejar_referentes(carpetas, dry):
    """Escribe `pares` y `sin_referente` de referentes.json PARA LAS MISMAS PIEZAS QUE ESTE
    generador acaba de publicar. Devuelve (n_pares, n_sin).

    EL BUG QUE CIERRA (bug 6, reportado por Gerard el 25-ago): el drawer «Comparar con el
    referente» casi nunca aparecia. El codigo del front estaba bien (`vistas/revisar.js`
    linea 325); faltaban los DATOS. Medido hoy: de los 28 carruseles del panel **solo 2**
    tenian pareja en referentes.json.

    La causa NO era que las piezas no declarasen referente — **59 de las 62 carpetas PASS
    resuelven su referente contra el disco**. Era que habia DOS definiciones distintas de
    «las piezas del panel»: este fichero barre PARA_REVISAR y filtra los votos de Gerard,
    mientras `_SCRIPTS/panel_referente_al_lado.py` iteraba `_INVENTARIO_PASS.json` con el
    corte de fecha de `empaquetar_semana`. Dos listas que no se hablan = 29 parejas de las
    que solo 21 existian en el panel, y casi ningun carrusel. Emparejar DENTRO del mismo
    bucle que publica las piezas hace la desincronizacion imposible por construccion.

    Se reusa `_resuelve_referente` de `gate_pieza.py` — el mismo criterio que usa el gate
    (ley 6: nada de un segundo inventario de referentes que se desincronice). Y se mira
    tambien `_MOLDE.txt`, que es donde varias piezas declaran su molde.

    ⛔ Lo que NO hace, a proposito: inventarse un referente «parecido» para la pieza que no
    lo declara. Sale sin pareja y con el motivo escrito (ley 4)."""
    try:
        sys.path.insert(0, os.path.join(BASE, "_SCRIPTS"))
        from gate_pieza import _resuelve_referente
    except Exception as e:                     # sin gate no se toca lo que ya hay
        print("AVISO: no pude importar gate_pieza (%s) -> referentes.json intacto" % str(e)[:70])
        return -1, -1

    pares, sin = [], []
    for pid, carpeta in carpetas:
        decl = []
        for f in ("_REFERENTE.txt", "_MOLDE.txt"):
            r = os.path.join(carpeta, f)
            if os.path.isfile(r):
                with io.open(r, encoding="utf-8", errors="replace") as fh:
                    decl.append((f, fh.read()))
        if not decl:
            sin.append({"pieza": pid, "motivo": "no declara referente"})
            continue
        origen = motivo = ""
        for f, txt in decl:
            ruta, mot = _resuelve_referente(txt)
            motivo = motivo or mot
            if ruta:
                origen, motivo = ruta, "%s · %s" % (f, mot)
                break
        if not origen:
            sin.append({"pieza": pid, "motivo": motivo})
            continue
        # un referente de CARRUSEL no es un fichero: es la carpeta de slides. Se coge la
        # primera imagen como muestra (misma regla que gate_pieza._ref_inventario).
        if os.path.isdir(origen):
            cand = sorted(f for f in os.listdir(origen) if f.lower().endswith(REF_IMG))
            if not cand:
                sin.append({"pieza": pid, "motivo": "carpeta de referente sin imagenes"})
                continue
            origen = os.path.join(origen, cand[0])
        ext = os.path.splitext(origen)[1].lower()
        # NOMBRE POR CONTENIDO, no por pieza (medido 25-ago). Nombrar la copia
        # `<pieza>__ref.mp4` significa una copia POR PIEZA: las 71 parejas apuntaban a solo
        # **10 ficheros distintos por contenido** y ocupaban 398,9 MB en vez de 55,5 —
        # 343 MB de bytes repetidos (86 %) en un repo de GitHub Pages, que tiene 1 GB de
        # techo. El caso peor: UN referente de 32,5 MB copiado 11 veces porque 11 memes de
        # Jordi clonan el mismo molde. Con el hash del contenido, N piezas que comparten
        # referente comparten fichero, y ademas la copia se salta sola si ya existe.
        dst_nom = "%s%s" % (_sha12(origen), ext)
        dst = os.path.join(REF_DEST, dst_nom)
        if not dry and not os.path.isfile(dst):
            os.makedirs(REF_DEST, exist_ok=True)
            try:
                shutil.copy2(origen, dst)
            except OSError as e:
                sin.append({"pieza": pid, "motivo": "no se pudo copiar (%s)" % str(e)[:50]})
                continue
        par = {"pieza": pid, "ref": "media/_ref/" + dst_nom,
               "es_video": ext in REF_VID,
               "origen": os.path.basename(origen), "como": motivo}
        # `_MOLDE.txt` de una linea es el NOMBRE del molde ("callout_moroso_giro"). El front
        # ya lo prefiere si viene (`revisar.js` moldeDe: `if (r.molde) return r.molde`) y si
        # no, cae al shortcode. Un nombre de molde se lee; un shortcode no dice nada.
        for f, txt in decl:
            if f == "_MOLDE.txt":
                ln = txt.strip().splitlines()[0].strip() if txt.strip() else ""
                if 0 < len(ln) <= 60 and " " not in ln:
                    par["molde"] = ln
        pares.append(par)

    if dry:
        return len(pares), len(sin)
    # NO pisar las otras claves del fichero (`medidos` lo escribe referentes_medir.py:
    # sobrescribir entero borraba 134 mediciones en cada pasada).
    previo = {}
    try:
        with io.open(REFERENTES_JSON, encoding="utf-8") as f:
            previo = json.load(f)
        if not isinstance(previo, dict):
            previo = {}
    except (OSError, ValueError):
        previo = {}
    if os.path.isfile(REFERENTES_JSON):
        shutil.copy2(REFERENTES_JSON, REFERENTES_JSON + ".bak_regen")
    previo["pares"] = pares
    previo["sin_referente"] = sin
    previo["pares_generado"] = datetime.datetime.now().isoformat(timespec="minutes")
    with io.open(REFERENTES_JSON, "w", encoding="utf-8") as f:
        json.dump(previo, f, ensure_ascii=False, indent=1)
    _huerfanos_ref({p["ref"] for p in pares})
    return len(pares), len(sin)


def _huerfanos_ref(vivos):
    """Avisa de las copias de `media/_ref/` que ya no cita ningun par (p.ej. las viejas
    `<pieza>__ref.mp4` de cuando se copiaba una por pieza). SOLO AVISA: borrar es
    destructivo y va con OK explicito (`--limpiar-ref`), y aun entonces solo se borra lo
    que es byte-identico a una copia que SI se conserva — nunca el ultimo ejemplar."""
    if not os.path.isdir(REF_DEST):
        return
    sobra, peso = [], 0
    for f in sorted(os.listdir(REF_DEST)):
        if "media/_ref/" + f in vivos:
            continue
        ruta = os.path.join(REF_DEST, f)
        if os.path.isfile(ruta):
            sobra.append(ruta)
            peso += os.path.getsize(ruta)
    if not sobra:
        return
    print("media/_ref: %d copias ya no citadas por ningun par (%.1f MB)"
          % (len(sobra), peso / 1048576.0))
    if "--limpiar-ref" not in sys.argv:
        print("           (se conservan. Para borrar SOLO las byte-identicas a una copia "
              "viva: python _gen_piezas.py --limpiar-ref)")
        return
    hashes_vivos = set()
    for r in vivos:
        ruta = os.path.join(PANEL, r.replace("/", os.sep))
        if os.path.isfile(ruta):
            hashes_vivos.add(_sha12(ruta))
    n = mb = 0
    for ruta in sobra:
        if _sha12(ruta) in hashes_vivos:        # duplicado exacto: la copia viva lo cubre
            mb += os.path.getsize(ruta) / 1048576.0
            os.remove(ruta)
            n += 1
    print("           borradas %d duplicadas exactas (%.1f MB). Las %d restantes NO son "
          "duplicado de nada vivo y se quedan." % (n, mb, len(sobra) - n))


def main():
    dry = "--dry-run" in sys.argv
    os.makedirs(MEDIA, exist_ok=True)

    # 0) etiquetas/tipos/cuentas corregidos a mano (21-ago) — se heredan. Se mira el json
    # vivo y, para huecos, el backup pre-regeneracion (el estado corregido del 21-ago).
    heredado = {}
    for ruta in (PIEZAS_JSON, PIEZAS_JSON + ".bak_regen"):
        if not os.path.isfile(ruta):
            continue
        with io.open(ruta, encoding="utf-8") as f:
            viejo = json.load(f)
        for p in viejo.get("piezas", []):
            h = heredado.setdefault(p["id"], {})
            for k in ("etiqueta", "tipo", "cuenta"):
                if not h.get(k) and p.get(k):
                    h[k] = p[k]
    print("piezas heredables (json vivo + backup):", len(heredado))

    # 0-bis) LAS FECHAS. Manda el calendario del MES (ISO, 30 dias); el plan de la semana
    # solo rellena los dias que el mes no cubre. Antes solo se leia el plan y de ahi salian
    # los bugs 2/3/4: etiquetas sin mes, un dia de fuera de la semana, y 43 de 64 sin dia.
    slots, horizonte = fechas_del_mes()
    print("calendario del mes: %d piezas fechadas · horizonte %s -> %s (%d dias)"
          % (len(slots), horizonte[0] if horizonte else "-",
             horizonte[-1] if horizonte else "-", len(horizonte)))
    for s in slots.values():
        s["fuente"] = "CALENDARIO_MES.json"
    plan = parsear_plan()
    n_plan = 0
    for carp, s in plan.items():
        if carp not in slots:
            s["fuente"] = os.path.basename(PLAN)
            slots[carp] = s
            n_plan += 1
    print("plan semanal (respaldo): %d slots leidos · %d fechas que el mes no traia"
          % (len(plan), n_plan))

    piezas = []
    avisos = []
    VETADAS = denegadas()
    print("vetadas por Gerard (filtro 1 = denegado):", len(VETADAS))
    n_veto = 0

    # 1) PARA_REVISAR: solo VEREDICTO PASS, salta _BLOQUEADAS y carpetas internas
    n_pass = n_skip = 0
    for nombre in sorted(os.listdir(PR)):
        carpeta = os.path.join(PR, nombre)
        if not os.path.isdir(carpeta) or nombre.startswith("_"):
            continue
        if not veredicto_pass(carpeta):
            n_skip += 1
            continue
        if nombre in VETADAS:            # Gerard ya la tumbo: no vuelve al panel
            n_veto += 1
            continue
        n_pass += 1
        her = heredado.get(nombre, {})
        etiqueta, eti_fuente = leer_etapa(carpeta)
        if etiqueta == "SIN" and her.get("etiqueta") not in (None, "", "SIN"):
            etiqueta, eti_fuente = her["etiqueta"], "piezas.json (corregido a mano)"
        tipo = her.get("tipo") or tipo_de(nombre)
        s = slots.get(nombre) or {}
        piezas.append({
            "nombre_carpeta": nombre, "id": nombre,
            "cuenta": cuenta_de(nombre) or her.get("cuenta", "") or leer_voz(carpeta),
            "tipo": tipo,
            "fecha": s.get("fecha", ""), "dia": etiqueta_dia(s.get("fecha", "")),
            "hora": s.get("hora", ""), "fecha_fuente": s.get("fuente", ""),
            "etiqueta": etiqueta, "etiqueta_fuente": eti_fuente,
            "caption": leer_caption(carpeta),
            "carpeta_abs": carpeta,
            "origen": "PARA_REVISAR/" + nombre,
        })
    print("PARA_REVISAR: %d PASS · %d saltadas · %d VETADAS por Gerard"
          % (n_pass, n_skip, n_veto))

    # 2) _CONTENIDO_JAVI_JORDI_HOY: carpetas de pieza del 21-ago (sin gate todavia)
    n_hoy = 0
    for sub, cuenta in (("1_JAVI", "JAVI"), ("2_JORDI", "JORDI")):
        raiz = os.path.join(HOY, sub)
        if not os.path.isdir(raiz):
            continue
        for nombre in sorted(os.listdir(raiz)):
            carpeta = os.path.join(raiz, nombre)
            if not os.path.isdir(carpeta):
                continue
            up = nombre.upper()
            if up.startswith("STORIES") or up.startswith("REELS_EVENTO") or up.startswith("REPLICA_"):
                continue  # no son piezas de feed de esta tanda (13 carpetas de pieza, plan §0)
            if not listar_media(carpeta):
                continue
            pid = nombre if cuenta_de(nombre) else "%s_%s" % (cuenta, nombre)
            # el calendario del mes indexa por id de pieza; el plan, por nombre de carpeta
            s = slots.get(pid) or slots.get(nombre) or {}
            her = heredado.get(pid, {})
            etiqueta, eti_fuente = leer_etapa(carpeta)
            if etiqueta == "SIN" and her.get("etiqueta") not in (None, "", "SIN"):
                etiqueta, eti_fuente = her["etiqueta"], "piezas.json (corregido a mano)"
            n_hoy += 1
            piezas.append({
                "nombre_carpeta": nombre, "id": pid,
                "cuenta": cuenta, "tipo": her.get("tipo") or tipo_de(nombre),
                "fecha": s.get("fecha", ""), "dia": etiqueta_dia(s.get("fecha", "")),
                "hora": s.get("hora", ""), "fecha_fuente": s.get("fuente", ""),
                "etiqueta": etiqueta, "etiqueta_fuente": eti_fuente,
                "caption": leer_caption(carpeta),
                "carpeta_abs": carpeta,
                "origen": "_CONTENIDO_JAVI_JORDI_HOY/%s/%s" % (sub, nombre),
            })
    print("_CONTENIDO_JAVI_JORDI_HOY: %d piezas" % n_hoy)

    # aviso de slots programados que no casaron con ninguna carpeta (sin inventar nada)
    usados = {p["nombre_carpeta"] for p in piezas if p["fecha"]} | {p["id"] for p in piezas if p["fecha"]}
    for carp in slots:
        if carp not in usados:
            avisos.append("slot programado sin carpeta viva en disco (%s): %s"
                          % (slots[carp].get("fuente", "?"), carp))

    # 3) medias + orden. Se ordena por FECHA ISO, que ordena sola y para siempre: la tabla
    # `orden_dia` que habia aqui indexaba la constante DIAS de una semana concreta, asi que
    # cualquier dia fuera de esa semana caia al fondo con el mismo peso (99).
    piezas.sort(key=lambda p: (p["fecha"] or "9999-99-99", p["hora"] or "99:99",
                               p["cuenta"], p["id"]))
    tot = {"videos": 0, "posters": 0, "omitidos": 0, "mb": 0.0}
    salida = []
    carpetas_vivas = []          # (id, carpeta) de lo que SI acaba en el panel -> referentes
    for p in piezas:
        carpeta = p.pop("carpeta_abs")
        archivos, st = media_pieza(p["id"], carpeta, dry)
        p.pop("nombre_carpeta")
        for k in tot:
            tot[k] += st[k]
        if not archivos:
            avisos.append("pieza sin media, fuera: " + p["id"])
            continue
        carpetas_vivas.append((p["id"], carpeta))
        p["archivos"] = archivos
        # Mesa 2.0: tipo MEDIDO de los ficheros (gana a la herencia y al nombre)
        p["tipo"] = tipo_medido(p["id"], archivos)
        n_slides = sum(1 for a in archivos if a["archivo"].lower().endswith((".png", ".jpg", ".jpeg")))
        if p["tipo"] == "carrusel" and n_slides:
            p["slides"] = n_slides
        p["sin_caption"] = not (p.get("caption") or "").strip()
        # Orden de claves = esquema del panel (§2.A de BUILD_SPEC_PANEL_ELITE).
        # `fecha` es NUEVA y se AÑADE: el contrato de datos es sagrado, ningun campo que ya
        # leia el front se renombra ni desaparece. `dia` sigue existiendo con la misma forma
        # ("mié 26") porque `hoy.js` casa letra a letra contra el; la diferencia es que ahora
        # se DERIVA de `fecha` en vez de venir escrita a mano.
        # `etiqueta` vuelve (P16 la habia quitado del json del equipo, y con ella se fue el
        # filtro TOFU/MOFU/BOFU de la topbar: bug 5). Vuelve con `etiqueta_fuente` al lado,
        # que es lo que P15 pedia de verdad: una etiqueta comprobable, no una etiqueta muda.
        salida.append({k: p[k] for k in
                       ("id", "cuenta", "tipo", "fecha", "dia", "hora", "fecha_fuente",
                        "etiqueta", "etiqueta_fuente",
                        "caption", "archivos", "sin_caption")
                       if k in p} | ({"slides": p["slides"]} if "slides" in p else {}))

    huecos = leer_huecos_plan()

    # 4) LA CABECERA DEL PANEL — el horizonte se MIDE, no se declara (bug 1).
    # `dias_iso` es el eje de tiempo de verdad: la union del horizonte del calendario del
    # mes con los dias que las piezas ocupan de verdad. Sale ordenado por fecha, asi que
    # ningun dia puede volver a colarse fuera de sitio como "dom 23" en la semana "24-30".
    fechas_vivas = sorted({p["fecha"] for p in salida if p.get("fecha")} |
                          {h["fecha"] for h in huecos if h.get("fecha")} |
                          set(horizonte))
    dias_iso = [{"fecha": f, "etiqueta": etiqueta_dia(f)} for f in fechas_vivas]
    hoy_iso = datetime.date.today().isoformat()
    doc = {
        "generado": datetime.datetime.now().isoformat(timespec="minutes"),
        "hoy": hoy_iso,
        # rango REAL de lo que hay en disco. Sustituye a la SEMANA horneada a mano.
        "rango": {"desde": fechas_vivas[0] if fechas_vivas else "",
                  "hasta": fechas_vivas[-1] if fechas_vivas else ""},
        # `semana` se conserva porque el front la lee (index.html: "Semana "+DATOS.semana) y
        # el contrato de datos no se rompe por sorpresa — pero ya NO es una etiqueta
        # escrita a mano: describe el rango medido. Cuando el front deje de pintar "Semana
        # X" y pase a `rango`/`dias_iso`, esta clave se puede jubilar.
        "semana": (rango_humano(fechas_vivas[0], fechas_vivas[-1])
                   if fechas_vivas else "sin fechas en disco"),
        "dias": [d["etiqueta"] for d in dias_iso],
        "dias_iso": dias_iso,
        "piezas": salida,
        "huecos": huecos,
    }

    con_fecha = sum(1 for p in salida if p.get("fecha"))
    con_eti = sum(1 for p in salida if p.get("etiqueta") not in ("", "SIN"))
    print("fechas: %d de %d piezas con fecha ISO (%d sin fecha, y el panel lo dice)"
          % (con_fecha, len(salida), len(salida) - con_fecha))
    print("etapa:  %d de %d piezas con TOFU/MOFU/BOFU/AD comprobable · %d SIN"
          % (con_eti, len(salida), len(salida) - con_eti))
    print("horizonte del panel: %s -> %s (%d dias)"
          % (doc["rango"]["desde"] or "-", doc["rango"]["hasta"] or "-", len(dias_iso)))
    print("TOTAL piezas: %d (antes: %d)" % (len(salida), len(heredado)))
    print("media nueva: %d videos (%.1f MB) · %d posters · %d videos >%dMB solo poster"
          % (tot["videos"], tot["mb"], tot["posters"], tot["omitidos"], LIM_MB))
    # 5) el referente al lado del clon, sobre ESTAS mismas piezas (bug 6)
    np_, ns_ = emparejar_referentes(carpetas_vivas, dry)
    if np_ >= 0:
        print("referentes: %d piezas con su referente al lado · %d sin declararlo"
              % (np_, ns_))
    for a in avisos:
        print("AVISO:", a)
    if dry:
        print("(dry-run: no se escribe nada)")
        return

    # backup + escribir piezas.json
    if os.path.isfile(PIEZAS_JSON):
        shutil.copy2(PIEZAS_JSON, PIEZAS_JSON + ".bak_regen")
    with io.open(PIEZAS_JSON, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=1)
    print("escrito:", PIEZAS_JSON)
    print("escrito:", REFERENTES_JSON)


if __name__ == "__main__":
    main()
