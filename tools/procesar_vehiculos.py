#!/usr/bin/env python3
"""
Procesa las fotos de vehículos (PNG con fondo transparente) para el carrusel.

Qué hace con cada imagen:
  1. Recorta los márgenes transparentes sobrantes.
  2. La acomoda en un lienzo del mismo tamaño para todas (800x400 por defecto),
     centrada y con las llantas apoyadas en la misma línea de suelo.
  3. La voltea si mira a la derecha (la web espera la trompa a la IZQUIERDA).
  4. La renombra con un nombre limpio: "Toyota Hilux 2017.png" -> toyota-hilux-2017.png

Uso básico (desde la carpeta del proyecto):
  1. Instala Pillow una sola vez:   pip install pillow
  2. Copia tus fotos descargadas a:  tools/entrada/
  3. Ejecuta:                        python tools/procesar_vehiculos.py
  4. Las fotos listas quedan en:     img/vehiculos/

Cómo indicar cuáles hay que voltear (miran a la derecha), dos formas:
  - Agrega " der" al final del nombre del archivo ANTES de procesar:
        "Toyota Hilux 2017 der.png"   (el " der" no queda en el nombre final)
  - O usa la opción --voltear con partes del nombre:
        python tools/procesar_vehiculos.py --voltear hilux,corolla

Otras opciones:
  --entrada CARPETA   carpeta con las fotos originales (por defecto tools/entrada)
  --salida CARPETA    carpeta de destino (por defecto img/vehiculos)
  --ancho 800 --alto 400   tamaño final del lienzo
  --margen 4          margen alrededor del vehículo, en % del lienzo
"""
import argparse
import re
import sys
import unicodedata
from pathlib import Path

try:
    from PIL import Image, ImageChops, ImageFilter
except ImportError:
    sys.exit("Falta Pillow. Instálalo con:  pip install pillow")

EXTENSIONES = {".png", ".webp", ".jpg", ".jpeg"}
UMBRAL_ALFA = 40  # ignora sombras muy tenues al medir el vehículo


def limpiar_nombre(stem):
    """Convierte 'Toyota Hilux 2017 der' en ('toyota-hilux-2017', True)."""
    # Algunos ZIP escriben las tildes como #U00e1: se convierten a su letra.
    stem = re.sub(r"#U([0-9a-fA-F]{4})", lambda m: chr(int(m.group(1), 16)), stem)
    voltear = False
    m = re.search(r"[\s_-]+der$", stem, flags=re.I)
    if m:
        voltear = True
        stem = stem[: m.start()]
    stem = unicodedata.normalize("NFKD", stem)
    stem = "".join(c for c in stem if not unicodedata.combining(c))
    slug = re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")
    return slug or "vehiculo", voltear


