# -*- coding: utf-8 -*-
"""Mide los referentes que YA estan en disco y cablea la pestana Referentes al dato real.

Queja literal de Gerard (audio 21-ago 19:21): "la pestana de referentes no esta en tiempo real".
Antes: 12 URLs hardcodeadas todas "sin analizar" mientras en disco hay 227 referentes con specs.

QUE HACE
1. Recorre los almacenes locales de referentes (prioridad: CLON > SYK > MINA-con-spec, tope 80)
   y por cada video mide con ffmpeg EN UNA SOLA PASADA:
     - duracion (ffprobe)
     - cortes/s a DOS umbrales de scene-detect: 0.30 (el del gate) y 0.12 (el ritmo real,
       banda talking_jumpcut - RECETA_MEDIDA_52_REFERENTES_19AGO)
2. La familia sale de moldes.json (ya medida) o del _SPEC_CLON.json de al lado. No se inventa.
3. El estado por referente: clonado (una pieza producida lo declara como referente en
   referentes.json "pares") > molde (esta en moldes.json) > medido (medido ahora) > bajado
   (en disco sin medir) > pendiente (URL pasada por el equipo SIN fichero local).
4. Escribe la clave "medidos" DENTRO de referentes.json SIN tocar "pares"/"sin_referente"
   (que son de panel_referente_al_lado.py). Un solo fichero, un solo fetch en el panel.

LO QUE NO HACE, a proposito: bajar nada nuevo con yt-dlp (ancho de banda). Lo que no esta en
disco queda estado "pendiente" y punto. Y no re-mide lo ya medido en una pasada anterior
(mismo fichero + mismo tamano) salvo --force.

Uso:
    python referentes_medir.py [--force] [--tope 80]
"""
import io
import json
import os
import re
import subprocess
import sys
import time

PANEL = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.path.join(PANEL, "referentes.json")
MOLDES = os.path.join(PANEL, "moldes.json")
INDEX = os.path.join(PANEL, "index.html")

# (carpeta, solo si tiene _SPEC_CLON.json al lado) - prioridad en este orden
TIENDAS = [
    ("D:\\REFERENTES_CLON_19AGO", False),
    ("D:\\REFERENTES_SYK_17AGO", False),
    ("D:\\REFERENTES_MINA_19AGO", True),
]
ESPIA = "D:\\REFERENTES_ESPIA_19AGO"          # medidos en moldes.json, no se re-decodifican
CARPETA_CARRUS = "D:\\REFERENTES_SYK_17AGO\\CARRUSELES"  # carruseles bajados (jpg, sin dur)

TOPE_DEF = 80
RX_SC = re.compile(r"^[A-Za-z0-9_-]{9,13}$")   # shortcode de IG tipico (11 chars)
NO_VENTANA = 0x08000000                        # CREATE_NO_WINDOW (protocolo: cero ventanas negras)


def _run(args, timeout=180):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8",
                          errors="replace", timeout=timeout, creationflags=NO_VENTANA)


def dur_de(ruta):
    r = _run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
              "-of", "csv=p=0", ruta], timeout=60)
    try:
        return round(float(r.stdout.strip().splitlines()[0]), 3)
    except Exception:
        return None


def escenas(ruta):
    """Una sola decodificacion: puntuaciones de escena > 0.10 con su timestamp.
    De ahi salen los DOS conteos (>=0.30 y >=0.12) sin decodificar dos veces."""
    vf = "scale=160:-2,select=gt(scene\\,0.10),metadata=print"
    r = _run(["ffmpeg", "-hide_banner", "-nostats", "-i", ruta,
              "-vf", vf, "-an", "-sn", "-f", "null", "-"], timeout=300)
    scores = []
    for m in re.finditer(r"lavfi\.scene_score=([0-9.]+)", r.stderr or ""):
        try:
            scores.append(float(m.group(1)))
        except ValueError:
            pass
    return scores


