-- Remaining source links, cluster membership for 0005 sites, press roles.

insert into site_sources (site_id, source_id, role)
select s.id, src.id, 'press'
from sites s
cross join sources src
where (s.code = 'PA-BERNINI' and src.slug = 'gdo-palermo-2025')
   or (s.code = 'ME-GALATI' and src.slug = 'gdo-galati-2026')
   or (s.code = 'ME-SANTAGATA' and src.slug = 'md-chi')
   or (s.code = 'CT-NICOLOSI' and src.slug = 'gdo-abate-2019')
   or (s.code = 'CT-CALTAGIRONE' and src.slug = 'gdo-abate-2019')
on conflict (site_id, source_id) do update set role = excluded.role;

insert into site_sources (site_id, source_id, role)
select s.id, src.id, 'corporate'
from sites s
cross join sources src
where s.code = 'CEDI-DITTAINO'
  and src.slug in ('md-logistica', 'md-cortenuova-pdf', 'md-chi', 'md-storia')
on conflict (site_id, source_id) do update set role = excluded.role;

insert into org_site_links (org_id, site_id)
select n.id, s.id
from sites s
join org_nodes n on n.slug = 'cluster-' || s.cluster_slug
where s.cluster_slug is not null
on conflict do nothing;

insert into timeline_events (site_id, occurred_on, title, body)
select s.id, '2025-07-02', 'Comparso nel PDF gift card',
  'Prima attestazione ufficiale di indirizzo nel sottoinsieme gift card. Non è la data di apertura.'
from sites s
where s.code in ('EN-REGALBUTO', 'CT-SCORDIA', 'PA-CEFALU', 'CT-STELLA-CANTAG')
  and not exists (
    select 1 from timeline_events t where t.site_id = s.id and t.title = 'Comparso nel PDF gift card'
  );
