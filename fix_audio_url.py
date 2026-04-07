path = r'app\lms\course\[id]\page.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = """  function getAudioUrl(audioPath) {
    if (!audioPath) return null
    return SUPABASE_URL + '/storage/v1/object/public/lms-audio/' + audioPath + '?t=' + Date.now()
  }"""

new = """  function getAudioUrl(audioPath) {
    if (!audioPath) return null
    const cleanPath = audioPath.replace(/^lms-audio\\//, '')
    return SUPABASE_URL + '/storage/v1/object/public/lms-audio/' + cleanPath + '?t=' + Date.now()
  }"""

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done.')
else:
    print('ERROR: Target string not found.')
