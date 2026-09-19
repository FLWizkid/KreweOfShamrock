-- Season Calendar joins the Document Library shelf
-- (DOCUMENT_LIBRARY_PLAN.md Phase 4). Applied as migration:
-- kos_season_calendar_seed.
insert into public.documents (title, description, category, page_url, file_type, is_published, sort_order)
select 'Krewe of Shamrock Season Calendar',
       'Twelve printable pages, July to June — parades pre-printed, with room to pencil in events all season.',
       'calendars', '/assets/docs/season-calendar.html', 'html', true, 10
where not exists (
  select 1 from public.documents d
  where d.page_url = '/assets/docs/season-calendar.html'
);