def sc_de_url(url):
    m = re.search(r"instagram\.com/(?:reel|p)/([A-Za-z0-9_-]+)", url or "")
    return m.group(1) if m else None


def carga_json(ruta, defecto):
    try:
        d = json.load(io.open(ruta, encoding="utf-8"))
        return d if d else defecto
    except Exception:
        return defecto


def refs_ini_del_panel():
    """Las URLs que el panel siembra en el blob (const REFS_INI=[...] de index.html)."""
    try:
        html = io.open(INDEX, encoding="utf-8", errors="replace").read()
        m = re.search(r"const REFS_INI=(\[.*?\]);", html)
        return json.loads(m.group(1)) if m else []
    except Exception:
        return []


def main():
    force = "--force" in sys.argv
    tope = TOPE_DEF
    if "--tope" in sys.argv:
        try:
            tope = int(sys.argv[sys.argv.index("--tope") + 1])
        except Exception:
            pass

    actual = carga_json(SALIDA, {})
    if not isinstance(actual, dict):
        actual = {}
    moldes = carga_json(MOLDES, {})

    # cache de la pasada anterior: mismo fichero + mismo tamano = no se re-decodifica
    cache = {}
    for m in actual.get("medidos", []):
        if m.get("dur") and m.get("cortes_s_012") is not None:
            cache[(m.get("fichero", ""), m.get("bytes", 0))] = m

    # que shortcodes estan CLONADOS (una pieza producida los declara de referente)
    clonados = set()
    for p in actual.get("pares", []):
        base = os.path.splitext(p.get("origen", ""))[0]
        if RX_SC.match(base):
            clonados.add(base)
        m = re.search(r"shortcode (\S+)", p.get("como", ""))
        if m:
            clonados.add(m.group(1))

    def estado_de(sc, medido_ahora):
        if sc and sc in clonados:
            return "clonado"
        if sc and sc in moldes:
            return "molde"
        return "medido" if medido_ahora else "bajado"

    def familia_de(sc, carpeta, fichero):
        if sc and sc in moldes and moldes[sc].get("familia"):
            return moldes[sc]["familia"]
        spec = os.path.join(carpeta, os.path.splitext(fichero)[0] + "_SPEC_CLON.json")
        s = carga_json(spec, {})
        return s.get("familia_sugerida") or s.get("familia") or ""

    medidos, en_disco = [], set()
    n_medidos = n_cache = 0

    # 1) VIDEOS A MEDIR (prioridad CLON > SYK > MINA-con-spec, tope duro)
    for carpeta, solo_spec in TIENDAS:
        if not os.path.isdir(carpeta):
            continue
        for f in sorted(os.listdir(carpeta)):
            if not f.lower().endswith(".mp4") or ".temp." in f or "fdash" in f:
                continue
            base = os.path.splitext(f)[0]
            spec = os.path.join(carpeta, base + "_SPEC_CLON.json")
            if solo_spec and not os.path.isfile(spec):
                continue
            ruta = os.path.join(carpeta, f)
            sc = base if RX_SC.match(base) else None
            if sc:
                en_disco.add(sc)
            tam = os.path.getsize(ruta)
            ent = None
            if not force and (f, tam) in cache:
                ent = dict(cache[(f, tam)])
                n_cache += 1
            elif n_medidos < tope:
                dur = dur_de(ruta)
                if not dur:
                    continue
                sc_scores = escenas(ruta)
                n030 = sum(1 for s in sc_scores if s >= 0.30)
                n012 = sum(1 for s in sc_scores if s >= 0.12)
                ent = {"dur": dur,
                       "n_030": n030, "cortes_s_030": round(n030 / dur, 3),
                       "n_012": n012, "cortes_s_012": round(n012 / dur, 3)}
                n_medidos += 1
                print("  %-38s %6.1fs  %5.2f c/s@.30  %5.2f c/s@.12" % (
                    f[:38], dur, ent["cortes_s_030"], ent["cortes_s_012"]))
            if ent is None:
                # fuera del tope: queda como bajado, sin numeros inventados
                medidos.append({"sc": sc, "url": sc and "https://www.instagram.com/reel/%s/" % sc,
                                "fichero": f, "carpeta": os.path.basename(carpeta),
                                "familia": familia_de(sc, carpeta, f),
                                "estado": estado_de(sc, False)})
                continue
            ent.update({"sc": sc, "url": sc and "https://www.instagram.com/reel/%s/" % sc,
                        "fichero": f, "bytes": tam, "carpeta": os.path.basename(carpeta),
                        "familia": familia_de(sc, carpeta, f),
                        "estado": estado_de(sc, True), "medida": "ffmpeg 0.30/0.12"})
            medidos.append(ent)

    # 2) ESPIA: ya medidos en moldes.json (un umbral). Se reusa el dato, no se re-decodifica.
    if os.path.isdir(ESPIA):
        for f in sorted(os.listdir(ESPIA)):
            if not f.lower().endswith(".mp4"):
                continue
            base = os.path.splitext(f)[0]
            sc = base if RX_SC.match(base) else None
            if not sc or sc in en_disco:
                continue
            en_disco.add(sc)
            mj = moldes.get(sc, {})
            medidos.append({"sc": sc, "url": "https://www.instagram.com/reel/%s/" % sc,
                            "fichero": f, "carpeta": os.path.basename(ESPIA),
                            "dur": mj.get("dur_s"),
                            "cortes_s_030": mj.get("cortes_s"), "cortes_s_012": None,
                            "familia": mj.get("familia", ""),
                            "estado": "clonado" if sc in clonados else ("molde" if sc in moldes else "bajado"),
                            "medida": "moldes.json (solo @0.30)"})

    # 3) CARRUSELES bajados (carpetas de jpg: sin dur ni cortes, pero existen y se dicen)
    if os.path.isdir(CARPETA_CARRUS):
        for d in sorted(os.listdir(CARPETA_CARRUS)):
            ruta = os.path.join(CARPETA_CARRUS, d)
            if not os.path.isdir(ruta) or not RX_SC.match(d) or d in en_disco:
                continue
            en_disco.add(d)
            slides = [x for x in os.listdir(ruta)
                      if x.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))]
            medidos.append({"sc": d, "url": "https://www.instagram.com/p/%s/" % d,
                            "fichero": d + "/ (%d slides)" % len(slides),
                            "carpeta": "CARRUSELES", "familia": "carrusel",
                            "estado": "clonado" if d in clonados else "bajado"})

    # 4) PENDIENTES: URLs pasadas por el equipo (REFS_INI del panel) sin fichero local
    for r in refs_ini_del_panel():
        sc = sc_de_url(r.get("url", ""))
        if sc and sc not in en_disco:
            medidos.append({"sc": sc, "url": r.get("url", ""), "fichero": None,
                            "quien": r.get("quien", ""), "familia": "",
                            "estado": "pendiente"})

    orden = {"clonado": 0, "molde": 1, "medido": 2, "bajado": 3, "pendiente": 4}
    medidos.sort(key=lambda m: (orden.get(m.get("estado"), 9), -(m.get("dur") or 0)))

    actual["medidos"] = medidos
    actual["medidos_generado"] = time.strftime("%Y-%m-%d %H:%M")
    io.open(SALIDA, "w", encoding="utf-8").write(
        json.dumps(actual, ensure_ascii=False, indent=1))

    from collections import Counter
    c = Counter(m.get("estado") for m in medidos)
    con_012 = sum(1 for m in medidos if m.get("cortes_s_012") is not None)
    print("\n%d referentes en el JSON · %d con doble umbral medido (%d nuevos, %d de cache)" % (
        len(medidos), con_012, n_medidos, n_cache))
    print("   " + " · ".join("%s %d" % (k, v) for k, v in sorted(c.items(), key=lambda x: orden.get(x[0], 9))))
    print("-> %s" % SALIDA)
    return 0


if __name__ == "__main__":
    sys.exit(main())
