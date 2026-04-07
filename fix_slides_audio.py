path = 'app/api/lms/learner/slides/[courseId]/route.js'
content = open(path, encoding='utf-8', errors='replace').read()
fixed = content.replace(
    "'id, slide_order, image_path, speaker_notes'",
    "'id, slide_order, image_path, speaker_notes, audio_path, video_path, video_url'"
)
open(path, 'w', encoding='utf-8').write(fixed)
print('Done' if 'audio_path' in fixed else 'ERROR')
