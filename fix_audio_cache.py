path = 'app/lms/course/[id]/page.js'
content = open(path, encoding='utf-8', errors='replace').read()

old = "  function getAudioUrl(audioPath) {\n    if (!audioPath) return null\n    return SUPABASE_URL + '/storage/v1/object/public/lms-audio/' + audioPath\n  }"

new = "  function getAudioUrl(audioPath) {\n    if (!audioPath) return null\n    return SUPABASE_URL + '/storage/v1/object/public/lms-audio/' + audioPath + '?t=' + Date.now()\n  }"

result = content.replace(old, new)
if result == content:
    print('ERROR: string not found')
else:
    open(path, 'w', encoding='utf-8').write(result)
    print('Done')
