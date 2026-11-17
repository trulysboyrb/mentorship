-- Phase 21: rebrand to Forbes Academy.
-- Changes the public business name only if you have not already set your own in Admin > Settings > Contact details.
update public.app_settings
set value = 'Forbes Academy'
where key = 'contact_business' and value = 'ApexTrade Academy';
