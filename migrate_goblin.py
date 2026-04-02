import os
import shutil

BASE_DIR = r"c:\Users\nicos\OneDrive\Escritorio\Lanista-arena"
CHAR_DIR = os.path.join(BASE_DIR, "Lanista-arena", "personajes", "goblin")

MAPPING = {
    "running-6-frames": "run",
    "custom-fast knife attack, step forwar": "attack_fast",
    "custom-fast dodge animation, quick ba": "dodge",
    "custom-death animation, collapsing to": "die",
    "custom-victory animation, aggressive ": "cheer"
}

def migrate_goblin():
    # 1. Renombrar las carpetas fisicas de animacion
    anims_dir = os.path.join(CHAR_DIR, "animations")
    if os.path.exists(anims_dir):
        for folder in os.listdir(anims_dir):
            if folder in MAPPING:
                old_path = os.path.join(anims_dir, folder)
                new_path = os.path.join(anims_dir, MAPPING[folder])
                print(f"Renombrando {folder} -> {MAPPING[folder]}")
                os.rename(old_path, new_path)

    # 2. Reescribir metadata.json
    metadata_path = os.path.join(CHAR_DIR, "metadata.json")
    if os.path.exists(metadata_path):
        print("Actualizando metadata.json para goblin...")
        with open(metadata_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Hacemos buscar y reemplazar por cada mapping
        for old, new in MAPPING.items():
            content = content.replace(old, new)
            
        with open(metadata_path, 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    migrate_goblin()
    print("Migración de estructura física completada exitosamente.")
