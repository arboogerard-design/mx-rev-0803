# -*- coding: utf-8 -*-
"""P16 (22-ago) — lint del panel de EQUIPO. Javi 22-ago: «se nota que lo hace todo la IA».
La mesa (index.html) no puede enseñar jerga interna: gates, veredictos, funnel, rutas.
Se corre ANTES de cada push (lo llama quien pushea, o a mano). Exit 0 limpio / 1 = NO subir.
Los comentarios HTML/CSS/JS no cuentan (no se ven); el texto visible y los strings de JS sí."""
import io
import re
import sys
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
NEGRA = ["TOFU", "MOFU", "BOFU", "SIN-VERIF", "SIN VERIFICAR", "pHash", "LUFS",
         "cooldown", "_WIP", "PARA_REVISAR", "gate_pieza", "ERR-TOOL",
         "BLOCK", " PASS", "WARN "]


def limpia_html(t):
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"/\*.*?\*/", "", t, flags=re.S)
    t = re.sub(r"(^|\s)//[^\n]*", "", t)
    return t


def main():
    fallos = []
    t = limpia_html(io.open(os.path.join(AQUI, "index.html"), encoding="utf-8").read())
    for palabra in NEGRA:
        if palabra in t:
            fallos.append("index.html contiene '%s'" % palabra.strip())
    # campos que la mesa pinta desde piezas.json: id, cuenta, caption, dia, hora, poster, archivos
    d = json.load(io.open(os.path.join(AQUI, "piezas.json"), encoding="utf-8"))
    for p in d.get("piezas", []):
        cap = (p.get("caption") or "")
        for palabra in ("TOFU", "MOFU", "BOFU", "BLOCK", "gate", "_WIP"):
            if palabra in cap:
                fallos.append("caption de %s contiene '%s'" % (p.get("id"), palabra))
    if fallos:
        print("LINT EQUIPO: BLOCK — el panel NO se sube:")
        for f in fallos[:20]:
            print("  -", f)
        sys.exit(1)
    print("LINT EQUIPO: limpio (index.html + captions)")
    sys.exit(0)


if __name__ == "__main__":
    main()
