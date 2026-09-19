-- The treasure hunt goes live (DOCUMENT_LIBRARY_PLAN.md Phase 5).
-- Publishing a surprise document makes its egg link answer: members who
-- follow a hidden clover get the celebration, +10 Clovers (first find
-- only), and the document on their personal Fun finds shelf. Published
-- surprises stay invisible in the main library until found.
-- Applied as migration: kos_publish_easter_eggs.
update public.documents
set is_published = true
where is_surprise
  and surprise_slug in ('tampa-parades', 'shamrock-lore', 'irish-blessing');
