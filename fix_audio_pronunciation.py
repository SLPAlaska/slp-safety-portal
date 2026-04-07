path = 'app/api/lms/generate-audio/route.js'
content = open(path, encoding='utf-8', errors='replace').read()

old = "        const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID, {"

new = """        // Fix CFR citation pronunciation before sending to ElevenLabs
        let ttsText = slide.speaker_notes
        // 29 CFR 1910.1020 -> 29 C F R 1910 point 1020
        ttsText = ttsText.replace(/([0-9]+)\\s*CFR\\s*([0-9]+)\\.([0-9]+)\\(([a-z])\\)/gi,
          '$1 C F R $2 point $3 paragraph $4')
        ttsText = ttsText.replace(/([0-9]+)\\s*CFR\\s*([0-9]+)\\.([0-9]+)/gi,
          '$1 C F R $2 point $3')
        ttsText = ttsText.replace(/\\bCFR\\b/g, 'C F R')
        ttsText = ttsText.replace(/\\bOSHA\\b/g, 'OH SHA')
        ttsText = ttsText.replace(/\\bPPE\\b/g, 'P P E')
        ttsText = ttsText.replace(/\\bSDS\\b/g, 'S D S')
        ttsText = ttsText.replace(/\\bGHS\\b/g, 'G H S')
        ttsText = ttsText.replace(/\\bHAZMAT\\b/gi, 'HAZ MAT')

        const ttsRes = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID, {"""

new_body = """            text: ttsText,"""
old_body = """            text: slide.speaker_notes,"""

result = content.replace(old, new)
result = result.replace(old_body, new_body, 1)

if 'C F R' in result and 'ttsText' in result:
    open(path, 'w', encoding='utf-8').write(result)
    print('Done')
else:
    print('ERROR')
