import re

path = r'app\api\lms\company-admin\matrix\route.js'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

fixed = content.replace('\u2713', 'X')

with open(path, 'w', encoding='utf-8') as f:
    f.write(fixed)

print('Done. Replaced checkmark with X.')
