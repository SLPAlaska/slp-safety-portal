path = 'app/api/lms/generate-audio/route.js'
content = open(path, encoding='utf-8', errors='replace').read()

# Switch to higher quality model and remove all pronunciation hacks
old_model = "const ELEVENLABS_MODEL = 'eleven_turbo_v2_5'"
new_model = "const ELEVENLABS_MODEL = 'eleven_multilingual_v2'"

result = content.replace(old_model, new_model)

# Remove all the pronunciation preprocessing -- let the model handle it
import re
result = re.sub(
    r"        // Fix CFR citation pronunciation.*?ttsText = ttsText\.replace\(/\\bHAZMAT\\b/gi, 'HAZ MAT'\)\n\n",
    "",
    result,
    flags=re.DOTALL
)

# Fix text reference from ttsText back to slide.speaker_notes if preprocessing removed
if 'ttsText' not in result:
    result = result.replace('text: ttsText,', 'text: slide.speaker_notes,')
else:
    result = result.replace('text: ttsText,', 'text: slide.speaker_notes,')

if 'eleven_multilingual_v2' in result:
    open(path, 'w', encoding='utf-8').write(result)
    print('Done')
else:
    print('ERROR')
