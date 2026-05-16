# Sauti ya Zamani — Build Plan

This is a large platform. I'll ship it in phases so you can see and test progress instead of waiting on one giant build. Each phase is independently usable.

## Design direction

- Inspiration: Spotify + Apple Podcasts, with a nostalgic East African magazine feel.
- Palette: deep midnight (background), warm amber/gold (accent, evokes vinyl & old radio), cream text. Dark mode is the default; light mode supported.
- Typography: editorial serif headings (Instrument Serif), modern sans body (Work Sans).
- Effects: glassmorphism cards, subtle gradient highlights, animated waveforms, 3D tilt on podcast covers, smooth hover/press animations.
- Your uploaded photo goes on the About page.

## Phase 1 — Foundation & public site (this turn)

1. Design system in `src/styles.css` (tokens, gradients, glass, animations).
2. Database schema: profiles, user_roles (admin/user), podcast_categories, podcasts, podcast_episodes, podcast_likes, podcast_comments, listening_history, blog_categories, blog_posts, blog_comments, tags, contact_messages, newsletter_subscribers — all with RLS.
3. Auth (email/password) + admin role check via `has_role()` security-definer function.
4. Public pages: Home, Podcasts, Single Podcast, Blog, Single Blog, About (with your photo), Contact (with WhatsApp float + +254725409996 / omaryw003@gmail.com), Privacy, Terms.
5. Sticky audio player with play/pause, seek, speed, queue, continue-listening (localStorage + DB sync).
6. Header nav, theme toggle, search, newsletter form, social share, sitemap.xml, robots.txt, SEO meta per route.

## Phase 2 — Admin & content management (next turn)

- Admin dashboard with overview stats.
- Podcast CRUD with cover upload, audio upload to Supabase Storage, categories/tags, scheduled publishing, drafts, rich-text show notes.
- Blog CRUD with rich-text editor, featured images, SEO fields.
- Comment moderation, user management, contact messages inbox, newsletter list, category/tag management.

## Phase 3 — Studio & advanced (third turn)

- Browser recording studio (MediaRecorder API): record, pause/resume, waveform, background music mixing with volume + fade, preview, upload.
- AI summaries + transcripts via Lovable AI Gateway (Gemini).
- Analytics charts (Recharts), notifications, bookmarks, QR sharing, PWA manifest.

## Technical notes

- Stack: TanStack Start + Supabase (already connected), TanStack Query, shadcn/ui, Tailwind v4, Recharts, react-h5-audio-player or custom HTML5 audio.
- Roles stored in separate `user_roles` table (security best practice).
- RLS on every table; admin writes gated by `has_role(auth.uid(), 'admin')`.
- Audio + images via Supabase Storage buckets (`podcast-audio` private+signed, `podcast-covers` public, `blog-images` public, `background-music` private).
- Admin account: I'll create the auth flow; after signup you tell me your email and I'll grant the admin role via SQL.

## Scope confirmation

Proceeding with Phase 1 on approval. Reply with anything to tweak (e.g. "skip blog", "lighter palette", "use Google login") or just approve to start.