import re
import json
import base64

# Leer tok.html
with open('/workspace/tok.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Extraer tokens CDN
cdn_pattern = r'\{\s*cdn:\s*"([^"]+)",\s*token:\s*"([^"]+)"\s*\}'
cdns = re.findall(cdn_pattern, html_content)

# Extraer mapeos getURL -> keyId/key
mapping_pattern = r'if\s*\(\s*getURL\s*==\s*"([^"]+)"\s*\)\s*\{\s*map\.set\(\s*"([^"]+)",\s*\{\s*keyId:\s*"([^"]+)",\s*key:\s*"([^"]+)"\s*\}\s*\)'
mappings = re.findall(mapping_pattern, html_content)

# Decodificar nombres de canales
def decode_base64_name(encoded):
    try:
        decoded = base64.b64decode(encoded).decode('utf-8')
        return decoded
    except:
        return encoded

# Crear diccionario de mapeos
channel_map = {}
for mapping in mappings:
    get_url, channel_path, key_id, key = mapping
    channel_map[get_url] = {
        'path': channel_path,
        'keyId': key_id,
        'key': key
    }

print(f"CDNs encontrados: {len(cdns)}")
print(f"Mapeos encontrados: {len(channel_map)}")

# Mostrar algunos ejemplos
for i, (get_url, data) in enumerate(list(channel_map.items())[:5]):
    name = decode_base64_name(get_url)
    print(f"{i+1}. {name} -> {data['path']}")

# Guardar datos extraídos
with open('/workspace/extracted_data.json', 'w', encoding='utf-8') as f:
    json.dump({
        'cdns': cdns,
        'mappings': channel_map
    }, f, indent=2, ensure_ascii=False)

print("\nDatos extraídos guardados en extracted_data.json")
