import os
import sys
import argparse
from PIL import Image

def extract_layer(base_path, clothed_path, output_path):
    try:
        base_img = Image.open(base_path).convert("RGBA")
        clothed_img = Image.open(clothed_path).convert("RGBA")
    except Exception as e:
        print(f"Error cargando imágenes: {e}")
        return

    if base_img.size != clothed_img.size:
        print(f"Ignorando {os.path.basename(clothed_path)}: el tamaño de la imagen ({clothed_img.size}) no coincide con la base ({base_img.size})")
        return

    base_data = base_img.getdata()
    clothed_data = clothed_img.getdata()

    new_data = []
    extracted_pixels = 0

    # Sustracción pixel por pixel
    for b_pixel, c_pixel in zip(base_data, clothed_data):
        # b_pixel y c_pixel son tuplas (R, G, B, A)
        
        # Si el píxel vestido es totalmente transparente, lo ignoramos de todas formas
        if c_pixel[3] == 0:
            new_data.append((0, 0, 0, 0))
            continue
            
        # Si el píxel es exactamente idéntico al peludo, significa que NO es ropa. Lo borramos.
        if b_pixel == c_pixel:
            new_data.append((0, 0, 0, 0))
        else:
            # Hay una diferencia, ¡aquí dibujaste la ropa!
            new_data.append(c_pixel)
            extracted_pixels += 1

    # Optimizacion: Si la imagen resultantante no tiene ni 1 pixel extraido (la pose no tiene ropa), podemos decidir no grabarla
    # o sí grabarla con 100% fondo transparente (mejor para no romper el Loader de Three.js que busca el frame indexado).
    out_img = Image.new("RGBA", base_img.size)
    out_img.putdata(new_data)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    out_img.save(output_path, "PNG")

def main():
    parser = argparse.ArgumentParser(description="Recorta automáticamente la ropa/pelo de un personaje basándose en la diferencia de píxeles contra el muñeco base.")
    parser.add_argument("--base", required=True, help="Ruta a la carpeta del Personaje Pelado (ej: Lanista-arena/Personaje_base)")
    parser.add_argument("--vestido", required=True, help="Ruta a la carpeta del Personaje con Armadura (ej: Personaje_Armadura_1)")
    parser.add_argument("--salida", required=True, help="Ruta donde se guardará SOLO LA ROPA (ej: Lanista-arena/Armadura_1)")
    
    args = parser.parse_args()

    base_dir = args.base
    clothed_dir = args.vestido
    output_dir = args.salida

    if not os.path.exists(base_dir):
        print(f"Error: La carpeta base no existe '{base_dir}'")
        return
    if not os.path.exists(clothed_dir):
        print(f"Error: La carpeta de ropa no existe '{clothed_dir}'")
        return

    print(f"Iniciando extracción matemática...\nBase (Desnudo): {base_dir}\nDestino (Solapar): {clothed_dir}\nCarpeta Final: {output_dir}\n")
    
    processed = 0
    # Recorrer todos los archivos y subcarpetas (Norte, Sur, frames...)
    for root, _, files in os.walk(clothed_dir):
        for file in files:
            if file.lower().endswith('.png'):
                clothed_filepath = os.path.join(root, file)
                
                # Averiguamos la ruta relativa (ej: "rotations/south.png" o "animations/attack_fast/east/frame1.png")
                rel_path = os.path.relpath(clothed_filepath, clothed_dir)
                base_filepath = os.path.join(base_dir, rel_path)
                output_filepath = os.path.join(output_dir, rel_path)

                if os.path.exists(base_filepath):
                    extract_layer(base_filepath, clothed_filepath, output_filepath)
                    processed += 1
                else:
                    print(f"Ignorando {rel_path} porque falta en la carpeta Base.")
                    
    print(f"\n¡Proceso finalizado! Se recortaron y aislaron {processed} archivos de ropa/equipo en la carpeta '{output_dir}'.")

if __name__ == "__main__":
    main()
