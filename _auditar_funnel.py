# -*- coding: utf-8 -*-
"""Auditoria TOFU/MOFU/BOFU del panel (queja de Javi 21-ago 22:04 «esta mal, tema bofu y demas»
+ encargo de Gerard 13-ago «los clasificare por TOFU MOFU BOFU»). Re-etiqueta las piezas cuya
etiqueta NO corresponde a lo que la pieza ES segun la estrategia de Santi:
  TOFU = PROBLEMA del ICP (en Jordi: viral/meme/lifestyle) · MOFU = SOLUCION, que hacer sin el
  como, vehiculo/herramienta · BOFU = mentalidad, creencias, objeciones, producto por dentro,
  casos de exito. Backup antes. No borra ni denega nada."""
import collections
import io
import json
import shutil

F = r"C:\Users\PC\Desktop\_panel_mx\piezas.json"
shutil.copy(F, F + ".bak_21ago_funnel")

RELABEL = {
    # id: (nueva, motivo)
    "TH_PADRE_LOCO_17AGO": ("BOFU", "historia personal/mentalidad, no es problema del ICP"),
    "CARRUSEL_JAVI_CAMBIAR_PRODUCTO_18AGO": ("BOFU", "rompe creencia limitante (cambiar de producto lo arregla)"),
    "CARR_JAVI_RECURSOS": ("MOFU", "recursos/vehiculo, no prueba social"),
    "MEME_JAVI_M2_CLASE_17MIN_1AGO": ("BOFU", "producto por dentro = rompe objecion"),
    "MEME_JAVI_M3_64_HERRAMIENTAS_1AGO": ("BOFU", "producto por dentro"),
    "REEL_JAVI_PANEL_MODULO_1AGO": ("BOFU", "producto por dentro"),
    "CARR_JORDI_ATAJO": ("BOFU", "caso de exito de alumno"),
    "REEL_JORDI_FILTRO_2AGO": ("MOFU", "vehiculo: construir el filtro"),
}
SIN_A = {
    "CARRUSEL_JAVI_MOROSO_20AGO": ("TOFU", "historia-dolor"),
    "JAVI_NICHO_MERCADO_20AGO": ("MOFU", "que hacer: nicho vs mercado"),
    "PAPEL_JAVI_CUATRO_FUGAS_19AGO": ("MOFU", "diagnostico accionable"),
    "PAPEL_JAVI_EL_QUE_DUDA_19AGO": ("TOFU", "sintoma del ICP"),
    "REEL_JAVI_EVENTO_ALUMNOS_20AGO": ("BOFU", "prueba social evento"),
    "CARRUSEL_JORDI_MOROSO_20AGO": ("TOFU", "historia-dolor"),
    "MEMES_JORDI_SEMANA_25AGO": ("TOFU", "memes = alcance"),
    "MEME_JORDI_TIENDA_FUNCIONA_20AGO": ("TOFU", "meme"),
    "PAPEL_JORDI_UNA_TARDE_19AGO": ("MOFU", "que hace la IA de verdad"),
    "REEL_JORDI_RETARGETING_20AGO": ("MOFU", "solucion (revisar jerga del copy)"),
    "HOOKAD_A_QUEDA0_15AGO": ("AD", "ad de testimonios, fuera del funnel organico"),
    "HOOKAD_B_HUMO_15AGO": ("AD", "ad"),
    "HOOKAD_C_2ANOS_15AGO": ("AD", "ad"),
}

d = json.load(io.open(F, encoding="utf-8"))
antes = collections.Counter(p.get("etiqueta", "?") for p in d["piezas"])
cambios = []
for p in d["piezas"]:
    pid = p["id"]
    if pid in RELABEL:
        nueva, motivo = RELABEL[pid]
        cambios.append((pid, p.get("etiqueta"), nueva, motivo))
        p["etiqueta"] = nueva
    elif pid in SIN_A and p.get("etiqueta") in (None, "", "SIN"):
        nueva, motivo = SIN_A[pid]
        cambios.append((pid, "SIN", nueva, motivo))
        p["etiqueta"] = nueva

despues = collections.Counter(p.get("etiqueta", "?") for p in d["piezas"])
io.open(F, "w", encoding="utf-8").write(json.dumps(d, ensure_ascii=False, indent=1))
print("ANTES:  ", dict(antes))
print("DESPUES:", dict(despues))
print(f"cambios aplicados: {len(cambios)}")
for c in cambios:
    print("  %-38s %s -> %s  (%s)" % (c[0][:38], c[1], c[2], c[3]))

# reparto del FEED (sin stories ni ads) contra el 50/30/20 de Santi
feed = [p for p in d["piezas"] if p.get("tipo") not in ("story",) and p.get("etiqueta") != "AD"]
rep = collections.Counter(p["etiqueta"] for p in feed)
tot = sum(rep.values())
print(f"\nFEED ({tot} piezas): " + " · ".join(
    f"{k} {v} ({100*v//tot}%)" for k, v in rep.most_common()))
print("OBJETIVO SANTI: TOFU 50% · MOFU 30% · BOFU 20%")

# captions rotas (texto interno volcado como caption)
rotas = [p["id"] for p in d["piezas"]
         if (p.get("caption") or "").startswith(("CAPTION (", "CUENTA: @"))]
print("\nCAPTIONS ROTAS (texto interno en vez de caption):", len(rotas))
for r in rotas:
    print("  -", r)
