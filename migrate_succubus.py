import os

BASE_DIR = r"c:\Users\nicos\OneDrive\Escritorio\Lanista-arena"
CHAR_DIR = os.path.join(BASE_DIR, "Lanista-arena", "personajes", "succubus")

MAPPING = {
    "custom-sensual walking animation, slo": "run",
    "custom-death animation, sudden magica": "die",
    "custom-floating victory animation, ho": "cheer",
    "custom-whip strike animation, powerfu": "attack_fast"
}

def migrate_succubus():
    anims_dir = os.path.join(CHAR_DIR, "animations")
    if os.path.exists(anims_dir):
        for folder in os.listdir(anims_dir):
            if folder in MAPPING:
                old_path = os.path.join(anims_dir, folder)
                new_path = os.path.join(anims_dir, MAPPING[folder])
                print(f"Renombrando {folder} -> {MAPPING[folder]}")
                os.rename(old_path, new_path)

    metadata_path = os.path.join(CHAR_DIR, "metadata.json")
    if os.path.exists(metadata_path):
        print("Actualizando metadata.json para succubus...")
        with open(metadata_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        for old, new in MAPPING.items():
            content = content.replace(old, new)
            
        with open(metadata_path, 'w', encoding='utf-8') as f:
            f.write(content)

if __name__ == "__main__":
    migrate_succubus()
    print("Migración completada.")