def borrar_manchas(img):
    """Borra textos, marcas de agua y puntitos sueltos alrededor del vehículo.

    Trabaja con bloques de 8x8 px y se queda solo con la pieza más grande de la
    imagen (el vehículo con su sombra). Todo lo que quede separado de él, como
    una marca de agua en una esquina, se elimina.
    """
    alfa = img.getchannel("A")
    bloque = 8
    pequena = alfa.point(lambda a: 255 if a > 8 else 0).resize(
        (max(1, alfa.width // bloque), max(1, alfa.height // bloque)), Image.BOX
    )
    ocupado = pequena.point(lambda v: 255 if v > 90 else 0)
    ocupado = ocupado.filter(ImageFilter.MaxFilter(3))  # une piezas a 1 bloque
    w, h = ocupado.size
    px = ocupado.load()
    visto = [[False] * w for _ in range(h)]
    mejor, mejor_n = [], 0
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0] == 0 or visto[y0][x0]:
                continue
            pila, pieza = [(x0, y0)], []
            visto[y0][x0] = True
            while pila:
                x, y = pila.pop()
                pieza.append((x, y))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and not visto[ny][nx] and px[nx, ny]:
                            visto[ny][nx] = True
                            pila.append((nx, ny))
            if len(pieza) > mejor_n:
                mejor, mejor_n = pieza, len(pieza)
    conservar = Image.new("L", (w, h), 0)
    cp = conservar.load()
    for x, y in mejor:
        cp[x, y] = 255
    # Un bloque extra de margen para no cortar el borde de la sombra.
    conservar = conservar.filter(ImageFilter.MaxFilter(3))
    grande = conservar.resize(alfa.size, Image.NEAREST)
    img.putalpha(ImageChops.darker(alfa, grande))
    return img


def caja_vehiculo(alfa):
    """Caja del vehículo ignorando sombras tenues y manchas sueltas.

    Se mide sobre una versión reducida (bloques de 8x8 px): un puntito aislado
    ocupa muy poco de su bloque y no cuenta, mientras que el vehículo sí.
    """
    mascara = alfa.point(lambda a: 255 if a > UMBRAL_ALFA else 0)
    bloque = 8
    pequena = mascara.resize(
        (max(1, mascara.width // bloque), max(1, mascara.height // bloque)),
        Image.BOX,
    )
    caja = pequena.point(lambda v: 255 if v > 90 else 0).getbbox()
    if not caja:
        return mascara.getbbox()
    return (
        caja[0] * bloque,
        caja[1] * bloque,
        min(mascara.width, caja[2] * bloque),
        min(mascara.height, caja[3] * bloque),
    )


def procesar(ruta, ancho, alto, margen_pct, forzar_voltear):
    img = Image.open(ruta).convert("RGBA")
    alfa = img.getchannel("A")
    avisos = []

    if alfa.getextrema()[0] == 255:
        avisos.append("no tiene fondo transparente; no se pudo recortar el fondo")
        caja = img.getbbox()
    else:
        img = borrar_manchas(img)
        alfa = img.getchannel("A")
        caja = caja_vehiculo(alfa)
    if not caja:
        raise ValueError("la imagen está vacía")

    # Un poco de aire para no cortar la sombra suave del borde.
    extra = int(0.01 * max(img.size))
    caja = (
        max(0, caja[0] - extra),
        max(0, caja[1] - extra),
        min(img.width, caja[2] + extra),
        min(img.height, caja[3] + extra),
    )
    img = img.crop(caja)

    if forzar_voltear:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    mx = int(ancho * margen_pct / 100)
    my = int(alto * margen_pct / 100)
    caja_ancho, caja_alto = ancho - 2 * mx, alto - 2 * my
    escala = min(caja_ancho / img.width, caja_alto / img.height)
    nuevo = img.resize(
        (max(1, round(img.width * escala)), max(1, round(img.height * escala))),
        Image.LANCZOS,
    )

    lienzo = Image.new("RGBA", (ancho, alto), (0, 0, 0, 0))
    x = (ancho - nuevo.width) // 2
    y = alto - my - nuevo.height  # apoyado en la misma línea de suelo
    lienzo.paste(nuevo, (x, y), nuevo)
    return lienzo, avisos


def main():
    raiz = Path(__file__).resolve().parent.parent
    ap = argparse.ArgumentParser(description="Prepara fotos de vehículos para la web.")
    ap.add_argument("--entrada", default=str(raiz / "tools" / "entrada"))
    ap.add_argument("--salida", default=str(raiz / "img" / "vehiculos"))
    ap.add_argument("--ancho", type=int, default=800)
    ap.add_argument("--alto", type=int, default=400)
    ap.add_argument("--margen", type=float, default=4.0)
    ap.add_argument(
        "--voltear",
        default="",
        help="partes del nombre separadas por coma; esas fotos se voltean",
    )
    a = ap.parse_args()

    entrada, salida = Path(a.entrada), Path(a.salida)
    if not entrada.is_dir():
        sys.exit(f"No existe la carpeta de entrada: {entrada}")
    archivos = sorted(p for p in entrada.iterdir() if p.suffix.lower() in EXTENSIONES)
    if not archivos:
        sys.exit(f"No hay imágenes (png, webp, jpg) en {entrada}")
    salida.mkdir(parents=True, exist_ok=True)
    claves = [c.strip().lower() for c in a.voltear.split(",") if c.strip()]

    usados, ok = set(), 0
    for ruta in archivos:
        slug, voltear = limpiar_nombre(ruta.stem)
        if any(c in slug for c in claves):
            voltear = True
        base, n = slug, 2
        while slug in usados:
            slug, n = f"{base}-{n}", n + 1
        usados.add(slug)
        try:
            lienzo, avisos = procesar(ruta, a.ancho, a.alto, a.margen, voltear)
        except Exception as e:  # una foto mala no detiene las demás
            print(f"  ✗ {ruta.name}: {e}")
            continue
        destino = salida / f"{slug}.png"
        lienzo.save(destino, optimize=True)
        ok += 1
        nota = " (volteada)" if voltear else ""
        print(f"  ✓ {ruta.name} -> {destino.name}{nota}")
        for aviso in avisos:
            print(f"      ⚠ {aviso}")

    print(f"\nListo: {ok} de {len(archivos)} imágenes en {salida}")
    print("Si agregaste vehículos nuevos, enlaza cada foto en js/data.js, por ejemplo:")
    print("  image: 'img/vehiculos/<nombre>.png'")


if __name__ == "__main__":
    main()
