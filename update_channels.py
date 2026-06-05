import json
import re
import base64

# Leer el archivo tok.html
with open('/workspace/tok.html', 'r', encoding='utf-8') as f:
    content = f.read()

# Extraer el array mt con los tokens CDN
mt_match = re.search(r'var mt = \[(.*?)\];', content, re.DOTALL)
if not mt_match:
    print("No se encontró el array mt")
    exit(1)

mt_content = mt_match.group(1)
cdn_tokens = []
for match in re.finditer(r'\{\s*cdn:\s*"([^"]+)",\s*token:\s*"([^"]+)"\s*\}', mt_content):
    cdn_tokens.append({
        'cdn': match.group(1),
        'token': match.group(2)
    })

print(f"Encontrados {len(cdn_tokens)} tokens CDN")

# Extraer todos los mapeos getURL -> keyId/key
key_mappings = {}
pattern = r'if\s*\(\s*getURL\s*==\s*"([^"]+)"\s*\)\s*\{[^}]*keyId\s*=\s*"([^"]+)";\s*key\s*=\s*"([^"]+)";'
for match in re.finditer(pattern, content, re.DOTALL):
    get_url = match.group(1)
    key_id = match.group(2)
    key = match.group(3)
    key_mappings[get_url] = {'keyId': key_id, 'key': key}

# También buscar el patrón alternativo con // comentarios
pattern2 = r'else if\s*\(\s*getURL\s*==\s*"([^"]+)"\s*\)\s*\{[^}]*keyId\s*=\s*"([^"]+)";\s*key\s*=\s*"([^"]+)";'
for match in re.finditer(pattern2, content, re.DOTALL):
    get_url = match.group(1)
    key_id = match.group(2)
    key = match.group(3)
    key_mappings[get_url] = {'keyId': key_id, 'key': key}

print(f"Encontrados {len(key_mappings)} mapeos de claves")

# Leer el archivo premiumChannels_clean.json existente
with open('/workspace/src/data/premiumChannels_clean.json', 'r', encoding='utf-8') as f:
    channels = json.load(f)

print(f"Canales existentes: {len(channels)}")

# Mapeo de nombres de canales para logos (usando los del archivo original)
channel_logos = {}
for ch in channels:
    channel_logos[ch['name'].lower().replace(' ', '').replace('-', '')] = ch.get('logo', '')

# Categorías por defecto
default_categories = {
    'Locales': ['Argentinísima', 'Canal 12 de Córdoba', 'Canal de la Ciudad', 'Encuentro', 'Telefe', 
                'El Trece', 'El Nueve', 'América TV', 'TV Pública', 'Volver', 'Net TV', 
                'Ciudad Magazine', 'Rural', 'El Garage TV'],
    'Noticias': ['Crónica TV', 'C5N', 'A24', 'TN', 'Canal 26', 'La Nación', 'Ip Noticias', 'Diputados TV', 'C9N'],
    'Deportes': ['DeporTV', 'TyC Sports', 'NBA TV', 'TNT Sports Premium'],
    'Películas': ['Pakapaka', 'Cine AR', 'A3CINE & A3SERIES'],
    'Música': ['Quiero Música', 'CM'],
    'Infantiles': ['Pakapaka'],
    'Series y Entretenimiento': ['USA Network', 'Bravo TV', 'Sun Channel'],
    'Internacional': ['USA Network', 'Bravo TV', 'NBA TV', 'TNT Sports Premium', 'Sun Channel']
}

# Función para determinar categoría
def get_category(name):
    name_lower = name.lower()
    for cat, names in default_categories.items():
        for n in names:
            if n.lower() in name_lower or name_lower in n.lower():
                return cat
    return 'General'

# Función para determinar país
def get_country(name):
    name_lower = name.lower()
    if any(x in name_lower for x in ['argentina', 'telefe', 'eltrece', 'américa']):
        return 'AR'
    elif 'py' in name_lower or 'paraguay' in name_lower:
        return 'PY'
    elif 'uy' in name_lower or 'uruguay' in name_lower:
        return 'UY'
    elif 'chile' in name_lower:
        return 'CL'
    elif 'venezuela' in name_lower:
        return 'VE'
    elif 'españa' in name_lower or 'spain' in name_lower:
        return 'ES'
    else:
        return 'Internacional'

# Construir nuevos canales desde tok.html
new_channels = []
processed_urls = set()

