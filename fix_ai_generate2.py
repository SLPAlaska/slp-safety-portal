path = r'app\api\lms\ai-generate\route.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Just add await before the fire-and-forget fetch
old = '    fetch(edgeUrl, {'
new = '    await fetch(edgeUrl, {'

if old in content:
    content = content.replace(old, new, 1)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('Done.')
else:
    print('ERROR: Target string not found.')
    print('Looking for:', repr(old))
