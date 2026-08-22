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
  4. dia/hora: solo las piezas asignadas en la tabla seccion 1 de
     _HOY_20AGO/PLAN_SEMANA_JAVI_JORDI.md (slot 1=19:00, 2=19:30, 3=20:00 — regla 25 de
     Jordi: publicar 19-20h). El resto sin dia.
  5. Medias a media/: poster siempre (ffmpeg -ss 1 -frames:v 1 si falta); el mp4 entero
     SOLO si pesa <8MB, si no solo poster. Idempotente: no re-copia lo que ya esta.
  6. Refresca el fallback embebido `let DATOS=...` de index.html (el fetch de piezas.json
     es la fuente; el embed queda como fallback FRESCO para file:// o red caida).

Uso:  python _gen_piezas.py [--dry-run]
"""
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
PLAN = r"C:\Users\PC\Desktop\_HOY_20AGO\PLAN_SEMANA_JAVI_JORDI.md"

LIM_MB = 8.0                      # techo de video que viaja al repo (GitHub Pages)
SEMANA = "24-30 agosto 2026"
DIAS = ["lun 24", "mar 25", "mié 26", "jue 27", "vie 28", "sáb 29", "dom 30"]
HORAS_SLOT = {1: "19:00", 2: "19:30", 3: "20:00"}
MEDIA_EXT = (".mp4", ".png", ".jpg", ".jpeg")
NO_WIN = 0x08000000 if os.name == "nt" else 0   # CREATE_NO_WINDOW (protocolo-torre 5)


def norm(s):
    """minusculas sin acentos, para casar 'MIÉ 26' del plan con 'mié 26' del panel."""
    return unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()


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
    ruta = os.path.join(carpeta, "_FORMATO.txt")
    if not os.path.isfile(ruta):
        return ""
    with io.open(ruta, encoding="utf-8", errors="replace") as f:
        for ln in f:
            m = re.match(r"\s*etapa\s*:\s*(\w+)", ln, re.I)
            if m:
                v = m.group(1).upper()
                if v in ("TOFU", "MOFU", "BOFU", "AD"):
                    return v
    return ""


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
        return "ad"
    return "reel"


def parsear_plan():
    """Tabla seccion 1 del plan → {nombre_carpeta: (dia, hora)}. Filas FALTA PRODUCIR se saltan."""
    slots = {}
    if not os.path.isfile(PLAN):
        print("AVISO: plan semanal no encontrado:", PLAN)
        return slots
    with io.open(PLAN, encoding="utf-8", errors="replace") as f:
        txt = f.read()
    m = re.search(r"^## 1\..*?(?=^## 2\.)", txt, re.M | re.S)
    if not m:
        print("AVISO: seccion 1 del plan no localizada")
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
            eti = norm(md.group(1)) + " " + md.group(2)
            dia = next((d for d in DIAS if norm(d) == eti), None)
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
        if carpeta and carpeta not in slots:      # primera asignacion manda
            slots[carpeta] = (dia, HORAS_SLOT.get(slot, "19:30"))
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

    slots = parsear_plan()
    print("slots del plan resueltos:", len(slots))

    piezas = []
    avisos = []

    # 1) PARA_REVISAR: solo VEREDICTO PASS, salta _BLOQUEADAS y carpetas internas
    n_pass = n_skip = 0
    for nombre in sorted(os.listdir(PR)):
        carpeta = os.path.join(PR, nombre)
        if not os.path.isdir(carpeta) or nombre.startswith("_"):
            continue
        if not veredicto_pass(carpeta):
            n_skip += 1
            continue
        n_pass += 1
        her = heredado.get(nombre, {})
        etiqueta = her.get("etiqueta") or leer_etapa(carpeta)
        tipo = her.get("tipo") or tipo_de(nombre)
        if not etiqueta and tipo == "ad":
            etiqueta = "AD"
        dia, hora = slots.get(nombre, ("", ""))
        piezas.append({
            "nombre_carpeta": nombre, "id": nombre,
            "cuenta": cuenta_de(nombre) or her.get("cuenta", "") or leer_voz(carpeta),
            "tipo": tipo,
            "dia": dia, "hora": hora, "etiqueta": etiqueta,
            "caption": leer_caption(carpeta),
            "carpeta_abs": carpeta,
            "origen": "PARA_REVISAR/" + nombre,
        })
    print("PARA_REVISAR: %d PASS · %d saltadas (sin PASS o internas)" % (n_pass, n_skip))

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
            dia, hora = slots.get(nombre, ("", ""))
            her = heredado.get(pid, {})
            n_hoy += 1
            piezas.append({
                "nombre_carpeta": nombre, "id": pid,
                "cuenta": cuenta, "tipo": her.get("tipo") or tipo_de(nombre),
                "dia": dia, "hora": hora,
                "etiqueta": her.get("etiqueta") or leer_etapa(carpeta),
                "caption": leer_caption(carpeta),
                "carpeta_abs": carpeta,
                "origen": "_CONTENIDO_JAVI_JORDI_HOY/%s/%s" % (sub, nombre),
            })
    print("_CONTENIDO_JAVI_JORDI_HOY: %d piezas" % n_hoy)

    # aviso de slots del plan que no casaron con ninguna carpeta (sin inventar nada)
    usados = {p["nombre_carpeta"] for p in piezas if p["dia"]}
    for carp in slots:
        if carp not in usados:
            avisos.append("slot del plan sin carpeta en disco: " + carp)

    # 3) medias + orden (asignadas por dia primero, luego el resto por cuenta/nombre)
    orden_dia = {d: i for i, d in enumerate(DIAS)}
    piezas.sort(key=lambda p: (orden_dia.get(p["dia"], 99), p["hora"] or "99",
                               p["cuenta"], p["id"]))
    tot = {"videos": 0, "posters": 0, "omitidos": 0, "mb": 0.0}
    salida = []
    for p in piezas:
        archivos, st = media_pieza(p["id"], p.pop("carpeta_abs"), dry)
        p.pop("nombre_carpeta")
        for k in tot:
            tot[k] += st[k]
        if not archivos:
            avisos.append("pieza sin media, fuera: " + p["id"])
            continue
        p["archivos"] = archivos
        # orden de claves = esquema del panel (INTOCABLE)
        salida.append({k: p[k] for k in
                       ("id", "cuenta", "tipo", "dia", "hora", "etiqueta",
                        "caption", "archivos", "origen")})

    doc = {
        "generado": __import__("datetime").date.today().isoformat(),
        "semana": SEMANA,
        "dias": DIAS,
        "piezas": salida,
    }

    print("TOTAL piezas: %d (antes: %d)" % (len(salida), len(heredado)))
    print("media nueva: %d videos (%.1f MB) · %d posters · %d videos >%dMB solo poster"
          % (tot["videos"], tot["mb"], tot["posters"], tot["omitidos"], LIM_MB))
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

    # refrescar el fallback embebido de index.html (la fuente es el fetch; esto es solo
    # el paracaidas de file:// — y se regenera aqui para que nunca vuelva a congelarse)
    with io.open(INDEX, encoding="utf-8") as f:
        html = f.read()
    linea = "let DATOS=" + json.dumps(doc, ensure_ascii=False, separators=(",", ": ")) + ";"
    html2, n = re.subn(r"^(?:const|let) DATOS=.*$", lambda m: linea, html, count=1, flags=re.M)
    if n == 1:
        with io.open(INDEX, "w", encoding="utf-8") as f:
            f.write(html2)
        print("embed fallback de index.html refrescado")
    else:
        print("AVISO: no se encontro la linea DATOS= en index.html — embed sin tocar")


if __name__ == "__main__":
    main()
