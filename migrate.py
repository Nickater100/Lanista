import os
import json
import shutil

BASE_DIR = r"c:\Users\nicos\OneDrive\Escritorio\Lanista-arena"
OLD_CHAR_DIR = os.path.join(BASE_DIR, "Lanista-arena", "Personaje_base")
NEW_CHARS_DIR = os.path.join(BASE_DIR, "Lanista-arena", "personajes")
NEW_CHAR_DIR = os.path.join(NEW_CHARS_DIR, "pelado")

MAPPING = {
    "running-4-frames": "run",
    "custom-fast sword slash, quick horizo": "attack_fast",
    "custom-heavy sword swing, slow powerf": "attack_heavy",
    "custom-backward dodge jump, quick lea": "dodge",
    "custom-death animation, character col": "die",
    "custom-victory animation, celebrating": "cheer",
    "custom-The character shifts from a ne": "shift"
}

def migrate():
    # 1. Mover la carpeta a su nuevo hogar
    print(f"Moviendo de {OLD_CHAR_DIR} a {NEW_CHAR_DIR}")
    if os.path.exists(OLD_CHAR_DIR):
        os.makedirs(NEW_CHARS_DIR, exist_ok=True)
        if os.path.exists(NEW_CHAR_DIR):
            print("El destino ya existe, operando directamente ahí.")
        else:
            shutil.move(OLD_CHAR_DIR, NEW_CHAR_DIR)
    
    # 2. Renombrar las carpetas fisicas de animacion
    anims_dir = os.path.join(NEW_CHAR_DIR, "animations")
    if os.path.exists(anims_dir):
        for folder in os.listdir(anims_dir):
            if folder in MAPPING:
                old_path = os.path.join(anims_dir, folder)
                new_path = os.path.join(anims_dir, MAPPING[folder])
                print(f"Renombrando {folder} -> {MAPPING[folder]}")
                os.rename(old_path, new_path)

    # 3. Reescribir metadata.json
    metadata_path = os.path.join(NEW_CHAR_DIR, "metadata.json")
    if os.path.exists(metadata_path):
        print("Actualizando metadata.json...")
        with open(metadata_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Hacemos buscar y reemplazar por cada mapping
        for old, new in MAPPING.items():
            content = content.replace(old, new)
            
        with open(metadata_path, 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    migrate()
    print("Migración de estructura física completada exitosamente.")
