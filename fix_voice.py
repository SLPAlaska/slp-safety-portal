path = 'app/api/lms/generate-audio/route.js'
content = open(path, encoding='utf-8', errors='replace').read()
fixed = content.replace('ChO6kqkVouUn0s7HMunx', 'q0IMILNRPxOgtBTS4taI')
open(path, 'w', encoding='utf-8').write(fixed)
print('Done' if 'q0IMILNRPxOgtBTS4taI' in fixed else 'ERROR')
