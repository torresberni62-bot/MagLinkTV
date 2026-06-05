import re
import json
import base64

# Leer tok.html
with open('/workspace/tok.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Extraer tokens CDN
cdn_pattern = r'\{\s*cdn:\s*"([^"]+)",\s*token:\s*"([^"]+)"\s*\}'
cdns = re.findall(cdn_pattern, html_content)

# Extraer todos los getURL values y sus keyId/key
# Primero extraer todas las líneas con getURL
geturl_lines = re.findall(r'if\s*\(\s*getURL\s*==\s*"([^"]+)"\s*\)[^}]*keyId\s*=\s*"([^"]+)"[^}]*key\s*=\s*"([^"]+)"', html_content, re.DOTALL)

# También buscar patrones donde hay múltiples getURL en un solo if
multi_geturl_pattern = r'if\s*\(\s*getURL\s*==\s*"([^"]+)"(?:\s*\|\|\s*getURL\s*==\s*"([^"]+)")*(?:\n|\r\n)[^}]*keyId\s*=\s*"([^"]+)"[^}]*key\s*=\s*"([^"]+)"'
multi_matches = re.findall(multi_geturl_pattern, html_content, re.DOTALL)

channel_map = {}

# Procesar matches simples
for match in geturl_lines:
    get_url, key_id, key = match
    channel_map[get_url] = {
        'keyId': key_id,
        'key': key
    }

# Procesar matches múltiples (varios getURL en un if)
for match in multi_matches:
    urls = [u for u in match[:-2] if u]  # Todas las URLs excepto las últimas 2 que son keyId y key
    key_id = match[-2]
    key = match[-1]
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
for i, (get_url, data) in enumerate(list(channel_map.items())[:10]):
    name = decode_base64_name(get_url)
    print(f"{i+1}. {name} -> keyId: {data['keyId'][:8]}...")

# Guardar datos extraídos
with open('/workspace/extracted_data_v2.json', 'w', encoding='utf-8') as f:
    json.dump({
        'cdns': cdns,
        'mappings': channel_map
    }, f, indent=2, ensure_ascii=False)

print("\nDatos extraídos guardados en extracted_data_v2.json")
