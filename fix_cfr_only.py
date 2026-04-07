path = 'app/api/lms/generate-audio/route.js'
content = open(path, encoding='utf-8', errors='replace').read()

# Find the text: field and replace with preprocessing
old = "            text: slide.speaker_notes,"
new = """            text: (function() {
              var t = slide.speaker_notes
              t = t.replace(/([0-9]+)\\.([0-9]+)/g, '$1 dot $2')
              return t
            })(),"""

result = content.replace(old, new, 1)
if result == content:
    print('ERROR: string not found')
    print('Looking for text field...')
    idx = content.find('speaker_notes')
    print(repr(content[idx-50:idx+100]))
else:
    open(path, 'w', encoding='utf-8').write(result)
    print('Done')
