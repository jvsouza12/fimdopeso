<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Walking records use a dedicated owner-scoped database table and account-keyed IndexedDB outbox; GPS routes must never enter the shared nutrition state, preventing cross-account merging.
- WalkingProvider owns GPS and active sessions across navigation; backgrounding pauses tracking because browser geolocation cannot guarantee locked-screen recording.
- Offline support uses vite-plugin-pwa generateSW and a single guarded registration wrapper; never cache auth/RPC responses or Google Maps resources.
- Walking maps render saved GPS coordinates locally in all connectivity states without street tiles or external map SDKs, eliminating network dependence and preserving account-scoped route storage.
