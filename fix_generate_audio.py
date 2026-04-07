path = r'app\api\lms\generate-audio\route.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '    fetch(edgeUrl, {'
new = '    await fetch(edgeUrl, {'

if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done.')
else:
    print('ERROR: Target string not found.')
