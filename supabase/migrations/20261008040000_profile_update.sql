-- Phase 5: let students edit their own basic details, and nothing else.
-- (role and payment_status can never be changed from here)

create function public.update_my_profile(
  p_full_name text,
  p_whatsapp text,
  p_country text,
  p_learning_mode text,
  p_experience text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not logged in';
  end if;
  if length(trim(coalesce(p_full_name, ''))) < 2 then
    raise exception 'Please enter your full name';
  end if;
  if p_learning_mode is null or p_learning_mode not in ('online', 'in_person') then
    raise exception 'Invalid learning mode';
  end if;
  if p_experience is null or p_experience not in ('beginner', 'intermediate', 'experienced') then
    raise exception 'Invalid experience level';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      whatsapp = nullif(trim(coalesce(p_whatsapp, '')), ''),
      country = nullif(trim(coalesce(p_country, '')), ''),
      learning_mode = p_learning_mode,
      experience = p_experience
  where id = auth.uid();
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text) from public, anon;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;
