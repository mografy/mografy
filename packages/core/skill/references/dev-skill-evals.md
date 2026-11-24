# Evaluating Skill changes

Read this when changing the Mografy Skill itself and you need to show a revision is better. It is for Skill development, not for making films.

When evaluating a Skill revision in either host, use the same brief, assets, dimensions, and time budget for the previous and revised guidance. Keep each run's source, plan, actual frames, playable output when available, and critique separate. Do not label the new version as the preferred answer for the reviewer. These focused briefs exercise different decisions:

1. **Motion concept:** "Create an eight-second 16:9 bumper for the fictional wordmark LUMA, using only typography and simple Canvas geometry. Communicate 'Many ideas. One direction.' End on the wordmark."
2. **Explanatory causality:** "Create a six-second 9:16 animation showing a task move from waiting to complete after a button press. Preserve the visible cause/result and let the result read at phone size."
3. **Scope control:** "In this existing animation, change only the last title and lengthen its final hold by half a second. Preserve its established composition and other timings."
4. **Storyboard to timeline:** "Storyboard and build a twelve-second 16:9 launch film for the fictional app Tidepool in three shots: the problem, the product, the end card." Give only the brief; do not mention shots, IDs or layers.

For the first two, compare the five criteria in [motion-design.md](motion-design.md#review-design-separately-from-technical-correctness) using actual frames and playback. Let a reviewer state which version communicates the brief more clearly and cite the moment that determined the choice; document ties or regressions. For the third, verify that the requested local edit did not trigger a redesign or an unnecessary storyboard/image-generation cycle. For the fourth, check the outputs, not the agent's account of them: the storyboard labels every frame `S01`…`S03`, `meta.shots` has three shots titled with those IDs, every declared layer has an `s0n-` or `film-` id and a `colour`, and `npx mografy check` prints no shot-ID or tag-colour warning. Keep prompt-following and technical checks separate from this visual judgment. A rubric or self-score alone does not establish an improvement, and a run in one host does not establish behavior in another or a general model ranking.
