import sys

path = 'app/lms/course/[id]/page.js'
content = open(path, encoding='utf-8', errors='replace').read()

# Fix 1: Remove auto-narration from the slide change effect
# Instead just set up state, let user trigger via button
old_effect = """  // When slide changes
  useEffect(() => {
    if (loading || slides.length === 0 || showQuiz) return
    const slide = slides[currentIndex]
    setSlideStartTime(Date.now())
    narrateSlide(slide, speechRate)
    setSlidesViewedThisSession(prev => prev + 1)
    return () => {
      window.speechSynthesis?.cancel()
      clearTimeout(skipTimerRef.current)
    }
  }, [currentIndex, loading, slides, showQuiz, narrateSlide, speechRate])"""

new_effect = """  // When slide changes -- reset state, user must click Play or Next to trigger narration
  useEffect(() => {
    if (loading || slides.length === 0 || showQuiz) return
    window.speechSynthesis?.cancel()
    clearTimeout(skipTimerRef.current)
    setSlideStartTime(Date.now())
    setNarrating(false)
    setSkipVisible(false)
    const slide = slides[currentIndex]
    if (!slide?.speaker_notes) {
      setCanAdvance(true)
    } else {
      setCanAdvance(false)
    }
    setSlidesViewedThisSession(prev => prev + 1)
    return () => {
      window.speechSynthesis?.cancel()
      clearTimeout(skipTimerRef.current)
    }
  }, [currentIndex, loading, slides, showQuiz, speechRate])"""

result = content.replace(old_effect, new_effect)
if result == content:
    print('ERROR: slide effect not found')
    sys.exit(1)

# Fix 2: Update handleNext to narrate next slide directly (user gesture)
old_next = """  async function handleNext() {
    const slide = slides[currentIndex]
    const timeSpent = slideStartTime ? Math.round((Date.now() - slideStartTime) / 1000) : 0
    await saveProgress(slide.id, timeSpent)

    if (currentIndex < slides.length - 1) {
      setCurrentIndex(i => i + 1)
    } else {
      window.speechSynthesis?.cancel()
      setShowQuiz(true)
    }
  }"""

new_next = """  async function handleNext() {
    const slide = slides[currentIndex]
    const timeSpent = slideStartTime ? Math.round((Date.now() - slideStartTime) / 1000) : 0
    await saveProgress(slide.id, timeSpent)

    if (currentIndex < slides.length - 1) {
      const nextIdx = currentIndex + 1
      setCurrentIndex(nextIdx)
      // Narrate next slide directly from user gesture -- satisfies browser autoplay policy
      setTimeout(() => {
        const nextSlide = slides[nextIdx]
        if (nextSlide) narrateSlide(nextSlide, speechRate)
      }, 50)
    } else {
      window.speechSynthesis?.cancel()
      setShowQuiz(true)
    }
  }"""

result = result.replace(old_next, new_next)
if 'setTimeout' not in result or 'nextSlide' not in result:
    print('ERROR: handleNext not found')
    sys.exit(1)

# Fix 3: Add a Play Narration button that appears when slide has notes but not narrating
old_wait = """                {narrating && !skipVisible && (
                  <div style={P.waitMsg}>"""

new_wait = """                {!narrating && !canAdvance && currentSlide?.speaker_notes && (
                  <button style={P.skipBtn} onClick={() => narrateSlide(currentSlide, speechRate)}>
                    Play Narration
                  </button>
                )}

                {narrating && !skipVisible && (
                  <div style={P.waitMsg}>"""

result = result.replace(old_wait, new_wait)

open(path, 'w', encoding='utf-8').write(result)
print('Done - all 3 fixes applied')
