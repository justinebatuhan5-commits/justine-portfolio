-- Run once in the Supabase SQL Editor. Sign in as the owner before adding its UUID below.
begin;
create table public.portfolio_access_owners(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.portfolio_access_owners enable row level security;
revoke all on public.portfolio_access_owners from anon, authenticated;

create function public.portfolio_is_owner() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portfolio_access_owners where user_id=auth.uid());
$$;
revoke all on function public.portfolio_is_owner() from public;
grant execute on function public.portfolio_is_owner() to authenticated;

create table public.portfolio_access_requests(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 project text not null check(project in ('sound-diary','evaluation-studio')),
 name text not null check(length(name) between 2 and 100),
 email text not null,
 reason text not null check(length(reason) between 10 and 3000),
 status text not null default 'pending' check(status in ('pending','approved','declined','revoked')),
 created_at timestamptz not null default now(),
 decided_at timestamptz,
 expires_at timestamptz,
 unique(user_id,project)
);
alter table public.portfolio_access_requests enable row level security;
revoke all on public.portfolio_access_requests from anon,authenticated;
grant select on public.portfolio_access_requests to authenticated;
create policy "Read own requests or owner inbox" on public.portfolio_access_requests for select to authenticated
 using(user_id=auth.uid() or public.portfolio_is_owner());

create function public.portfolio_request_access(p_project text,p_name text,p_reason text) returns void
language plpgsql security definer set search_path='' as $$
declare verified_email text;
begin
 select email into verified_email from auth.users where id=auth.uid() and email_confirmed_at is not null;
 if verified_email is null then raise exception 'Verify email first'; end if;
 insert into public.portfolio_access_requests(user_id,project,name,email,reason)
 values(auth.uid(),p_project,btrim(p_name),verified_email,btrim(p_reason));
 -- Unique constraint means repeat submissions cannot create additional requests or reset decisions.
end;
$$;
revoke all on function public.portfolio_request_access(text,text,text) from public;
grant execute on function public.portfolio_request_access(text,text,text) to authenticated;

create function public.portfolio_decide_access(p_id uuid,p_status text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not public.portfolio_is_owner() then raise exception 'Owner access required'; end if;
 if p_status not in ('approved','declined','revoked') then raise exception 'Invalid decision'; end if;
 update public.portfolio_access_requests set status=p_status,decided_at=now(),
 expires_at=case when p_status='approved' then now()+interval '7 days' else null end where id=p_id;
 if not found then raise exception 'Request not found'; end if;
end;
$$;
revoke all on function public.portfolio_decide_access(uuid,text) from public;
grant execute on function public.portfolio_decide_access(uuid,text) to authenticated;

create function public.portfolio_has_access(p_project text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.portfolio_access_requests where user_id=auth.uid()
 and project=p_project and status='approved' and expires_at>now());
$$;
revoke all on function public.portfolio_has_access(text) from public;
grant execute on function public.portfolio_has_access(text) to authenticated;

insert into storage.buckets(id,name,public) values('portfolio-private','portfolio-private',false);
create policy "Approved Sound Diary download" on storage.objects for select to authenticated
 using(bucket_id='portfolio-private' and name='Sound-Diary.apk' and public.portfolio_has_access('sound-diary'));
commit;

-- After signing in, copy YOUR owner's UUID from Authentication > Users, then run:
-- insert into public.portfolio_access_owners(user_id) values ('YOUR-OWNER-USER-UUID');
