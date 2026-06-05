import re
import json
import base64

# Leer tok.html
with open('/workspace/tok.html', 'r', encoding='utf-8') as f:
    html_content = f.read()

# Extraer tokens CDN
cdn_pattern = r'\{\s*cdn:\s*"([^"]+)",\s*token:\s*"([^"]+)"\s*\}'
cdns = re.findall(cdn_pattern, html_content)

# Extraer todos los pares getURL con su keyId y key
pattern = r'(?:if|else\s+if)\s*\(\s*getURL\s*==\s*"([^"]+)"(?:\s*\|\|\s*getURL\s*==\s*"([^"]+)")*\s*\)[^}]*keyId\s*=\s*"([^"]+)"[^}]*key\s*=\s*"([^"]+)"'
matches = re.findall(pattern, html_content, re.DOTALL)

channel_map = {}

for match in matches:
    key_id = match[2]
    key = match[3]
    
    urls = [match[0]]
    if match[1]:
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

# Leer el archivo premiumChannels_clean.json existente
with open('/workspace/src/data/premiumChannels_clean.json', 'r', encoding='utf-8') as f:
    existing_channels = json.load(f)

# Crear un diccionario para búsqueda rápida por nombre decodificado
existing_by_name = {}
for ch in existing_channels:
    existing_by_name[ch['name']] = ch

# Construir nuevos canales desde tok.html
new_channels = []
processed_urls = set()

for get_url, data in channel_map.items():
    if get_url in processed_urls:
        continue
    processed_urls.add(get_url)
    
    name = decode_base64_name(get_url)
    
    # Intentar encontrar logo y categoría del canal existente
    logo = "https://bestleague.world/img/default.png"
    category = "General"
    country = "AR"
    tvg_id = ""
    
    # Buscar coincidencias parciales en canales existentes
    for existing_name, existing_ch in existing_by_name.items():
        if existing_name.lower().replace(' ', '').replace('_', '') == name.lower().replace(' ', '').replace('_', '') or \
           existing_name.lower() in name.lower() or name.lower() in existing_name.lower():
            logo = existing_ch.get('logo', logo)
            category = existing_ch.get('category', category)
            country = existing_ch.get('country', country)
            tvg_id = existing_ch.get('tvgId', tvg_id)
            break
    
    # Construir URL con el primer CDN disponible
    cdn_host = cdns[0][0] if cdns else "edge-live15-hr"
    token = cdns[0][1] if cdns else ""
    
    # El path del canal se puede inferir del getURL decodificado
    path = name.replace(' ', '_').replace('/', '_')
    
    url = f"https://{cdn_host}.cvattv.com.ar/{token}/live/c3eds/{path}/SA_Live_dash_enc/{path}.mpd"
    
    channel_entry = {
        "id": f"ch-_en-vivo_{name.lower().replace(' ', '_').replace('-', '_')}",
        "name": name,
        "logo": logo,
        "url": url,
        "category": category,
        "streamType": "dash",
        "drm": {
            "keyId": data['keyId'],
            "key": data['key']
        },
        "country": country,
        "tvgId": tvg_id
    }
    
    new_channels.append(channel_entry)

print(f"Canales extraídos de tok.html: {len(new_channels)}")
print(f"Canales existentes: {len(existing_channels)}")

# Combinar canales: mantener los existentes y añadir los nuevos que no estén duplicados
existing_names = {ch['name'].lower() for ch in existing_channels}
combined_channels = existing_channels.copy()

for new_ch in new_channels:
    if new_ch['name'].lower() not in existing_names:
        combined_channels.append(new_ch)
        existing_names.add(new_ch['name'].lower())
    else:
        # Actualizar DRM y URL si el canal ya existe
        for i, existing_ch in enumerate(combined_channels):
            if existing_ch['name'].lower() == new_ch['name'].lower():
                combined_channels[i]['drm'] = new_ch['drm']
                combined_channels[i]['url'] = new_ch['url']
                break

print(f"Canales combinados totales: {len(combined_channels)}")

# Guardar el archivo actualizado
with open('/workspace/src/data/premiumChannels_clean.json', 'w', encoding='utf-8') as f:
    json.dump(combined_channels, f, indent=2, ensure_ascii=False)

print("\nArchivo premiumChannels_clean.json actualizado exitosamente!")

# Mostrar algunos ejemplos de canales actualizados
print("\nEjemplos de canales actualizados:")
for ch in combined_channels[:5]:
    print(f"- {ch['name']} (DRM actualizado)")
