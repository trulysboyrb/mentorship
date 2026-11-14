-- Phase 21.1: business name becomes "The Forbes Academy".
-- Only changes the name if you have not set your own in Admin > Settings > Contact details.
update public.app_settings
set value = 'The Forbes Academy'
where key = 'contact_business' and value in ('ApexTrade Academy', 'Forbes Academy');
