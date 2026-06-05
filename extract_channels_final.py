import re
import json
import base64

# Leer tok.html
with open('/workspace/tok.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Extraer tokens CDN
cdn_pattern = r'\{\s*cdn:\s*"([^"]+)",\s*token:\s*"([^"]+)"\s*\}'
cdns = re.findall(cdn_pattern, html_content)

# Extraer todos los pares getURL con su keyId y key usando un patrón más flexible
# Buscar bloques completos de if/else if
pattern = r'(?:if|else\s+if)\s*\(\s*getURL\s*==\s*"([^"]+)"(?:\s*\|\|\s*getURL\s*==\s*"([^"]+)")*\s*\)[^}]*keyId\s*=\s*"([^"]+)"[^}]*key\s*=\s*"([^"]+)"'
matches = re.findall(pattern, html_content, re.DOTALL)

channel_map = {}

for match in matches:
    # match[0] es el primer getURL, match[1] puede ser el segundo (o vacío), match[2] es keyId, match[3] es key
    key_id = match[2]
    key = match[3]
    
    # Añadir todas las URLs encontradas en este bloque
    urls = [match[0]]
    if match[1]:  # Si hay un segundo URL
        urls.append(match[1])
    
    for url in urls:
        channel_map[url] = {
            'keyId': key_id,
            'key': key
        }

# Decodificar nombres de canales
def decode_base64_name(encoded):
    try:
        decoded = base64.b64decode(encoded).decode('utf-8')
        return decoded
    except:
        return encoded

print(f"CDNs encontrados: {len(cdns)}")
print(f"Mapeos encontrados: {len(channel_map)}")

# Mostrar algunos ejemplos
for i, (get_url, data) in enumerate(list(channel_map.items())[:15]):
    name = decode_base64_name(get_url)
    print(f"{i+1}. {name} -> keyId: {data['keyId'][:8]}...")

# Guardar datos extraídos
with open('/workspace/extracted_data_final.json', 'w', encoding='utf-8') as f:
    json.dump({
        'cdns': cdns,
        'mappings': channel_map
    }, f, indent=2, ensure_ascii=False)

print("\nDatos extraídos guardados en extracted_data_final.json")
