import json
import os

BASE_DIR = r"c:\Users\nicos\OneDrive\Escritorio\Lanista-arena"
META_PATH = os.path.join(BASE_DIR, "Lanista-arena", "personajes", "succubus", "metadata.json")

def inject_dodge():
    with open(META_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        
    directions = ["south", "north-east", "east", "west", "south-east", "south-west", "north", "north-west"]
    
    dodge_obj = {}
    for d in directions:
        frames = []
        for i in range(9):
            frames.append(f"animations/dodge/{d}/frame_{i:03d}.png")
        dodge_obj[d] = frames
        
    data["frames"]["animations"]["dodge"] = dodge_obj
    
    with open(META_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)

if __name__ == "__main__":
    inject_dodge()
    print("Dodge metadata injected successfully.")