for get_url, drm_info in key_mappings.items():
    try:
        # Decodificar el nombre del canal desde base64
        channel_name_raw = base64.b64decode(get_url).decode('utf-8', errors='ignore')
        if not channel_name_raw or len(channel_name_raw) < 2:
            continue
            
        # Limpiar nombre
        channel_name = channel_name_raw.replace('_', ' ').strip()
        
        # Evitar duplicados
        if channel_name in processed_urls:
            continue
        processed_urls.add(channel_name)
        
        # Determinar número de canal (3, 4, 5, 6, 7) basado en las condiciones del HTML
        number = 3  # default
        if get_url in ["QTNfQ2luZQ==", "Rmxvd19NdXNpY19YUA==", "Rmxvd19NdXNpY18x", "Rmxvd19NdXNpY18y", "Rmxvd19NdXNpY18z",
                       "QUVIRA==", "SG9sYV9UVg==", "QVhOSEQ=", "TVRWMDA=", "V2FybmVySEQ=", "R0VOX1RW",
                       "Rm94X1Nwb3J0c19QcmVtaXVtX0hE", "VG9kb05vdGljaWFz", "VHlDU3BvcnQ", "QW1lcmljYTI0",
                       "QzVO", "TGFfTmFjaW9u", "Q3JvbmljYVRW", "Q2FuYWxfOF9UdWN1bWFu", "UGFyYWd1YXlfVFY=",
                       "UGFyYW1vdW50", "Q29tZWR5Q2VudHJhbA==", "Qm9vbWVyYW5n", "RHJlYW13b3Jrcw==",
                       "QW5pbWFsUGxhbmV0", "SGlzdG9yeUhE", "SUQ=", "QnJhdm9UVg==", "U29ueUhE", "VHJ1VFY=",
                       "SEJPX1BPUA==", "RGlzY292ZXJ5VHVyYm8=", "RGlzbmV5SnI=", "SW52ZXN0aWdhY2lvbl9QZXJpb2Rpc3RpY2E=",
                       "Rm94U3BvcnRzMl9VWQ==", "RVNQTjQ=", "Rm94U3BvcnRzM19VWQ==", "RXZlbnRvc19IRF9VeQ==",
                       "VGVsZW11bmRvX0hE", "RVNQTjNfVXktUHk=", "QTNfU2VyaWVz", "VVNBX05ldHdvcms=",
                       "RHNwb3J0c19VWQ==", "RHNwb3J0czJfVVk=", "RHNwb3J0c19QbHVzX1VZ"]:
            number = 7
        elif get_url in ["RVNQTjJfQXJn", "Q2luZW1heA==", "RXZlbnRvc18yX0hE", "Q2FuYWxfOF9DQkE=",
                         "MjZfVFZfSEQ=", "RGlwdXRhZG9zX1RW", "QXJnZW50aW5pc2ltYQ==", "TWV0cm8=",
                         "QkJDX1dvcmxkX05ld3M=", "VGhlYXRlcl9IRA==", "R2xpdHo=", "UXVpZXJvX0hE",
                         "RGlzY292ZXJ5X1dvcmxkX0hE", "RXVyb2NoYW5uZWw=", "RGlzY292ZXJ5X1NjaWVuY2U=",
                         "SU5DQUFfVHY=", "VFY1X01vbmRl", "TVRWX0hpdHM=", "TVRWX0hE", "Tmlja19Kcg==",
                         "VFZfRXNwYW5h", "V09CSQ==", "Vm9sdmVy", "VGVsZXN1cg==", "TGlmZXRpbWU=",
                         "QW50ZW5hXzM=", "Rm94X05ld3M=", "VHZfQ2hpbGU=", "QU1DX1Nlcmllcw==",
                         "U3R1ZGlvX1VuaXZlcnNhbA==", "SVNBVA==", "U3VuX0NoYW5uZWw=", "UkFJ", "VmVudXM=",
                         "U2V4dHJlbWU=", "UGxheWJveA==", "VE5UX1Nwb3J0c19IRA==", "VGVsZWZlSEQ=",
                         "Q2FuYWw3", "RW5jdWVudHJv", "VGVsZW1heA==", "TmV0X1RW", "Q2FuYWxfMTJfQ0JB",
                         "RWxfR2FyYWdl", "RmlsbV9BcnRz", "VW5pdmVyc2FsX0NoYW5uZWxfSEQ=",
                         "RXVyb3BhX0V1cm9wYQ==", "RXVyb25ld3M=", "Rm9vZF9OZXR3b3Jr",
                         "RV9FbnRlcnRhaW5tZW50X1RlbGV2aXNpb24=", "Q00=", "UEFLQV9QQUtB", "SGlzdG9yeV8y",
                         "U3lGeQ==", "VEJT", "VENN", "SEJPXzI=", "SEJPX1BsdXM=", "SEJPX0ZhbWlseQ==",
                         "SEJPX0V4dHJlbWU=", "SEJPX011bmRp", "SEJPX1NpZ25hdHVyZQ==", "Q2FuYWxfUnVyYWw=",
                         "VExD", "Q2FuYWxfZGVfbGFfY2l1ZGFk", "RGlzY292ZXJ5X0tpZHM=", "SFRW", "TkJBX1RW",
                         "VW5pdmVyc2FsX0NpbmVtYQ==", "VW5pdmVyc2FsX0NvbWVkeQ==", "dW5pdmVyc2FsX0NyaW1l",
                         "VW5pdmVyc2FsX1ByZW1pZXJl", "VW5pdmVyc2FsX1JlYWxpdHk=", "RXZlbnRvc18yX0hE",
                         "Q2FuYWxfZGVfbGFzX2VzdHJlbGxhcw==", "Q2FuYWxfUnVyYWw=", "S1pP", "R29sZGVu"]:
            number = 6
        elif get_url == "QzlOX0M0":
            number = 5
        elif get_url in ["RGlzY292ZXJ5SG9tZUhlYWx0aEhE", "TmF0R2VvSEQ=", "VE5UX0hEX0FyZw==",
                         "VE5UU2VyaWVz", "Q2FydG9vbk5ldHdvcms=", "Tmlja2Vsb2Rlb24=", "QWR1bHRfU3dpbQ==",
                         "RXZlbnRvczFIRA==", "VHlDX0ludGVybmFjaW9uYWw="]:
            number = 3
        elif get_url in ["Q2FuYWxfNV9Sb3Nhcmlv", "VEVMRUZVVFVST19DNA==", "VGVsZWZlX05ldXF1ZW4=",
                         "VGVsZWZlX1NhbHRh", "U05UX0M0", "UEFSQVZJU0lPTl9DNA==", "Tk9USUNJQVNfUFlfQzQ=",
                         "TEFfVEVMRV9DNA==", "U1VSX1RWX0M0", "Q2FuYWwxMlVSVQ==", "Q2FuYWw0X1VSVQ==",
                         "SEJPSEQ=", "Q2FuYWwxMF9VUlU=", "UlBDX0M0", "RVNQTjJfVVk=", "RVNQTl9VWQ=="]:
            number = 4
        
        # Construir URL
        cdn = cdn_tokens[0]['cdn'] if cdn_tokens else "edge-live15-hr"
        token = cdn_tokens[0]['token'] if cdn_tokens else ""
        url = f"https://{cdn}.cvattv.com.ar/{token}/live/c{number}eds/{channel_name_raw}/SA_Live_dash_enc/{channel_name_raw}.mpd"
        
        # Determinar logo
        logo_key = channel_name.lower().replace(' ', '').replace('-', '').replace('.', '')
        logo = f"https://bestleague.world/img/{channel_name.lower().replace(' ', '_')}.png"
        
        # Buscar logo existente
        for existing_ch in channels:
            if existing_ch['name'].lower() in channel_name.lower() or channel_name.lower() in existing_ch['name'].lower():
                if existing_ch.get('logo'):
                    logo = existing_ch['logo']
                    break
        
        channel = {
            'id': f"ch-_en-vivo_{channel_name.lower().replace(' ', '_').replace('.', '')}_",
            'name': channel_name,
            'logo': logo,
            'url': url,
            'category': get_category(channel_name),
            'streamType': 'dash',
            'drm': drm_info,
            'country': get_country(channel_name),
            'tvgId': ''
        }
        
        new_channels.append(channel)
        
    except Exception as e:
        print(f"Error procesando {get_url}: {e}")
        continue

print(f"Nuevos canales extraídos: {len(new_channels)}")

# Combinar con canales existentes, priorizando los nuevos
existing_names = {ch['name'].lower() for ch in new_channels}
merged_channels = new_channels.copy()

for ch in channels:
    if ch['name'].lower() not in existing_names:
        merged_channels.append(ch)

# Ordenar por categoría y nombre
merged_channels.sort(key=lambda x: (x.get('category', 'General'), x['name']))

print(f"Total canales después de merge: {len(merged_channels)}")

# Guardar el archivo actualizado
with open('/workspace/src/data/premiumChannels_clean.json', 'w', encoding='utf-8') as f:
    json.dump(merged_channels, f, indent=2, ensure_ascii=False)

print("Archivo premiumChannels_clean.json actualizado exitosamente!")
print(f"Primeros 5 canales:")
for ch in merged_channels[:5]:
    print(f"  - {ch['name']} ({ch['category']})")
